

import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

console.log('🌐 API BASE URL:', API_BASE_URL);

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

interface LoginData {
  accessToken: string;
  refreshToken?: string;
  role?: string;
}

export interface LoginResult {
  accessToken: string;
  refreshToken?: string;
  role?: string;
}

export interface UserProfile {
  fullName: string;
  phoneNumber: string;
  address: string;
  province: string;
  ward: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  fullName: string;
  phoneNumber: string;
  province: string;
  ward: string;
  address: string;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/* =========================================================
   AUTH
   ========================================================= */

export async function login(
  email: string,
  password: string
): Promise<LoginResult> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}/api/v1/auth/login`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      }
    );
  } catch {
    throw new ApiError(
      'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
    );
  }

  const payload =
    (await response.json().catch(() => null)) as
    | ApiResponse<LoginData>
    | null;

  const message =
    payload?.message ||
    'Đăng nhập không thành công. Vui lòng thử lại.';

  if (
    !response.ok ||
    !payload?.success ||
    !payload.data?.accessToken
  ) {
    throw new ApiError(message, response.status);
  }

  return payload.data;
}

/* =========================================================
   USER PROFILE
   ========================================================= */

export async function getProfile(accessToken: string): Promise<UserProfile> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/api/v1/profile`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
    });
  } catch {
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
  }

  const payload = (await response.json().catch(() => null)) as
    | ApiResponse<UserProfile>
    | null;

  const message =
    payload?.message || 'Không thể lấy thông tin profile người dùng.';

  if (!response.ok || !payload?.success || !payload.data) {
    throw new ApiError(message, response.status);
  }

  return payload.data;
}

/* =========================================================
   GENERIC POST
   ========================================================= */

async function post<T>(
  path: string,
  body: unknown
): Promise<ApiResponse<T>> {
  let response: Response;

  try {
    response = await fetch(
      `${API_BASE_URL}${path}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      }
    );
  } catch {
    throw new ApiError(
      'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
    );
  }

  const payload =
    (await response.json().catch(() => null)) as
    | ApiResponse<T>
    | null;

  const message =
    payload?.message ||
    'Yêu cầu không thành công. Vui lòng thử lại.';

  if (!response.ok || !payload?.success) {
    throw new ApiError(message, response.status);
  }

  return payload;
}

/* =========================================================
   REGISTER
   ========================================================= */

export async function register(
  payload: RegisterPayload
): Promise<void> {
  await post('/api/v1/auth/register', {
    ...payload,
    email: payload.email.trim(),
    fullName: payload.fullName.trim(),
    phoneNumber: payload.phoneNumber.replace(/\s/g, ''),
    province: payload.province.trim(),
    ward: payload.ward.trim(),
    address: payload.address.trim(),
  });
}

/* =========================================================
   VERIFY EMAIL
   ========================================================= */

export async function verifyEmail(
  email: string,
  otp: string
): Promise<void> {
  await post('/api/v1/auth/verify-email', {
    email: email.trim(),
    otp: otp.trim(),
  });
}

/* =========================================================
   UPLOAD REPORT IMAGE
   STEP 2
   POST /api/v1/tickets/upload-image
   ========================================================= */

interface UploadImageItem {
  publicId: string;
  secureUrl: string;
  format?: string;
  width?: number;
  height?: number;
  bytes?: number;
  createdAt?: string;
}

interface UploadImageResponse {
  success: boolean;
  message?: string;
  data?: UploadImageItem[];
}

// export async function uploadReportImage(
//   uri: string,
//   accessToken: string
// ): Promise<string> {
//   const formData = new FormData();

//   formData.append(
//     'files',
//     {
//       uri,
//       name: `report-${Date.now()}.jpg`,
//       type: 'image/jpeg',
//     } as any
//   );

//   let response: Response;

//   try {
//     response = await fetch(
//       `${API_BASE_URL}/api/v1/tickets/upload-image?folder=cityfix%2Freports`,
//       {
//         method: 'POST',
//         headers: {
//           Accept: 'application/json',
//           Authorization: `Bearer ${accessToken}`,
//         },
//         body: formData,
//       }
//     );
//   } catch {
//     throw new ApiError(
//       'Không thể kết nối đến máy chủ. Vui lòng thử lại.'
//     );
//   }

//   const payload =
//     (await response.json().catch(() => null)) as
//       | UploadImageResponse
//       | null;

//   const message =
//     payload?.message ||
//     'Tải ảnh lên thất bại. Vui lòng thử lại.';

//   if (
//     !response.ok ||
//     !payload?.success ||
//     !payload.data?.length
//   ) {
//     throw new ApiError(message, response.status);
//   }

//   const secureUrl = payload.data[0]?.secureUrl;

//   if (!secureUrl) {
//     throw new ApiError(
//       'Upload thành công nhưng server không trả về secureUrl.'
//     );
//   }

//   return secureUrl;
// }


export async function uploadReportImage(
  uri: string,
  accessToken: string
): Promise<string> {
  const url =
    `${API_BASE_URL}/api/v1/tickets/upload-image?folder=cityfix%2Freports`;

  console.log('==============================');
  console.log('📤 START UPLOAD');
  console.log('🌐 URL:', url);
  console.log('📱 URI:', uri);
  console.log('🔑 TOKEN:', accessToken ? 'EXISTS' : 'NULL');
  console.log('==============================');

  try {
    // Convert local URI thành Expo File
    const file = new File(uri);

    console.log('📄 File created:', file.name);
    console.log('📏 File size:', file.size);

    const formData = new FormData();

    formData.append('files', file as any);

    console.log('🚀 Sending request...');

    const response = await expoFetch(url, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: formData,
    });

    console.log('✅ RESPONSE RECEIVED');
    console.log('📡 STATUS:', response.status);
    console.log('📡 OK:', response.ok);

    const text = await response.text();

    console.log('📦 RESPONSE BODY:', text);

    if (!response.ok) {
      throw new ApiError(
        `Upload failed: ${response.status} - ${text}`
      );
    }

    const payload = JSON.parse(text);

    console.log('📦 PARSED DATA:', payload);

    const secureUrl = payload?.data?.[0]?.secureUrl;

    if (!secureUrl) {
      throw new ApiError(
        'Server không trả về secureUrl.'
      );
    }

    console.log('☁️ CLOUDINARY URL:', secureUrl);

    return secureUrl;
  } catch (error) {
    console.error('==============================');
    console.error('❌ UPLOAD ERROR');
    console.error('❌ ERROR:', error);
    console.error(
      '❌ MESSAGE:',
      error instanceof Error
        ? error.message
        : 'unknown'
    );
    console.error('==============================');

    if (error instanceof ApiError) {
      throw error;
    }

    throw new ApiError(
      error instanceof Error
        ? error.message
        : 'Không thể upload ảnh.'
    );
  }
}


/* =========================================================
   AI ANALYSIS
   STEP 3
   POST /api/v1/tickets/analyze
   ========================================================= */

export interface AIAnalysisResponse {
  analysisId?: string;
  subCategoryIds?: string[];
  subCategoryNames?: string[];
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  confidenceScore: number;
  description: string;
  isValidIssue?: boolean;
  urgency?: number;
  impact?: number;
  severityScore?: number;
  context?: number;
  baseScore?: number;
  finalPriorityScore?: number;
  priorityReasoning?: string;
  // Fallbacks / legacy
  categoryId?: string;
  categoryName?: string | null;
  subCategoryId?: string;
  subCategoryName?: string | null;
  severity?: string;
  dangerLevel?: string;
}

export async function analyzeReportImage(
  imageUrl: string,
  accessToken: string
): Promise<AIAnalysisResponse> {
  const url = `${API_BASE_URL}/api/v1/tickets/analyze`;

  console.log('==============================');
  console.log('🤖 START ANALYZE API');
  console.log('🌐 URL:', url);
  console.log('🖼️ IMAGE:', imageUrl);
  console.log('🔑 TOKEN:', accessToken ? 'EXISTS' : 'NULL');
  console.log('==============================');

  let response: Response;

  try {
    response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        mediaUrl: imageUrl,
        mediaUrls: [imageUrl],
      }),
    });
  } catch (error) {
    console.error('❌ FETCH ERROR:', error);

    throw new ApiError(
      error instanceof Error
        ? error.message
        : 'Không thể kết nối đến máy chủ.'
    );
  }

  console.log('📡 ANALYZE STATUS:', response.status);
  console.log('📡 ANALYZE OK:', response.ok);

  const text = await response.text();

  console.log('📦 ANALYZE RESPONSE:', text);

  let payload: any = null;

  try {
    payload = JSON.parse(text);
  } catch {
    console.log('⚠️ Response không phải JSON');
  }

  console.log('🤖 AI PAYLOAD:', payload);

  if (!response.ok) {
    throw new ApiError(
      payload?.message ||
      `AI Analyze failed: ${response.status}`,
      response.status
    );
  }

  if (!payload?.success || !payload?.data) {
    throw new ApiError(
      payload?.message ||
      'Backend không trả về kết quả AI.',
      response.status
    );
  }

  return payload.data;
}





export interface CreateTicketRequest {
  description: string;
  imageUrl: string;
  subCategoryIds: string[];
  priority: string;
  priorityReasoning?: string;
  locationMethod: 'AUTO_GPS' | 'MANUAL_ENTRY' | string;
  address: string;
  latitude: number;
  longitude: number;
  confidenceScore?: number;
  isAnonymous?: boolean;
  // Optional / legacy fields (omitted from outgoing payload)
  categoryId?: string;
  severity?: string;
  dangerLevel?: string;
  aiCategoryId?: string;
  aiSeverity?: string;
  aiDangerLevel?: string;
  aiDescription?: string;
  aiConfidenceScore?: number;
  isAiAccepted?: boolean;
}

export interface DuplicateTicketItem {
  id?: string;
  ticketId?: string;
  categoryId?: string;
  categoryName?: string;
  description?: string;
  address?: string;
  imageUrl?: string;
  latitude?: number;
  longitude?: number;
  distance?: number | string;
  distanceMeters?: number;
  upvotes?: number;
  status?: string;
  createdAt?: string;
  similarity?: number;
}

/* =========================================================
   CREATE TICKET
   POST /api/v1/tickets
   ========================================================= */

export async function createTicket(
  data: CreateTicketRequest,
  accessToken: string
) {
  const payloadBody = {
    description: data.description,
    imageUrl: data.imageUrl,
    categoryId: data.categoryId || (Array.isArray(data.subCategoryIds) && data.subCategoryIds[0]) || '',
    subCategoryIds: Array.isArray(data.subCategoryIds) && data.subCategoryIds.length > 0
      ? data.subCategoryIds
      : (data as any).subCategoryId
        ? [(data as any).subCategoryId]
        : [],
    severity: (data.severity || data.priority || 'LOW').toUpperCase(),
    priority: (data.priority || data.severity || 'LOW').toUpperCase(),
    dangerLevel: (data.dangerLevel || 'CAUTION').toUpperCase(),
    priorityReasoning: data.priorityReasoning || '',
    locationMethod: data.locationMethod || 'AUTO_GPS',
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    confidenceScore: data.confidenceScore ?? data.aiConfidenceScore ?? 0,
    isAnonymous: data.isAnonymous ?? false,
  };

  console.log('🎫 PAYLOAD SENT TO BACKEND:', JSON.stringify(payloadBody, null, 2));

  const response = await fetch(
    `${API_BASE_URL}/api/v1/tickets`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payloadBody),
    }
  );

  const text = await response.text();

  console.log('🎫 CREATE TICKET STATUS:', response.status);
  console.log('🎫 CREATE TICKET RESPONSE:', text);

  let payload: any = null;

  try {
    payload = JSON.parse(text);
  } catch {
    // Response không phải JSON
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message ||
      `Tạo báo cáo thất bại (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

/* =========================================================
   CHECK DUPLICATES
   GET /api/v1/tickets/check-duplicates
   ========================================================= */

export interface CheckDuplicatesParams {
  categoryId: string;
  latitude?: number;
  longitude?: number;
  location?: string;
}

export async function checkDuplicates(
  params: CheckDuplicatesParams,
  accessToken: string
): Promise<DuplicateTicketItem[]> {
  const query = new URLSearchParams();
  query.append('categoryId', params.categoryId);
  if (params.latitude !== undefined) {
    query.append('latitude', params.latitude.toString());
  }
  if (params.longitude !== undefined) {
    query.append('longitude', params.longitude.toString());
  }
  if (params.location) {
    query.append('location', params.location);
  }

  const url = `${API_BASE_URL}/api/v1/tickets/check-duplicates?${query.toString()}`;

  console.log('🔍 CHECK DUPLICATES URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await response.text();
  console.log('🔍 CHECK DUPLICATES RESPONSE:', text);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    //
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message ||
      `Kiểm tra trùng lặp thất bại (${response.status})`,
      response.status
    );
  }

  return Array.isArray(payload.data) ? payload.data : [];
}

/* =========================================================
   UPVOTE TICKET
   POST /api/v1/tickets/{id}/upvote
   ========================================================= */

export async function upvoteTicket(
  ticketId: string,
  accessToken: string
): Promise<void> {
  const url = `${API_BASE_URL}/api/v1/tickets/${ticketId}/upvote`;
  console.log('👍 UPVOTE TICKET URL:', url);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
  });

  const text = await response.text();
  console.log('👍 UPVOTE TICKET RESPONSE:', text);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    //
  }

  if (!response.ok || (payload && payload.success === false)) {
    throw new ApiError(
      payload?.message ||
      `Upvote thất bại (${response.status})`,
      response.status
    );
  }
}

/* =========================================================
   MY REPORTED TICKETS
   GET /api/v1/tickets/my-reports
   ========================================================= */

export interface SubCategoryItem {
  subCategoryId: string;
  categoryId: string;
  name: string;
  description?: string;
  sla?: number;
  priority?: string;
  active?: boolean;
}

export interface ReportedTicket {
  id: string;
  description: string;
  imageUrl?: string;
  imageUrls?: string[];
  categoryId?: string;
  categoryName?: string;
  categories?: Array<{ categoryId: string; categoryName: string }>;
  subCategories?: SubCategoryItem[];
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string;
  priorityReasoning?: string;
  locationMethod?: 'AUTO_GPS' | 'MANUAL_ENTRY' | string;
  address?: string;
  status: 'INITIATED' | 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'RESOLVED' | 'COMPLETED' | 'REJECTED' | 'CANCELLED' | string;
  latitude?: number;
  longitude?: number;
  reviewNote?: string;
  isAnonymous?: boolean;
  createdBy?: string;
  creatorFullName?: string;
  creatorPhoneNumber?: string;
  images?: string[];
  createdAt: string;
  deadline: string | null;
  departmentId?: string;
  departmentName?: string;
  steps?: Array<{
    id?: string;
    stepId?: string;
    stepName?: string;
    assigneeId?: string;
    assigneeName?: string;
    status?: string;
    dependsOnStepIds?: string[];
    deadline?: string;
    evidences?: Array<{
      evidenceId?: string;
      imageUrl?: string;
      resolutionNote?: string;
      staffName?: string;
      createdAt?: string;
    }>;
  }>;
}

export interface PageResponse<T> {
  totalPages: number;
  totalElements: number;
  size: number;
  content: T[];
  number: number;
  numberOfElements: number;
  first: boolean;
  last: boolean;
  empty: boolean;
}

export async function getMyReportedTickets(
  accessToken?: string | null,
  page: number = 0,
  size: number = 20,
  sort: string = 'createdAt,desc'
): Promise<PageResponse<ReportedTicket>> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }

  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort,
  });

  const url = `${API_BASE_URL}/api/v1/tickets/my-reports?${queryParams.toString()}`;
  console.log('📋 GET MY REPORTED TICKETS URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  console.log('📋 GET MY REPORTED TICKETS STATUS:', response.status);
  console.log('📋 GET MY REPORTED TICKETS RESPONSE:', text);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Response không phải JSON
  }

  if (!response.ok || !payload?.success) {
    const defaultMsg = response.status >= 500
      ? 'Máy chủ backend đang gặp sự cố tạm thời (500). Vui lòng thử lại sau.'
      : `Không thể tải danh sách báo cáo (${response.status})`;
    throw new ApiError(
      payload?.message && payload?.message !== 'An unexpected error occurred'
        ? payload.message
        : defaultMsg,
      response.status
    );
  }

  return payload.data;
}

/* =========================================================
   CANCEL TICKET
   PUT /api/v1/tickets/{id}/cancel
   Người dân hủy vé do chính mình tạo (khi ở trạng thái INITIATED)
   ========================================================= */

export async function cancelTicket(
  ticketId: string,
  accessToken?: string | null
): Promise<ReportedTicket> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }

  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const url = `${API_BASE_URL}/api/v1/tickets/${ticketId}/cancel`;
  console.log('🚫 CANCEL TICKET URL:', url);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'PUT',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });
  } catch {
    throw new ApiError('Không thể kết nối đến máy chủ. Vui lòng thử lại.');
  }

  const text = await response.text();
  console.log('🚫 CANCEL TICKET STATUS:', response.status);
  console.log('🚫 CANCEL TICKET RESPONSE:', text);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Response không phải JSON
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Hủy vé thất bại (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

/* =========================================================
   GET TICKET BY ID
   GET /api/v1/tickets/{ticketId}
   ========================================================= */

export async function getTicketById(
  ticketId: string,
  accessToken?: string | null
): Promise<ReportedTicket> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }

  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const url = `${API_BASE_URL}/api/v1/tickets/${encodeURIComponent(ticketId)}`;
  console.log('📋 GET TICKET BY ID URL:', url);

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const text = await response.text();
    let payload: any = null;
    try {
      payload = JSON.parse(text);
    } catch {
      // not json
    }

    if (response.ok && payload?.success && payload?.data) {
      return payload.data;
    }
  } catch (err) {
    console.warn('Lỗi gọi GET /api/v1/tickets/{id}:', err);
  }

  // Fallback: Tìm trong danh sách vé đã báo cáo của người dùng
  try {
    const page = await getMyReportedTickets(token, 0, 50);
    const found = page.content?.find(
      (t) => (t.id || (t as any).ticketId) === ticketId
    );
    if (found) return found;
  } catch (e) {
    console.warn('Fallback tìm vé trong my-reports thất bại:', e);
  }

  throw new ApiError('Không tìm thấy thông tin sự cố.', 404);
}

export function mapBackendStatus(status?: string): {
  statusText: string;
  statusKey: 'received' | 'processing' | 'done' | 'rejected' | 'cancelled';
  color: string;
  bgColor: string;
  borderColor: string;
} {
  const upper = (status || '').toUpperCase();
  switch (upper) {
    case 'INITIATED':
      return {
        statusText: 'ĐÃ TIẾP NHẬN',
        statusKey: 'received',
        color: '#64748b',
        bgColor: '#f8fafc',
        borderColor: '#e2e8f0',
      };
    case 'OPEN':
    case 'ASSIGNED':
    case 'IN_PROGRESS':
      return {
        statusText: upper === 'ASSIGNED' ? 'ĐÃ PHÂN CÔNG' : 'ĐANG XỬ LÝ',
        statusKey: 'processing',
        color: '#ea580c',
        bgColor: 'rgba(249, 115, 22, 0.08)',
        borderColor: 'rgba(249, 115, 22, 0.25)',
      };
    case 'RESOLVED':
    case 'COMPLETED':
      return {
        statusText: 'HOÀN THÀNH',
        statusKey: 'done',
        color: '#16a34a',
        bgColor: '#f0fdf4',
        borderColor: '#bbf7d0',
      };
    case 'REJECTED':
      return {
        statusText: 'TỪ CHỐI',
        statusKey: 'rejected',
        color: '#dc2626',
        bgColor: '#fef2f2',
        borderColor: '#fca5a5',
      };
    case 'CANCELLED':
      return {
        statusText: 'ĐÃ HỦY',
        statusKey: 'cancelled',
        color: '#64748b',
        bgColor: '#f1f5f9',
        borderColor: '#cbd5e1',
      };
    default:
      return {
        statusText: status || 'CHỜ XỬ LÝ',
        statusKey: 'received',
        color: '#64748b',
        bgColor: '#f8fafc',
        borderColor: '#e2e8f0',
      };
  }
}

/* =========================================================
   NOTIFICATIONS
   ========================================================= */

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

export async function getNotifications(
  isRead?: boolean,
  page: number = 0,
  size: number = 20,
  sort: string = 'createdAt,desc'
): Promise<PageNotificationResponse> {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort,
  });

  if (isRead !== undefined) {
    queryParams.append('isRead', String(isRead));
  }

  const url = `${API_BASE_URL}/api/v1/notifications?${queryParams.toString()}`;
  console.log('🔔 GET NOTIFICATIONS URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // not json
  }

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Không thể tải thông báo (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) return 0;

  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/notifications/unread-count`, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    });

    const payload = await response.json().catch(() => null);
    if (payload?.success && typeof payload.data === 'number') {
      return payload.data;
    }
    if (typeof payload?.data?.count === 'number') {
      return payload.data.count;
    }
    return 0;
  } catch (err) {
    console.warn('Lỗi lấy số thông báo chưa đọc:', err);
    return 0;
  }
}

export async function markNotificationAsRead(id: string): Promise<NotificationItem> {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const response = await fetch(
    `${API_BASE_URL}/api/v1/notifications/${encodeURIComponent(id)}/read`,
    {
      method: 'PATCH',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
    }
  );

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Không thể đánh dấu đã đọc (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

export async function markAllNotificationsAsRead(): Promise<any> {
  const token = await AsyncStorage.getItem('accessToken');
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const response = await fetch(`${API_BASE_URL}/api/v1/notifications/read-all`, {
    method: 'PATCH',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Không thể đánh dấu tất cả đã đọc (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

/* =========================================================
   MY UPVOTED TICKETS
   GET /api/v1/tickets/my-upvoted
   ========================================================= */

export async function getMyUpvotedTickets(
  accessToken?: string | null,
  page: number = 0,
  size: number = 20,
  sort: string = 'createdAt,desc'
): Promise<PageResponse<ReportedTicket>> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }

  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    size: String(size),
    sort,
  });

  const url = `${API_BASE_URL}/api/v1/tickets/my-upvoted?${queryParams.toString()}`;
  console.log('👍 GET MY UPVOTED TICKETS URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  console.log('👍 GET MY UPVOTED TICKETS STATUS:', response.status);
  console.log('👍 GET MY UPVOTED TICKETS RESPONSE:', text);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {
    // Response không phải JSON
  }

  if (!response.ok || !payload?.success) {
    const defaultMsg = response.status >= 500
      ? 'Máy chủ backend đang gặp sự cố tạm thời (500). Vui lòng thử lại sau.'
      : `Không thể tải danh sách vé đã upvote (${response.status})`;
    throw new ApiError(
      payload?.message && payload?.message !== 'An unexpected error occurred'
        ? payload.message
        : defaultMsg,
      response.status
    );
  }

  return payload.data;
}

/* =========================================================
   RATING MANAGEMENT
   /api/v1/user/tickets/...
   ========================================================= */

export interface TicketRating {
  id: string;
  ticketId: string;
  userId: string;
  userName?: string;
  userAvatar?: string;
  rate: number;
  isAnonymous?: boolean;
  feedback?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateRatingRequest {
  rate: number;
  feedback?: string;
  isAnonymous?: boolean;
}

export interface UpdateRatingRequest {
  rate: number;
  feedback?: string;
  isAnonymous?: boolean;
}

// 1. Tạo đánh giá cho vé
// POST /api/v1/user/tickets/{ticketId}/ratings
export async function createRating(
  ticketId: string,
  data: CreateRatingRequest,
  accessToken?: string | null
): Promise<TicketRating> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const url = `${API_BASE_URL}/api/v1/user/tickets/${ticketId}/ratings`;
  console.log('⭐ CREATE RATING URL:', url, 'DATA:', data);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  console.log('⭐ CREATE RATING STATUS:', response.status);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {}

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Đánh giá vé thất bại (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

// 2. Chỉnh sửa đánh giá
// PUT /api/v1/user/tickets/{ticketId}/ratings/{ratingId}
export async function updateRating(
  ticketId: string,
  ratingId: string,
  data: UpdateRatingRequest,
  accessToken?: string | null
): Promise<TicketRating> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const url = `${API_BASE_URL}/api/v1/user/tickets/${ticketId}/ratings/${ratingId}`;
  console.log('⭐ UPDATE RATING URL:', url, 'DATA:', data);

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(data),
  });

  const text = await response.text();
  console.log('⭐ UPDATE RATING STATUS:', response.status);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {}

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Cập nhật đánh giá thất bại (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

// 3. Lấy đánh giá của người dùng hiện tại trên một vé
// GET /api/v1/user/tickets/{ticketId}/ratings/my-rating
export async function getMyRating(
  ticketId: string,
  accessToken?: string | null
): Promise<TicketRating | null> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const url = `${API_BASE_URL}/api/v1/user/tickets/${ticketId}/ratings/my-rating`;
  console.log('⭐ GET MY RATING URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  console.log('⭐ GET MY RATING STATUS:', response.status);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {}

  if (!response.ok || !payload?.success) {
    if (response.status === 404) return null;
    throw new ApiError(
      payload?.message || `Không thể tải đánh giá của bạn (${response.status})`,
      response.status
    );
  }

  return payload.data || null;
}

// 4. Lấy danh sách đánh giá của một vé
// GET /api/v1/user/tickets/{ticketId}/ratings
export async function getTicketRatings(
  ticketId: string,
  page: number = 0,
  size: number = 10,
  accessToken?: string | null
): Promise<PageResponse<TicketRating>> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const queryParams = new URLSearchParams({
    page: String(page),
    size: String(size),
  });

  const url = `${API_BASE_URL}/api/v1/user/tickets/${ticketId}/ratings?${queryParams.toString()}`;
  console.log('⭐ GET TICKET RATINGS URL:', url);

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  console.log('⭐ GET TICKET RATINGS STATUS:', response.status);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {}

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Không thể tải danh sách đánh giá (${response.status})`,
      response.status
    );
  }

  return payload.data;
}

// 5. Xóa mềm đánh giá
// DELETE /api/v1/user/tickets/{ticketId}/ratings/{ratingId}
export async function deleteRating(
  ticketId: string,
  ratingId: string,
  accessToken?: string | null
): Promise<string> {
  let token = accessToken;
  if (!token) {
    token = await AsyncStorage.getItem('accessToken');
  }
  if (!token) {
    throw new ApiError('Phiên đăng nhập đã hết. Vui lòng đăng nhập lại.', 401);
  }

  const url = `${API_BASE_URL}/api/v1/user/tickets/${ticketId}/ratings/${ratingId}`;
  console.log('⭐ DELETE RATING URL:', url);

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const text = await response.text();
  console.log('⭐ DELETE RATING STATUS:', response.status);

  let payload: any = null;
  try {
    payload = JSON.parse(text);
  } catch {}

  if (!response.ok || !payload?.success) {
    throw new ApiError(
      payload?.message || `Không thể xóa đánh giá (${response.status})`,
      response.status
    );
  }

  return payload.data;
}