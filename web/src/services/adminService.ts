import { APP_CONFIG } from '../config';
import { getAccessToken } from './auth';
import { Ticket, TicketHistory, Department, Severity, DangerLevel, StatusKey } from '../data';
import { getDepartments, DepartmentItem } from './departments';
import { getRoutingRules, RoutingRuleItem } from './routingRules';

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

// ── Admin Ticket & Detail DTOs (GET /api/v1/admin/tickets & /api/v1/admin/tickets/{id}) ──

export interface AdminTicketCategoryItem {
  categoryId: string;
  categoryName: string;
}

export interface AdminTicketSubCategoryItem {
  subCategoryId: string;
  name: string;
  priority?: string;
  sla?: number;
}

export interface AdminTicketStepItem {
  id: string;
  stepId: string;
  stepName: string;
  assigneeId?: string;
  assigneeName?: string;
  status: string;
  dependsOnStepIds?: string[];
  startedAt?: string;
  completedAt?: string;
  deadline?: string;
  notes?: string;
  evidences?: Array<{
    id?: string;
    imageUrl?: string;
    url?: string;
    notes?: string;
    createdAt?: string;
  }>;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminTicketHistoryItem {
  historyId: string;
  ticketId: string;
  actorId?: string;
  actorName?: string;
  actionType: string;
  previousStatus?: string;
  currentStatus?: string;
  actionNote?: string;
  createdAt: string;
}

export interface AdminTicketRatingItem {
  id: string;
  ticketId: string;
  userId?: string;
  userName?: string;
  userAvatar?: string;
  rate: number;
  isAnonymous?: boolean;
  feedback?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface AdminTicketItem {
  id: string;
  ticketId?: string;
  description: string;
  categories?: AdminTicketCategoryItem[];
  subCategories?: AdminTicketSubCategoryItem[];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  priorityReasoning?: string;
  locationMethod?: string;
  address?: string;
  province?: string;
  ward?: string;
  status: 'INITIATED' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | string;
  latitude?: number;
  longitude?: number;
  reviewNote?: string;
  isAnonymous?: boolean;
  isLifeThreatening?: boolean;
  needsManualReview?: boolean;
  createdBy?: string;
  creatorFullName?: string;
  creatorPhoneNumber?: string;
  imageUrls?: string[];
  createdAt: string;
  updatedAt?: string;
  steps?: AdminTicketStepItem[];
  deadline?: string;
  departmentId?: string;
  departmentName?: string;
  assigneeId?: string;
  assigneeName?: string;
}

export interface AdminTicketDetailResponse extends AdminTicketItem {
  creatorEmail?: string;
  upvoteCount?: number;
  histories?: AdminTicketHistoryItem[];
  ratings?: AdminTicketRatingItem[];
}

export interface AdminTicketFilterParams {
  keyword?: string;
  status?: string;
  priority?: string;
  categoryId?: string;
  subCategoryId?: string;
  departmentId?: string;
  unassigned?: boolean;
  province?: string;
  ward?: string;
  isLifeThreatening?: boolean;
  needsManualReview?: boolean;
  fromDate?: string;
  toDate?: string;
  page?: number;
  size?: number;
  sort?: string;
}

export interface AdminTicketPageResponse {
  content: AdminTicketItem[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
}

// ── Admin Dashboard Summary DTO (GET /api/v1/admin/dashboard/summary) ────────

export interface AdminDashboardSummaryResponse {
  ticketSummary: {
    totalTickets: number;
    initiatedTickets: number;
    assignedTickets: number;
    inProgressTickets: number;
    resolvedTickets: number;
    completedTickets: number;
    rejectedTickets: number;
    cancelledTickets: number;
    unassignedTickets: number;
    needsManualReviewTickets: number;
    lifeThreateningTickets: number;
    overdueTickets: number;
    overallResolutionRate: number;
    averageRating: number;
  };
  accountSummary: {
    totalUsers: number;
    activeUsers: number;
    blockedUsers: number;
    residentCount: number;
    staffCount: number;
    managerCount: number;
    adminCount: number;
  };
  configSummary: {
    totalDepartments: number;
    totalCategories: number;
    activeCategories: number;
    totalSubCategories: number;
    activeSubCategories: number;
    totalSteps: number;
    totalRoutingRules: number;
  };
  departmentSummaries: Array<{
    departmentId: string;
    departmentName: string;
    totalAssignedTickets: number;
    inProgressTickets: number;
    resolvedOrCompletedTickets: number;
    overdueTickets: number;
    resolutionRate: number;
  }>;
}

// ── Admin Analytics DTO (GET /api/v1/admin/analytics) ────────────────────────

export interface AdminAnalyticsParams {
  fromDate?: string;
  toDate?: string;
  groupBy?: 'DAY' | 'WEEK' | 'MONTH';
  province?: string;
  ward?: string;
  departmentId?: string;
  categoryId?: string;
}

export interface AdminAnalyticsResponse {
  overview: {
    totalTickets: number;
    resolvedOrCompletedTickets: number;
    inProgressTickets: number;
    overdueTickets: number;
    rejectedOrCancelledTickets: number;
    resolutionRate: number;
    onTimeResolutionRate: number;
    averageResolutionHours: number;
    averageRating: number;
  };
  timeSeries: Array<{
    period: string;
    totalCreated: number;
    resolvedOrCompleted: number;
    inProgress: number;
    rejectedOrCancelled: number;
  }>;
  geographicBreakdown: Array<{
    province: string;
    ward: string;
    totalTickets: number;
    resolvedOrCompletedTickets: number;
    inProgressTickets: number;
    overdueTickets: number;
    resolutionRate: number;
  }>;
  departmentBreakdown: Array<{
    departmentId: string;
    departmentName: string;
    totalTickets: number;
    resolvedOrCompletedTickets: number;
    inProgressTickets: number;
    overdueTickets: number;
    resolutionRate: number;
    onTimeRate: number;
    averageResolutionHours: number;
    averageRating: number;
  }>;
  categoryBreakdown: Array<{
    categoryId: string;
    categoryName: string;
    totalTickets: number;
    resolvedOrCompletedTickets: number;
    resolutionRate: number;
  }>;
  statusBreakdown: Record<string, number>;
  priorityBreakdown: Record<string, number>;
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

function buildQueryString(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      sp.append(key, String(value));
    }
  });
  const qs = sp.toString();
  return qs ? `?${qs}` : '';
}

// ── 1. GET /api/v1/admin/tickets — Tra cứu & Lọc hồ sơ toàn hệ thống ─────────
export async function getAdminTickets(
  params: AdminTicketFilterParams = {},
): Promise<AdminTicketPageResponse> {
  const query = buildQueryString(params as Record<string, unknown>);
  const res = await request<AdminTicketPageResponse | AdminTicketItem[]>(
    `/api/v1/admin/tickets${query}`,
  );
  const data = res?.data;
  if (!data) {
    return { content: [], totalElements: 0, totalPages: 0, size: params.size ?? 20, number: params.page ?? 0 };
  }
  if (Array.isArray(data)) {
    return {
      content: data,
      totalElements: data.length,
      totalPages: 1,
      size: data.length,
      number: 0,
    };
  }
  return {
    content: Array.isArray(data.content) ? data.content : [],
    totalElements: Number(data.totalElements ?? 0),
    totalPages: Number(data.totalPages ?? 0),
    size: Number(data.size ?? params.size ?? 20),
    number: Number(data.number ?? params.page ?? 0),
  };
}

// ── 2. GET /api/v1/admin/tickets/{id} — Xem chi tiết 1 hồ sơ (Read-only) ──────
export async function getAdminTicketDetail(
  ticketId: string,
): Promise<AdminTicketDetailResponse> {
  const res = await request<AdminTicketDetailResponse>(
    `/api/v1/admin/tickets/${encodeURIComponent(ticketId)}`,
  );
  return res.data;
}

// ── 3. GET /api/v1/admin/dashboard/summary — Tổng quan Quản trị Hệ thống ─────
export async function getAdminDashboardSummary(): Promise<AdminDashboardSummaryResponse> {
  const res = await request<AdminDashboardSummaryResponse>(
    '/api/v1/admin/dashboard/summary',
  );
  return res.data;
}

// ── 4. GET /api/v1/admin/analytics — Báo cáo & Thống kê Hệ thống ─────────────
export async function getAdminAnalytics(
  params: AdminAnalyticsParams = {},
): Promise<AdminAnalyticsResponse> {
  const query = buildQueryString(params as Record<string, unknown>);
  const res = await request<AdminAnalyticsResponse>(
    `/api/v1/admin/analytics${query}`,
  );
  return res.data;
}

// ── 5. GET /api/v1/admin/analytics/export — Xuất báo cáo CSV từ Backend ──────
export async function exportAdminAnalyticsCsv(
  params: AdminAnalyticsParams = {},
): Promise<string> {
  const token = getAccessToken();
  if (!token) {
    throw new Error('Không tìm thấy access token. Vui lòng đăng nhập lại.');
  }
  const query = buildQueryString({
    ...params,
    format: 'csv',
  });
  const response = await fetch(`${API_BASE_URL}/api/v1/admin/analytics/export${query}`, {
    method: 'GET',
    headers: {
      Accept: 'text/csv, application/json, */*',
      Authorization: `Bearer ${token}`,
    },
  });
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `Xuất báo cáo thất bại với mã ${response.status}`);
  }
  return response.text();
}

// ── Helper chuẩn hóa chuỗi tìm kiếm & địa bàn thực tế ────────────────────────
export function normalizeSearchText(str?: string | null): string {
  if (!str) return '';
  return String(str)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchesSearch(target: string | undefined | null, query: string): boolean {
  const qRaw = query.trim().toLowerCase().replace(/^#/, '');
  if (!qRaw) return true;
  if (!target) return false;
  const tRaw = String(target).toLowerCase();
  if (tRaw.includes(qRaw)) return true;
  const qNorm = normalizeSearchText(qRaw);
  const tNorm = normalizeSearchText(target);
  return Boolean(qNorm && tNorm.includes(qNorm));
}

export function normalizeLocationKey(val?: string | null): string {
  if (!val || val === 'ALL' || val === 'Chưa xác định') return '';
  const stripped = String(val)
    .replace(/^(TP\.|Tỉnh|Thành phố|Tp|Phường|Xã|Thị trấn|Đặc khu|P\.|X\.|TT\.)\s*/i, '')
    .trim();
  return normalizeSearchText(stripped);
}

export function matchesLocation(actual?: string | null, selected?: string | null): boolean {
  if (!selected || selected === 'ALL') return true;
  if (!actual || actual === 'Chưa xác định') return false;
  if (actual.trim().toLowerCase() === selected.trim().toLowerCase()) return true;
  const actKey = normalizeLocationKey(actual);
  const selKey = normalizeLocationKey(selected);
  if (!actKey || !selKey) return false;
  return actKey === selKey || actKey.includes(selKey) || selKey.includes(actKey);
}

// ── Helper chuyển đổi AdminTicketItem / AdminTicketDetailResponse sang UI Ticket ──
export function extractProvinceAndWard(
  address?: string,
  explicitProvince?: string,
  explicitWard?: string,
): { province: string; ward: string } {
  let province = (explicitProvince || '').trim();
  let ward = (explicitWard || '').trim();
  const addr = (address || '').trim();

  if ((!province || !ward) && addr) {
    let parts = addr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (parts.length > 1 && /^(việt nam|vietnam|vn)$/i.test(parts[parts.length - 1])) {
      parts = parts.slice(0, -1);
    }

    if (!province && parts.length >= 1) {
      province = parts[parts.length - 1];
    }

    if (!ward && parts.length >= 2) {
      const innerParts = parts.slice(0, -1);
      const explicitWardPart = innerParts.find((p) =>
        /^(Phường|Xã|Thị trấn|Đặc khu|P\.|X\.|TT\.)\s+/i.test(p),
      );
      if (explicitWardPart) {
        ward = explicitWardPart;
      } else if (parts.length >= 4) {
        ward = parts[parts.length - 3];
      } else if (parts.length === 3) {
        const middle = parts[1];
        ward = /^(Quận|Huyện|Thị xã|Thành phố|Q\.|H\.)\s+/i.test(middle) ? parts[0] : middle;
      } else {
        ward = parts[0];
      }
    }
  }

  return {
    province: province || 'Chưa xác định',
    ward: ward || 'Chưa xác định',
  };
}

export function mapAdminTicketToUiTicket(t: AdminTicketItem | AdminTicketDetailResponse): Ticket {
  const rawId = String(t.id || t.ticketId || '');
  const priorityStr = String(t.priority || t.subCategories?.[0]?.priority || 'MEDIUM').toUpperCase();
  const severity: Severity =
    priorityStr === 'CRITICAL' ? 'CRITICAL' :
    priorityStr === 'HIGH' ? 'HIGH' :
    priorityStr === 'LOW' ? 'LOW' : 'MEDIUM';

  const isSOS = Boolean(t.isLifeThreatening) || severity === 'CRITICAL';
  const dangerLevel: DangerLevel =
    isSOS ? 'CRITICAL' :
    severity === 'HIGH' ? 'DANGEROUS' :
    severity === 'MEDIUM' ? 'CAUTION' : 'SAFE';

  const rawStatus = String(t.status || 'INITIATED').toUpperCase();
  const validStatuses: StatusKey[] = [
    'INITIATED', 'PENDING_REVIEW', 'OPEN', 'ASSIGNED',
    'IN_PROGRESS', 'RESOLVED', 'COMPLETED', 'REJECTED', 'CANCELLED',
  ];
  const status: StatusKey = (validStatuses.includes(rawStatus as StatusKey) ? rawStatus : 'INITIATED') as StatusKey;

  const firstCat = t.categories?.[0];
  const firstSubCat = t.subCategories?.[0];
  const categoryId = String(firstCat?.categoryId || firstSubCat?.subCategoryId || '');
  const categoryName = firstCat?.categoryName || firstSubCat?.name || 'Chưa phân loại';
  const subCategoryName = firstSubCat?.name;

  const { province, ward } = extractProvinceAndWard(t.address, t.province, t.ward);

  const images = Array.isArray(t.imageUrls) ? t.imageUrls.filter(Boolean) : [];
  const stepEvidenceUrls: string[] = [];
  if (Array.isArray(t.steps)) {
    for (const s of t.steps) {
      if (Array.isArray(s.evidences)) {
        for (const ev of s.evidences) {
          const u = ev?.imageUrl || ev?.url;
          if (u) stepEvidenceUrls.push(u);
        }
      }
    }
  }

  const detail = t as AdminTicketDetailResponse;
  const avgRate =
    Array.isArray(detail.ratings) && detail.ratings.length > 0
      ? Math.round((detail.ratings.reduce((sum, r) => sum + (Number(r.rate) || 0), 0) / detail.ratings.length) * 10) / 10
      : undefined;

  return {
    ticketId: rawId,
    rawId,
    userId: String(t.createdBy || ''),
    departmentId: String(t.departmentId || ''),
    departmentName: t.departmentName || (t.departmentId ? String(t.departmentId) : 'Chưa phân tuyến'),
    categoryId,
    categoryName,
    subCategoryName,
    assigneeId: t.assigneeId ? String(t.assigneeId) : undefined,
    assigneeName: t.assigneeName || undefined,
    description: t.description || '(Không có mô tả)',
    severity,
    dangerLevel,
    locationMethod: String(t.locationMethod || '').toUpperCase() === 'MANUAL_ENTRY' ? 'MANUAL_ENTRY' : 'AUTO_GPS',
    location: {
      lat: Number(t.latitude ?? 10.7769),
      lng: Number(t.longitude ?? 106.7009),
    },
    address: t.address || 'Chưa cập nhật địa chỉ',
    province,
    ward,
    status,
    createdAt: t.createdAt
      ? new Date(t.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
      : '',
    updatedAt: t.updatedAt
      ? new Date(t.updatedAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
      : t.createdAt
      ? new Date(t.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
      : '',
    isLifeThreatening: isSOS,
    needsManualReview: Boolean(t.needsManualReview),
    reporterName: t.isAnonymous ? 'Người dân ẩn danh' : (t.creatorFullName || 'Người dân'),
    reporterPhone: t.isAnonymous ? 'Ẩn danh' : (t.creatorPhoneNumber || '—'),
    reporterEmail: detail.creatorEmail || undefined,
    reportedVia: 'Ứng dụng CityFix',
    imageUrl: images[0],
    evidenceUrls: stepEvidenceUrls.length > 0 ? stepEvidenceUrls : images.slice(1),
    deadline: t.deadline
      ? new Date(t.deadline).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' })
      : undefined,
    feedbackRating: avgRate,
  };
}

export function mapAdminHistoryToUiHistory(
  histories: AdminTicketHistoryItem[] = [],
  fallbackTicketId = '',
): TicketHistory[] {
  return histories.map((h) => {
    const rawAction = String(h.actionType || '').toUpperCase();
    const validActions: TicketHistory['action'][] = [
      'CREATED', 'AI_REVIEWED', 'MANUAL_APPROVED', 'ROUTED',
      'ASSIGNED', 'REASSIGNED', 'REROUTED', 'WORK_STARTED',
      'EVIDENCE_SUBMITTED', 'CLOSED',
    ];
    let action: TicketHistory['action'] = 'MANUAL_APPROVED';
    if (validActions.includes(rawAction as TicketHistory['action'])) {
      action = rawAction as TicketHistory['action'];
    } else if (rawAction.includes('CREATE')) {
      action = 'CREATED';
    } else if (rawAction.includes('ASSIGN')) {
      action = 'ASSIGNED';
    } else if (rawAction.includes('START') || rawAction.includes('PROGRESS')) {
      action = 'WORK_STARTED';
    } else if (rawAction.includes('EVIDENCE') || rawAction.includes('RESOLVE')) {
      action = 'EVIDENCE_SUBMITTED';
    } else if (rawAction.includes('COMPLETE') || rawAction.includes('CLOSE') || rawAction.includes('REJECT')) {
      action = 'CLOSED';
    }

    const statusTransition =
      h.previousStatus || h.currentStatus
        ? ` (${h.previousStatus || '—'} → ${h.currentStatus || '—'})`
        : '';

    return {
      ticketId: String(h.ticketId || fallbackTicketId),
      action,
      actor: h.actorName || 'Hệ thống',
      note: (h.actionNote || `Cập nhật trạng thái${statusTransition}`).trim(),
      time: h.createdAt
        ? new Date(h.createdAt).toLocaleString('vi-VN', {
            hour: '2-digit',
            minute: '2-digit',
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
          })
        : '—',
    };
  });
}

// ── Quản lý Quy trình Xử lý (Steps) ──────────────────────────────────────────

export interface SystemLocationPair {
  province: string;
  ward: string;
}

export async function fetchSystemLocationsForAdmin(): Promise<SystemLocationPair[]> {
  try {
    const [analyticsRes, routingRes, ticketsRes] = await Promise.all([
      getAdminAnalytics({ groupBy: 'MONTH' }).catch(() => null),
      getRoutingRules({ page: 0, size: 200 }).catch(() => null),
      getAdminTickets({ page: 0, size: 100, sort: 'createdAt,desc' }).catch(() => null),
    ]);

    const rawPairs: SystemLocationPair[] = [];

    if (Array.isArray(analyticsRes?.geographicBreakdown)) {
      analyticsRes.geographicBreakdown.forEach((g) => {
        const p = (g.province || '').trim();
        const w = (g.ward || '').trim();
        if (p && p !== 'Chưa xác định') {
          rawPairs.push({
            province: p,
            ward: w && w !== 'Chưa xác định' ? w : '',
          });
        }
      });
    }

    const rulesList: RoutingRuleItem[] = Array.isArray(routingRes)
      ? routingRes
      : Array.isArray(routingRes?.content)
      ? routingRes.content
      : [];
    rulesList.forEach((r) => {
      const p = (r.province || '').trim();
      const w = (r.ward || '').trim();
      if (p && p !== 'Chưa xác định') {
        rawPairs.push({
          province: p,
          ward: w && w !== 'Chưa xác định' ? w : '',
        });
      }
    });

    if (Array.isArray(ticketsRes?.content)) {
      ticketsRes.content.forEach((t) => {
        const { province, ward } = extractProvinceAndWard(t.address, t.province, t.ward);
        if (province && province !== 'Chưa xác định') {
          rawPairs.push({
            province,
            ward: ward && ward !== 'Chưa xác định' ? ward : '',
          });
        }
      });
    }

    // Chuẩn hóa & gộp các tên Tỉnh/TP hoặc Phường/Xã trùng nhau (ưu tiên bản có dấu tiếng Việt)
    const canonicalProvinceByKey = new Map<string, string>();
    const hasDiacritic = (s: string) => /[^\u0000-\u007f]/.test(s);

    rawPairs.forEach(({ province }) => {
      const pKey = normalizeLocationKey(province);
      if (!pKey) return;
      const existing = canonicalProvinceByKey.get(pKey);
      if (!existing || (!hasDiacritic(existing) && hasDiacritic(province))) {
        canonicalProvinceByKey.set(pKey, province);
      }
    });

    const canonicalWardByKey = new Map<string, string>();
    rawPairs.forEach(({ province, ward }) => {
      if (!ward) return;
      const pKey = normalizeLocationKey(province);
      const wKey = normalizeLocationKey(ward);
      if (!pKey || !wKey) return;
      const compKey = `${pKey}__${wKey}`;
      const existing = canonicalWardByKey.get(compKey);
      if (!existing || (!hasDiacritic(existing) && hasDiacritic(ward))) {
        canonicalWardByKey.set(compKey, ward);
      }
    });

    const uniqueMap = new Map<string, SystemLocationPair>();
    rawPairs.forEach(({ province, ward }) => {
      const pKey = normalizeLocationKey(province);
      if (!pKey) return;
      const canonProv = canonicalProvinceByKey.get(pKey) || province;
      const wKey = ward ? normalizeLocationKey(ward) : '';
      const canonWard = wKey ? canonicalWardByKey.get(`${pKey}__${wKey}`) || ward : '';
      const pairKey = `${pKey}__${wKey}`;
      if (!uniqueMap.has(pairKey)) {
        uniqueMap.set(pairKey, { province: canonProv, ward: canonWard });
      }
    });

    return Array.from(uniqueMap.values());
  } catch {
    return [];
  }
}

export async function fetchAllDepartmentsForAdmin(): Promise<Department[]> {
  try {
    const res = await getDepartments({ page: 0, size: 100 });
    const list: DepartmentItem[] = Array.isArray(res)
      ? res
      : Array.isArray(res?.content)
      ? res.content
      : [];
    return list.map((d) => ({
      departmentId: String(d.departmentId || ''),
      name: d.name || '',
      level: d.level === 'WARD' ? 'WARD' : 'CITY',
      contactEmail: d.contactEmail || '',
      phoneNumber: d.phoneNumber || '',
    }));
  } catch {
    return [];
  }
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
