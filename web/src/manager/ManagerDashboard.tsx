import { TICKETS, User, getCat, statusInfo, sevInfo, dangerInfo } from '../data';

interface Props {
  currentUser: User;
  onOpenTicket: (id: string) => void;
  onViewAll: () => void;
}

export default function ManagerDashboard({ currentUser, onOpenTicket, onViewAll }: Props) {
  // My tickets = assigned to me OR in my department
  const myTickets = TICKETS.filter(t =>
    t.assigneeId === currentUser.userId || t.departmentId === currentUser.departmentId
  );
  const assignedToMe = myTickets.filter(t => t.assigneeId === currentUser.userId && t.status === 'ASSIGNED');
  const inProgress   = myTickets.filter(t => t.assigneeId === currentUser.userId && t.status === 'IN_PROGRESS');
  const critical     = myTickets.filter(t => t.severity === 'CRITICAL' || t.isLifeThreatening);
  const resolved     = myTickets.filter(t => t.status === 'RESOLVED' || t.status === 'COMPLETED');

  const KPIS = [
    { label: 'Được giao cho tôi', value: String(assignedToMe.length + inProgress.length), color: 'text-orange-400' },
    { label: 'Đang xử lý',        value: String(inProgress.length),   color: 'text-orange-400' },
    { label: 'Nghiêm trọng',      value: String(critical.length),     color: 'text-red-300'    },
    { label: 'Đã giải quyết',     value: String(resolved.length),     color: 'text-green-400'  },
  ];

  const deptQueue = TICKETS.filter(t =>
    t.departmentId === currentUser.departmentId && !t.assigneeId
  );

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* Life-threat warning */}
      {critical.filter(t => t.isLifeThreatening).length > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-red-500/40">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 to-white" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ background: 'repeating-linear-gradient(-45deg,#ef4444,#ef4444 8px,transparent 8px,transparent 16px)' }} />
          <div className="relative flex items-center gap-3 px-5 py-3.5">
            <div className="relative flex-shrink-0">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <div className="absolute inset-0 w-2.5 h-2.5 rounded-full bg-red-500 animate-ping-slow" />
            </div>
            <p className="text-[13px] font-bold text-red-300">
              {critical.filter(t => t.isLifeThreatening).length} hồ sơ trong khu vực của bạn có nguy cơ đe dọa tính mạng
            </p>
          </div>
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {KPIS.map((k, i) => (
          <div key={i} className="relative bg-white border border-gray-200 rounded-2xl px-4 py-4 overflow-hidden card-depth">
            <div className="absolute top-0 right-0 w-12 h-1.5 overflow-hidden rounded-bl-lg">
              <div style={{ width: '100%', height: '100%', background: 'repeating-linear-gradient(-45deg,#f97316,#f97316 3px,transparent 3px,transparent 6px)' }} />
            </div>
            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] mb-2 leading-tight">{k.label}</p>
            <span className={`font-display text-[42px] font-extrabold leading-none block ${k.color}`}>{k.value}</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* My Recent Tickets */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200 flex items-center justify-between">
            <SectionLabel>Hồ sơ được giao cho tôi</SectionLabel>
            <button onClick={onViewAll} className="text-[11px] text-orange-400 hover:text-orange-300 font-semibold transition-colors">
              Xem tất cả →
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left min-w-[640px]">
              <thead>
                <tr className="border-b border-gray-200">
                  {['ID', 'Danh mục', 'Phường', 'Mức độ', 'Nguy hiểm', 'Trạng thái', 'Ngày tạo'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {myTickets.filter(t => t.assigneeId === currentUser.userId).length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-10 text-center">
                    <p className="text-gray-400 text-[13px]">Chưa có hồ sơ nào được giao cho bạn</p>
                  </td></tr>
                )}
                {myTickets.filter(t => t.assigneeId === currentUser.userId).slice(0, 6).map(t => {
                  const cat = getCat(t.categoryId);
                  const si = statusInfo(t.status);
                  const sv = sevInfo(t.severity);
                  const di = dangerInfo(t.dangerLevel);
                  return (
                    <tr key={t.ticketId}
                      onClick={() => onOpenTicket(t.ticketId)}
                      className="hover:bg-orange-50/50 transition-colors cursor-pointer group">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {t.isLifeThreatening && <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />}
                          <span className="font-mono-cf text-[10px] text-gray-500">{t.ticketId}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-[12px] text-gray-800 max-w-[140px] truncate group-hover:text-gray-900 transition-colors">{cat?.name}</td>
                      <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[100px] truncate">{t.ward}</td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sv.cls}`}>{sv.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${di.cls}`}>{di.label}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${si.cls}`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                          {si.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">{t.createdAt}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Department queue */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-200 flex items-center justify-between">
              <SectionLabel>Hàng đợi cơ quan</SectionLabel>
              <span className="font-display text-[18px] font-bold text-gray-500">{deptQueue.length}</span>
            </div>
            {deptQueue.length === 0
              ? <p className="px-5 py-6 text-[12px] text-gray-300">Không có hồ sơ chờ phân công</p>
              : (
                <div className="divide-y divide-gray-100">
                  {deptQueue.slice(0, 5).map(t => {
                    const cat = getCat(t.categoryId);
                    const sv = sevInfo(t.severity);
                    return (
                      <button key={t.ticketId} onClick={() => onOpenTicket(t.ticketId)}
                        className="w-full px-5 py-3 flex items-center gap-3 hover:bg-orange-50/50 transition-colors text-left">
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] text-gray-700 truncate">{cat?.name}</p>
                          <p className="text-[10px] text-gray-400 truncate">{t.ward}</p>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${sv.cls}`}>{sv.label}</span>
                      </button>
                    );
                  })}
                </div>
              )
            }
          </div>

          
        
        {/* Notifications */}
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
            <SectionLabel>Thông báo hoạt động</SectionLabel>
          </div>
          <div className="p-2 max-h-60 overflow-y-auto scrollbar-thin">
            <div onClick={() => onOpenTicket('CF-2851')} className="cursor-pointer transition-all hover:bg-blue-100 hover:border-blue-200 p-3 mb-2 bg-blue-50/50 rounded-xl border border-blue-100">
              <p className="text-[12px] text-gray-800"><b>CF-2851</b> (SOS) đã được chuyển đến phòng ban của bạn.</p>
              <p className="text-[10px] text-gray-400 mt-1">2 phút trước</p>
            </div>
            <div onClick={() => onOpenTicket('CF-2853')} className="cursor-pointer transition-all hover:bg-gray-100 hover:border-gray-300 p-3 mb-2 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[12px] text-gray-800">Trần Minh Quân (STAFF) đã cập nhật trạng thái <b>CF-2853</b> thành ĐANG XỬ LÝ.</p>
              <p className="text-[10px] text-gray-400 mt-1">10 phút trước</p>
            </div>
            <div onClick={() => onOpenTicket('CF-2848')} className="cursor-pointer transition-all hover:bg-red-50 hover:border-red-200 p-3 bg-gray-50 rounded-xl border border-gray-100">
              <p className="text-[12px] text-gray-800"><b>CF-2848</b> đang chờ phân công khẩn cấp (SLA đe dọa).</p>
              <p className="text-[10px] text-gray-400 mt-1">1 giờ trước</p>
            </div>
          </div>
        </div>

          {/* Quick stats */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-200">
              <SectionLabel>Thống kê cá nhân</SectionLabel>
            </div>
            <div className="divide-y divide-gray-100">
              {[
                { label: 'Tổng được giao', val: String(myTickets.filter(t => t.assigneeId === currentUser.userId).length) },
                { label: 'Hoàn thành hôm nay', val: String(resolved.length) },
                { label: 'Tỷ lệ hoàn thành', val: myTickets.length > 0 ? `${Math.round((resolved.length / Math.max(myTickets.filter(t => t.assigneeId === currentUser.userId).length, 1)) * 100)}%` : '—' },
              ].map(s => (
                <div key={s.label} className="flex items-center justify-between px-5 py-2.5">
                  <p className="text-[12px] text-gray-500">{s.label}</p>
                  <p className="font-display text-[20px] font-bold text-orange-400">{s.val}</p>
                </div>
              ))}
            </div>
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
        <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-90" />
        <div className="h-0.5 w-3 rounded-full bg-orange-500 opacity-50" />
      </div>
      <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">{children}</p>
    </div>
  );
}
