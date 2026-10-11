import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface AdminCategory {
  id?: string;
  categoryId?: string;
  name: string;
  description: string;
  sla?: number;
  slaHours?: number;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateCategoryPayload {
  name: string;
  description: string;
  sla?: number;
}

export interface UpdateCategoryPayload {
  name: string;
  description: string;
  sla?: number;
}

async function adminRequest<T>(
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
 * 1. Lấy danh sách danh mục
 * GET /api/v1/admin/categories
 */
export async function getAdminCategories(): Promise<AdminCategory[]> {
  const res = await adminRequest<AdminCategory[]>('/api/v1/admin/categories', {
    method: 'GET',
  });
  return res.data || [];
}

/**
 * 2. Tạo mới danh mục
 * POST /api/v1/admin/categories
 */
export async function createAdminCategory(
  payload: CreateCategoryPayload
): Promise<AdminCategory> {
  const res = await adminRequest<AdminCategory>('/api/v1/admin/categories', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name.trim(),
      description: payload.description.trim(),
      sla: Number(payload.sla) || 1,
    }),
  });

  return res.data as AdminCategory;
}

/**
 * 3. Cập nhật danh mục
 * PUT /api/v1/admin/categories/{id}
 */
export async function updateAdminCategory(
  id: string,
  payload: UpdateCategoryPayload
): Promise<AdminCategory> {
  const res = await adminRequest<AdminCategory>(`/api/v1/admin/categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      name: payload.name.trim(),
      description: payload.description.trim(),
      sla: Number(payload.sla) || 1,
    }),
  });

  return res.data as AdminCategory;
}

/**
 * 4. Xóa danh mục
 * DELETE /api/v1/admin/categories/{id}
 */
export async function deleteAdminCategory(id: string): Promise<void> {
  await adminRequest<void>(`/api/v1/admin/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
