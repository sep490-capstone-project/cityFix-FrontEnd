import { APP_CONFIG } from '../config';
import { getAccessToken, ApiError, ApiResponse } from './auth';

const BASE_URL = APP_CONFIG.API_BASE_URL.replace(/\/+$/, '');

export interface NotificationItem {
  notificationId: string;
  userId?: string;
  ticketId?: string;
  title: string;
  content: string;
  readAt?: string | null;
  createdAt: string;
  read: boolean;
}

export interface PageNotificationResponse {
  totalPages: number;
  totalElements: number;
  size: number;
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
  content: NotificationItem[];
}

export interface GetNotificationsParams {
  isRead?: boolean;
  page?: number;
  size?: number;
  sort?: string;
}

async function notificationRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAccessToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const payload: ApiResponse<T> | null = await response.json().catch(() => null);

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiError(
      payload?.message || `Lỗi yêu cầu thông báo (${response.status})`,
      response.status,
      payload
    );
  }

  return (payload?.data !== undefined ? payload.data : payload) as T;
}

/**
 * 1. Lấy danh sách thông báo của người dùng hiện tại
 * GET /api/v1/notifications
 */
export async function getNotifications(
  params?: GetNotificationsParams
): Promise<PageNotificationResponse> {
  const query = new URLSearchParams();
  if (params?.isRead !== undefined) {
    query.append('isRead', String(params.isRead));
  }
  if (params?.page !== undefined) {
    query.append('page', String(params.page));
  }
  if (params?.size !== undefined) {
    query.append('size', String(params.size));
  }
  if (params?.sort) {
    query.append('sort', params.sort);
  } else {
    query.append('sort', 'createdAt,desc');
  }

  const qs = query.toString();
  return notificationRequest<PageNotificationResponse>(
    `/api/v1/notifications${qs ? `?${qs}` : ''}`,
    { method: 'GET' }
  );
}

/**
 * 2. Đếm số lượng thông báo chưa đọc
 * GET /api/v1/notifications/unread-count
 */
export async function getUnreadNotificationCount(): Promise<number> {
  try {
    const res = await notificationRequest<any>(
      '/api/v1/notifications/unread-count',
      { method: 'GET' }
    );
    if (typeof res === 'number') return res;
    if (typeof res?.data === 'number') return res.data;
    if (typeof res?.count === 'number') return res.count;
    return 0;
  } catch (err) {
    console.warn('Lỗi khi lấy số thông báo chưa đọc:', err);
    return 0;
  }
}

/**
 * 3. Đánh dấu một thông báo đã đọc
 * PATCH /api/v1/notifications/{id}/read
 */
export async function markNotificationAsRead(
  id: string
): Promise<NotificationItem> {
  return notificationRequest<NotificationItem>(
    `/api/v1/notifications/${encodeURIComponent(id)}/read`,
    { method: 'PATCH' }
  );
}

/**
 * 4. Đánh dấu tất cả thông báo đã đọc
 * PATCH /api/v1/notifications/read-all
 */
export async function markAllNotificationsAsRead(): Promise<any> {
  return notificationRequest<any>(
    '/api/v1/notifications/read-all',
    { method: 'PATCH' }
  );
}
