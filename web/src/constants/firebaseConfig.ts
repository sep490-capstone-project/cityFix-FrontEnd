export const FIREBASE_CONFIG = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || '',
};

/**
 * Chuẩn hóa số điện thoại Việt Nam sang chuẩn quốc tế E.164 (+84...) để gửi SMS Firebase
 */
export function formatPhoneNumberE164(phone: string): string {
  const cleaned = (phone || '').replace(/[^\d+]/g, '');
  if (!cleaned) return '';
  if (cleaned.startsWith('+84')) {
    return cleaned;
  }
  if (cleaned.startsWith('84') && cleaned.length >= 11) {
    return `+${cleaned}`;
  }
  if (cleaned.startsWith('0')) {
    return `+84${cleaned.substring(1)}`;
  }
  return `+84${cleaned}`;
}

/**
 * Định dạng hiển thị số điện thoại thân thiện (VD: 0901 234 567)
 */
export function formatPhoneDisplay(phone: string): string {
  const digits = (phone || '').replace(/\s/g, '');
  let local = digits;
  if (local.startsWith('+84')) {
    local = '0' + local.substring(3);
  } else if (local.startsWith('84') && local.length >= 11) {
    local = '0' + local.substring(2);
  }
  if (local.length === 10) {
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return phone;
}

/**
 * Tải động Firebase Web SDK v10 chuẩn từ CDN Google
 */
export async function loadFirebaseSdk(): Promise<{
  firebaseApp: any;
  firebaseAuth: any;
  auth: any;
}> {
  const appModuleUrl = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
  const authModuleUrl = 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';

  const [firebaseApp, firebaseAuth]: [any, any] = await Promise.all([
    import(/* @vite-ignore */ appModuleUrl),
    import(/* @vite-ignore */ authModuleUrl),
  ]);

  const app =
    firebaseApp.getApps().length > 0
      ? firebaseApp.getApp()
      : firebaseApp.initializeApp(FIREBASE_CONFIG);
  const auth = firebaseAuth.getAuth(app);
  auth.languageCode = 'vi';

  return { firebaseApp, firebaseAuth, auth };
}

export function mapFirebaseError(code?: string, rawMessage?: string): string {
  if (!code && !rawMessage) return 'Đã xảy ra lỗi khi xác thực số điện thoại.';
  const c = (code || '').toLowerCase();
  if (c.includes('invalid-phone-number')) {
    return 'Số điện thoại không đúng định dạng hợp lệ (+84...).';
  }
  if (c.includes('too-many-requests') || c.includes('quota-exceeded')) {
    return 'Số điện thoại này đã yêu cầu mã OTP quá nhiều lần. Vui lòng thử lại sau ít phút.';
  }
  if (c.includes('invalid-verification-code')) {
    return 'Mã OTP bạn nhập không chính xác. Vui lòng kiểm tra lại tin nhắn SMS.';
  }
  if (c.includes('code-expired') || c.includes('session-expired')) {
    return 'Mã OTP đã hết hạn. Vui lòng bấm gửi lại mã mới.';
  }
  if (c.includes('captcha-check-failed')) {
    return 'Xác minh bảo mật reCAPTCHA không thành công. Vui lòng thử lại.';
  }
  if (c.includes('unauthorized-domain')) {
    return 'Tên miền hiện tại chưa được cấp phép trong Firebase Console (Authorized Domains).';
  }
  return rawMessage || 'Xác thực không thành công. Vui lòng thử lại.';
}

