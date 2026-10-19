import { useState, useEffect } from 'react';
import { User, statusInfo, sevInfo, priorityInfo } from '../data';
import { getStaffAssignedTickets, StaffTicketItem, ApiError } from '../services';

interface Props {
  currentUser: User;
  onOpenTicket: (ticketOrId: any) => void;
}

export default function StaffTickets({ currentUser, onOpenTicket }: Props) {
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<string>('all');
  const [sevF, setSevF] = useState<string>('all');
  const [priorityF, setPriorityF] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'mine' | 'dept'>('mine');

  async function fetchAssignedTickets() {
    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await getStaffAssignedTickets({
        status: statusF !== 'all' ? statusF : undefined,
        page: 0,
        size: 100,
      });
      setTickets(res.content || []);
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể tải danh sách hồ sơ được phân công.';
      setErrorMessage(msg);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssignedTickets();
  }, [statusF]);

  const base = viewMode === 'mine'
    ? tickets.filter((t) => t.assigneeId === currentUser.userId)
    : tickets;

  const filtered = base.filter((t) => {
    if (sevF !== 'all' && t.severity !== sevF) return false;
    if (priorityF !== 'all') {
      const p = (t.priority || t.subCategories?.[0]?.priority || '').toUpperCase();
      if (p !== priorityF.toUpperCase()) return false;
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      const id = (t.id || t.ticketId || '').toLowerCase();
      const cat = (t.categoryName || '').toLowerCase();
      const desc = (t.description || '').toLowerCase();
      const addr = (t.address || '').toLowerCase();
      if (!id.includes(q) && !cat.includes(q) && !desc.includes(q) && !addr.includes(q)) return false;
    }
    return true;
  });

  const STATUS_OPTS = [
    { value: 'all', label: 'Mọi trạng thái' },
    { value: 'ASSIGNED', label: 'Đã phân công' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'RESOLVED', label: 'Đã giải quyết' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'OPEN', label: 'Mở' },
    { value: 'CANCELLED', label: 'Đã hủy' },
  ];

  return (
    <div className="p-6 space-y-4 screen-enter">
      {/* Header & Chuyển chế độ xem */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setViewMode('mine')}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              viewMode === 'mine'
                ? 'bg-orange-500/15 text-orange-600 border border-orange-500/25 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            👤 Hồ sơ của tôi ({tickets.filter((t) => t.assigneeId === currentUser.userId).length})
          </button>
          <button
            type="button"
            onClick={() => setViewMode('dept')}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              viewMode === 'dept'
                ? 'bg-orange-500/15 text-orange-600 border border-orange-500/25 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🏢 Cơ quan tôi ({tickets.length})
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono-cf text-[12px] font-bold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
            {filtered.length} hồ sơ
          </span>

          <button
            type="button"
            onClick={fetchAssignedTickets}
            disabled={loading}
            className="p-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-600 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Làm mới danh sách"
          >
            <svg
              className={`w-4 h-4 ${loading ? 'animate-spin text-orange-500' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-[12px] text-red-700 flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="font-bold text-red-500 cursor-pointer ml-2">
            ✕
          </button>
        </div>
      )}

      {/* Bộ Lọc & Tìm Kiếm */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 flex flex-wrap items-center gap-3 shadow-xs">
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64 shadow-2xs">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã, nội dung, địa chỉ..."
            className="bg-transparent text-[12px] text-gray-800 placeholder-gray-400 outline-none flex-1 font-medium"
          />
        </div>

        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 font-semibold outline-none cursor-pointer hover:bg-gray-100 transition-colors shadow-2xs"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        <select
          value={sevF}
          onChange={(e) => setSevF(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 font-semibold outline-none cursor-pointer hover:bg-gray-100 transition-colors shadow-2xs"
        >
          <option value="all">Mọi mức độ nghiêm trọng</option>
          <option value="CRITICAL">Cực kỳ nghiêm trọng</option>
          <option value="HIGH">Cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>

        <select
          value={priorityF}
          onChange={(e) => setPriorityF(e.target.value)}
          className="bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-[12px] text-gray-700 font-semibold outline-none cursor-pointer hover:bg-gray-100 transition-colors shadow-2xs"
        >
          <option value="all">Mọi độ ưu tiên</option>
          <option value="CRITICAL">Khẩn cấp</option>
          <option value="HIGH">Ưu tiên cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>
      </div>

      {/* Bảng Danh Sách Hồ Sơ */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-left min-w-[850px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ', 'MỨC ĐỘ', 'ĐỘ ƯU TIÊN', 'TRẠNG THÁI', 'NGƯỜI XỬ LÝ', 'NGÀY TẠO', 'THAO TÁC'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center text-gray-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-orange-600 font-semibold">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                        </svg>
                        Đang đồng bộ hồ sơ phân công...
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="font-display text-lg font-bold text-gray-400 uppercase">Không có hồ sơ nào</p>
                        <p className="text-gray-400 text-xs">Thử chuyển tab hoặc điều chỉnh bộ lọc tìm kiếm</p>
                      </div>
                    )}
                  </td>
                </tr>
              )}

              {filtered.map((t) => {
                const ticketId = t.id || t.ticketId || '';
                const si = statusInfo(t.status as any);
                const sv = sevInfo(t.severity || 'LOW');
                const pi = priorityInfo(t.priority || t.subCategories?.[0]?.priority);
                const isAssignedToMe = t.assigneeId === currentUser.userId;

                return (
                  <tr
                    key={ticketId}
                    onClick={() => onOpenTicket(t)}
                    className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {t.isLifeThreatening && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" title="Khẩn cấp" />
                        )}
                        <span className="font-mono-cf text-[11px] font-extrabold text-gray-900 group-hover:text-orange-600 transition-colors">
                          #{ticketId.slice(0, 8)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 text-[12px] font-bold text-gray-800 max-w-[160px] truncate">
                      {t.categoryName || 'Chưa phân loại'}
                    </td>

                    <td className="px-4 py-3.5 text-[11px] text-gray-600 max-w-[200px] truncate">
                      {t.address || '—'}
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sv.cls}`}>
                        {sv.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pi.cls}`}>
                        {pi.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5">
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-lg border inline-flex items-center gap-1 ${si.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                        {si.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-[11px]">
                      {t.assigneeName ? (
                        <span className={`font-semibold ${isAssignedToMe ? 'text-orange-600' : 'text-gray-700'}`}>
                          {t.assigneeName} {isAssignedToMe ? '(Tôi)' : ''}
                        </span>
                      ) : (
                        <span className="text-gray-400 italic">Chưa giao</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">
                      {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                    </td>

                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onOpenTicket(t)}
                        className="px-3 py-1.5 rounded-xl border border-gray-300 hover:border-orange-500 hover:bg-orange-50 text-gray-700 hover:text-orange-600 font-bold text-[11px] transition-all cursor-pointer shadow-2xs"
                      >
                        Chi tiết
                      </button>
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
