import { useState, useEffect, useRef } from 'react';
import {
  NotificationItem,
  getNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
} from '../services';

interface Props {
  onOpenTicket?: (ticketId: string) => void;
  accentColor?: string; // Kept for compatibility with existing callers.
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';

  const date = new Date(dateStr);
  const now = new Date();
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (isNaN(diffSec)) return dateStr;
  if (diffSec < 60) return 'Vừa xong';

  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;

  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} giờ trước`;

  const diffDay = Math.floor(diffHour / 24);
  if (diffDay < 7) return `${diffDay} ngày trước`;

  return date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function NotificationBell({ onOpenTicket }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);

  // Refresh unread count every 45 seconds.
  useEffect(() => {
    let mounted = true;

    async function fetchCount() {
      try {
        const count = await getUnreadNotificationCount();
        if (mounted) setUnreadCount(count);
      } catch (e) {
        console.warn('Lỗi tải số thông báo chưa đọc:', e);
      }
    }

    fetchCount();
    const interval = setInterval(fetchCount, 45000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Load notifications when the dropdown opens or the filter changes.
  useEffect(() => {
    if (!isOpen) return;

    let active = true;

    async function loadList() {
      setLoading(true);
      try {
        const res = await getNotifications({
          isRead: filter === 'unread' ? false : undefined,
          page: 0,
          size: 30,
          sort: 'createdAt,desc',
        });

        if (active && res && Array.isArray(res.content)) {
          setNotifications(res.content);
        }
      } catch (err) {
        console.warn('Lỗi tải danh sách thông báo:', err);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadList();

    return () => {
      active = false;
    };
  }, [isOpen, filter]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark one notification as read.
  async function handleItemClick(item: NotificationItem) {
    if (!item.read) {
      try {
        await markNotificationAsRead(item.notificationId);

        setNotifications((prev) =>
          prev.map((n) =>
            n.notificationId === item.notificationId
              ? { ...n, read: true, readAt: new Date().toISOString() }
              : n
          )
        );

        setUnreadCount((prev) => Math.max(0, prev - 1));
      } catch (e) {
        console.warn('Lỗi đánh dấu đã đọc:', e);
      }
    }

    if (item.ticketId && onOpenTicket) {
      setIsOpen(false);
      onOpenTicket(item.ticketId);
    }
  }

  // Mark all notifications as read.
  async function handleMarkAllRead() {
    if (unreadCount === 0 || markingAll) return;

    setMarkingAll(true);
    try {
      await markAllNotificationsAsRead();

      setNotifications((prev) =>
        prev.map((n) => ({
          ...n,
          read: true,
          readAt: new Date().toISOString(),
        }))
      );

      setUnreadCount(0);
    } catch (e) {
      console.warn('Lỗi đánh dấu tất cả đã đọc:', e);
    } finally {
      setMarkingAll(false);
    }
  }

  const displayedList =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div className="relative" ref={containerRef}>
      {/* Notification bell */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg border transition-colors ${
          isOpen
            ? 'border-slate-300 bg-slate-100 text-slate-900'
            : 'border-transparent text-slate-600 hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900'
        }`}
        title="Thông báo hệ thống"
        aria-label={`Thông báo${unreadCount > 0 ? `, ${unreadCount} chưa đọc` : ''}`}
        aria-expanded={isOpen}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>

        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-orange-600 px-1 text-[10px] font-semibold leading-none text-white">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 z-50 mt-2 flex max-h-[min(620px,85vh)] w-[min(390px,calc(100vw-2rem))] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3.5">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-slate-900">
                Thông báo
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Cập nhật và hoạt động gần đây
              </p>
            </div>

            {unreadCount > 0 && (
              <span className="ml-3 shrink-0 rounded-md bg-orange-50 px-2 py-1 text-xs font-medium text-orange-700">
                {unreadCount} chưa đọc
              </span>
            )}
          </div>

          {/* Filters and bulk action */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2">
            <div className="flex items-center gap-1" role="tablist" aria-label="Lọc thông báo">
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'all'}
                onClick={() => setFilter('all')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-white hover:text-slate-800'
                }`}
              >
                Tất cả
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={filter === 'unread'}
                onClick={() => setFilter('unread')}
                className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  filter === 'unread'
                    ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
                    : 'text-slate-500 hover:bg-white hover:text-slate-800'
                }`}
              >
                Chưa đọc
                {unreadCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-orange-600 px-1.5 py-0.5 text-[10px] font-semibold text-white">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </button>
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                disabled={markingAll}
                className="shrink-0 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {markingAll ? 'Đang xử lý...' : 'Đánh dấu đã đọc'}
              </button>
            )}
          </div>

          {/* Notification list */}
          <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center gap-3 px-4 py-12 text-slate-500">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-slate-300 border-t-slate-700" />
                <span className="text-xs">Đang tải thông báo...</span>
              </div>
            ) : displayedList.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-500">
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-slate-800">
                  {filter === 'unread'
                    ? 'Bạn không có thông báo chưa đọc'
                    : 'Chưa có thông báo nào'}
                </p>
                <p className="mx-auto mt-1.5 max-w-[260px] text-xs leading-5 text-slate-500">
                  Các cập nhật về hồ sơ và hoạt động hệ thống sẽ hiển thị tại đây.
                </p>
              </div>
            ) : (
              displayedList.map((item) => (
                <button
                  type="button"
                  key={item.notificationId}
                  onClick={() => handleItemClick(item)}
                  className={`relative flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-slate-400 ${
                    item.read ? 'bg-white' : 'bg-orange-50/40'
                  }`}
                >
                  <span
                    className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      item.read
                        ? 'bg-slate-100 text-slate-500'
                        : 'bg-orange-100 text-orange-700'
                    }`}
                    aria-hidden="true"
                  >
                    {item.ticketId ? (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M4 7V5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v2a3 3 0 0 0 0 6v2a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-2a3 3 0 0 0 0-6Z" />
                        <path d="M13 8v2M13 14v2" />
                      </svg>
                    ) : (
                      <svg
                        width="18"
                        height="18"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.7"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z" />
                        <path d="m9 12 2 2 4-4" />
                      </svg>
                    )}
                  </span>

                  <span className="min-w-0 flex-1">
                    <span className="flex items-start justify-between gap-2">
                      <span
                        className={`line-clamp-2 text-[13px] leading-5 ${
                          item.read
                            ? 'font-medium text-slate-800'
                            : 'font-semibold text-slate-950'
                        }`}
                      >
                        {item.title || 'Thông báo mới'}
                      </span>
                      <span className="shrink-0 pt-0.5 text-[10px] text-slate-400">
                        {formatRelativeTime(item.createdAt)}
                      </span>
                    </span>

                    <span
                      className={`mt-1 block line-clamp-2 text-xs leading-5 ${
                        item.read ? 'text-slate-500' : 'text-slate-700'
                      }`}
                    >
                      {item.content}
                    </span>

                    {item.ticketId && (
                      <span className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-slate-700">
                        Xem chi tiết hồ sơ
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M5 12h14M13 6l6 6-6 6" />
                        </svg>
                      </span>
                    )}
                  </span>

                  {!item.read && (
                    <span
                      className="absolute left-1 top-5 h-1.5 w-1.5 rounded-full bg-orange-600"
                      aria-label="Chưa đọc"
                    />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-200 bg-white px-4 py-2.5">
            <span className="text-[11px] text-slate-400">
              CityFix · Trung tâm thông báo
            </span>
            <button
              type="button"
              onClick={async () => {
                setLoading(true);
                try {
                  const res = await getNotifications({
                    isRead: filter === 'unread' ? false : undefined,
                    page: 0,
                    size: 30,
                    sort: 'createdAt,desc',
                  });

                  if (res && Array.isArray(res.content)) {
                    setNotifications(res.content);
                  }

                  const count = await getUnreadNotificationCount();
                  setUnreadCount(count);
                } catch (err) {
                  console.warn('Lỗi làm mới thông báo:', err);
                } finally {
                  setLoading(false);
                }
              }}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M20 7v5h-5M4 17v-5h5" />
                <path d="M5.6 9A7 7 0 0 1 18 6l2 6M4 12l2 6a7 7 0 0 0 12.4-3" />
              </svg>
              Làm mới
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
