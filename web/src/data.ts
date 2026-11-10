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
  assigneeId?: string;
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

// ── Danh sách Tỉnh/Thành phố & Phường/Xã chuẩn 2 cấp (Province -> Ward) ────────
export const PROVINCE_WARDS: Record<string, string[]> = {
  'TP. Hồ Chí Minh': [
    'Phường Bến Nghé',
    'Phường Bến Thành',
    'Phường Võ Thị Sáu',
    'Phường 6',
    'Phường 14',
    'Phường 24',
  ],
  'TP. Hà Nội': [
    'Phường Điện Biên',
    'Phường Tràng Tiền',
    'Phường Hàng Bài',
    'Phường Láng Hạ',
    'Phường Dịch Vọng',
  ],
  'TP. Đà Nẵng': [
    'Phường Hải Châu 1',
    'Phường Thạch Thang',
    'Phường Hòa Thuận Đông',
    'Phường An Hải Bắc',
  ],
};

// ── Departments (Toàn hệ thống: Cấp Thành phố/Tỉnh CITY & Cấp Xã/Phường WARD) ─
export const DEPARTMENTS: Department[] = [
  { departmentId: 'D001', level: 'CITY', name: 'Sở Giao thông Vận tải TP.HCM',         contactEmail: 'sogtvt@tphcm.gov.vn',        phoneNumber: '028-3821-4567' },
  { departmentId: 'D002', level: 'WARD', name: 'UBND Phường Võ Thị Sáu',                contactEmail: 'vothisau@tphcm.gov.vn',      phoneNumber: '028-3920-1234' },
  { departmentId: 'D003', level: 'CITY', name: 'Tổng Công ty Điện lực TP.HCM',          contactEmail: 'cskh@evnhcmc.vn',            phoneNumber: '028-3864-9999' },
  { departmentId: 'D004', level: 'WARD', name: 'UBND Phường Bến Nghé',                  contactEmail: 'bennghe@tphcm.gov.vn',       phoneNumber: '028-3845-6789' },
  { departmentId: 'D005', level: 'CITY', name: 'Sở Xây dựng TP. Hà Nội',                contactEmail: 'soxaydung@hanoi.gov.vn',     phoneNumber: '024-3812-0000' },
  { departmentId: 'D006', level: 'WARD', name: 'UBND Phường Điện Biên',                 contactEmail: 'dienbien@hanoi.gov.vn',      phoneNumber: '024-3899-5678' },
  { departmentId: 'D007', level: 'CITY', name: 'Sở Tài nguyên & Môi trường Đà Nẵng',   contactEmail: 'stnmt@danang.gov.vn',        phoneNumber: '0236-3823-456' },
  { departmentId: 'D008', level: 'WARD', name: 'UBND Phường Hải Châu 1',                contactEmail: 'haichau1@danang.gov.vn',     phoneNumber: '0236-3914-345' },
];

// ── Categories ─────────────────────────────────────────────────────────────────
export const CATEGORIES: Category[] = [
  { categoryId: 'CAT001', name: 'Ổ gà / Hư hỏng mặt đường', description: 'Mặt đường bị ổ gà, sụt lún, nứt nẻ',         isActive: true  },
  { categoryId: 'CAT002', name: 'Đèn đường / Chiếu sáng',    description: 'Cột đèn hư, mất điện chiếu sáng công cộng',  isActive: true  },
  { categoryId: 'CAT003', name: 'Rác thải / Vệ sinh',         description: 'Bãi rác tự phát, vệ sinh môi trường',        isActive: true  },
  { categoryId: 'CAT004', name: 'Cây đổ / Cây nguy hiểm',    description: 'Cây nghiêng, đổ, nguy cơ gây tai nạn',       isActive: true  },
  { categoryId: 'CAT005', name: 'Ngập úng / Thoát nước',      description: 'Cống tắc, mất nắp cống, ngập úng sau mưa',   isActive: true  },
  { categoryId: 'CAT006', name: 'Vỉa hè hư hỏng',             description: 'Gạch vỡ, lún sụt trên vỉa hè',              isActive: true  },
  { categoryId: 'CAT007', name: 'Biển báo giao thông',        description: 'Biển giao thông hỏng, nghiêng, mờ',          isActive: true  },
];

// ── Routing Rules (Category + Province + Ward -> Department) ───────────────────
export const ROUTING_RULES: RoutingRule[] = [
  { ruleId: 'RR001', categoryId: 'CAT001', province: 'TP. Hồ Chí Minh', ward: 'Phường Võ Thị Sáu', departmentId: 'D001' },
  { ruleId: 'RR002', categoryId: 'CAT002', province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé',   departmentId: 'D003' },
  { ruleId: 'RR003', categoryId: 'CAT006', province: 'TP. Hồ Chí Minh', ward: 'Phường 6',          departmentId: 'D002' },
  { ruleId: 'RR004', categoryId: 'CAT005', province: 'TP. Hà Nội',      ward: 'Phường Điện Biên',  departmentId: 'D005' },
  { ruleId: 'RR005', categoryId: 'CAT003', province: 'TP. Hà Nội',      ward: 'Phường Tràng Tiền', departmentId: 'D006' },
  { ruleId: 'RR006', categoryId: 'CAT004', province: 'TP. Đà Nẵng',     ward: 'Phường Hải Châu 1', departmentId: 'D007' },
  { ruleId: 'RR007', categoryId: 'CAT007', province: 'TP. Đà Nẵng',     ward: 'Phường Thạch Thang',departmentId: 'D008' },
];

// ── Tickets (Dữ liệu mẫu đa Tỉnh/Thành phố trên toàn hệ thống) ─────────────────
export const TICKETS: Ticket[] = [
  {
    ticketId: 'CF-2853', userId: 'U001', departmentId: 'D001', categoryId: 'CAT001', assigneeId: 'Trần Minh Quân',
    description: 'Ổ gà lớn rộng khoảng 1.2m, sâu 15cm gây nguy hiểm cho phương tiện lưu thông.',
    severity: 'HIGH', dangerLevel: 'DANGEROUS',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7769, lng: 106.6980 },
    address: '127 Nguyễn Thị Minh Khai', province: 'TP. Hồ Chí Minh', ward: 'Phường Võ Thị Sáu',
    status: 'IN_PROGRESS', createdAt: '10/09/2026 09:41', updatedAt: '10/09/2026 11:30',
    isLifeThreatening: false, needsManualReview: false,
  },
  {
    ticketId: 'CF-2852', userId: 'U002', departmentId: 'D005', categoryId: 'CAT005', assigneeId: 'Nguyễn Hoàng Nam',
    description: 'Nắp cống thoát nước bị mất trên trục đường chính, nguy hiểm cho người đi đường ban đêm.',
    severity: 'CRITICAL', dangerLevel: 'CRITICAL',
    locationMethod: 'AUTO_GPS', location: { lat: 21.0313, lng: 105.8416 },
    address: '18 Điện Biên Phủ', province: 'TP. Hà Nội', ward: 'Phường Điện Biên',
    status: 'IN_PROGRESS', createdAt: '10/09/2026 08:15', updatedAt: '10/09/2026 09:00',
    isLifeThreatening: true, needsManualReview: false,
  },
  {
    ticketId: 'CF-2851', userId: 'U003', departmentId: 'D007', categoryId: 'CAT004',
    description: 'Cây xanh lớn bị nghiêng sau mưa giông, có nguy cơ gãy đổ xuống lòng đường.',
    severity: 'CRITICAL', dangerLevel: 'CRITICAL',
    locationMethod: 'MANUAL_ENTRY', location: { lat: 16.0748, lng: 108.2240 },
    address: '42 Bạch Đằng', province: 'TP. Đà Nẵng', ward: 'Phường Hải Châu 1',
    status: 'INITIATED', createdAt: '09/09/2026 14:30', updatedAt: '09/09/2026 15:00',
    isLifeThreatening: true, needsManualReview: true,
  },
  {
    ticketId: 'CF-2849', userId: 'U004', departmentId: 'D006', categoryId: 'CAT003', assigneeId: 'Lê Thu Hà',
    description: 'Điểm tập kết rác thải sinh hoạt tồn đọng gây cản trở lối đi bộ.',
    severity: 'LOW', dangerLevel: 'SAFE',
    locationMethod: 'AUTO_GPS', location: { lat: 21.0245, lng: 105.8532 },
    address: '25 Tràng Tiền', province: 'TP. Hà Nội', ward: 'Phường Tràng Tiền',
    status: 'COMPLETED', createdAt: '08/09/2026 10:15', updatedAt: '09/09/2026 16:00',
    isLifeThreatening: false, needsManualReview: false,
  },
  {
    ticketId: 'CF-2848', userId: 'U005', departmentId: 'D003', categoryId: 'CAT002', assigneeId: 'Võ Thanh Hùng',
    description: 'Hệ thống đèn chiếu sáng công cộng bị chập chờn và tắt 4 trụ liên tiếp.',
    severity: 'MEDIUM', dangerLevel: 'CAUTION',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7775, lng: 106.7012 },
    address: '68 Nguyễn Huệ', province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé',
    status: 'ASSIGNED', createdAt: '07/09/2026 16:45', updatedAt: '07/09/2026 17:00',
    isLifeThreatening: false, needsManualReview: false,
  },
  {
    ticketId: 'CF-2847', userId: 'U006', departmentId: 'D002', categoryId: 'CAT006', assigneeId: 'Trần Minh Quân',
    description: 'Gạch lát vỉa hè bị bong tróc và sụt lún khoảng 5m2.',
    severity: 'MEDIUM', dangerLevel: 'CAUTION',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7812, lng: 106.6921 },
    address: '203 Hai Bà Trưng', province: 'TP. Hồ Chí Minh', ward: 'Phường 6',
    status: 'COMPLETED', createdAt: '07/09/2026 09:00', updatedAt: '08/09/2026 14:20',
    isLifeThreatening: false, needsManualReview: false,
  },
  {
    ticketId: 'CF-2846', userId: 'U007', departmentId: 'D008', categoryId: 'CAT007', assigneeId: 'Phạm Quốc Bảo',
    description: 'Biển báo giao thông một chiều bị nghiêng do va quẹt.',
    severity: 'LOW', dangerLevel: 'SAFE',
    locationMethod: 'AUTO_GPS', location: { lat: 16.0765, lng: 108.2215 },
    address: '12 Lý Tự Trọng', province: 'TP. Đà Nẵng', ward: 'Phường Thạch Thang',
    status: 'RESOLVED', createdAt: '06/09/2026 11:22', updatedAt: '08/09/2026 14:00',
    isLifeThreatening: false, needsManualReview: false,
  },
];

// ── Ticket History ─────────────────────────────────────────────────────────────
export const TICKET_HISTORY: Record<string, TicketHistory[]> = {
  'CF-2853': [
    { ticketId: 'CF-2853', action: 'CREATED',       actor: 'Nguyễn Thị Mai',              note: 'Gửi phản ánh sự cố qua ứng dụng di động',                time: '10/09/2026 09:41' },
    { ticketId: 'CF-2853', action: 'ROUTED',        actor: 'Hệ thống Định tuyến',         note: 'Định tuyến tự động đến Sở Giao thông Vận tải TP.HCM',   time: '10/09/2026 09:42' },
    { ticketId: 'CF-2853', action: 'ASSIGNED',      actor: 'Quản lý Đơn vị (Manager)',    note: 'Duyệt hồ sơ và phân công cho cán bộ Trần Minh Quân',     time: '10/09/2026 10:15' },
    { ticketId: 'CF-2853', action: 'WORK_STARTED',  actor: 'Trần Minh Quân (Staff)',      note: 'Bắt đầu xử lý bước khảo sát và khắc phục tại hiện trường',time: '10/09/2026 11:30' },
  ],
  'CF-2852': [
    { ticketId: 'CF-2852', action: 'CREATED',       actor: 'Trần Văn Hùng',               note: 'Gửi phản ánh sự cố khẩn cấp qua ứng dụng',               time: '10/09/2026 08:15' },
    { ticketId: 'CF-2852', action: 'ROUTED',        actor: 'Hệ thống Định tuyến',         note: 'Định tuyến tự động đến Sở Xây dựng TP. Hà Nội',          time: '10/09/2026 08:16' },
    { ticketId: 'CF-2852', action: 'ASSIGNED',      actor: 'Quản lý Đơn vị (Manager)',    note: 'Phân công xử lý khẩn cấp cho Nguyễn Hoàng Nam',          time: '10/09/2026 08:30' },
  ],
  'CF-2851': [
    { ticketId: 'CF-2851', action: 'CREATED',       actor: 'Lê Văn Khoa',                 note: 'Gửi phản ánh sự cố cây nghiêng nguy hiểm',               time: '09/09/2026 14:30' },
    { ticketId: 'CF-2851', action: 'ROUTED',        actor: 'Hệ thống Định tuyến',         note: 'Định tuyến đến Sở Tài nguyên & Môi trường Đà Nẵng',      time: '09/09/2026 14:31' },
  ],
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const USERS: User[] = [
  { userId: 'U001', fullName: 'Nguyễn Thị Mai',    email: 'mai.nguyen@gmail.com',    phoneNumber: '0901234567', province: 'TP. Hồ Chí Minh', ward: 'Phường Võ Thị Sáu', address: '12 Lê Lợi',              role: 'RESIDENT', status: 'ACTIVE',  createdAt: '01/01/2026', updatedAt: '10/09/2026' },
  { userId: 'U002', fullName: 'Trần Văn Hùng',     email: 'hung.tran@gmail.com',     phoneNumber: '0912345678', province: 'TP. Hà Nội',      ward: 'Phường Điện Biên',  address: '18 Điện Biên Phủ',       role: 'RESIDENT', status: 'ACTIVE',  createdAt: '15/02/2026', updatedAt: '10/09/2026' },
  { userId: 'U003', fullName: 'Lê Thị Hoa',        email: 'hoa.le@hanoi.gov.vn',     phoneNumber: '0923456789', province: 'TP. Hà Nội',      ward: 'Phường Điện Biên',  address: '78 Hoàng Diệu',          role: 'MANAGER',  status: 'ACTIVE',  departmentId: 'D005', createdAt: '20/03/2026', updatedAt: '10/09/2026' },
  { userId: 'U004', fullName: 'Phạm Minh Tuấn',    email: 'tuan.pham@gmail.com',     phoneNumber: '0934567890', province: 'TP. Đà Nẵng',     ward: 'Phường Hải Châu 1', address: '23 Bạch Đằng',           role: 'RESIDENT', status: 'BLOCKED', createdAt: '10/04/2026', updatedAt: '05/09/2026' },
  { userId: 'U005', fullName: 'Võ Thanh Hùng',     email: 'hung.vo@tphcm.gov.vn',    phoneNumber: '0945678901', province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé',   address: '56 Hai Bà Trưng',        role: 'STAFF',    status: 'ACTIVE',  departmentId: 'D003', createdAt: '01/05/2026', updatedAt: '10/09/2026' },
  { userId: 'U006', fullName: 'Nguyễn Văn Admin',  email: 'admin@cityfix.gov.vn',    phoneNumber: '0956789012', province: 'TP. Hồ Chí Minh', ward: 'Phường Bến Nghé',   address: '1 Lý Tự Trọng',          role: 'ADMIN',    status: 'ACTIVE',  createdAt: '01/01/2026', updatedAt: '10/09/2026' },
  { userId: 'U007', fullName: 'Trần Minh Quân',    email: 'quan.tran@tphcm.gov.vn',  phoneNumber: '0901112233', province: 'TP. Hồ Chí Minh', ward: 'Phường 6',          address: '15 Nguyễn Thị Minh Khai',role: 'STAFF',    status: 'ACTIVE',  departmentId: 'D001', createdAt: '10/02/2026', updatedAt: '10/09/2026' },
  { userId: 'U008', fullName: 'Phạm Quốc Bảo',     email: 'bao.pham@danang.gov.vn',  phoneNumber: '0912223344', province: 'TP. Đà Nẵng',     ward: 'Phường Thạch Thang',address: '12 Lý Tự Trọng',         role: 'STAFF',    status: 'ACTIVE',  departmentId: 'D008', createdAt: '01/03/2026', updatedAt: '10/09/2026' },
];

// ── Status & Semantic Badge Config (Unified Brand Palette) ───────────────────
// Chỉ sử dụng:
// - Orange (Chủ đạo): Đang xử lý, Đã phân công, Đã tiếp nhận, Ưu tiên cao
// - Emerald (Hoàn thành): Hoàn thành, Đã giải quyết, An toàn
// - Amber (Chờ đợi): Chờ duyệt, Chờ xét duyệt, Đã chuyển giao, Cần chú ý
// - Red (Khẩn cấp / Từ chối): Khẩn cấp, Từ chối, Nguy hiểm cao
// - Slate / Gray (Trung tính): Trung bình, Bình thường, Thấp, Đã hủy
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

export const DANGER_MAP: Record<DangerLevel, { label: string; cls: string }> = {
  CRITICAL:  { label: 'Nguy hiểm cao', cls: 'text-red-700 bg-red-50 border-red-200'             },
  DANGEROUS: { label: 'Nguy hiểm',     cls: 'text-orange-700 bg-orange-50 border-orange-200'     },
  CAUTION:   { label: 'Cần chú ý',     cls: 'text-amber-700 bg-amber-50 border-amber-200'       },
  SAFE:      { label: 'An toàn',       cls: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
};

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
  return PRIORITY_MAP[key] ?? { label: p, cls: 'text-gray-600 bg-gray-100 border-gray-200' };
}
