/**
 * CityFix Mobile Design System - Typography Tokens
 * Thang đo chuẩn Type Scale đồng bộ cho toàn bộ ứng dụng CityFix Mobile
 */
import { Platform } from 'react-native';

export const FONT_FAMILY = {
  regular: Platform.select({ ios: 'System', android: 'Roboto', default: 'System' }),
  mono: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
};

export const FONT_SIZE = {
  // 1. Hero / Large Title (Số liệu thống kê nổi bật, Màn hình Welcome)
  hero: 24,
  // 2. Screen Title (Tiêu đề màn hình chính, Tên người dùng Header)
  title: 20,
  // 3. Section Title (Tiêu đề khối danh mục, tiêu đề card lớn)
  section: 16,
  // 4. Body Large / Button (Nút bấm CTA chính, nhãn form, tên sự cố danh sách)
  bodyLarge: 14,
  // 5. Body Regular (Nội dung mô tả sự cố, địa chỉ chi tiết, văn bản thông báo)
  body: 13,
  // 6. Caption / Subtext (Thời gian, ngày gửi, người báo cáo, lời chào Header)
  caption: 11,
  // 7. Badge / Tag (Tag trạng thái ĐANG XỬ LÝ/HOÀN THÀNH, badge đếm thông báo)
  badge: 10,
  // 8. Micro (Nhãn siêu nhỏ, hint phụ)
  micro: 9,
} as const;

export const FONT_WEIGHT = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
  black: '900',
} as const;
