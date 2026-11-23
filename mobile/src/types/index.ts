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
  categoryId?: string;
  categoryName?: string | null;
  subCategoryId?: string;
  subCategoryName?: string | null;
  subCategoryIds?: string[];
  subCategoryNames?: string[];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  priorityReasoning?: string;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  severityScore?: number;
  dangerLevel?: 'SAFE' | 'CAUTION' | 'DANGEROUS' | 'CRITICAL' | string;
  confidenceScore: number;
  description: string;
  isAcceptedByHuman?: boolean;
  isValidIssue?: boolean;
  urgency?: number;
  impact?: number;
  context?: number;
  baseScore?: number;
  finalPriorityScore?: number;
}

export interface ReportDraft {
  location: LocationData | null;
  address: string;
  locationMethod: 'AUTO_GPS' | 'MANUAL_ENTRY' | null;
  locationSource?: 'GPS' | 'MANUAL' | 'MAP' | null;
  imageUrls: string[];
  aiAnalysis: AIAnalysis | null;
  userCategoryId: string | null;
  userSubCategoryId?: string | null;
  userSubCategoryIds?: string[];
  userSubCategoryNames?: string[];
  userDescription: string;
  isAnonymous?: boolean;
}

export interface Category {
  categoryId: string;
  name: string;
}

export const CATEGORIES: Category[] = [];
