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
