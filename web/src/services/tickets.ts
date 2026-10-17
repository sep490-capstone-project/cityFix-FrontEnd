import { getAccessToken } from './auth';

export interface PageableParams {
  page?: number;
  size?: number;
  sort?: string[];
}

export interface TicketResponse {
  id: string;
  description: string;
  imageUrl?: string;
  categoryId: string;
  categoryName?: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  dangerLevel: 'SAFE' | 'CAUTION' | 'DANGEROUS' | 'CRITICAL';
  locationMethod: 'AUTO_GPS' | 'MANUAL_ENTRY';
  address: string;
  status: 'INITIATED' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED';
  latitude: number;
  longitude: number;
  reviewNote?: string;
  createdBy: string;
  createdAt: string;
  deadline: string | null;
}

export interface PageTicketResponse {
  content: TicketResponse[];
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
}

const API_URL = 'https://cityfix-backend-80ar.onrender.com';

async function ticketRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(payload?.message || `Lỗi gọi API: ${response.status}`);
  }

  return payload.data as T;
}

// API: Lấy danh sách ticket chờ duyệt (INITIATED)
export async function getInitiatedTickets(params?: PageableParams): Promise<PageTicketResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.append('page', params.page.toString());
  if (params?.size !== undefined) query.append('size', params.size.toString());
  
  const qString = query.toString() ? `?${query.toString()}` : '';
  return ticketRequest<PageTicketResponse>(`/api/v1/admin/tickets/initiated${qString}`);
}

// API: (Chưa có trên backend) Lấy danh sách tất cả các ticket
// Giả định backend sẽ làm API này ở GET /api/v1/tickets
export async function getAllTickets(params?: PageableParams): Promise<PageTicketResponse> {
  const query = new URLSearchParams();
  if (params?.page !== undefined) query.append('page', params.page.toString());
  if (params?.size !== undefined) query.append('size', params.size.toString());
  
  const qString = query.toString() ? `?${query.toString()}` : '';
  return ticketRequest<PageTicketResponse>(`/api/v1/tickets${qString}`);
}
