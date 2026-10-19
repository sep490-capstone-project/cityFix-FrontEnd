export type StatusKey = 'INITIATED' | 'PENDING_REVIEW' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'COMPLETED';
export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type DangerLevel = 'SAFE' | 'CAUTION' | 'DANGEROUS' | 'CRITICAL';
export type Role = 'RESIDENT' | 'STAFF' | 'MANAGER' | 'ADMIN';
export type DeptLevel = 'CITY' | 'WARD';

export interface Ticket {
  ticketId: string;
  userId: string;
  departmentId: string;
  categoryId: string;
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
  district?: string;
  reporterName?: string;
  reporterPhone?: string;
  reporterEmail?: string;
  reportedVia?: string;
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

// ── Departments ────────────────────────────────────────────────────────────────
export const DEPARTMENTS: Department[] = [
  { departmentId: 'D001', level: 'CITY', name: 'Phòng Hạ tầng Đô thị TP.HCM',        contactEmail: 'hatang@tphcm.gov.vn',       phoneNumber: '028-3821-4567' },
  { departmentId: 'D002', level: 'WARD', name: 'Phòng Hạ tầng Đô thị Q.3',            contactEmail: 'hatang.q3@tphcm.gov.vn',    phoneNumber: '028-3920-1234' },
  { departmentId: 'D003', level: 'CITY', name: 'Điện lực TP.HCM',                      contactEmail: 'dienlu@evnhcmc.vn',         phoneNumber: '028-3864-9999' },
  { departmentId: 'D004', level: 'WARD', name: 'Điện lực Phú Nhuận',                   contactEmail: 'dienlu.pn@evnhcmc.vn',      phoneNumber: '028-3845-6789' },
  { departmentId: 'D005', level: 'CITY', name: 'TT Quản lý Hạ tầng Kỹ thuật',         contactEmail: 'htkt@tphcm.gov.vn',         phoneNumber: '028-3812-0000' },
  { departmentId: 'D006', level: 'CITY', name: 'Công ty TNHH MTV Môi trường Đô thị',  contactEmail: 'mtdt@citenco.com.vn',       phoneNumber: '028-3899-5678' },
  { departmentId: 'D007', level: 'CITY', name: 'Công ty Cây xanh TP.HCM',              contactEmail: 'cayxanh@tphcm.gov.vn',      phoneNumber: '028-3823-4567' },
  { departmentId: 'D008', level: 'WARD', name: 'Phòng Quản lý Đô thị Q.1',             contactEmail: 'qldt.q1@tphcm.gov.vn',     phoneNumber: '028-3914-3456' },
];

// ── Categories ─────────────────────────────────────────────────────────────────
export const CATEGORIES: Category[] = [
  { categoryId: 'CAT001', name: 'Ổ gà / Hư hỏng mặt đường', description: 'Mặt đường bị ổ gà, sụt lún, nứt nẻ',         isActive: true  },
  { categoryId: 'CAT002', name: 'Đèn đường hỏng',            description: 'Cột đèn hư, mất điện chiếu sáng công cộng',  isActive: true  },
  { categoryId: 'CAT003', name: 'Rác thải / Vệ sinh',         description: 'Bãi rác tự phát, vệ sinh môi trường',        isActive: true  },
  { categoryId: 'CAT004', name: 'Cây đổ / Cây nguy hiểm',    description: 'Cây nghiêng, đổ, nguy cơ gây tai nạn',       isActive: true  },
  { categoryId: 'CAT005', name: 'Ngập úng / Thoát nước',      description: 'Cống tắc, ngập úng sau mưa',                 isActive: true  },
  { categoryId: 'CAT006', name: 'Vỉa hè hư hỏng',             description: 'Gạch vỡ, lún sụt trên vỉa hè',              isActive: true  },
  { categoryId: 'CAT007', name: 'Biển báo hỏng',              description: 'Biển giao thông hỏng, nghiêng, mờ',          isActive: false },
  { categoryId: 'CAT008', name: 'Khác',                        description: 'Các sự cố hạ tầng chưa phân loại',          isActive: true  },
];

// ── Routing Rules ──────────────────────────────────────────────────────────────
export const ROUTING_RULES: RoutingRule[] = [
  { ruleId: 'RR001', categoryId: 'CAT001', province: 'TP.HCM', ward: 'P.6, Q.3',         departmentId: 'D002' },
  { ruleId: 'RR002', categoryId: 'CAT002', province: 'TP.HCM', ward: 'P.14, Q. Phú Nhuận', departmentId: 'D004' },
  { ruleId: 'RR003', categoryId: 'CAT005', province: 'TP.HCM', ward: 'P.24, Q. Bình Thạnh', departmentId: 'D005' },
  { ruleId: 'RR004', categoryId: 'CAT003', province: 'TP.HCM', ward: 'P. Bến Thành, Q.1', departmentId: 'D006' },
  { ruleId: 'RR005', categoryId: 'CAT004', province: 'TP.HCM', ward: 'P. Võ Thị Sáu, Q.3', departmentId: 'D007' },
  { ruleId: 'RR006', categoryId: 'CAT006', province: 'TP.HCM', ward: 'P.8, Q.3',          departmentId: 'D002' },
  { ruleId: 'RR007', categoryId: 'CAT007', province: 'TP.HCM', ward: 'P. Bến Nghé, Q.1',  departmentId: 'D008' },
  { ruleId: 'RR008', categoryId: 'CAT001', province: 'TP.HCM', ward: 'P.17, Q. Phú Nhuận', departmentId: 'D002' },
];

// ── Tickets ────────────────────────────────────────────────────────────────────
export const TICKETS: Ticket[] = [
  {
    ticketId: 'CF-2853', userId: 'U001', departmentId: 'D002', categoryId: 'CAT001', assigneeId: 'U010',
    description: 'Ổ gà lớn rộng khoảng 1.2m, sâu 15cm, gây nguy hiểm cho xe máy lưu thông vào giờ cao điểm.',
    severity: 'HIGH', dangerLevel: 'DANGEROUS',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7769, lng: 106.6980 },
    address: '127 Nguyễn Thị Minh Khai', province: 'TP.HCM', ward: 'P.6, Q.3',
    status: 'IN_PROGRESS', createdAt: '10/09/2026 09:41', updatedAt: '10/09/2026 11:30',
    isLifeThreatening: false, needsManualReview: false,
    aiConfidence: 87, aiCategory: 'CAT001', aiSeverity: 'HIGH', aiDangerLevel: 'DANGEROUS',
  },
  {
    ticketId: 'CF-2852', userId: 'U002', departmentId: 'D004', categoryId: 'CAT002', assigneeId: 'U011',
    description: '3 cột đèn đường liên tiếp bị tắt từ đêm qua, đoạn đường tối hoàn toàn, mất an toàn.',
    severity: 'MEDIUM', dangerLevel: 'CAUTION',
    locationMethod: 'AUTO_GPS', location: { lat: 10.8013, lng: 106.6761 },
    address: '45 Lê Văn Sỹ', province: 'TP.HCM', ward: 'P.14, Q. Phú Nhuận',
    status: 'ASSIGNED', createdAt: '10/09/2026 06:22', updatedAt: '10/09/2026 10:00',
    isLifeThreatening: false, needsManualReview: false,
    aiConfidence: 92, aiCategory: 'CAT002', aiSeverity: 'MEDIUM', aiDangerLevel: 'CAUTION',
  },
  {
    ticketId: 'CF-2851', userId: 'U003', departmentId: 'D005', categoryId: 'CAT005',
    description: 'Cống thoát nước bị tắc nghẽn, ngập nước mỗi khi mưa lớn, mức ngập 30-40cm, xe cộ không qua được.',
    severity: 'CRITICAL', dangerLevel: 'CRITICAL',
    locationMethod: 'MANUAL_ENTRY', location: { lat: 10.8120, lng: 106.7069 },
    address: 'Ngã tư Hàng Xanh', province: 'TP.HCM', ward: 'P.24, Q. Bình Thạnh',
    status: 'PENDING_REVIEW', createdAt: '09/09/2026 14:30', updatedAt: '09/09/2026 15:00',
    isLifeThreatening: true, needsManualReview: true,
    aiConfidence: 61, aiCategory: 'CAT005', aiSeverity: 'HIGH', aiDangerLevel: 'DANGEROUS',
    isRepeatIssue: true, repeatCount: 3,
  },
  {
    ticketId: 'CF-2849', userId: 'U004', departmentId: 'D006', categoryId: 'CAT003', assigneeId: 'U012',
    description: 'Bãi rác tự phát hình thành trước cổng chợ, ảnh hưởng vệ sinh môi trường khu dân cư.',
    severity: 'LOW', dangerLevel: 'SAFE',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7720, lng: 106.6984 },
    address: '78 Bùi Thị Xuân', province: 'TP.HCM', ward: 'P. Bến Thành, Q.1',
    status: 'COMPLETED', createdAt: '08/09/2026 10:15', updatedAt: '09/09/2026 16:00',
    isLifeThreatening: false, needsManualReview: false,
    aiConfidence: 95, aiCategory: 'CAT003', aiSeverity: 'LOW', aiDangerLevel: 'SAFE',
  },
  {
    ticketId: 'CF-2848', userId: 'U005', departmentId: 'D007', categoryId: 'CAT004',
    description: 'Cây lớn nghiêng nguy hiểm sau bão, có thể đổ vào đường đi bộ bất kỳ lúc nào.',
    severity: 'HIGH', dangerLevel: 'DANGEROUS',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7775, lng: 106.6888 },
    address: 'Công viên Tao Đàn', province: 'TP.HCM', ward: 'P. Võ Thị Sáu, Q.3',
    status: 'OPEN', createdAt: '07/09/2026 16:45', updatedAt: '07/09/2026 17:00',
    isLifeThreatening: true, needsManualReview: true,
    aiConfidence: 55, aiCategory: 'CAT004', aiSeverity: 'CRITICAL', aiDangerLevel: 'CRITICAL',
  },
  {
    ticketId: 'CF-2847', userId: 'U006', departmentId: 'D002', categoryId: 'CAT006', assigneeId: 'U010',
    description: 'Gạch lát vỉa hè bị vỡ nứt nhiều đoạn, gây khó khăn cho người đi bộ, đặc biệt người khuyết tật.',
    severity: 'MEDIUM', dangerLevel: 'CAUTION',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7812, lng: 106.6921 },
    address: '203 Hai Bà Trưng', province: 'TP.HCM', ward: 'P.8, Q.3',
    status: 'ASSIGNED', createdAt: '07/09/2026 09:00', updatedAt: '07/09/2026 12:00',
    isLifeThreatening: false, needsManualReview: false,
    aiConfidence: 89, aiCategory: 'CAT006', aiSeverity: 'MEDIUM', aiDangerLevel: 'CAUTION',
  },
  {
    ticketId: 'CF-2846', userId: 'U007', departmentId: 'D008', categoryId: 'CAT007', assigneeId: 'U013',
    description: 'Biển báo đường một chiều bị va chạm và cong vẹo, không còn rõ nội dung.',
    severity: 'LOW', dangerLevel: 'SAFE',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7724, lng: 106.7005 },
    address: 'Giao lộ Đinh Tiên Hoàng - Đinh Lễ', province: 'TP.HCM', ward: 'P. Bến Nghé, Q.1',
    status: 'RESOLVED', createdAt: '06/09/2026 11:22', updatedAt: '08/09/2026 14:00',
    isLifeThreatening: false, needsManualReview: false,
    aiConfidence: 97, aiCategory: 'CAT007', aiSeverity: 'LOW', aiDangerLevel: 'SAFE',
  },
  {
    ticketId: 'CF-2844', userId: 'U008', departmentId: 'D002', categoryId: 'CAT001',
    description: 'Mặt đường sụt lún tạo thành hố sâu làm đứt cáp điện ngầm bên dưới, cần phối hợp cả Điện lực và Giao thông.',
    severity: 'CRITICAL', dangerLevel: 'CRITICAL',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7990, lng: 106.6760 },
    address: '56 Phan Đình Phùng', province: 'TP.HCM', ward: 'P.17, Q. Phú Nhuận',
    status: 'PENDING_REVIEW', createdAt: '05/09/2026 08:50', updatedAt: '05/09/2026 09:30',
    isLifeThreatening: true, needsManualReview: true,
    aiConfidence: 43, aiCategory: 'CAT001', aiSeverity: 'HIGH', aiDangerLevel: 'DANGEROUS',
    isRepeatIssue: true, repeatCount: 2,
  },
  {
    ticketId: 'CF-2843', userId: 'U009', departmentId: 'D005', categoryId: 'CAT005', assigneeId: 'U014',
    description: 'Nắp cống bị mất, hố sâu 80cm giữa đường, cực kỳ nguy hiểm cho người đi bộ ban đêm.',
    severity: 'CRITICAL', dangerLevel: 'CRITICAL',
    locationMethod: 'AUTO_GPS', location: { lat: 10.7853, lng: 106.7012 },
    address: '14 Đinh Bộ Lĩnh', province: 'TP.HCM', ward: 'P.24, Q. Bình Thạnh',
    status: 'IN_PROGRESS', createdAt: '05/09/2026 20:15', updatedAt: '06/09/2026 08:00',
    isLifeThreatening: true, needsManualReview: false,
    aiConfidence: 94, aiCategory: 'CAT005', aiSeverity: 'CRITICAL', aiDangerLevel: 'CRITICAL',
  },
];

// ── Ticket History ─────────────────────────────────────────────────────────────
export const TICKET_HISTORY: Record<string, TicketHistory[]> = {
  'CF-2853': [
    { ticketId: 'CF-2853', action: 'CREATED',       actor: 'Người dùng U001',  note: 'Báo cáo được ghi nhận qua ứng dụng',            time: '10/09 09:41' },
    { ticketId: 'CF-2853', action: 'AI_REVIEWED',   actor: 'Hệ thống AI',      note: 'Phân tích ảnh: HIGH severity, confidence 87%',   time: '10/09 09:42' },
    { ticketId: 'CF-2853', action: 'ROUTED',         actor: 'Hệ thống',         note: 'Định tuyến đến Phòng Hạ tầng Đô thị Q.3',       time: '10/09 09:43' },
    { ticketId: 'CF-2853', action: 'ASSIGNED',       actor: 'Nguyễn Văn Admin', note: 'Phân công cho Trần Minh Quân',                   time: '10/09 10:15' },
    { ticketId: 'CF-2853', action: 'WORK_STARTED',   actor: 'Trần Minh Quân',   note: 'Đã đến hiện trường, xác nhận sự cố',            time: '10/09 11:30' },
  ],
  'CF-2851': [
    { ticketId: 'CF-2851', action: 'CREATED',        actor: 'Người dùng U003',  note: 'Báo cáo được ghi nhận qua ứng dụng',            time: '09/09 14:30' },
    { ticketId: 'CF-2851', action: 'AI_REVIEWED',    actor: 'Hệ thống AI',      note: 'Confidence thấp (61%). Cần xem xét thủ công',   time: '09/09 14:31' },
  ],
  'CF-2848': [
    { ticketId: 'CF-2848', action: 'CREATED',        actor: 'Người dùng U005',  note: 'Báo cáo được ghi nhận qua ứng dụng',            time: '07/09 16:45' },
    { ticketId: 'CF-2848', action: 'AI_REVIEWED',    actor: 'Hệ thống AI',      note: 'Phát hiện đe dọa tính mạng. Yêu cầu duyệt thủ công', time: '07/09 16:46' },
  ],
};

// ── Users ──────────────────────────────────────────────────────────────────────
export const USERS: User[] = [
  { userId: 'U001', fullName: 'Nguyễn Thị Mai',    email: 'mai.nguyen@gmail.com',   phoneNumber: '0901234567', province: 'TP.HCM', ward: 'P.6, Q.3',           address: '12 Lê Lợi',             role: 'RESIDENT', status: 'ACTIVE',  createdAt: '01/01/2026', updatedAt: '10/09/2026' },
  { userId: 'U002', fullName: 'Trần Văn Hùng',     email: 'hung.tran@gmail.com',    phoneNumber: '0912345678', province: 'TP.HCM', ward: 'P.14, Q. Phú Nhuận', address: '45 Lê Văn Sỹ',          role: 'RESIDENT', status: 'ACTIVE',  createdAt: '15/02/2026', updatedAt: '10/09/2026' },
  { userId: 'U003', fullName: 'Lê Thị Hoa',        email: 'hoa.le@tphcm.gov.vn',   phoneNumber: '0923456789', province: 'TP.HCM', ward: 'P.24, Q. Bình Thạnh',address: '78 Bình Thạnh',         role: 'STAFF',    status: 'ACTIVE',  departmentId: 'D005', createdAt: '20/03/2026', updatedAt: '10/09/2026' },
  { userId: 'U004', fullName: 'Phạm Minh Tuấn',    email: 'tuan.pham@gmail.com',    phoneNumber: '0934567890', province: 'TP.HCM', ward: 'P. Bến Thành, Q.1',  address: '23 Nguyễn Huệ',         role: 'RESIDENT', status: 'BLOCKED', createdAt: '10/04/2026', updatedAt: '05/09/2026' },
  { userId: 'U005', fullName: 'Võ Thanh Hùng',     email: 'hung.vo@tphcm.gov.vn',  phoneNumber: '0945678901', province: 'TP.HCM', ward: 'P.8, Q.3',            address: '56 Hai Bà Trưng',       role: 'STAFF',    status: 'ACTIVE',  departmentId: 'D002', createdAt: '01/05/2026', updatedAt: '10/09/2026' },
  { userId: 'U006', fullName: 'Nguyễn Văn Admin',  email: 'admin@cityfix.gov.vn',   phoneNumber: '0956789012', province: 'TP.HCM', ward: 'P. Bến Nghé, Q.1',   address: '1 Lý Tự Trọng',         role: 'ADMIN',    status: 'ACTIVE',  createdAt: '01/01/2026', updatedAt: '10/09/2026' },
  { userId: 'U007', fullName: 'Trần Thị Lan',      email: 'lan.tran@gmail.com',     phoneNumber: '0967890123', province: 'TP.HCM', ward: 'P.17, Q. Phú Nhuận', address: '90 Phan Đình Phùng',    role: 'RESIDENT', status: 'ACTIVE',  createdAt: '01/06/2026', updatedAt: '10/09/2026' },
  { userId: 'U008', fullName: 'Đặng Minh Khoa',    email: 'khoa.dang@gmail.com',    phoneNumber: '0978901234', province: 'TP.HCM', ward: 'P.24, Q. Bình Thạnh',address: '32 Đinh Bộ Lĩnh',       role: 'RESIDENT', status: 'ACTIVE',  createdAt: '15/07/2026', updatedAt: '10/09/2026' },
  { userId: 'U010', fullName: 'Trần Minh Quân',    email: 'quan.tran@tphcm.gov.vn', phoneNumber: '0901112233', province: 'TP.HCM', ward: 'P.6, Q.3',            address: '15 Nguyễn Thị Minh Khai',role: 'STAFF',  status: 'ACTIVE',  departmentId: 'D002', createdAt: '10/02/2026', updatedAt: '10/09/2026' },
  { userId: 'U011', fullName: 'Lê Thị Hương',      email: 'huong.le@evnhcmc.vn',   phoneNumber: '0912223344', province: 'TP.HCM', ward: 'P.14, Q. Phú Nhuận', address: '67 Lê Văn Sỹ',          role: 'STAFF',    status: 'ACTIVE',  departmentId: 'D004', createdAt: '01/03/2026', updatedAt: '10/09/2026' },
];

// ── Status Config ─────────────────────────────────────────────────────────────
export const STATUS_MAP: Record<StatusKey, { label: string; cls: string; dot: string }> = {
  INITIATED:      { label: 'Khởi tạo',       cls: 'text-zinc-400  bg-zinc-700/30    border-zinc-600/30',   dot: 'bg-zinc-400'   },
  PENDING_REVIEW: { label: 'Chờ xét duyệt',  cls: 'text-amber-400 bg-amber-500/12   border-amber-500/25',  dot: 'bg-amber-400'  },
  OPEN:           { label: 'Mở',              cls: 'text-blue-400  bg-blue-500/12    border-blue-500/25',   dot: 'bg-blue-400'   },
  ASSIGNED:       { label: 'Đã phân công',   cls: 'text-purple-400 bg-purple-500/12 border-purple-500/25', dot: 'bg-purple-400' },
  IN_PROGRESS:    { label: 'Đang xử lý',     cls: 'text-orange-400 bg-orange-500/12 border-orange-500/20', dot: 'bg-orange-400' },
  RESOLVED:       { label: 'Đã giải quyết',  cls: 'text-teal-400  bg-teal-500/12    border-teal-500/20',   dot: 'bg-teal-400'   },
  COMPLETED:      { label: 'Hoàn thành',     cls: 'text-green-400 bg-green-500/12   border-green-500/20',  dot: 'bg-green-400'  },
};

export const SEV_MAP: Record<Severity, { label: string; cls: string }> = {
  CRITICAL: { label: 'Nghiêm trọng', cls: 'text-red-300   bg-red-700/20     border-red-700/30'    },
  HIGH:     { label: 'Cao',          cls: 'text-red-400   bg-red-500/12     border-red-500/25'    },
  MEDIUM:   { label: 'Trung bình',   cls: 'text-orange-400 bg-orange-500/12 border-orange-500/20' },
  LOW:      { label: 'Thấp',         cls: 'text-zinc-400  bg-zinc-700/30    border-zinc-600/30'   },
};

export const DANGER_MAP: Record<DangerLevel, { label: string; cls: string }> = {
  CRITICAL:  { label: 'Cực kỳ nguy hiểm', cls: 'text-red-300   bg-red-700/20     border-red-700/30'    },
  DANGEROUS: { label: 'Nguy hiểm',         cls: 'text-red-400   bg-red-500/12     border-red-500/25'    },
  CAUTION:   { label: 'Cần chú ý',         cls: 'text-amber-400 bg-amber-500/12   border-amber-500/20'  },
  SAFE:      { label: 'An toàn',            cls: 'text-green-400 bg-green-500/12   border-green-500/20'  },
};

// ── Helpers ────────────────────────────────────────────────────────────────────
export function getDept(id: string) { return DEPARTMENTS.find(d => d.departmentId === id); }
export function getCat(id: string)  { return CATEGORIES.find(c => c.categoryId === id); }
export function getUser(id: string) { return USERS.find(u => u.userId === id); }

const FALLBACK_STATUS = { label: 'Không xác định', cls: 'text-zinc-500 bg-zinc-800/40 border-zinc-700/40', dot: 'bg-zinc-500' };
const FALLBACK_BADGE  = { label: 'Không xác định', cls: 'text-zinc-500 bg-zinc-800/40 border-zinc-700/40' };

export function statusInfo(s: string)  { return STATUS_MAP[s as StatusKey]  ?? FALLBACK_STATUS; }
export function sevInfo(s: string)     { return SEV_MAP[s as Severity]       ?? FALLBACK_BADGE;  }
export function dangerInfo(s: string)  { return DANGER_MAP[s as DangerLevel] ?? FALLBACK_BADGE;  }

export const PRIORITY_MAP: Record<string, { label: string; cls: string }> = {
  CRITICAL: { label: 'Khẩn cấp',    cls: 'text-red-700 bg-red-100 border-red-300'       },
  URGENT:   { label: 'Khẩn cấp',    cls: 'text-red-700 bg-red-100 border-red-300'       },
  HIGH:     { label: 'Ưu tiên cao', cls: 'text-rose-600 bg-rose-50 border-rose-200'     },
  MEDIUM:   { label: 'Trung bình',  cls: 'text-amber-700 bg-amber-50 border-amber-200'  },
  NORMAL:   { label: 'Bình thường', cls: 'text-blue-700 bg-blue-50 border-blue-200'     },
  LOW:      { label: 'Thấp',        cls: 'text-gray-600 bg-gray-100 border-gray-200'    },
};

export function priorityInfo(p?: string) {
  if (!p) return { label: 'Chưa đặt', cls: 'text-gray-400 bg-gray-50 border-gray-200' };
  const key = p.toUpperCase();
  return PRIORITY_MAP[key] ?? { label: p, cls: 'text-gray-600 bg-gray-100 border-gray-200' };
}

