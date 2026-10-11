import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export type SubCategoryPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' | string;

export interface AdminSubCategory {
  subCategoryId: string;
  categoryId: string;
  name: string;
  description?: string;
  sla?: number;
  priority?: SubCategoryPriority;
  active?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSubCategoryPayload {
  categoryId: string;
  name: string;
  description?: string;
  sla?: number;
  priority?: string;
  isActive?: boolean;
}

export interface UpdateSubCategoryPayload {
  categoryId: string;
  name: string;
  description?: string;
  sla?: number;
  priority?: string;
  isActive?: boolean;
}

async function subCategoryRequest<T>(
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
 * 1. Lấy danh sách tất cả SubCategory
 * GET /api/v1/admin/sub-categories
 */
export async function getAllSubCategories(): Promise<AdminSubCategory[]> {
  const res = await subCategoryRequest<AdminSubCategory[]>('/api/v1/admin/sub-categories', {
    method: 'GET',
  });
  return res.data || [];
}

/**
 * 2. Lấy chi tiết SubCategory theo ID
 * GET /api/v1/admin/sub-categories/{id}
 */
export async function getSubCategoryById(id: string): Promise<AdminSubCategory> {
  const res = await subCategoryRequest<AdminSubCategory>(`/api/v1/admin/sub-categories/${encodeURIComponent(id)}`, {
    method: 'GET',
  });
  return res.data as AdminSubCategory;
}

/**
 * 3. Lấy SubCategory theo Category ID
 * GET /api/v1/admin/sub-categories/category/{categoryId}
 */
export async function getSubCategoriesByCategoryId(categoryId: string): Promise<AdminSubCategory[]> {
  const res = await subCategoryRequest<AdminSubCategory[]>(`/api/v1/admin/sub-categories/category/${encodeURIComponent(categoryId)}`, {
    method: 'GET',
  });
  return res.data || [];
}

/**
 * 4. Tạo mới SubCategory
 * POST /api/v1/admin/sub-categories
 */
export async function createSubCategory(
  payload: CreateSubCategoryPayload
): Promise<AdminSubCategory> {
  const res = await subCategoryRequest<AdminSubCategory>('/api/v1/admin/sub-categories', {
    method: 'POST',
    body: JSON.stringify({
      categoryId: payload.categoryId,
      name: payload.name.trim(),
      description: (payload.description || '').trim(),
      sla: Number(payload.sla) || 0,
      priority: payload.priority || 'LOW',
      isActive: payload.isActive ?? true,
    }),
  });

  return res.data as AdminSubCategory;
}

/**
 * 5. Cập nhật SubCategory
 * PUT /api/v1/admin/sub-categories/{id}
 */
export async function updateSubCategory(
  id: string,
  payload: UpdateSubCategoryPayload
): Promise<AdminSubCategory> {
  const res = await subCategoryRequest<AdminSubCategory>(`/api/v1/admin/sub-categories/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify({
      categoryId: payload.categoryId,
      name: payload.name.trim(),
      description: (payload.description || '').trim(),
      sla: Number(payload.sla) || 0,
      priority: payload.priority || 'LOW',
      isActive: payload.isActive ?? true,
    }),
  });

  return res.data as AdminSubCategory;
}

/**
 * 6. Xóa mềm SubCategory
 * DELETE /api/v1/admin/sub-categories/{id}
 */
export async function deleteSubCategory(id: string): Promise<void> {
  await subCategoryRequest<void>(`/api/v1/admin/sub-categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
