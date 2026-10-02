import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';
import { PageableResponse } from './routingRules';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface DepartmentItem {
  departmentId: string;
  name: string;
  level: 'CITY' | 'WARD' | string;
  contactEmail: string;
  phoneNumber: string;
  officerCount?: number;
  isActive?: boolean;
}

export interface CreateDepartmentPayload {
  name: string;
  level: string;
  contactEmail: string;
  phoneNumber: string;
}

export interface UpdateDepartmentPayload {
  name?: string;
  level?: string;
  contactEmail?: string;
  phoneNumber?: string;
  isActive?: boolean;
}

export interface DepartmentFilter {
  activeOnly?: boolean;
  page?: number;
  size?: number;
  sort?: string[];
}

async function departmentRequest<T>(
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
 * 1. Cập nhật thông tin cơ quan phụ trách
 * PUT /api/v1/departments/{id}
 */
export async function updateDepartment(
  id: string,
  payload: UpdateDepartmentPayload
): Promise<DepartmentItem> {
  const res = await departmentRequest<DepartmentItem>(
    `/api/v1/departments/${encodeURIComponent(id)}`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
  return res.data as DepartmentItem;
}

/**
 * 2. Tạo mới cơ quan phụ trách
 * POST /api/v1/departments
 */
export async function createDepartment(
  payload: CreateDepartmentPayload
): Promise<DepartmentItem> {
  const res = await departmentRequest<DepartmentItem>('/api/v1/departments', {
    method: 'POST',
    body: JSON.stringify({
      name: payload.name.trim(),
      level: payload.level,
      contactEmail: payload.contactEmail.trim(),
      phoneNumber: payload.phoneNumber.trim(),
    }),
  });
  return res.data as DepartmentItem;
}

/**
 * 3. Lấy danh sách cơ quan phụ trách
 * GET /api/v1/departments
 */
export async function getDepartments(
  filter: DepartmentFilter = {}
): Promise<PageableResponse<DepartmentItem> | DepartmentItem[]> {
  const params = new URLSearchParams();
  if (filter.activeOnly !== undefined) {
    params.append('activeOnly', String(filter.activeOnly));
  }
  if (filter.page !== undefined) {
    params.append('page', String(filter.page));
  }
  if (filter.size !== undefined) {
    params.append('size', String(filter.size));
  }

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await departmentRequest<PageableResponse<DepartmentItem> | DepartmentItem[]>(
    `/api/v1/departments${queryStr}`,
    {
      method: 'GET',
    }
  );

  return res.data as PageableResponse<DepartmentItem> | DepartmentItem[];
}

/**
 * 4. Lấy chi tiết cơ quan phụ trách
 * GET /api/v1/departments/{id}
 */
export async function getDepartmentById(id: string): Promise<DepartmentItem> {
  const res = await departmentRequest<DepartmentItem>(
    `/api/v1/departments/${encodeURIComponent(id)}`,
    {
      method: 'GET',
    }
  );
  return res.data as DepartmentItem;
}

/**
 * 5. Vô hiệu hóa cơ quan phụ trách (hoặc xóa)
 * DELETE /api/v1/departments/{id}
 */
export async function deleteDepartment(id: string): Promise<void> {
  await departmentRequest<void>(`/api/v1/departments/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
