import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

const ROLE_ID_MAP: Record<string, string> = {
  RESIDENT: 'dca2a13d-5d68-4ce3-bc49-bcfc7fe4c729',
  STAFF: 'd6d7806d-96d1-4a5c-bac7-c994ee77c69d',
  ADMIN: '97f45d59-0c9d-4bc1-9722-c59acc3976bd',
  MANAGER: '16051abf-4590-4e8b-b5a1-f65f98221c5c',
};

export interface AdminUser {
  id?: string;
  userId?: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  phone?: string;
  province?: string;
  ward?: string;
  address?: string;
  roleId?: string;
  role?: 'ADMIN' | 'MANAGER' | 'STAFF' | 'RESIDENT' | string;
  departmentId?: string;
  status?: 'ACTIVE' | 'BLOCKED' | 'INACTIVE' | string;
  isDispatcher?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateAdminUserPayload {
  email: string;
  password?: string;
  fullName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  address: string;
  roleId?: string;
  role?: string;
  departmentId?: string;
  status?: string;
  isDispatcher?: boolean;
}

export interface UpdateAdminUserPayload {
  email?: string;
  fullName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  address: string;
  roleId?: string;
  role?: string;
  departmentId?: string;
  status?: string;
  isDispatcher?: boolean;
}

async function adminUserRequest<T>(
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

/**
 * 1. Lấy danh sách người dùng
 * GET /api/v1/admin/users
 */
export async function getAdminUsers(): Promise<AdminUser[]> {
  const res = await adminUserRequest<AdminUser[]>('/api/v1/admin/users', {
    method: 'GET',
  });
  return res.data || [];
}

/**
 * 2. Tạo mới người dùng
 * POST /api/v1/admin/users
 */
export async function createAdminUser(
  payload: CreateAdminUserPayload
): Promise<AdminUser> {
  const res = await adminUserRequest<AdminUser>('/api/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email.trim(),
      password: payload.password || 'password123',
      fullName: payload.fullName.trim(),
      phoneNumber: payload.phoneNumber.replace(/\s/g, ''),
      province: payload.province.trim(),
      ward: payload.ward.trim(),
      address: payload.address.trim(),
      roleId: payload.roleId || ROLE_ID_MAP[payload.role || 'STAFF'],
      ...(payload.role ? { role: payload.role } : {}),
      departmentId: payload.departmentId || undefined,
      status: payload.status || 'ACTIVE',
      isDispatcher: Boolean(payload.isDispatcher),
    }),
  });

  return res.data as AdminUser;
}

/**
 * 3. Cập nhật người dùng
 * PUT /api/v1/admin/users/{id}
 */
export async function updateAdminUser(
  id: string,
  payload: UpdateAdminUserPayload
): Promise<AdminUser> {
  const res = await adminUserRequest<AdminUser>(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      ...(payload.email ? { email: payload.email.trim() } : {}),
      fullName: payload.fullName.trim(),
      phoneNumber: payload.phoneNumber.replace(/\s/g, ''),
      province: payload.province.trim(),
      ward: payload.ward.trim(),
      address: payload.address.trim(),
      roleId: payload.roleId || undefined,
      ...(payload.role ? { role: payload.role } : {}),
      departmentId: payload.departmentId || undefined,
      status: payload.status || 'ACTIVE',
      isDispatcher: Boolean(payload.isDispatcher),
    }),
  });

  return res.data as AdminUser;
}

/**
 * 4. Xóa người dùng
 * DELETE /api/v1/admin/users/{id}
 */
export async function deleteAdminUser(id: string): Promise<void> {
  await adminUserRequest<void>(`/api/v1/admin/users/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
