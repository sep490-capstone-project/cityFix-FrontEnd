import { useNavigate } from 'react-router-dom';
import {
  TICKETS,
  getDept,
  getCat,
  statusInfo,
  sevInfo,
  dangerInfo,
} from '../data';

interface Props {
  onOpenTicket: (id: string) => void;
  onViewAll: () => void;
}

const DEPT_PERF = [
  { deptId: 'D002', total: 12, assigned: 9, inProgress: 5, completed: 6 },
  { deptId: 'D005', total: 8, assigned: 7, inProgress: 4, completed: 3 },
  { deptId: 'D004', total: 5, assigned: 4, inProgress: 2, completed: 2 },
  { deptId: 'D006', total: 6, assigned: 6, inProgress: 1, completed: 5 },
];

export default function Dashboard({ onOpenTicket, onViewAll }: Props) {
  const lifeThreats = TICKETS.filter((t) => t.isLifeThreatening);
  const pendingReview = TICKETS.filter(
    (t) => t.status === 'PENDING_REVIEW'
  );
  const inProgress = TICKETS.filter(
    (t) => t.status === 'IN_PROGRESS'
  );
  const assigned = TICKETS.filter((t) => t.status === 'ASSIGNED');
  const completed = TICKETS.filter((t) => t.status === 'COMPLETED');

  // Flow 5: SOS
  const sosCritical = TICKETS.filter(
    (t) =>
      (t.dangerLevel === 'DANGEROUS' ||
        t.dangerLevel === 'CRITICAL') &&
      t.status !== 'RESOLVED' &&
      t.status !== 'COMPLETED'
  );

  // Flow 4: Repeated issues
  const repeatIssues = TICKETS.filter((t) => t.isRepeatIssue);

  const KPIS = [
    {
      label: 'Tổng hồ sơ',
      value: String(TICKETS.length),
      color: 'text-orange-500',
      trend: '+19%',
      path: '/tickets',
    },
    {
      label: 'Chờ xét duyệt',
      value: String(pendingReview.length),
      color: 'text-amber-500',
      trend: '',
      path: '/manual-review',
    },
    {
      label: 'Đe dọa tính mạng',
      value: String(lifeThreats.length),
      color: 'text-red-500',
      trend: '!',
      path: '/tickets',
    },
    {
      label: 'Đã phân công',
      value: String(assigned.length),
      color: 'text-purple-500',
      trend: '',
      path: '/tickets',
    },
    {
      label: 'Đang xử lý',
      value: String(inProgress.length),
      color: 'text-orange-500',
      trend: '',
      path: '/tickets',
    },
    {
      label: 'Hoàn thành',
      value: String(completed.length),
      color: 'text-green-600',
      trend: '+8%',
      path: '/tickets',
    },
  ];

  const navigate = useNavigate();

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* =========================
          LIFE THREAT ALERT
      ========================== */}
      {lifeThreats.length > 0 && (
        <div className="relative rounded-2xl overflow-hidden border border-red-200">
          <div className="absolute inset-0 bg-gradient-to-r from-red-50 via-red-50/80 to-white" />

          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{
              background:
                'repeating-linear-gradient(-45deg,#ef4444,#ef4444 8px,transparent 8px,transparent 16px)',
            }}
          />

          <div className="relative flex items-center gap-4 px-5 py-3.5">
            <div className="relative flex-shrink-0">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <div className="absolute inset-0 w-3 h-3 rounded-full bg-red-500 animate-ping-slow" />
            </div>

            <div>
              <p className="text-[13px] font-bold text-red-600">
                {lifeThreats.length} Hồ sơ có nguy cơ đe dọa tính mạng đang chờ xử lý
              </p>

              <p className="text-[11px] text-red-400 mt-0.5">
                {lifeThreats.map((t) => t.ticketId).join(' · ')}
              </p>
            </div>

            <button
              onClick={onViewAll}
              className="ml-auto text-[11px] font-bold text-red-600 border border-red-200 bg-white/60 rounded-lg px-3 py-1.5 hover:bg-red-50 transition-colors"
            >
              Xem ngay →
            </button>
          </div>
        </div>
      )}

      {/* =========================
          KPI GRID
      ========================== */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
        {KPIS.map((k, i) => (
          <div
            key={i}
            onClick={() => navigate(k.path)}
              className="relative bg-white border border-gray-200 rounded-2xl px-4 py-4 overflow-hidden shadow-sm cursor-pointer hover:shadow-md hover:border-orange-200 transition-all active:scale-[0.98]"
          >
            <div className="absolute top-0 right-0 w-12 h-1.5 overflow-hidden rounded-bl-lg">
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  background:
                    'repeating-linear-gradient(-45deg,#f97316,#f97316 3px,transparent 3px,transparent 6px)',
                }}
              />
            </div>

            <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] mb-1.5 leading-tight">
              {k.label}
            </p>

            <span
              className={`font-display text-[38px] font-extrabold leading-none block ${k.color}`}
            >
              {k.value}
            </span>

            {k.trend && (
              <p className="text-[9px] font-bold text-orange-500 mt-0.5 tracking-wide">
                {k.trend} tuần này
              </p>
            )}
          </div>
        ))}
      </div>

      {/* =========================
          MAIN CONTENT
      ========================== */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 items-start">
        {/* =========================
            RECENT TICKETS
        ========================== */}
        <div className="xl:col-span-2 self-start bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-5 pt-3.5 pb-3 border-b border-gray-100 flex items-center justify-between">
            <SectionLabel>Hồ sơ mới nhất</SectionLabel>

            <button
              onClick={onViewAll}
              className="text-[11px] text-orange-500 hover:text-orange-600 font-semibold transition-colors"
            >
              Xem tất cả →
            </button>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-left min-w-[800px]">
              <thead>
                <tr className="border-b border-gray-100">
                  {[
                    'ID',
                    'Danh mục',
                    'Tỉnh/TP',
                    'Phường',
                    'Cơ quan',
                    'Phụ trách',
                    'Mức độ',
                    'Nguy hiểm',
                    'Trạng thái',
                    'Ngày tạo',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {TICKETS.slice(0, 7).map((t) => {
                  const dept = getDept(t.departmentId);
                  const cat = getCat(t.categoryId);

                  return (
                    <tr
                      key={t.ticketId}
                      onClick={() => onOpenTicket(t.ticketId)}
                      className="hover:bg-orange-50/50 transition-colors cursor-pointer group"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {t.isLifeThreatening && (
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                          )}

                          <span className="font-mono-cf text-[10px] text-gray-500">
                            {t.ticketId}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3 text-[12px] text-gray-700 max-w-[140px] truncate">
                        {cat?.name}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-gray-500 whitespace-nowrap">
                        {t.province}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[100px] truncate">
                        {t.ward}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[130px] truncate">
                        {dept?.name}
                      </td>

                      <td className="px-4 py-3 text-[11px] text-gray-500">
                        {t.assigneeId ?? '—'}
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(t.severity).cls}`}
                        >
                          {sevInfo(t.severity).label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(t.dangerLevel).cls}`}
                        >
                          {dangerInfo(t.dangerLevel).label}
                        </span>
                      </td>

                      <td className="px-4 py-3">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${statusInfo(t.status).cls}`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${statusInfo(t.status).dot}`}
                          />
                          {statusInfo(t.status).label}
                        </span>
                      </td>

                      <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">
                        {t.createdAt}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* =========================
            RIGHT COLUMN
        ========================== */}
        <div className="space-y-4">
          {/* =========================
              SOS
          ========================== */}
          {sosCritical.length > 0 && (
            <div className="bg-white border border-red-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 pt-3.5 pb-3 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <div className="w-2 h-2 rounded-full bg-red-500" />
                    <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping-slow" />
                  </div>

                  <p className="font-display text-[13px] font-bold text-red-600 uppercase tracking-[0.12em]">
                    SOS — Cảnh báo nguy hiểm
                  </p>
                </div>

                <span className="font-display text-[20px] font-bold text-red-500">
                  {sosCritical.length}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {sosCritical.slice(0, 4).map((t) => {
                  const cat = getCat(t.categoryId);
                  const di = dangerInfo(t.dangerLevel);

                  return (
                    <button
                      key={t.ticketId}
                      onClick={() => onOpenTicket(t.ticketId)}
                      className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-red-50 transition-colors text-left"
                    >
                      {t.isLifeThreatening && (
                        <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 animate-pulse" />
                      )}

                      <div className="flex-1 min-w-0">
                        <p className="font-mono-cf text-[10px] text-gray-400">
                          {t.ticketId}
                        </p>

                        <p className="text-[12px] text-gray-700 truncate">
                          {cat?.name} — {t.ward}
                        </p>
                      </div>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${di.cls}`}
                      >
                        {di.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================
              REPEATED ISSUES
          ========================== */}
          {repeatIssues.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-2xl overflow-hidden shadow-sm">
              <div className="px-5 pt-3.5 pb-3 border-b border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" />
                    <line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>

                  <p className="font-display text-[13px] font-bold text-amber-600 uppercase tracking-[0.12em]">
                    Hồ sơ lặp lại (Flow 4)
                  </p>
                </div>

                <span className="font-display text-[20px] font-bold text-amber-500">
                  {repeatIssues.length}
                </span>
              </div>

              <div className="divide-y divide-gray-100">
                {repeatIssues.map((t) => {
                  const cat = getCat(t.categoryId);

                  return (
                    <button
                      key={t.ticketId}
                      onClick={() => onOpenTicket(t.ticketId)}
                      className="w-full px-5 py-2.5 flex items-center gap-3 hover:bg-amber-50 transition-colors text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-mono-cf text-[10px] text-gray-400">
                          {t.ticketId}
                        </p>

                        <p className="text-[12px] text-gray-700 truncate">
                          {cat?.name} — {t.ward}
                        </p>
                      </div>

                      <div className="flex-shrink-0 text-right">
                        <p className="text-[10px] font-bold text-amber-600">
                          ×{t.repeatCount} lần
                        </p>

                        <p className="text-[9px] text-gray-400">
                          lặp lại
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="px-5 py-3 border-t border-gray-100">
                <p className="text-[10px] text-gray-400">
                  ⚠ Hồ sơ lặp lại ≥ 2 lần → Kích hoạt cảnh báo & trừ điểm hiệu suất cơ quan
                </p>
              </div>
            </div>
          )}

          {/* =========================
              DEPARTMENT PERFORMANCE
          ========================== */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
            <div className="px-5 pt-3.5 pb-3 border-b border-gray-100">
              <SectionLabel>Hiệu suất cơ quan</SectionLabel>
            </div>

            <div className="divide-y divide-gray-100">
              {DEPT_PERF.map((dp) => {
                const dept = getDept(dp.deptId);
                const pct = Math.round(
                  (dp.completed / dp.total) * 100
                );

                return (
                  <div key={dp.deptId} className="px-5 py-3.5">
                    <p className="text-[12px] text-gray-700 font-semibold truncate mb-2 leading-tight">
                      {dept?.name}
                    </p>

                    <div className="grid grid-cols-3 gap-1 mb-2">
                      {[
                        {
                          label: 'Tổng',
                          val: dp.total,
                          cls: 'text-gray-500',
                        },
                        {
                          label: 'Đang xử',
                          val: dp.inProgress,
                          cls: 'text-orange-500',
                        },
                        {
                          label: 'Xong',
                          val: dp.completed,
                          cls: 'text-green-600',
                        },
                      ].map((s) => (
                        <div
                          key={s.label}
                          className="text-center bg-gray-50 rounded-lg py-1.5"
                        >
                          <p
                            className={`font-display text-[18px] font-bold ${s.cls}`}
                          >
                            {s.val}
                          </p>

                          <p className="text-[9px] text-gray-400 uppercase tracking-wide">
                            {s.label}
                          </p>
                        </div>
                      ))}
                    </div>

                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-600 to-orange-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>

                    <p className="text-[10px] text-gray-400 mt-1">
                      {pct}% hoàn thành
                    </p>
                  </div>
                );
              })}
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

      <p className="font-display text-[14px] font-bold text-gray-900 uppercase tracking-[0.12em]">
        {children}
      </p>
    </div>
  );
}