import { useState, useEffect } from 'react';
import { User, StatusKey, Severity, statusInfo, sevInfo, priorityInfo } from '../data';
import {
  getManagerTickets,
  getManagerResolvedTickets,
  ManagerTicketItem,
  ApiError,
} from '../services';

interface Props {
  currentUser: User;
  onOpenTicket: (ticketOrId: any) => void;
}

type TabType = 'dept' | 'mine' | 'resolved';

export default function ManagerTickets({ currentUser, onOpenTicket }: Props) {
  const [tickets, setTickets] = useState<ManagerTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('dept');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [statusF, setStatusF] = useState<string>('all');
  const [sevF, setSevF] = useState<string>('all');
  const [priorityF, setPriorityF] = useState<string>('all');

  // Tải dữ liệu vé từ API Backend
  async function fetchTickets() {
    setLoading(true);
    setErrorMessage(null);
    try {
      if (activeTab === 'resolved') {
        const res = await getManagerResolvedTickets({ page: 0, size: 50 });
        setTickets(res.content || []);
      } else {
        const res = await getManagerTickets({
          departmentId: currentUser.departmentId || undefined,
          page: 0,
          size: 50,
        });
        setTickets(res.content || []);
      }
    } catch (err: any) {
      const msg = err instanceof ApiError ? err.message : 'Không thể tải danh sách hồ sơ từ máy chủ.';
      setErrorMessage(msg);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchTickets();
  }, [activeTab, currentUser.departmentId]);

  // Lọc theo Tab và tiêu chí
  const filtered = tickets.filter((t) => {
    // Tab: Hồ sơ của tôi (do manager trực tiếp phụ trách)
    if (activeTab === 'mine') {
      const isMine =
        t.assigneeId === currentUser.userId ||
        t.createdBy === currentUser.userId ||
        t.steps?.some((s) => s.assigneeId === currentUser.userId);
      if (!isMine) return false;
    }

    // Bộ lọc Trạng thái
    if (statusF !== 'all' && t.status !== statusF) return false;

    // Bộ lọc Mức nghiêm trọng
    if (sevF !== 'all' && t.severity !== sevF) return false;

    // Bộ lọc Độ ưu tiên
    if (priorityF !== 'all') {
      const p = (t.priority || t.subCategories?.[0]?.priority || '').toUpperCase();
      if (p !== priorityF.toUpperCase()) return false;
    }

    // Tìm kiếm
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

  const STATUS_OPTS: { value: string; label: string }[] = [
    { value: 'all', label: 'Mọi trạng thái' },
    { value: 'INITIATED', label: 'Chờ điều phối' },
    { value: 'OPEN', label: 'Mở' },
    { value: 'ASSIGNED', label: 'Đã phân công' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'RESOLVED', label: 'Đã giải quyết' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'REJECTED', label: 'Từ chối' },
  ];

  return (
    <div className="p-6 space-y-4 screen-enter">
      {/* Thanh Header & Chuyển Tab */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 bg-white border border-gray-200 rounded-2xl p-1 shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('dept')}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              activeTab === 'dept'
                ? 'bg-orange-500/15 text-orange-600 border border-orange-500/25 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            🏢 Cơ quan tôi ({activeTab === 'dept' ? filtered.length : '...'})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('mine')}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              activeTab === 'mine'
                ? 'bg-orange-500/15 text-orange-600 border border-orange-500/25 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            👤 Hồ sơ của tôi ({activeTab === 'mine' ? filtered.length : '...'})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('resolved')}
            className={`px-4 py-2 rounded-xl text-[12px] font-bold transition-all cursor-pointer ${
              activeTab === 'resolved'
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-300 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            ✓ Đã giải quyết
          </button>
        </div>

        <div className="flex items-center gap-3">
          <span className="font-mono-cf text-[12px] font-bold text-gray-500 bg-white border border-gray-200 px-3 py-1.5 rounded-xl shadow-2xs">
            {filtered.length} hồ sơ
          </span>

          <button
            type="button"
            onClick={fetchTickets}
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

        {activeTab !== 'resolved' && (
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
        )}


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
                {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ', 'TIẾN ĐỘ BƯỚC', 'ĐỘ ƯU TIÊN', 'TRẠNG THÁI', 'NGÀY TẠO', 'THAO TÁC'].map((h) => (
                  <th key={h} className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-wider whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-16 text-center text-gray-400">
                    {loading ? (
                      <div className="flex items-center justify-center gap-2 text-orange-600 font-semibold">
                        <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                        </svg>
                        Đang tải danh sách hồ sơ...
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
                const stepsCount = t.steps?.length || 0;
                const resolvedSteps = t.steps?.filter((s) => s.status === 'RESOLVED').length || 0;

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

                    <td className="px-4 py-3.5 max-w-[200px]">
                      {(() => {
                        const subs: string[] = [];
                        if (Array.isArray(t.subCategories)) {
                          t.subCategories.forEach((sc: any) => {
                            const n = sc.name || sc.subCategoryName;
                            if (n && !subs.includes(n)) subs.push(n);
                          });
                        }
                        if (Array.isArray((t as any).subCategoryNames)) {
                          (t as any).subCategoryNames.forEach((n: string) => {
                            if (n && !subs.includes(n)) subs.push(n);
                          });
                        }
                        if (subs.length === 0 && t.subCategoryName) {
                          subs.push(t.subCategoryName);
                        }

                        const hasCat = t.categoryName && t.categoryName.trim() && t.categoryName !== 'Chưa phân loại';

                        return (
                          <div>
                            {hasCat ? (
                              <div className="text-[12px] font-bold text-gray-800 truncate mb-1">
                                {t.categoryName}
                              </div>
                            ) : null}

                            {subs.length > 0 ? (
                              <div className="flex flex-wrap items-center gap-1">
                                {subs.slice(0, 2).map((name, idx) => (
                                  <span
                                    key={idx}
                                    className="text-[10px] font-bold text-orange-700 bg-orange-50 border border-orange-200 px-1.5 py-0.5 rounded-md truncate max-w-[150px]"
                                    title={name}
                                  >
                                    🏷️ {name}
                                  </span>
                                ))}
                                {subs.length > 2 && (
                                  <span
                                    className="text-[9px] font-extrabold text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded-md"
                                    title={subs.slice(2).join(', ')}
                                  >
                                    +{subs.length - 2}
                                  </span>
                                )}
                              </div>
                            ) : !hasCat ? (
                              <span className="text-gray-400 text-[11px]">—</span>
                            ) : null}
                          </div>
                        );
                      })()}
                    </td>

                    <td className="px-4 py-3.5 text-[11px] text-gray-600 max-w-[200px] truncate">
                      {t.address || '—'}
                    </td>

                    {/* Tiến độ bước */}
                    <td className="px-4 py-3.5">
                      {stepsCount > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                              resolvedSteps === stepsCount
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {resolvedSteps}/{stepsCount} bước
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 italic">Chưa thiết lập</span>
                      )}
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

                    <td className="px-4 py-3.5 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">
                      {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                    </td>

                    <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => onOpenTicket(t)}
                          className="px-3 py-1.5 rounded-xl border border-gray-300 hover:border-orange-500 hover:bg-orange-50 text-gray-700 hover:text-orange-600 font-bold text-[11px] transition-all cursor-pointer shadow-2xs whitespace-nowrap"
                        >
                          Chi tiết
                        </button>
                        {t.status === 'IN_PROGRESS' && (
                          <button
                            type="button"
                            onClick={() => onOpenTicket(t)}
                            className="px-2.5 py-1.5 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[10px] transition-all cursor-pointer shadow-2xs flex items-center gap-1 whitespace-nowrap"
                            title="Hồ sơ đang xử lý: Bấm để điều chỉnh hạn chót các bước"
                          >
                            <span>⏱️</span>
                            <span>Đổi hạn</span>
                          </button>
                        )}
                      </div>
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
