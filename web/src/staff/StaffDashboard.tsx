import { useState, useEffect } from 'react';
import { User, statusInfo, sevInfo, priorityInfo } from '../data';
import { getStaffAssignedTickets, StaffTicketItem } from '../services';

interface Props {
  currentUser: User;
  onOpenTicket: (ticketOrId: any) => void;
  onViewAll: () => void;
}

export default function StaffDashboard({ currentUser, onOpenTicket, onViewAll }: Props) {
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadDashboardTickets() {
      setLoading(true);
      try {
        const res = await getStaffAssignedTickets({ page: 0, size: 100 });
        setTickets(res.content || []);
      } catch (err) {
        console.warn('Lỗi tải dữ liệu dashboard cán bộ:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardTickets();
  }, [currentUser.userId]);

  const assignedToMe = tickets.filter(
    (t) => t.assigneeId === currentUser.userId && t.status === 'ASSIGNED'
  );
  const inProgress = tickets.filter(
    (t) => t.assigneeId === currentUser.userId && t.status === 'IN_PROGRESS'
  );
  const critical = tickets.filter(
    (t) => t.severity === 'CRITICAL' || t.isLifeThreatening
  );
  const resolved = tickets.filter(
    (t) => t.status === 'RESOLVED' || t.status === 'COMPLETED'
  );

  const KPIS = [
    {
      label: 'Được giao cho tôi',
      value: String(assignedToMe.length + inProgress.length),
      color: 'text-orange-500',
    },
    {
      label: 'Đang xử lý',
      value: String(inProgress.length),
      color: 'text-orange-500',
    },
    {
      label: 'Nghiêm trọng',
      value: String(critical.length),
      color: 'text-rose-600',
    },
    {
      label: 'Đã giải quyết',
      value: String(resolved.length),
      color: 'text-emerald-600',
    },
  ];

  const deptQueue = tickets.filter((t) => !t.assigneeId || t.assigneeId !== currentUser.userId);

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* Cảnh báo khẩn cấp */}
      {critical.filter((t) => t.isLifeThreatening).length > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-red-300 bg-red-50 p-4">
          <div className="relative flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse flex-shrink-0" />
            <p className="text-[13px] font-bold text-red-900">
              Có {critical.filter((t) => t.isLifeThreatening).length} hồ sơ trong cơ quan của bạn được đánh dấu khẩn cấp
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <div
            key={i}
            className="relative bg-white border border-gray-200 rounded-2xl px-5 py-4 overflow-hidden shadow-xs"
          >
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2 leading-tight">
              {k.label}
            </p>
            <span className={`font-display text-[38px] font-extrabold leading-none block ${k.color}`}>
              {k.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Danh sách hồ sơ giao cho tôi */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200 flex items-center justify-between">
            <SectionLabel>Hồ sơ được giao cho tôi</SectionLabel>
            <button
              onClick={onViewAll}
              className="text-[11px] text-orange-600 hover:text-orange-700 font-bold transition-colors cursor-pointer"
            >
              Xem tất cả →
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70">
                  {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ', 'MỨC ĐỘ', 'ĐỘ ƯU TIÊN', 'TRẠNG THÁI', 'NGÀY TẠO'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.filter((t) => t.assigneeId === currentUser.userId).length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <p className="text-gray-400 text-[13px]">Chưa có hồ sơ nào được giao cho bạn</p>
                    </td>
                  </tr>
                )}
                {tickets
                  .filter((t) => t.assigneeId === currentUser.userId)
                  .slice(0, 6)
                  .map((t) => {
                    const ticketId = t.id || t.ticketId || '';
                    const si = statusInfo(t.status as any);
                    const sv = sevInfo(t.severity || 'LOW');
                    const pi = priorityInfo(t.priority || t.subCategories?.[0]?.priority);
                    return (
                      <tr
                        key={ticketId}
                        onClick={() => onOpenTicket(t)}
                        className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            {t.isLifeThreatening && (
                              <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                            <span className="font-mono-cf text-[11px] font-bold text-gray-800 group-hover:text-orange-600">
                              #{ticketId.slice(0, 8)}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[12px] font-semibold text-gray-800 max-w-[140px] truncate">
                          {t.categoryName || 'Chưa phân loại'}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[150px] truncate">
                          {t.address || '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sv.cls}`}>
                            {sv.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pi.cls}`}>
                            {pi.label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${si.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                            {si.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">
                          {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Hàng đợi cơ quan */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-200 flex items-center justify-between">
              <SectionLabel>Hàng đợi cơ quan</SectionLabel>
              <span className="font-display text-[16px] font-bold text-orange-600">{deptQueue.length}</span>
            </div>
            {deptQueue.length === 0 ? (
              <p className="px-5 py-6 text-[12px] text-gray-400 text-center">Không có hồ sơ chờ xử lý</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[350px] overflow-y-auto">
                {deptQueue.slice(0, 6).map((t) => {
                  const ticketId = t.id || t.ticketId || '';
                  const sv = sevInfo(t.severity || 'LOW');
                  return (
                    <button
                      key={ticketId}
                      onClick={() => onOpenTicket(t)}
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-orange-50/50 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-gray-800 truncate">
                          #{ticketId.slice(0, 8)} · {t.categoryName || 'Sự cố'}
                        </p>
                        <p className="text-[10px] text-gray-400 truncate">{t.address || 'Hiện trường'}</p>
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${sv.cls}`}>
                        {sv.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-orange-500" />
      <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-wider">{children}</p>
    </div>
  );
}
