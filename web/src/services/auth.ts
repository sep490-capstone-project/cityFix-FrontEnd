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
  return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function setAccessToken(token: string): void {
  localStorage.setItem(ACCESS_TOKEN_KEY, token);
}

export function getRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token: string): void {
  localStorage.setItem(REFRESH_TOKEN_KEY, token);
}

export function clearTokens(): void {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
}

export function decodeJwt(token: string): Record<string, any> | null {
  try {
    const base64Url = token.split('.')[1];
    if (!base64Url) return null;
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window
        .atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch {
    return null;
  }
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
 * 4. Gửi lại mã OTP
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
 * 5. Xác thực Email bằng mã OTP
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
