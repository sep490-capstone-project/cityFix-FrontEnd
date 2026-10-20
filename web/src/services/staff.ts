import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface StaffTicketStepEvidence {
  evidenceId: string;
  ticketStepId?: string;
  imageUrl: string;
  resolutionNote?: string;
  staffName?: string;
  createdAt: string;
}

export interface StaffTicketStep {
  id?: string;
  stepId?: string;
  stepName?: string;
  assigneeId?: string;
  assigneeName?: string;
  status?: string;
  orderIndex?: number;
  startedAt?: string;
  completedAt?: string;
  deadline?: string | null;
  notes?: string;
  evidences?: StaffTicketStepEvidence[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffTicketItem {
  id: string;
  ticketId?: string;
  description: string;
  imageUrl?: string;
  images?: string[];
  evidenceUrls?: string[];
  categoryId?: string;
  categoryName?: string;
  categories?: Array<{ categoryId: string; categoryName: string }>;
  subCategories?: Array<{
    id?: string;
    subCategoryId?: string;
    name?: string;
    subCategoryName?: string;
    description?: string;
    sla?: number;
    priority?: string;
  }>;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  priority?: string;
  dangerLevel?: 'SAFE' | 'CAUTION' | 'DANGEROUS' | 'CRITICAL';
  locationMethod?: 'AUTO_GPS' | 'MANUAL_ENTRY' | string;
  address?: string;
  province?: string;
  ward?: string;
  district?: string;
  latitude?: number;
  longitude?: number;
  status: string;
  reviewNote?: string;
  createdBy?: string;
  creatorFullName?: string;
  creatorPhoneNumber?: string;
  reporterName?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  reportedVia?: string;
  isAnonymous?: boolean;
  createdAt?: string;
  updatedAt?: string;
  steps?: StaffTicketStep[];
  deadline?: string | null;
  departmentId?: string;
  departmentName?: string;
  assigneeId?: string;
  assigneeName?: string;
  isLifeThreatening?: boolean;
  aiVerificationScore?: number;
  needsManualReview?: boolean;
  aiSeverity?: string;
  aiDangerLevel?: string;
}

export interface PageStaffTickets {
  totalPages: number;
  totalElements: number;
  size: number;
  content: StaffTicketItem[];
  number: number;
  first?: boolean;
  last?: boolean;
  empty?: boolean;
}

export interface RejectStaffTicketPayload {
  reason: string;
  suggestedCategoryId?: string;
  suggestedDepartmentId?: string;
}

export interface ForwardStaffTicketPayload {
  reason: string;
  suggestedCategoryId?: string;
  suggestedDepartmentId?: string;
}

export interface AssignStaffTicketPayload {
  assigneeId: string;
}

export interface UpdateStaffTicketStatusPayload {
  note?: string;
}

async function staffRequest<T>(
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

  if (options.body instanceof FormData) {
    delete headers['Content-Type'];
  }

  if (token && !headers.Authorization) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response: Response;
  try {
    response = await fetch(url, { ...options, headers });
  } catch (err: any) {
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối mạng.');
  }

  const payload = (await response.json().catch(() => null)) as any;
  let message = payload?.message || payload?.error || `Yêu cầu thất bại (${response.status})`;

  if (Array.isArray(payload?.errors) && payload.errors.length > 0) {
    const errorDetails = payload.errors
      .map((e: any) => (e.field ? `${e.field}: ${e.defaultMessage || e.message}` : e.defaultMessage || e.message || JSON.stringify(e)))
      .join(', ');
    message = `${message} [Chi tiết: ${errorDetails}]`;
  } else if (payload?.data && typeof payload.data === 'string') {
    message = `${message} (${payload.data})`;
  }

  if (!response.ok || (payload && payload.success === false)) {
    console.error(`[staffRequest Error] ${options.method || 'GET'} ${url} status=${response.status}`, {
      payload,
      message,
    });
    throw new ApiError(message, response.status, payload);
  }

  return (payload?.data !== undefined ? payload.data : (payload as any)) as T;
}

/**
 * 1. PUT /api/v1/staff/tickets/{id}/assign
 * Cán bộ xác nhận vé đúng chuyên môn và phân công cho nhân viên cụ thể
 */
export async function assignStaffTicket(
  ticketId: string,
  payload: AssignStaffTicketPayload
): Promise<StaffTicketItem> {
  return staffRequest<StaffTicketItem>(
    `/api/v1/staff/tickets/${encodeURIComponent(ticketId)}/assign`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * 2. PUT /api/v1/staff/tickets/{id}/forward
 * Chuyển giao vé sang phòng ban khác nếu không thuộc thẩm quyền xử lý hiện tại
 */
export async function forwardStaffTicket(
  ticketId: string,
  payload: ForwardStaffTicketPayload
): Promise<StaffTicketItem> {
  return staffRequest<StaffTicketItem>(
    `/api/v1/staff/tickets/${encodeURIComponent(ticketId)}/forward`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * 3. PUT /api/v1/staff/tickets/{id}/reject
 * Từ chối hồ sơ, chuyển trạng thái thành REJECTED kèm lý do
 */
export async function rejectStaffTicket(
  ticketId: string,
  payload: RejectStaffTicketPayload
): Promise<StaffTicketItem> {
  return staffRequest<StaffTicketItem>(
    `/api/v1/staff/tickets/${encodeURIComponent(ticketId)}/reject`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
    }
  );
}

/**
 * 4. PUT /api/v1/staff/tickets/{id}/status?targetStatus=...
 * Cập nhật trạng thái Ticket.
 * Path param {id}: ID của ticket (lấy từ ticket.id).
 * Query param targetStatus: INITIATED, OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, COMPLETED, REJECTED, CANCELLED.
 * Body (JSON): { stepId?: string, note?: string }
 * Lưu ý: trường "stepId" trong schema body là ID của bước xử lý trong vé (step.id).
 */
export async function updateStaffTicketStatus(
  ticketId: string,
  targetStatus: string,
  note?: string,
  stepId?: string
): Promise<StaffTicketItem> {
  const bodyPayload: Record<string, any> = {
    note: note || '',
  };
  if (stepId) {
    bodyPayload.stepId = stepId;
  }

  return staffRequest<StaffTicketItem>(
    `/api/v1/staff/tickets/${encodeURIComponent(ticketId)}/status?targetStatus=${encodeURIComponent(targetStatus)}`,
    {
      method: 'PUT',
      body: JSON.stringify(bodyPayload),
    }
  );
}

/**
 * 5. POST /api/v1/ticket-steps/{stepId}/evidences?resolutionNote=...
 * Đính kèm bằng chứng xử lý cho bước.
 * Upload nhiều files bằng chứng và kèm ghi chú cho một bước cụ thể.
 * Bước sẽ tự động chuyển sang RESOLVED khi upload thành công.
 */
export async function submitStaffEvidence(
  stepId: string,
  files: File[],
  resolutionNote?: string
): Promise<StaffTicketStepEvidence[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const query = resolutionNote ? `?resolutionNote=${encodeURIComponent(resolutionNote)}` : '';
  const res = await staffRequest<any>(
    `/api/v1/ticket-steps/${encodeURIComponent(stepId)}/evidences${query}`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

/**
 * Lấy danh sách các bước xử lý của một vé dành cho cán bộ
 * GET /api/v1/ticket-steps/ticket/{ticketId}
 */
export async function getStaffTicketSteps(ticketId: string): Promise<StaffTicketStep[]> {
  try {
    const res = await staffRequest<any>(
      `/api/v1/ticket-steps/ticket/${encodeURIComponent(ticketId)}`,
      { method: 'GET' }
    );
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  } catch (err: any) {
    if (err?.status === 404) {
      try {
        const fallback = await staffRequest<any>(
          `/api/v1/tickets/${encodeURIComponent(ticketId)}/steps`,
          { method: 'GET' }
        );
        if (Array.isArray(fallback)) return fallback;
        if (Array.isArray(fallback?.content)) return fallback.content;
        if (Array.isArray(fallback?.data)) return fallback.data;
      } catch {
        // Fallback failed
      }
    }
    return [];
  }
}

/**
 * 6. GET /api/v1/staff/tickets/assigned
 * Lấy danh sách vé được phân công cho phòng ban của cán bộ đang đăng nhập
 */
export async function getStaffAssignedTickets(params?: {
  status?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageStaffTickets> {
  const query = new URLSearchParams();
  if (params?.status && params.status !== 'all') {
    query.append('status', params.status);
  }
  if (params?.page !== undefined) query.append('page', params.page.toString());
  if (params?.size !== undefined) query.append('size', params.size.toString());
  if (params?.sort && params.sort.length > 0) {
    params.sort.forEach((s) => query.append('sort', s));
  }

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await staffRequest<any>(`/api/v1/staff/tickets/assigned${qs}`, {
    method: 'GET',
  });

  if (Array.isArray(res)) {
    return {
      content: res,
      totalPages: 1,
      totalElements: res.length,
      size: res.length,
      number: 0,
    };
  }

  return res as PageStaffTickets;
}
