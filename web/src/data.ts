export type StatusKey = 'INITIATED' | 'PENDING_REVIEW' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DangerLevel = 'SAFE' | 'CAUTION' | 'DANGEROUS' | 'CRITICAL';
export type Role = 'RESIDENT' | 'STAFF' | 'MANAGER' | 'ADMIN';
export type DeptLevel = 'CITY' | 'WARD';

export interface Ticket {
  ticketId: string;
  rawId?: string;
  userId: string;
  departmentId: string;
  departmentName?: string;
  categoryId: string;
  categoryName?: string;
  subCategoryName?: string;
  assigneeId?: string;
  assigneeName?: string;
  description: string;
  severity: Severity;
  dangerLevel: DangerLevel;
  locationMethod: 'AUTO_GPS' | 'MANUAL_ENTRY';
  location: { lat: number; lng: number };
  address: string;
  province: string;
  ward: string;
  status: StatusKey;
  createdAt: string;
  updatedAt: string;
  isLifeThreatening: boolean;
  needsManualReview: boolean;
  aiConfidence?: number;
  aiCategory?: string;
  aiSeverity?: Severity;
  aiDangerLevel?: DangerLevel;
  aiVerificationScore?: number;
  reporterName?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  reportedVia?: string;
  imageUrl?: string;
  evidenceUrls?: string[];
  deadline?: string;
  isRepeatIssue?: boolean;
  repeatCount?: number;
  feedbackRating?: number;
  unsatisfiedRate?: number;
}

export interface TicketHistory {
  ticketId: string;
  action: 'CREATED' | 'AI_REVIEWED' | 'MANUAL_APPROVED' | 'ROUTED' | 'ASSIGNED' | 'REASSIGNED' | 'REROUTED' | 'WORK_STARTED' | 'EVIDENCE_SUBMITTED' | 'CLOSED';
  actor: string;
  note: string;
  time: string;
}

export interface User {
  userId: string;
  fullName: string;
  email: string;
  phoneNumber: string;
  province: string;
  ward: string;
  address: string;
  role: Role;
  status: 'ACTIVE' | 'BLOCKED';
  departmentId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Department {
  departmentId: string;
  level: DeptLevel;
  name: string;
  contactEmail: string;
  phoneNumber: string;
}

export interface Category {
  categoryId: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface RoutingRule {
  ruleId: string;
  departmentId: string;
  categoryId: string;
  province: string;
  ward: string;
}

// ── Không sử dụng dữ liệu mẫu (Mock Data đã được loại bỏ hoàn toàn) ────────────
export const PROVINCE_WARDS: Record<string, string[]> = {};
export const DEPARTMENTS: Department[] = [];
export const CATEGORIES: Category[] = [];
export const ROUTING_RULES: RoutingRule[] = [];
export const TICKETS: Ticket[] = [];
export const TICKET_HISTORY: Record<string, TicketHistory[]> = {};
export const USERS: User[] = [];

// ── Status & Semantic Badge Config (Unified Brand Palette) ───────────────────
export const STATUS_MAP: Record<string, { label: string; cls: string; dot: string }> = {
  INITIATED:      { label: 'Chờ duyệt',      cls: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
  PENDING_REVIEW: { label: 'Chờ xét duyệt',  cls: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
  PENDING:        { label: 'Chờ xử lý',      cls: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
  OPEN:           { label: 'Đã tiếp nhận',   cls: 'text-orange-700 bg-orange-50 border-orange-200',     dot: 'bg-orange-500'  },
  ASSIGNED:       { label: 'Đã phân công',   cls: 'text-orange-700 bg-orange-50 border-orange-200',     dot: 'bg-orange-500'  },
  IN_PROGRESS:    { label: 'Đang xử lý',     cls: 'text-orange-700 bg-orange-50 border-orange-200',     dot: 'bg-orange-600'  },
  RESOLVED:       { label: 'Đã giải quyết',  cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-500' },
  COMPLETED:      { label: 'Hoàn thành',     cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', dot: 'bg-emerald-600' },
  REJECTED:       { label: 'Từ chối',        cls: 'text-red-700 bg-red-50 border-red-200',             dot: 'bg-red-500'     },
  CANCELLED:      { label: 'Đã hủy',         cls: 'text-gray-600 bg-gray-100 border-gray-200',         dot: 'bg-gray-400'    },
  TRANSFERRED:    { label: 'Đã chuyển giao', cls: 'text-amber-700 bg-amber-50 border-amber-200',       dot: 'bg-amber-500'   },
};

export const SEV_MAP: Record<Severity, { label: string; cls: string }> = {
  CRITICAL: { label: 'Khẩn cấp',   cls: 'text-red-700 bg-red-50 border-red-200'         },
  HIGH:     { label: 'Cao',        cls: 'text-orange-700 bg-orange-50 border-orange-200' },
  MEDIUM:   { label: 'Trung bình', cls: 'text-slate-700 bg-slate-100 border-slate-200'   },
  LOW:      { label: 'Thấp',       cls: 'text-gray-500 bg-gray-50 border-gray-200'       },
};

export const DANGER_MAP: Record<DangerLevel, { label: string; cls: string; color: string }> = {
  CRITICAL:  { label: 'Nguy hiểm cao', cls: 'text-red-700 bg-red-50 border-red-200',             color: '#dc2626' },
  DANGEROUS: { label: 'Nguy hiểm',     cls: 'text-orange-700 bg-orange-50 border-orange-200',     color: '#ea580c' },
  CAUTION:   { label: 'Cần chú ý',     cls: 'text-amber-700 bg-amber-50 border-amber-200',       color: '#d97706' },
  SAFE:      { label: 'An toàn',       cls: 'text-emerald-700 bg-emerald-50 border-emerald-200', color: '#059669' },
};

export const STATUS_META = STATUS_MAP;
export const SEVERITY_META = SEV_MAP;
export const DANGER_META = DANGER_MAP;

// ── Helpers ────────────────────────────────────────────────────────────────────
export function getDept(id: string) { return DEPARTMENTS.find(d => d.departmentId === id); }
export function getCat(id: string)  { return CATEGORIES.find(c => c.categoryId === id); }
export function getUser(id: string) { return USERS.find(u => u.userId === id); }

const FALLBACK_STATUS = { label: 'Không xác định', cls: 'text-gray-500 bg-gray-100 border-gray-200', dot: 'bg-gray-400' };
const FALLBACK_BADGE  = { label: 'Không xác định', cls: 'text-gray-500 bg-gray-100 border-gray-200' };

export function statusInfo(s?: string) {
  if (!s) return FALLBACK_STATUS;
  const key = s.toUpperCase();
  return STATUS_MAP[key] ?? { label: s, cls: 'text-gray-500 bg-gray-100 border-gray-200', dot: 'bg-gray-400' };
}
export function sevInfo(s: string)     { return SEV_MAP[s as Severity]       ?? FALLBACK_BADGE;  }
export function dangerInfo(s: string)  { return DANGER_MAP[s as DangerLevel] ?? FALLBACK_BADGE;  }

export const PRIORITY_MAP: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: 'Khẩn cấp',    cls: 'text-red-700 bg-red-50 border-red-200'          },
  URGENT:   { label: 'Khẩn cấp',    cls: 'text-red-700 bg-red-50 border-red-200'          },
  HIGH:     { label: 'Ưu tiên cao', cls: 'text-orange-700 bg-orange-50 border-orange-200' },
  MEDIUM:   { label: 'Trung bình',  cls: 'text-slate-700 bg-slate-100 border-slate-200'   },
  NORMAL:   { label: 'Bình thường', cls: 'text-slate-700 bg-slate-100 border-slate-200'   },
  LOW:      { label: 'Thấp',        cls: 'text-gray-500 bg-gray-50 border-gray-200'       },
};

export function priorityInfo(p?: string) {
  if (!p) return { label: 'Chưa đặt', cls: 'text-gray-400 bg-gray-50 border-gray-200' };
  const key = p.toUpperCase();
  return PRIORITY_MAP[key] ?? { label: p, cls: 'text-gray-500 bg-gray-100 border-gray-200' };
}
