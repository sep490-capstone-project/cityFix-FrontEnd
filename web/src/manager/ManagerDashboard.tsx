import { useState, useEffect } from 'react';
import { User, statusInfo, sevInfo, dangerInfo } from '../data';
import { getManagerTickets, ManagerTicketItem } from '../services';

interface Props {
  currentUser: User;
  onOpenTicket: (ticketOrId: any) => void;
  onViewAll: () => void;
}

export default function ManagerDashboard({ currentUser, onOpenTicket, onViewAll }: Props) {
  const [tickets, setTickets] = useState<ManagerTicketItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchDashboardData() {
      setLoading(true);
      try {
        const res = await getManagerTickets({
          departmentId: currentUser.departmentId || undefined,
          page: 0,
          size: 50,
        });
        setTickets(res.content || []);
      } catch (err) {
        console.warn('Lỗi tải dữ liệu ManagerDashboard:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchDashboardData();
  }, [currentUser.departmentId]);

  const assignedToMe = tickets.filter(
    (t) => t.assigneeId === currentUser.userId || t.steps?.some((s) => s.assigneeId === currentUser.userId)
  );
  const inProgress = tickets.filter((t) => t.status === 'IN_PROGRESS');
  const critical = tickets.filter((t) => t.severity === 'CRITICAL' || t.isLifeThreatening);
  const resolved = tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'COMPLETED');

  const KPIS = [
    { label: 'Hồ sơ của tôi', value: String(assignedToMe.length), color: 'text-orange-600' },
    { label: 'Đang xử lý', value: String(inProgress.length), color: 'text-blue-600' },
    { label: 'Khẩn cấp / Nguy hiểm', value: String(critical.length), color: 'text-red-600' },
    { label: 'Đã giải quyết', value: String(resolved.length), color: 'text-emerald-600' },
  ];

  const deptQueue = tickets.filter((t) => !t.assigneeId || t.status === 'OPEN' || t.status === 'INITIATED');

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* Cảnh báo đe dọa tính mạng */}
      {critical.filter((t) => t.isLifeThreatening).length > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-red-300 bg-red-50/90 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <p className="text-[13px] font-bold text-red-900">
              Có {critical.filter((t) => t.isLifeThreatening).length} hồ sơ trong cơ quan bạn có nguy cơ đe dọa an toàn / tính mạng người dân!
            </p>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <div key={i} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs relative overflow-hidden">
            <p className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">{k.label}</p>
            <span className={`font-display text-[36px] font-black leading-none block ${k.color}`}>
              {loading ? '...' : k.value}
            </span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* Danh sách hồ sơ gần đây */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
            <SectionLabel>Hồ sơ phòng ban gần đây</SectionLabel>
            <button
              onClick={onViewAll}
              className="text-[12px] text-orange-600 hover:text-orange-700 font-bold transition-colors cursor-pointer"
            >
              Xem tất cả ({tickets.length}) →
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/80">
                  {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ', 'MỨC ĐỘ', 'NGUY HIỂM', 'TRẠNG THÁI', 'NGÀY TẠO'].map((h) => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tickets.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-gray-400 text-xs">
                      {loading ? 'Đang tải dữ liệu...' : 'Chưa có hồ sơ nào trong phòng ban'}
                    </td>
                  </tr>
                )}
                {tickets.slice(0, 6).map((t) => {
                  const ticketId = t.id || t.ticketId || '';
                  const si = statusInfo(t.status as any);
                  const sv = sevInfo(t.severity || 'LOW');
                  const di = dangerInfo(t.dangerLevel || 'SAFE');
                  return (
                    <tr
                      key={ticketId}
                      onClick={() => onOpenTicket(t)}
                      className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {t.isLifeThreatening && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                          <span className="font-mono-cf text-[11px] font-bold text-gray-700 group-hover:text-orange-600">
                            #{ticketId.slice(0, 8)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] font-bold text-gray-800 max-w-[140px] truncate">
                        {t.categoryName || 'Chưa phân loại'}
                      </td>
                      <td className="px-4 py-3 text-[11px] text-gray-600 max-w-[160px] truncate">{t.address || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sv.cls}`}>{sv.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${di.cls}`}>{di.label}</span>
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

        {/* Hàng đợi chưa phân công / đang mở */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-200 flex items-center justify-between bg-gray-50/50">
              <SectionLabel>Hồ sơ cần xử lý</SectionLabel>
              <span className="font-mono-cf text-[12px] font-bold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200">
                {deptQueue.length}
              </span>
            </div>
            {deptQueue.length === 0 ? (
              <p className="px-5 py-8 text-[12px] text-gray-400 text-center">Không có hồ sơ nào đang chờ</p>
            ) : (
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto scrollbar-thin">
                {deptQueue.slice(0, 6).map((t) => {
                  const ticketId = t.id || t.ticketId || '';
                  const sv = sevInfo(t.severity || 'LOW');
                  return (
                    <button
                      key={ticketId}
                      onClick={() => onOpenTicket(t)}
                      className="w-full px-5 py-3 flex items-center gap-3 hover:bg-orange-50/40 transition-colors text-left cursor-pointer"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[12px] font-bold text-gray-800 truncate">{t.categoryName || 'Sự cố'}</p>
                        <p className="text-[11px] text-gray-500 truncate">{t.address || `#${ticketId.slice(0, 8)}`}</p>
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
      <div className="flex flex-col gap-0.5 opacity-70">
        <div className="h-0.5 w-3 rounded-full bg-orange-500" />
        <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
      </div>
      <p className="font-display text-[13px] font-extrabold text-gray-900 uppercase tracking-wide">{children}</p>
    </div>
  );
}
