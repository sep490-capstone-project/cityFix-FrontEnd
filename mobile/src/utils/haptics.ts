import { Vibration, Platform } from 'react-native';

/**
 * Tiện ích rung: CHỈ rung khi có thông báo mới đến.
 * Tất cả các thao tác bấm UI thông thường (tab, nút, kéo trang, nhập liệu) hoàn toàn KHÔNG rung.
 */
export const Haptics = {
  /** Rung duy nhất khi có thông báo mới đến */
  notifyNew: () => {
    try {
      if (Platform.OS === 'ios') {
        Vibration.vibrate([0, 25, 70, 35]);
      } else {
        Vibration.vibrate([0, 40, 90, 50]);
      }
    } catch {}
  },

  // Các hàm khác giữ no-op để triệt tiêu mọi hiệu ứng rung khi bấm nút hay thao tác UI
  light: () => {},
  medium: () => {},
  success: () => {},
  warning: () => {},
};
