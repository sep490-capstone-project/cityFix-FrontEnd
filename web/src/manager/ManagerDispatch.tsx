import { useState } from 'react';
import { TICKETS, SEV_MAP, DANGER_MAP, getCat, getDept, Severity, DangerLevel, sevInfo, dangerInfo, ROUTING_RULES } from '../data';

interface Props { onOpenTicket: (id: string) => void; }

type ReviewAction = 'approve' | 'modify' | 'reject';

export default function ManagerDispatch({ onOpenTicket }: Props) {
  const pending = TICKETS.filter(t => t.needsManualReview);
  const [selected, setSelected] = useState<string | null>(null);
  const [action, setAction] = useState<ReviewAction | null>(null);
  const [modSev, setModSev] = useState<Severity>('HIGH');
  const [modDanger, setModDanger] = useState<DangerLevel>('DANGEROUS');
  const [modCat, setModCat] = useState('CAT001');
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  // Flow 2: after approval, show routing result
  const [routingResult, setRoutingResult] = useState<{ ticketId: string; deptName: string; ruleId: string } | null>(null);

  const ticket = TICKETS.find(t => t.ticketId === selected);

  function submitDecision() {
    if (!selected || !ticket) return;
    // Flow 2: if approved/modified, compute routing result
    if (action === 'approve' || action === 'modify') {
      const rule = ROUTING_RULES.find(r => r.categoryId === ticket.categoryId);
      const dept = getDept(rule?.departmentId ?? ticket.departmentId);
      setRoutingResult({
        ticketId: selected,
        deptName: dept?.name ?? ticket.departmentId,
        ruleId: rule?.ruleId ?? 'N/A',
      });
    }
    setDone(d => [...d, selected]);
    setSelected(null);
    setAction(null);
    setConfirmed(false);
  }

  if (selected && ticket) {
    const cat = getCat(ticket.categoryId);
    return (
      <div className="p-6 space-y-5 screen-enter">
        <div className="flex items-center gap-3">
          <button onClick={() => { setSelected(null); setAction(null); setConfirmed(false); }}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors text-[13px] font-semibold active:scale-[0.97]">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
            Quay lại
          </button>
          <span className="font-mono-cf text-[12px] text-gray-400 tracking-widest">{ticket.ticketId}</span>
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-lg border text-amber-400 bg-amber-500/12 border-amber-500/25">
            Cần xét duyệt thủ công
          </span>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Ticket info */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
              <div className="px-5 pt-3 pb-2.5 border-b border-gray-200">
                <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">Thông tin Hồ sơ gốc</p>
              </div>
              <div className="divide-y divide-gray-100">
                {[
                  { label: 'Mã Hồ sơ', val: ticket.ticketId, mono: true },
                  { label: 'Danh mục', val: cat?.name ?? '' },
                  { label: 'Mô tả', val: ticket.description },
                  { label: 'Địa chỉ', val: `${ticket.address}, ${ticket.ward}` },
                  { label: 'Tỉnh/TP', val: ticket.province },
                ].map(r => (
                  <div key={r.label} className="flex items-start gap-3 px-5 py-2.5">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] w-28 flex-shrink-0 mt-0.5">{r.label}</p>
                    <p className={`text-[12px] text-gray-700 flex-1 ${r.mono ? 'font-mono-cf' : ''}`}>{r.val}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* AI result */}
            <div className="bg-white border border-orange-500/20 rounded-2xl overflow-hidden card-depth">
              <div className="px-5 pt-3 pb-2.5 border-b border-gray-200 flex items-center gap-2">
                <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">Kết quả AI</p>
                <span className="font-mono-cf text-[10px] text-orange-500/60 ml-auto">Confidence: {ticket.aiConfidence}%</span>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${ticket.aiConfidence}%`, background: 'linear-gradient(90deg,#9a3412,#f97316 55%,#fb923c)' }} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Mức độ AI</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(ticket.aiSeverity ?? ticket.severity).cls}`}>
                      {sevInfo(ticket.aiSeverity ?? ticket.severity).label}
                    </span>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Nguy hiểm AI</p>
                    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(ticket.aiDangerLevel ?? ticket.dangerLevel).cls}`}>
                      {dangerInfo(ticket.aiDangerLevel ?? ticket.dangerLevel).label}
                    </span>
                  </div>
                </div>
                <div>
                  <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Đe dọa tính mạng</p>
                  <span className={`text-[11px] font-bold ${ticket.isLifeThreatening ? 'text-red-400' : 'text-green-400'}`}>
                    {ticket.isLifeThreatening ? 'Có ⚠' : 'Không'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Admin decision */}
          <div className="space-y-4">
            <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
              <div className="px-5 pt-3 pb-2.5 border-b border-gray-200">
                <p className="font-display text-[13px] font-bold text-gray-900 uppercase tracking-[0.12em]">Quyết định Admin</p>
              </div>
              <div className="px-5 py-4 space-y-3">
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: 'approve', label: 'Phê duyệt', cls: 'border-green-500/30 hover:bg-green-500/10', active: 'bg-green-500/15 border-green-500/40 text-green-400' },
                    { key: 'modify',  label: 'Chỉnh sửa', cls: 'border-amber-500/30 hover:bg-amber-500/10', active: 'bg-amber-500/15 border-amber-500/40 text-amber-400' },
                    { key: 'reject',  label: 'Từ chối',   cls: 'border-red-500/30   hover:bg-red-500/10',   active: 'bg-red-500/15   border-red-500/40   text-red-400' },
                  ] as const).map(opt => (
                    <button key={opt.key} onClick={() => { setAction(opt.key); setConfirmed(false); }}
                      className={`py-2.5 rounded-xl border text-[12px] font-bold uppercase tracking-wide transition-all active:scale-[0.97]
                        ${action === opt.key ? opt.active : `border-gray-200 text-gray-500 ${opt.cls}`}`}>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {action === 'modify' && (
                  <div className="space-y-3 pt-2">
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.15em]">Chỉnh sửa thông tin</p>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Mức độ nghiêm trọng</label>
                      <select value={modSev} onChange={e => setModSev(e.target.value as Severity)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50">
                        {Object.entries(SEV_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em]">Mức nguy hiểm</label>
                      <select value={modDanger} onChange={e => setModDanger(e.target.value as DangerLevel)}
                        className="w-full bg-gray-50 border border-gray-300 rounded-xl px-3.5 py-2 text-[12px] text-gray-900 outline-none focus:border-orange-500/50">
                        {Object.entries(DANGER_MAP).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select>
                    </div>
                  </div>
                )}

                {action && !confirmed && (
                  <div className="relative rounded-xl border border-amber-500/30 bg-amber-500/8 px-4 py-3">
                    <p className="text-[12px] text-amber-300 mb-3">
                      Xác nhận{' '}
                      <strong>{action === 'approve' ? 'phê duyệt' : action === 'modify' ? 'chỉnh sửa và duyệt' : 'từ chối'}</strong>{' '}
                      Hồ sơ <span className="font-mono-cf">{ticket.ticketId}</span>?
                    </p>
                    <div className="flex gap-2">
                      <button onClick={() => setAction(null)}
                        className="flex-1 py-2 rounded-xl border border-gray-300 text-gray-600 text-[12px] font-semibold hover:text-gray-800 transition-colors">
                        Hủy
                      </button>
                      <button onClick={submitDecision}
                        className="flex-1 relative rounded-xl overflow-hidden py-2 active:scale-[0.97] transition-transform">
                        <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                        <span className="relative text-white font-bold uppercase tracking-wide text-[12px]">Xác nhận</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button onClick={() => onOpenTicket(ticket.ticketId)}
              className="w-full py-2.5 rounded-xl border border-gray-300 text-gray-600 hover:text-gray-800 text-[12px] font-semibold uppercase tracking-wide transition-colors active:scale-[0.97]">
              Xem toàn bộ chi tiết Hồ sơ →
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5 screen-enter">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-[18px] font-bold text-gray-900 uppercase tracking-wide">Xét duyệt thủ công</h2>
          <p className="text-[12px] text-gray-400 mt-0.5">Chỉ hiển thị Hồ sơ cần xác nhận bởi Admin</p>
        </div>
        <span className="font-display text-[28px] font-bold text-amber-400">{pending.filter(t => !done.includes(t.ticketId)).length}</span>
      </div>

      {/* Flow 2: Routing result after approval */}
      {routingResult && (
        <div className="relative rounded-2xl overflow-hidden border border-green-500/30">
          <div className="absolute inset-0 bg-green-50" />
          <div className="relative flex items-start gap-3 px-5 py-4">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0 mt-0.5"><polyline points="20 6 9 17 4 12"/></svg>
            <div className="flex-1">
              <p className="text-[13px] font-bold text-green-400">
                Hồ sơ <span className="font-mono-cf">{routingResult.ticketId}</span> đã được duyệt và định tuyến tự động
              </p>
              <div className="flex items-center gap-4 mt-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Cơ quan tiếp nhận</span>
                  <span className="text-[12px] text-green-300 font-semibold">{routingResult.deptName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Quy tắc</span>
                  <span className="font-mono-cf text-[11px] text-orange-400">{routingResult.ruleId}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Trạng thái mới</span>
                  <span className="text-[11px] font-bold text-blue-400 bg-blue-500/12 border border-blue-500/25 px-2 py-0.5 rounded-lg">OPEN → Chờ cơ quan tiếp nhận</span>
                </div>
              </div>
            </div>
            <button onClick={() => setRoutingResult(null)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>
          </div>
        </div>
      )}

      {/* Warning */}
      <div className="relative rounded-2xl overflow-hidden border border-amber-500/30">
        <div className="absolute inset-0 bg-gradient-to-r from-amber-50 to-white" />
        <div className="relative flex items-center gap-3 px-5 py-3.5">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          <p className="text-[13px] text-amber-300 font-semibold">
            Các Hồ sơ dưới đây có confidence AI thấp hoặc được đánh dấu đe dọa tính mạng — cần Quản lý điều phối trước khi định tuyến.
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200">
                {['ID', 'Danh mục', 'Tỉnh/TP', 'Phường', 'AI Confidence', 'Mức độ', 'Nguy hiểm', 'Đe dọa TM', 'Ngày tạo', 'Hành động'].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {pending.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center">
                  <p className="font-display text-2xl font-bold text-gray-300 uppercase">Không có Hồ sơ cần điều phối</p>
                </td></tr>
              )}
              {pending.map(t => {
                const isDone = done.includes(t.ticketId);
                const cat = getCat(t.categoryId);
                return (
                  <tr key={t.ticketId} className={`transition-colors ${isDone ? 'opacity-40' : 'hover:bg-orange-50/50'}`}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {t.isLifeThreatening && <span className="w-1.5 h-1.5 rounded-full bg-red-500" />}
                        <span className="font-mono-cf text-[10px] text-gray-500">{t.ticketId}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-[12px] text-gray-700 max-w-[140px] truncate">{cat?.name}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500">{t.province}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[110px] truncate">{t.ward}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-gradient-to-r from-orange-700 to-orange-400" style={{ width: `${t.aiConfidence}%` }} />
                        </div>
                        <span className="font-mono-cf text-[11px] text-orange-400">{t.aiConfidence}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sevInfo(t.severity).cls}`}>{sevInfo(t.severity).label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${dangerInfo(t.dangerLevel).cls}`}>{dangerInfo(t.dangerLevel).label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-[11px] font-bold ${t.isLifeThreatening ? 'text-red-400' : 'text-gray-400'}`}>
                        {t.isLifeThreatening ? 'Có ⚠' : 'Không'}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">{t.createdAt}</td>
                    <td className="px-4 py-3">
                      {isDone
                        ? <span className="text-[11px] text-green-400 font-semibold">✓ Đã xử lý</span>
                        : <button onClick={() => setSelected(t.ticketId)}
                            className="relative rounded-lg overflow-hidden px-3 py-1.5 active:scale-[0.97] transition-transform">
                            <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                            <span className="relative text-white font-bold uppercase tracking-wide text-[10px]">Xét duyệt</span>
                          </button>
                      }
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

