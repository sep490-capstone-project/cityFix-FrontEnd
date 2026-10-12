import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface TicketStep {
  id?: string;
  stepId?: string;
  stepName?: string;
  assigneeId?: string;
  assigneeName?: string;
  status?: string;
  orderIndex?: number;
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ManagerTicketRoute {
  subCategoryId: string;
  departmentId: string;
}

export interface ReviewTicketPayload {
  categoryId: string;
  targetDepartmentId?: string;
  routes?: ManagerTicketRoute[];
  departmentIds?: string[];
  isLifeThreatening?: boolean;
  reviewNote?: string;
}

export interface RejectTicketPayload {
  suggestedCategoryId?: string;
  suggestedDepartmentId?: string;
  reason: string;
}

export interface StepDeadlineItem {
  ticketStepId: string;
  deadline: string;
}

export interface UpdateStepDeadlinesPayload {
  stepDeadlines: StepDeadlineItem[];
}

export interface StepOrderItem {
  ticketStepId: string;
  orderIndex: number;
}

export interface ReorderStepsPayload {
  stepOrders: StepOrderItem[];
}

export interface SuggestedDepartment {
  departmentId: string;
  name: string;
  level?: string;
  contactEmail?: string;
  phoneNumber?: string;
  officerCount?: number;
  isActive?: boolean;
}

export interface ManagerTicketItem {
  id: string;
  ticketId?: string;
  description: string;
  imageUrl?: string;
  categoryId?: string;
  categoryName?: string;
  subCategories?: Array<{ id?: string; subCategoryId?: string; name?: string; subCategoryName?: string }>;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority?: string;
  dangerLevel?: 'SAFE' | 'CAUTION' | 'DANGEROUS' | 'CRITICAL';
  locationMethod?: 'AUTO_GPS' | 'MANUAL_ENTRY';
  address: string;
  status: string;
  latitude?: number;
  longitude?: number;
  reviewNote?: string;
  isLifeThreatening?: boolean;
  isAnonymous?: boolean;
  createdBy?: string;
  createdAt?: string;
  steps?: TicketStep[];
  duration?: any;
}

export interface PageManagerTickets {
  content: ManagerTicketItem[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements?: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

async function managerRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
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
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
  }

  const payload = (await response.json().catch(() => null)) as ApiResponse<T> | null;
  const message = payload?.message || `Yêu cầu thất bại (${response.status})`;

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiError(message, response.status, payload);
  }

  return (payload?.data !== undefined ? payload.data : (payload as any)) as T;
}

/**
 * 1. Cập nhật deadline cho một bước xử lý
 * PUT /api/v1/manager/tickets/steps/{stepId}/deadline
 */
export async function updateStepDeadline(
  stepId: string,
  deadline: string | { deadline: string }
): Promise<TicketStep> {
  const bodyData = typeof deadline === 'string' ? { deadline } : deadline;
  return managerRequest<TicketStep>(
    `/api/v1/manager/tickets/steps/${encodeURIComponent(stepId)}/deadline`,
    {
      method: 'PUT',
      body: JSON.stringify(bodyData),
    }
  );
}

/**
 * 2. Cập nhật thứ tự cho một bước xử lý
 * PUT /api/v1/manager/tickets/steps/{stepId}/order-index
 */
export async function updateStepOrderIndex(
  stepId: string,
  orderIndex: number
): Promise<TicketStep> {
  return managerRequest<TicketStep>(
    `/api/v1/manager/tickets/steps/${encodeURIComponent(stepId)}/order-index`,
    {
      method: 'PUT',
      body: JSON.stringify({ orderIndex }),
    }
  );
}

/**
 * 3. Từ chối vé (Manual Review)
 * PUT /api/v1/manager/tickets/{id}/reject
 */
export async function rejectManagerTicket(
  ticketId: string,
  payload: RejectTicketPayload
): Promise<ManagerTicketItem> {
  return managerRequest<ManagerTicketItem>(
    `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/reject`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * 4. Duyệt vé và định tuyến
 * PUT /api/v1/manager/tickets/{id}/review
 */
export async function reviewManagerTicket(
  ticketId: string,
  payload: ReviewTicketPayload
): Promise<ManagerTicketItem> {
  return managerRequest<ManagerTicketItem>(
    `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/review`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * 5. Cập nhật deadline cho nhiều bước của một vé
 * PUT /api/v1/manager/tickets/{ticketId}/steps/deadlines
 */
export async function updateTicketStepDeadlines(
  ticketId: string,
  payload: UpdateStepDeadlinesPayload
): Promise<TicketStep[]> {
  return managerRequest<TicketStep[]>(
    `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/steps/deadlines`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * 6. Sắp xếp lại toàn bộ bước xử lý của một vé
 * PUT /api/v1/manager/tickets/{ticketId}/steps/reorder
 */
export async function reorderTicketSteps(
  ticketId: string,
  payload: ReorderStepsPayload
): Promise<TicketStep[]> {
  return managerRequest<TicketStep[]>(
    `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/steps/reorder`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * 7. Lấy danh sách vé chờ duyệt (INITIATED)
 * GET /api/v1/manager/tickets/initiated
 */
export async function getManagerInitiatedTickets(params?: {
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageManagerTickets> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.append('page', params.page.toString());
  if (params?.size !== undefined) query.append('size', params.size.toString());
  if (params?.sort && params.sort.length > 0) {
    params.sort.forEach((s) => query.append('sort', s));
  }

  const qs = query.toString() ? `?${query.toString()}` : '';
  return managerRequest<PageManagerTickets>(`/api/v1/manager/tickets/initiated${qs}`, {
    method: 'GET',
  });
}

/**
 * 8. Gợi ý phòng ban cho vé
 * GET /api/v1/manager/tickets/{id}/suggested-departments
 */
export async function getSuggestedDepartments(
  ticketId: string,
  categoryId?: string
): Promise<SuggestedDepartment[]> {
  const query = new URLSearchParams();
  if (categoryId) query.append('categoryId', categoryId);
  const qs = query.toString() ? `?${query.toString()}` : '';

  return managerRequest<SuggestedDepartment[]>(
    `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/suggested-departments${qs}`,
    {
      method: 'GET',
    }
  );
}
