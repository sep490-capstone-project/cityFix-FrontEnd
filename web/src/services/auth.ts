import { APP_CONFIG } from '../config';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
    public readonly data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
  errorCode?: string;
  timestamp?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface LoginData {
  accessToken: string;
  refreshToken?: string;
  role?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  address: string;
}

export interface ResendOtpPayload {
  email: string;
}

export interface VerifyEmailPayload {
  email: string;
  otp: string;
}

export interface UserProfile {
  userId?: string;
  email?: string;
  roleName?: string;
  departmentId?: string;
  status?: string;
  fullName: string;
  phoneNumber: string;
  address: string;
  province: string;
  ward: string;
}

export interface UpdateProfilePayload {
  fullName: string;
  phoneNumber: string;
  address: string;
  province: string;
  ward: string;
}

/* =========================================================
   TOKEN STORAGE HELPERS
   ========================================================= */

const ACCESS_TOKEN_KEY = 'cityfix_access_token';
const REFRESH_TOKEN_KEY = 'cityfix_refresh_token';

export function getAccessToken(): string | null {
  return (
    localStorage.getItem(ACCESS_TOKEN_KEY) ||
    localStorage.getItem('accessToken') ||
    localStorage.getItem('token')
  );
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
  localStorage.setItem('accessToken', token);
}

export function getRefreshToken(): string | null {
  return (
    localStorage.getItem(REFRESH_TOKEN_KEY) ||
    localStorage.getItem('refreshToken')
  );
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
  localStorage.setItem('refreshToken', token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('token');
}

export function decodeJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    let base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/').replace(/[^A-Za-z0-9+/=]/g, '');
    const padLen = (4 - (base64.length % 4)) % 4;
    if (padLen > 0) {
      base64 = base64.padEnd(base64.length + padLen, '=');
    }
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    ).replace(/\0+$/g, '');
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
}

export function isTokenExpired(token?: string | null): boolean {
  if (!token) return true;
  const decoded = decodeJwt(token);
  if (!decoded) return false;
  if (typeof decoded.exp === 'number') {
    const nowSec = Date.now() / 1000;
    return decoded.exp + 30 <= nowSec;
  }
  return false;
}

/* =========================================================
   REFRESH TOKEN & GLOBAL FETCH INTERCEPTOR (AUTO-REFRESH)
   POST /api/v1/auth/refresh
   ========================================================= */

const rawFetch = window.fetch.bind(window);
let activeRefreshPromise: Promise<LoginData | null> | null = null;

/**
 * Làm mới Access Token bằng Refresh Token
 * POST /api/v1/auth/refresh
 */
export async function refreshAccessToken(customRefreshToken?: string | null): Promise<LoginData | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  const refreshTok = customRefreshToken || getRefreshToken();
  if (!refreshTok) {
    return null;
  }

  activeRefreshPromise = (async () => {
    try {
      const response = await rawFetch(`${BASE_URL}/api/v1/auth/refresh`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          refreshToken: refreshTok,
        }),
      });

      const payload = (await response.json().catch(() => null)) as ApiResponse<LoginData> | null;
      if (!response.ok || !payload?.success || !payload.data?.accessToken) {
        return null;
      }

      setAccessToken(payload.data.accessToken);
      if (payload.data.refreshToken) {
        setRefreshToken(payload.data.refreshToken);
      }
      return payload.data;
    } catch (err) {
      console.warn('⚠️ Refresh token failed:', err);
      return null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

// Bọc window.fetch để tự động refresh token và retry cho toàn bộ các service trên Web khi gặp 401
if (typeof window !== 'undefined' && !(window as any).__cityfixFetchWrapped) {
  (window as any).__cityfixFetchWrapped = true;
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const isAuthEndpoint =
      urlStr.includes('/api/v1/auth/login') ||
      urlStr.includes('/api/v1/auth/register') ||
      urlStr.includes('/api/v1/auth/refresh') ||
      urlStr.includes('/api/v1/auth/verify-phone-firebase') ||
      urlStr.includes('/api/v1/auth/reset-password');

    // Nếu token hiện tại đã hết hạn và có refreshToken, chủ động refresh trước khi gửi request
    if (urlStr.startsWith(BASE_URL) && !isAuthEndpoint) {
      const currentToken = getAccessToken();
      if (currentToken && isTokenExpired(currentToken) && getRefreshToken()) {
        const refreshed = await refreshAccessToken();
        if (refreshed?.accessToken && init?.headers) {
          if (init.headers instanceof Headers) {
            init.headers.set('Authorization', `Bearer ${refreshed.accessToken}`);
          } else if (Array.isArray(init.headers)) {
            const idx = init.headers.findIndex(([k]) => k.toLowerCase() === 'authorization');
            if (idx >= 0) init.headers[idx][1] = `Bearer ${refreshed.accessToken}`;
          } else {
            (init.headers as Record<string, string>)['Authorization'] = `Bearer ${refreshed.accessToken}`;
          }
        }
      }
    }

    const response = await rawFetch(input, init);

    if (
      response.status === 401 &&
      urlStr.startsWith(BASE_URL) &&
      !isAuthEndpoint &&
      getRefreshToken()
    ) {
      const refreshed = await refreshAccessToken();
      if (refreshed?.accessToken) {
        const retryInit: RequestInit = { ...(init || {}) };
        const nextHeaders = new Headers(init?.headers || {});
        nextHeaders.set('Authorization', `Bearer ${refreshed.accessToken}`);
        retryInit.headers = nextHeaders;
        return rawFetch(input, retryInit);
      }
    }

    return response;
  };
}

/* =========================================================
   GENERIC REQUEST HANDLER
   ========================================================= */

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${path}`;
  const token = getAccessToken();

  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  const message = payload?.message || `Yêu cầu thất bại (${response.status})`;

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiError(message, response.status, payload);
  }

  return payload || { success: true };
}

/* =========================================================
   AUTH APIS
   ========================================================= */

/**
 * 1. Đăng nhập
 * POST /api/v1/auth/login
 */
export async function login(payload: LoginPayload): Promise<LoginData> {
  const res = await request<LoginData>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
    }),
  });

  if (!res.data?.accessToken) {
    throw new ApiError(res.message || 'Không nhận được access token từ máy chủ.');
  }

  setAccessToken(res.data.accessToken);
  if (res.data.refreshToken) {
    setRefreshToken(res.data.refreshToken);
  }

  return res.data;
}

/**
 * 2. Đăng xuất
 * POST /api/v1/auth/logout
 */
export async function logout(): Promise<void> {
  const token = getAccessToken();
  try {
    if (token) {
      await request<void>('/api/v1/auth/logout', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    }
  } catch (err) {
    console.warn('Logout API warning:', err);
  } finally {
    clearTokens();
  }
}

/**
 * 3. Đăng ký tài khoản
 * POST /api/v1/auth/register
 */
export async function register(payload: RegisterPayload): Promise<void> {
  await request<void>('/api/v1/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password,
      fullName: payload.fullName.trim(),
      phoneNumber: payload.phoneNumber.replace(/\s/g, ''),
      province: payload.province.trim(),
      ward: payload.ward.trim(),
      address: payload.address.trim(),
    }),
  });
}

/**
 * 4. Xác thực Số điện thoại qua Firebase ID Token
 * POST /api/v1/auth/verify-phone-firebase
 */
export async function verifyPhoneFirebase(
  firebaseIdToken: string
): Promise<LoginData> {
  const res = await request<LoginData>('/api/v1/auth/verify-phone-firebase', {
    method: 'POST',
    body: JSON.stringify({
      firebaseIdToken: firebaseIdToken.trim(),
    }),
  });

  if (res.data?.accessToken) {
    setAccessToken(res.data.accessToken);
  }
  if (res.data?.refreshToken) {
    setRefreshToken(res.data.refreshToken);
  }

  return res.data || { accessToken: '' };
}

/**
 * 5. Khôi phục / Đặt lại mật khẩu qua Firebase ID Token
 * POST /api/v1/auth/reset-password
 */
export async function resetPassword(
  firebaseIdToken: string,
  newPassword: string
): Promise<void> {
  await request<void>('/api/v1/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({
      firebaseIdToken: firebaseIdToken.trim(),
      newPassword,
    }),
  });
}

/**
 * 6. Gửi lại mã OTP (Legacy)
 * POST /api/v1/auth/resend-otp
 */
export async function resendOtp(payload: ResendOtpPayload): Promise<void> {
  await request<void>('/api/v1/auth/resend-otp', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
    }),
  });
}

/**
 * 7. Xác thực Email bằng mã OTP (Legacy)
 * POST /api/v1/auth/verify-email
 */
export async function verifyEmail(payload: VerifyEmailPayload): Promise<void> {
  await request<void>('/api/v1/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      otp: payload.otp.trim(),
    }),
  });
}

/**
 * Lấy thông tin profile người dùng hiện tại
 * GET /api/v1/profile
 */
export async function getProfile(token?: string): Promise<UserProfile> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await request<UserProfile>('/api/v1/profile', {
    method: 'GET',
    headers,
  });

  if (!res.data) {
    throw new ApiError(res.message || 'Không thể lấy thông tin profile.');
  }

  return res.data;
}

/**
 * Cập nhật thông tin profile người dùng hiện tại
 * PUT /api/v1/profile
 */
export async function updateProfile(payload: UpdateProfilePayload, token?: string): Promise<UserProfile> {
  const headers: Record<string, string> = {};
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await request<UserProfile>('/api/v1/profile', {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  });

  if (!res.data) {
    throw new ApiError(res.message || 'Không thể cập nhật thông tin profile.');
  }

  return res.data;
}
