

import { fetch as expoFetch } from 'expo/fetch';
import { File } from 'expo-file-system';

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
  categoryId: string;
  categoryName?: string | null;
  subCategoryId?: string;
  subCategoryName?: string | null;
  severity: string;
  priority?: string;
  dangerLevel?: string;
  confidenceScore: number;
  description: string;
  isValidIssue?: boolean;
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
  categoryId: string;
  // subCategoryId: string;
  subCategoryIds: string[];
  severity: string;
  priority: string;
  dangerLevel?: string;
  locationMethod: 'AUTO_GPS' | 'MANUAL_ENTRY' | string;
  address: string;
  latitude: number;
  longitude: number;
  confidenceScore?: number;
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
    categoryId: data.categoryId,
    subCategoryIds: Array.isArray(data.subCategoryIds) && data.subCategoryIds.length > 0
      ? data.subCategoryIds
      : (data as any).subCategoryId
      ? [(data as any).subCategoryId]
      : [],
    severity: data.severity,
    priority: data.priority,
    dangerLevel: data.dangerLevel,
    locationMethod: data.locationMethod,
    address: data.address,
    latitude: data.latitude,
    longitude: data.longitude,
    confidenceScore: data.confidenceScore ?? data.aiConfidenceScore ?? 0,
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