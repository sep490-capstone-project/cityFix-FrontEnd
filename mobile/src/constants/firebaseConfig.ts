export const FIREBASE_CONFIG = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID || '',
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID || '',
};

/**
 * Chuẩn hóa số điện thoại Việt Nam sang chuẩn quốc tế E.164 (+84...) để gửi SMS Firebase
 * Ví dụ: "0901 234 567" -> "+84901234567"
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
