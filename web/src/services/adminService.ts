import { APP_CONFIG } from '../config';
import { getAccessToken } from './auth';

const API_BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface AdminStep {
  stepId: string;
  subCategoryId: string;
  stepName: string;
  description: string;
  duration: number;
}

export interface CreateAdminStepRequest {
  subCategoryId: string;
  stepName: string;
  description: string;
  duration: number;
}

interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<ApiResponse<T>> {
  const token = getAccessToken();

  if (!token) {
    throw new Error('Không tìm thấy access token. Vui lòng đăng nhập lại.');
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      errorText || `API thất bại với mã ${response.status}`,
    );
  }

  const text = await response.text();

  if (!text) {
    return { data: undefined as T };
  }

  return JSON.parse(text) as ApiResponse<T>;
}

// GET: Lấy tất cả Step
export async function getAdminSteps() {
  return request<AdminStep[]>('/api/v1/admin/steps');
}

// GET: Lấy Step theo SubCategory ID
export async function getAdminStepsBySubCategory(
  subCategoryId: string,
) {
  return request<AdminStep[]>(
    `/api/v1/admin/steps/sub-category/${encodeURIComponent(subCategoryId)}`,
  );
}

// POST: Tạo Step
export async function createAdminStep(
  data: CreateAdminStepRequest,
) {
  return request<AdminStep>('/api/v1/admin/steps', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// PUT: Cập nhật Step
export async function updateAdminStep(
  id: string,
  data: CreateAdminStepRequest,
) {
  return request<AdminStep>(`/api/v1/admin/steps/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

// DELETE: Xóa Step
export async function deleteAdminStep(id: string) {
  return request<unknown>(
    `/api/v1/admin/steps/${encodeURIComponent(id)}`,
    { method: 'DELETE' },
  );
}
