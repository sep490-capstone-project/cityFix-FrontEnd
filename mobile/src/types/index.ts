export interface User {
  id: string;
  name: string;
  email: string;
  role: 'citizen' | 'admin' | 'staff';
  avatarUrl?: string;
  createdAt: string;
}

export type IssueStatus = 'pending' | 'in_progress' | 'resolved' | 'rejected';
export type IssuePriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Location {
  latitude: number;
  longitude: number;
  address?: string;
}

export interface Issue {
  id: string;
  title: string;
  description: string;
  category: string;
  status: IssueStatus;
  priority: IssuePriority;
  location: Location;
  images: string[];
  reporterId: string;
  assignedToId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface LocationData {
  lat: number;
  lng: number;
}

export interface AIAnalysis {
  analysisId?: string;
  categoryId: string;
  categoryName?: string | null;
  subCategoryId?: string;
  subCategoryName?: string | null;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | string;
  dangerLevel?: 'SAFE' | 'CAUTION' | 'DANGEROUS' | 'CRITICAL' | string;
  confidenceScore: number;
  description: string;
  isAcceptedByHuman?: boolean;
  isValidIssue?: boolean;
}

export interface ReportDraft {
  location: LocationData | null;
  address: string;
  locationMethod: 'AUTO_GPS' | 'MANUAL_ENTRY' | null;
  imageUrls: string[];
  aiAnalysis: AIAnalysis | null;
  userCategoryId: string | null;
  userSubCategoryId?: string | null;
  userDescription: string;
}

export interface Category {
  categoryId: string;
  name: string;
}

export const CATEGORIES: Category[] = [
  { categoryId: 'cat-001', name: 'Ổ gà / Mặt đường' },
  { categoryId: 'cat-002', name: 'Đèn đường hỏng' },
  { categoryId: 'cat-003', name: 'Rác thải / Vệ sinh' },
  { categoryId: 'cat-004', name: 'Cây gãy đổ' },
  { categoryId: 'cat-005', name: 'Ngập úng / Thoát nước' },
  { categoryId: 'cat-006', name: 'Sụt lở vỉa hè' },
  { categoryId: 'cat-007', name: 'Biển báo hỏng' },
  { categoryId: 'cat-008', name: 'Khác' },
];
