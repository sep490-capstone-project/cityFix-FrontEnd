import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface TicketStepEvidence {
  evidenceId: string;
  ticketStepId: string;
  imageUrl: string;
  resolutionNote?: string;
  staffName?: string;
  createdAt: string;
}

export interface TicketStep {
  id?: string;
  stepId?: string;
  stepName?: string;
  assigneeId?: string;
  assigneeName?: string;
  status?: string;
  orderIndex?: number;
  dependsOnStepIds?: string[];
  startedAt?: string;
  completedAt?: string;
  deadline?: string | null;
  notes?: string;
  evidences?: TicketStepEvidence[];
  createdAt?: string;
  updatedAt?: string;
}

export interface StepReadiness {
  assigneeName: string;
  canDoNow: boolean;
  hasDependencies: boolean;
  isAllDependenciesDone: boolean;
  pendingDependencies: Array<{
    id: string;
    name: string;
    status: string;
  }>;
  totalDependenciesCount: number;
}

/**
 * Kiểm tra xem bước có thể làm ngay tức thì hay phải chờ bước phụ thuộc
 */
export function checkStepReadiness(
  st: TicketStep | any,
  allSteps: any[] = []
): StepReadiness {
  const anySt = st as any;
  const assigneeName =
    st.assigneeName ||
    anySt.assignee?.fullName ||
    anySt.assignee?.name ||
    anySt.staffName ||
    anySt.staff?.fullName ||
    anySt.user?.fullName ||
    anySt.handlerName ||
    'Chưa phân công';

  const depIds: string[] = Array.isArray(st.dependsOnStepIds)
    ? st.dependsOnStepIds.filter(Boolean)
    : [];

  if (depIds.length === 0) {
    return {
      assigneeName,
      canDoNow: true,
      hasDependencies: false,
      isAllDependenciesDone: true,
      pendingDependencies: [],
      totalDependenciesCount: 0,
    };
  }

  const pendingDependencies: Array<{ id: string; name: string; status: string }> = [];

  for (const depId of depIds) {
    const parent = allSteps.find(
      (s) =>
        (s.id && s.id === depId) ||
        (s.stepId && s.stepId === depId) ||
        ((s as any).ticketStepId && (s as any).ticketStepId === depId)
    );

    const isFinished = parent
      ? parent.status === 'COMPLETED' || parent.status === 'RESOLVED'
      : false;

    if (!isFinished) {
      pendingDependencies.push({
        id: depId,
        name:
          parent?.stepName ||
          (parent as any)?.name ||
          (parent as any)?.title ||
          `Bước [${depId.slice(0, 8)}]`,
        status: parent?.status || 'PENDING',
      });
    }
  }

  const isAllDependenciesDone = pendingDependencies.length === 0;

  return {
    assigneeName,
    canDoNow: isAllDependenciesDone,
    hasDependencies: true,
    isAllDependenciesDone,
    pendingDependencies,
    totalDependenciesCount: depIds.length,
  };
}

export interface ManagerTicketRoute {
  subCategoryId: string;
  departmentId: string;
}

export interface ReviewStepItemPayload {
  stepId: string;
  assigneeId: string;
  dependsOnStepIds?: string[];
  notes?: string;
  stepName?: string;
  name?: string;
  title?: string;
  stepTitle?: string;
  duration?: number;
  deadline?: string | null;
}

export interface ReviewTicketPayload {
  isLifeThreatening?: boolean;
  reviewNote?: string;
  subCategoryIds?: string[];
  steps?: ReviewStepItemPayload[];
  categoryId?: string;
  targetDepartmentId?: string;
  departmentIds?: string[];
  routes?: ManagerTicketRoute[];
}

export interface DepartmentStaffUser {
  userId?: string;
  id?: string;
  email: string;
  fullName: string;
  phoneNumber?: string;
  phone?: string;
  province?: string;
  ward?: string;
  address?: string;
  roleId?: string;
  role?: string;
  departmentId?: string;
  departmentName?: string;
  status?: string;
  createdAt?: string;
}

export interface ManagerDepartment {
  departmentId: string;
  id?: string;
  name: string;
  level?: string;
  contactEmail?: string;
  phoneNumber?: string;
  officerCount?: number;
  isActive?: boolean;
  users?: DepartmentStaffUser[];
  staffs?: DepartmentStaffUser[];
  officers?: DepartmentStaffUser[];
  members?: DepartmentStaffUser[];
  employees?: DepartmentStaffUser[];
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

export interface UpdateStepDependenciesPayload {
  dependsOnStepIds: string[];
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
  images?: string[];
  categoryId?: string;
  categoryName?: string;
  subCategoryId?: string;
  subCategoryName?: string;
  subCategories?: Array<{ id?: string; subCategoryId?: string; name?: string; subCategoryName?: string; description?: string; sla?: number; priority?: string; active?: boolean }>;
  categories?: Array<{ categoryId: string; categoryName: string }>;
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
  creatorFullName?: string;
  creatorPhoneNumber?: string;
  createdAt?: string;
  steps?: TicketStep[];
  deadline?: string | null;
  departmentId?: string;
  departmentName?: string;
  assigneeId?: string;
  assigneeName?: string;
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

  // Tránh ghi đè Content-Type khi gửi FormData để trình duyệt tự thêm boundary
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
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra mạng.');
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
    console.error(`[managerRequest Error] ${options.method || 'GET'} ${url} status=${response.status}`, {
      payload,
      message,
    });
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
  deadline: string | { deadline: string },
  altStepId?: string
): Promise<TicketStep> {
  let deadlineStr = typeof deadline === 'string' ? deadline : deadline.deadline;
  if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(deadlineStr.trim())) {
    deadlineStr = `${deadlineStr.trim()}:00`;
  }
  const bodyData = { deadline: deadlineStr.trim() };
  try {
    return await managerRequest<TicketStep>(
      `/api/v1/manager/tickets/steps/${encodeURIComponent(stepId)}/deadline`,
      {
        method: 'PUT',
        body: JSON.stringify(bodyData),
      }
    );
  } catch (err: any) {
    if (err?.status === 404 && altStepId && altStepId !== stepId) {
      return await managerRequest<TicketStep>(
        `/api/v1/manager/tickets/steps/${encodeURIComponent(altStepId)}/deadline`,
        {
          method: 'PUT',
          body: JSON.stringify(bodyData),
        }
      );
    }
    throw err;
  }
}

/**
 * 2. Cập nhật danh sách bước phụ thuộc (DAG dependencies) cho bước xử lý
 * PUT /api/v1/manager/tickets/steps/{stepId}/dependencies
 */
export async function updateStepDependencies(
  stepId: string,
  payload: UpdateStepDependenciesPayload
): Promise<TicketStep> {
  return managerRequest<TicketStep>(
    `/api/v1/manager/tickets/steps/${encodeURIComponent(stepId)}/dependencies`,
    {
      method: 'PUT',
      body: JSON.stringify(payload),
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
  try {
    return await managerRequest<ManagerTicketItem>(
      `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/reject`,
      {
        method: 'PUT',
        body: JSON.stringify(payload),
      }
    );
  } catch (err: any) {
    if (err?.status === 404) {
      return await managerRequest<ManagerTicketItem>(
        `/api/v1/admin/tickets/${encodeURIComponent(ticketId)}/reject`,
        {
          method: 'PUT',
          body: JSON.stringify(payload),
        }
      );
    }
    throw err;
  }
}

/**
 * 4. Duyệt vé và định tuyến
 * PUT /api/v1/manager/tickets/{id}/review hoặc PUT /api/v1/admin/tickets/{id}/review
 */
export async function reviewManagerTicket(
  ticketId: string,
  payload: ReviewTicketPayload
): Promise<ManagerTicketItem> {
  const cleanBody = {
    isLifeThreatening: Boolean(payload.isLifeThreatening),
    reviewNote: payload.reviewNote?.trim() || 'Đã tiếp nhận và giao các cán bộ phụ trách xử lý khẩn cấp',
    subCategoryIds: payload.subCategoryIds || [],
    steps: (payload.steps || []).map((s) => {
      const sName = s.stepName?.trim() || (s as any).name?.trim() || (s as any).title?.trim() || undefined;
      return {
        stepId: s.stepId,
        assigneeId: s.assigneeId,
        dependsOnStepIds: Array.isArray(s.dependsOnStepIds) ? s.dependsOnStepIds : [],
        deadline: s.deadline ? s.deadline : null,
        notes: s.notes?.trim() || sName || 'Tiến hành xử lý theo quy trình',
      };
    }),
  };

  console.log(`[reviewManagerTicket] PUT /api/v1/manager/tickets/${ticketId}/review:`, cleanBody);

  try {
    return await managerRequest<ManagerTicketItem>(
      `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/review`,
      {
        method: 'PUT',
        body: JSON.stringify(cleanBody),
      }
    );
  } catch (err: any) {
    if (err?.status === 404) {
      return await managerRequest<ManagerTicketItem>(
        `/api/v1/admin/tickets/${encodeURIComponent(ticketId)}/review`,
        {
          method: 'PUT',
          body: JSON.stringify(cleanBody),
        }
      );
    }
    throw err;
  }
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
  let res: any;
  try {
    res = await managerRequest<any>(`/api/v1/manager/tickets/initiated${qs}`, {
      method: 'GET',
    });
  } catch (err: any) {
    if (err?.status === 404) {
      res = await managerRequest<any>(`/api/v1/admin/tickets/initiated${qs}`, {
        method: 'GET',
      });
    } else {
      throw err;
    }
  }

  if (Array.isArray(res)) {
    return {
      content: res,
      totalPages: 1,
      totalElements: res.length,
      size: res.length,
      number: 0,
    };
  }
  return res as PageManagerTickets;
}

/**
 * 8. Gợi ý phòng ban cho vé
 * GET /api/v1/manager/tickets/{id}/suggested-departments hoặc GET /api/v1/admin/tickets/{id}/suggested-departments
 */
export async function getSuggestedDepartments(
  ticketId: string,
  categoryId?: string
): Promise<SuggestedDepartment[]> {
  const query = new URLSearchParams();
  if (categoryId) query.append('categoryId', categoryId);
  const qs = query.toString() ? `?${query.toString()}` : '';

  try {
    return await managerRequest<SuggestedDepartment[]>(
      `/api/v1/manager/tickets/${encodeURIComponent(ticketId)}/suggested-departments${qs}`,
      {
        method: 'GET',
      }
    );
  } catch (err: any) {
    if (err?.status === 404) {
      return await managerRequest<SuggestedDepartment[]>(
        `/api/v1/admin/tickets/${encodeURIComponent(ticketId)}/suggested-departments${qs}`,
        {
          method: 'GET',
        }
      );
    }
    throw err;
  }
}

/**
 * 9. Lấy danh sách toàn bộ phòng ban và nhân sự cho Manager
 * GET /api/v1/manager/tickets/departments
 */
export async function getManagerDepartments(): Promise<ManagerDepartment[]> {
  try {
    const res = await managerRequest<any>('/api/v1/manager/tickets/departments', {
      method: 'GET',
    });
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  } catch (err: any) {
    if (err?.status === 404) {
      // Fallback nếu môi trường cũ dùng /api/v1/manager/departments hoặc /api/v1/departments
      try {
        const fallback = await managerRequest<any>('/api/v1/manager/departments', { method: 'GET' });
        if (Array.isArray(fallback)) return fallback;
        if (Array.isArray(fallback?.content)) return fallback.content;
        if (Array.isArray(fallback?.data)) return fallback.data;
      } catch {
        const res = await managerRequest<any>('/api/v1/departments', {
          method: 'GET',
        });
        if (Array.isArray(res)) return res;
        if (Array.isArray(res?.content)) return res.content;
        if (Array.isArray(res?.data)) return res.data;
      }
      return [];
    }
    throw err;
  }
}

/**
 * 10. Xem danh sách nhân sự của một phòng ban
 * GET /api/v1/departments/{id}/users (Quyền ADMIN, MANAGER)
 */
export async function getDepartmentUsers(departmentId: string): Promise<DepartmentStaffUser[]> {
  try {
    const res = await managerRequest<any>(
      `/api/v1/departments/${encodeURIComponent(departmentId)}/users`,
      {
        method: 'GET',
      }
    );
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  } catch (err) {
    console.warn(`Lỗi khi tải users của phòng ban ${departmentId}:`, err);
    return [];
  }
}

/**
 * 11. Gán danh sách nhân sự vào phòng ban
 * POST /api/v1/departments/{id}/users (Quyền ADMIN)
 */
export async function addDepartmentUsers(
  departmentId: string,
  userIds: string[]
): Promise<any> {
  return managerRequest<any>(
    `/api/v1/departments/${encodeURIComponent(departmentId)}/users`,
    {
      method: 'POST',
      body: JSON.stringify({ userIds }),
    }
  );
}

/**
 * 12. Xóa nhân sự khỏi phòng ban
 * DELETE /api/v1/departments/{id}/users/{userId} (Quyền ADMIN)
 */
export async function removeDepartmentUser(
  departmentId: string,
  userId: string
): Promise<void> {
  await managerRequest<void>(
    `/api/v1/departments/${encodeURIComponent(departmentId)}/users/${encodeURIComponent(userId)}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * 13. Lấy danh sách quy trình các bước của subcategory
 * GET /api/v1/admin/steps/sub-category/{subCategoryId}
 */
export async function getStepsBySubCategory(
  subCategoryId: string
): Promise<Array<{
  stepId: string;
  subCategoryId: string;
  stepName: string;
  description: string;
  duration: number;
}>> {
  try {
    const res = await managerRequest<any>(
      `/api/v1/admin/steps/sub-category/${encodeURIComponent(subCategoryId)}`,
      {
        method: 'GET',
      }
    );
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.content)) return res.content;
    if (Array.isArray(res?.data)) return res.data;
    return [];
  } catch (err: any) {
    try {
      const fallback = await managerRequest<any>(
        `/api/v1/steps/sub-category/${encodeURIComponent(subCategoryId)}`,
        { method: 'GET' }
      );
      if (Array.isArray(fallback)) return fallback;
      if (Array.isArray(fallback?.content)) return fallback.content;
      if (Array.isArray(fallback?.data)) return fallback.data;
    } catch {
      // Ignored
    }
    console.warn(`Lỗi khi tải quy trình của subcategory ${subCategoryId}:`, err);
    return [];
  }
}

/**
 * 14. Cập nhật trạng thái một bước xử lý (Manager duyệt hoặc yêu cầu xử lý lại)
 * PUT /api/v1/manager/tickets/steps/{stepId}/status?status=COMPLETED|IN_PROGRESS
 * Lưu ý: stepId trong path là id của bước trong ticket (st.id), KHÔNG dùng stepId (template)
 */
export async function updateTicketStepStatus(
  stepId: string,
  status: string
): Promise<TicketStep> {
  return managerRequest<TicketStep>(
    `/api/v1/manager/tickets/steps/${encodeURIComponent(stepId)}/status?status=${encodeURIComponent(status)}`,
    {
      method: 'PUT',
    }
  );
}

/**
 * 15. Xóa mềm một bước xử lý
 * DELETE /api/v1/ticket-steps/{id}
 */
export async function deleteTicketStep(
  id: string
): Promise<void> {
  await managerRequest<void>(
    `/api/v1/ticket-steps/${encodeURIComponent(id)}`,
    {
      method: 'DELETE',
    }
  );
}

/**
 * 16. Lấy danh sách các bước xử lý của một vé
 * GET /api/v1/ticket-steps/ticket/{ticketId} (hoặc fallback GET /api/v1/tickets/{ticketId}/steps)
 */
export async function getTicketSteps(ticketId: string): Promise<TicketStep[]> {
  try {
    const res = await managerRequest<any>(
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
        const fallback = await managerRequest<any>(
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
    console.warn(`Lỗi khi tải danh sách bước xử lý của vé ${ticketId}:`, err);
    return [];
  }
}

/**
 * 17. Lấy thông tin chi tiết một vé theo ID
 * GET /api/v1/tickets/{ticketId}
 * Có fallback sang GET /api/v1/manager/tickets nếu backend chưa có endpoint riêng
 */
export async function getTicketById(ticketId: string): Promise<ManagerTicketItem> {
  try {
    return await managerRequest<ManagerTicketItem>(
      `/api/v1/tickets/${encodeURIComponent(ticketId)}`,
      { method: 'GET' }
    );
  } catch (err: any) {
    try {
      const page = await getManagerTickets({ size: 100 });
      const found = page.content?.find((t) => (t.id || t.ticketId) === ticketId);
      if (found) return found;
    } catch {
      // Fallback failed
    }
    throw err;
  }
}

/**
 * 18. Upload bằng chứng xử lý cho bước
 * POST /api/v1/ticket-steps/{stepId}/evidences?resolutionNote=...
 * Body: FormData (files)
 * Tự động chuyển bước sang RESOLVED theo mô tả backend
 */
export async function uploadStepEvidence(
  stepId: string,
  files: File[],
  resolutionNote?: string
): Promise<TicketStepEvidence[]> {
  const formData = new FormData();
  files.forEach((file) => {
    formData.append('files', file);
  });

  const query = resolutionNote ? `?resolutionNote=${encodeURIComponent(resolutionNote)}` : '';
  const res = await managerRequest<any>(
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
 * 19. Lấy toàn bộ vé có người xử lý thuộc phòng ban của Manager
 * GET /api/v1/manager/tickets
 * Trả về danh sách phân trang toàn bộ thông tin vé và tất cả các bước xử lý (ticket steps)
 */
export async function getManagerTickets(params?: {
  departmentId?: string;
  page?: number;
  size?: number;
  sort?: string[];
}): Promise<PageManagerTickets> {
  const query = new URLSearchParams();
  if (params?.departmentId) query.append('departmentId', params.departmentId);
  if (params?.page !== undefined) query.append('page', params.page.toString());
  if (params?.size !== undefined) query.append('size', params.size.toString());
  if (params?.sort && params.sort.length > 0) {
    params.sort.forEach((s) => query.append('sort', s));
  }

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await managerRequest<any>(`/api/v1/manager/tickets${qs}`, {
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
  return res as PageManagerTickets;
}

/**
 * 20. Lấy danh sách vé đang ở trạng thái RESOLVED kèm toàn bộ Ticket Step
 * GET /api/v1/manager/tickets/resolved
 */
export async function getManagerResolvedTickets(params?: {
  page?: number;
  size?: number;
}): Promise<PageManagerTickets> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.append('page', params.page.toString());
  if (params?.size !== undefined) query.append('size', params.size.toString());

  const qs = query.toString() ? `?${query.toString()}` : '';
  const res = await managerRequest<any>(`/api/v1/manager/tickets/resolved${qs}`, {
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
  return res as PageManagerTickets;
}
