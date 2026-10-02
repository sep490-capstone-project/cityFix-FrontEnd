import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface RoutingRuleItem {
  ruleId?: string;
  id?: string;
  departmentId: string;
  departmentName?: string;
  categoryId: string;
  categoryName?: string;
  province: string;
  ward: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateRoutingRulePayload {
  departmentId: string;
  categoryId: string;
  province: string;
  ward: string;
}

export interface UpdateRoutingRulePayload {
  departmentId?: string;
  categoryId?: string;
  province?: string;
  ward?: string;
}

export interface RoutingRulesFilter {
  categoryId?: string;
  province?: string;
  ward?: string;
  departmentId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}

export interface PageableResponse<T> {
  totalPages: number;
  totalElements: number;
  size: number;
  content: T[];
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

async function routingRequest<T>(
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
 * 1. Cập nhật quy tắc định tuyến
 * PUT /api/v1/routing-rules/{id}
 */
export async function updateRoutingRule(
  id: string,
  payload: UpdateRoutingRulePayload
): Promise<RoutingRuleItem> {
  const res = await routingRequest<RoutingRuleItem>(`/api/v1/routing-rules/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  });
  return res.data as RoutingRuleItem;
}

/**
 * 2. Tạo mới quy tắc định tuyến
 * POST /api/v1/routing-rules
 */
export async function createRoutingRule(
  payload: CreateRoutingRulePayload
): Promise<RoutingRuleItem> {
  const res = await routingRequest<RoutingRuleItem>('/api/v1/routing-rules', {
    method: 'POST',
    body: JSON.stringify({
      departmentId: payload.departmentId.trim(),
      categoryId: payload.categoryId.trim(),
      province: payload.province.trim(),
      ward: payload.ward.trim(),
    }),
  });
  return res.data as RoutingRuleItem;
}

/**
 * 3. Lấy danh sách theo phòng ban
 * GET /api/v1/routing-rules/department/{departmentId}
 */
export async function getRoutingRulesByDepartment(
  departmentId: string
): Promise<RoutingRuleItem[]> {
  const res = await routingRequest<RoutingRuleItem[]>(
    `/api/v1/routing-rules/department/${encodeURIComponent(departmentId)}`,
    {
      method: 'GET',
    }
  );
  return res.data || [];
}

/**
 * 4. Tìm kiếm / danh sách routing rules (phân trang + lọc)
 * GET /api/v1/routing-rules
 */
export async function getRoutingRules(
  filter: RoutingRulesFilter = {}
): Promise<PageableResponse<RoutingRuleItem> | RoutingRuleItem[]> {
  const params = new URLSearchParams();
  if (filter.categoryId) params.append('categoryId', filter.categoryId);
  if (filter.province) params.append('province', filter.province);
  if (filter.ward) params.append('ward', filter.ward);
  if (filter.departmentId) params.append('departmentId', filter.departmentId);
  if (filter.page !== undefined) params.append('page', String(filter.page));
  if (filter.size !== undefined) params.append('size', String(filter.size));

  const queryStr = params.toString() ? `?${params.toString()}` : '';
  const res = await routingRequest<PageableResponse<RoutingRuleItem> | RoutingRuleItem[]>(
    `/api/v1/routing-rules${queryStr}`,
    {
      method: 'GET',
    }
  );

  return res.data as PageableResponse<RoutingRuleItem> | RoutingRuleItem[];
}

/**
 * 5. Lấy chi tiết routing rule
 * GET /api/v1/routing-rules/{id}
 */
export async function getRoutingRuleById(id: string): Promise<RoutingRuleItem> {
  const res = await routingRequest<RoutingRuleItem>(
    `/api/v1/routing-rules/${encodeURIComponent(id)}`,
    {
      method: 'GET',
    }
  );
  return res.data as RoutingRuleItem;
}

/**
 * 6. Xóa routing rule
 * DELETE /api/v1/routing-rules/{id}
 */
export async function deleteRoutingRule(id: string): Promise<void> {
  await routingRequest<void>(`/api/v1/routing-rules/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
