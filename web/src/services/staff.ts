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
 * 4. PUT /api/v1/staff/tickets/{id}/status
 * Cập nhật trạng thái Ticket (targetStatus query, note body)
 * targetStatus: INITIATED, OPEN, ASSIGNED, IN_PROGRESS, RESOLVED, COMPLETED, REJECTED, CANCELLED
 */
export async function updateStaffTicketStatus(
  ticketId: string,
  targetStatus: string,
  note?: string
): Promise<StaffTicketItem> {
  return staffRequest<StaffTicketItem>(
    `/api/v1/staff/tickets/${encodeURIComponent(ticketId)}/status?targetStatus=${encodeURIComponent(targetStatus)}`,
    {
      method: 'PUT',
      body: JSON.stringify({ note: note || '' }),
    }
  );
}

/**
 * 5. POST /api/v1/staff/tickets/{id}/evidences
 * Upload nhiều file (hình ảnh, video) kèm ghi chú kết quả xử lý
 * Hỗ trợ fallback sang POST /api/v1/ticket-steps/{stepId}/evidences nếu backend yêu cầu step
 */
export async function submitStaffEvidence(
  ticketId: string,
  files: File[],
  resolutionNote?: string,
  stepId?: string
): Promise<StaffTicketStepEvidence[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });
  if (resolutionNote) {
    formData.append('resolutionNote', resolutionNote);
  }
  if (stepId) {
    formData.append('stepId', stepId);
  }

  const query = new URLSearchParams();
  if (resolutionNote) query.append('resolutionNote', resolutionNote);
  if (stepId) query.append('stepId', stepId);

  const qs = query.toString() ? `?${query.toString()}` : '';

  // 1. Thử gọi API chính: POST /api/v1/staff/tickets/{ticketId}/evidences?stepId=...
  try {
    const res = await staffRequest<any>(
      `/api/v1/staff/tickets/${encodeURIComponent(ticketId)}/evidences${qs}`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  } catch (err: any) {
    console.warn('[submitStaffEvidence] Thử endpoint chính gặp lỗi:', err);

    // 2. Nếu có stepId, thử gọi POST /api/v1/ticket-steps/{stepId}/evidences (endpoint chuyên dụng cho bước)
    if (stepId && stepId !== ticketId) {
      try {
        const queryWithNote = resolutionNote ? `?resolutionNote=${encodeURIComponent(resolutionNote)}` : '';
        const resStep = await staffRequest<any>(
          `/api/v1/ticket-steps/${encodeURIComponent(stepId)}/evidences${queryWithNote}`,
          {
            method: 'POST',
            body: formData,
          }
        );
        if (Array.isArray(resStep)) return resStep;
        if (Array.isArray(resStep?.data)) return resStep.data;
        return [];
      } catch (stepErr) {
        console.warn('[submitStaffEvidence] Fallback /ticket-steps/{stepId}/evidences gặp lỗi:', stepErr);
      }
    }

    throw err;
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
