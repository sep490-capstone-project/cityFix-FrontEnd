import { useState } from 'react';
import { TICKETS, User, StatusKey, Severity, DangerLevel, getCat, statusInfo, sevInfo, dangerInfo } from '../data';

interface Props {
  currentUser: User;
  onOpenTicket: (id: string) => void;
}

export default function StaffTickets({ currentUser, onOpenTicket }: Props) {
  const [search, setSearch]     = useState('');
  const [statusF, setStatusF]   = useState<StatusKey | 'all'>('all');
  const [sevF, setSevF]         = useState<Severity | 'all'>('all');
  const [dangerF, setDangerF]   = useState<DangerLevel | 'all'>('all');
  const [catF, setCatF]         = useState('all');
  const [wardF, setWardF]       = useState('all');
  const [viewMode, setViewMode] = useState<'mine' | 'dept'>('mine');

  const base = viewMode === 'mine'
    ? TICKETS.filter(t => t.assigneeId === currentUser.userId)
    : TICKETS.filter(t => t.departmentId === currentUser.departmentId);

  const filtered = base.filter(t => {
    if (statusF !== 'all' && t.status !== statusF) return false;
    if (sevF !== 'all' && t.severity !== sevF) return false;
    if (dangerF !== 'all' && t.dangerLevel !== dangerF) return false;
    if (catF !== 'all' && t.categoryId !== catF) return false;
    if (wardF !== 'all' && t.ward !== wardF) return false;
    if (search) {
      const q = search.toLowerCase();
      const cat = getCat(t.categoryId)?.name.toLowerCase() ?? '';
      if (!t.ticketId.toLowerCase().includes(q) && !cat.includes(q) &&
          !t.address.toLowerCase().includes(q) && !t.ward.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  const wards = [...new Set(TICKETS.filter(t => t.departmentId === currentUser.departmentId).map(t => t.ward))];

  const STATUS_OPTS: { value: StatusKey | 'all'; label: string }[] = [
    { value: 'all', label: 'Mọi trạng thái' },
    { value: 'ASSIGNED', label: 'Đã phân công' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'RESOLVED', label: 'Đã giải quyết' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'OPEN', label: 'Mở' },
  ];

  return (
    <div className="p-6 space-y-4 screen-enter">
      {/* View mode toggle */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl p-1">
          <button onClick={() => setViewMode('mine')}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all
              ${viewMode === 'mine' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' : 'text-gray-500 hover:text-gray-700'}`}>
            Vé của tôi
          </button>
          <button onClick={() => setViewMode('dept')}
            className={`px-4 py-2 rounded-lg text-[12px] font-semibold transition-all
              ${viewMode === 'dept' ? 'bg-orange-500/15 text-orange-400 border border-orange-500/20' : 'text-gray-500 hover:text-gray-700'}`}>
            Cơ quan tôi
          </button>
        </div>
        <div className="flex-1" />
        <span className="font-mono-cf text-[11px] text-gray-400">{filtered.length} vé</span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-300 rounded-xl px-3 py-2 w-52">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#52525b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ID, danh mục, địa chỉ..."
            className="bg-transparent text-[12px] text-gray-700 placeholder-zinc-700 outline-none flex-1" />
        </div>
        <Sel value={statusF} onChange={v => setStatusF(v as StatusKey | 'all')}
          opts={STATUS_OPTS} />
        <Sel value={sevF} onChange={v => setSevF(v as Severity | 'all')}
          opts={[{ value: 'all', label: 'Mọi mức độ' }, { value: 'CRITICAL', label: 'Nghiêm trọng' }, { value: 'HIGH', label: 'Cao' }, { value: 'MEDIUM', label: 'Trung bình' }, { value: 'LOW', label: 'Thấp' }]} />
        <Sel value={dangerF} onChange={v => setDangerF(v as DangerLevel | 'all')}
          opts={[{ value: 'all', label: 'Mọi nguy hiểm' }, { value: 'CRITICAL', label: 'Cực kỳ nguy hiểm' }, { value: 'DANGEROUS', label: 'Nguy hiểm' }, { value: 'CAUTION', label: 'Cần chú ý' }, { value: 'SAFE', label: 'An toàn' }]} />
        {wards.length > 0 && (
          <Sel value={wardF} onChange={setWardF}
            opts={[{ value: 'all', label: 'Mọi phường' }, ...wards.map(w => ({ value: w, label: w }))]} />
        )}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden card-depth">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[700px]">
            <thead>
              <tr className="border-b border-gray-200">
                {['ID', 'Danh mục', 'Địa chỉ', 'Mức độ', 'Nguy hiểm', 'Trạng thái', 'Ngày tạo', ''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-[9px] font-bold text-gray-400 uppercase tracking-[0.18em] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center">
                  <p className="font-display text-xl font-bold text-gray-300 uppercase">Không có vé</p>
                  <p className="text-gray-400 text-sm mt-1">Thử thay đổi bộ lọc hoặc chuyển tab</p>
                </td></tr>
              )}
              {filtered.map(t => {
                const cat = getCat(t.categoryId);
                const si = statusInfo(t.status);
                const sv = sevInfo(t.severity);
                const di = dangerInfo(t.dangerLevel);
                const canAct = t.status === 'ASSIGNED' || t.status === 'IN_PROGRESS';
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
                    <td className="px-4 py-3 text-[12px] text-gray-800 max-w-[140px] truncate group-hover:text-gray-900">{cat?.name}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-500 max-w-[160px] truncate">{t.address}</td>
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
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      {canAct && (
                        <button onClick={() => onOpenTicket(t.ticketId)}
                          className="relative rounded-lg overflow-hidden px-3 py-1.5 active:scale-[0.97] transition-transform">
                          <div className="absolute inset-0 bg-gradient-to-r from-[#c2410c] to-[#f97316]" />
                          <span className="relative text-white font-bold text-[10px] uppercase tracking-wide">
                            {t.status === 'ASSIGNED' ? 'Bắt đầu' : 'Hoàn tất'}
                          </span>
                        </button>
                      )}
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

function Sel({ value, onChange, opts }: { value: string; onChange: (v: string) => void; opts: { value: string; label: string }[] }) {
  return (
    <select value={value} onChange={e => onChange(e.target.value)}
      className="bg-white border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 outline-none">
      {opts.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
    </select>
  );
}
