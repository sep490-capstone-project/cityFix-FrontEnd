import type { ReactNode } from 'react';

/**
 * Chuẩn khung & tiêu đề trang dùng chung cho cả 3 cổng Admin – Manager – Staff.
 * Mọi trang nội dung đều dùng PAGE_CONTAINER làm khung ngoài cùng để độ rộng,
 * khoảng đệm và khoảng cách giữa các khối luôn nhất quán khi chuyển trang.
 */
export const PAGE_CONTAINER = 'p-6 space-y-5 max-w-7xl mx-auto screen-enter';

export const PAGE_HEADER_CARD = 'bg-white border border-gray-200 rounded-2xl p-5 shadow-xs';
export const PAGE_TITLE = 'font-display text-xl lg:text-2xl font-extrabold text-gray-900';
export const PAGE_SUBTITLE = 'text-[12px] text-gray-500 mt-1';

/** Nút "Quay lại" chuẩn dùng trong tiêu đề trang chi tiết */
export function PageBackButton({ onClick, label = 'Quay lại' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-[12px] font-semibold transition-colors cursor-pointer active:scale-95"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="15 18 9 12 15 6" />
      </svg>
      {label}
    </button>
  );
}

interface PageHeaderProps {
  /** Tiêu đề chính của trang */
  title: ReactNode;
  /** Mô tả ngắn bên dưới tiêu đề */
  subtitle?: ReactNode;
  /** Các huy hiệu hiển thị cạnh tiêu đề */
  badges?: ReactNode;
  /** Thành phần đứng trước khối tiêu đề (vd: nút Quay lại) */
  leading?: ReactNode;
  /** Nhóm nút thao tác bên phải */
  actions?: ReactNode;
  /** Nội dung phụ bên dưới hàng tiêu đề (vd: tab, bộ lọc nhanh) */
  children?: ReactNode;
}

export default function PageHeader({ title, subtitle, badges, leading, actions, children }: PageHeaderProps) {
  return (
    <div className={`${PAGE_HEADER_CARD} ${children ? 'space-y-4' : ''}`}>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          {leading}
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className={PAGE_TITLE}>{title}</h1>
              {badges}
            </div>
            {subtitle && <div className={PAGE_SUBTITLE}>{subtitle}</div>}
          </div>
        </div>
        {actions && (
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">{actions}</div>
        )}
      </div>
      {children}
    </div>
  );
}
