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

  const filtered = tickets.filter((t) => {
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

  const isFiltered = search.trim() !== '' || statusF !== 'all' || sevF !== 'all' || priorityF !== 'all';

  function handleResetFilters() {
    setSearch('');
    setStatusF('all');
    setSevF('all');
    setPriorityF('all');
  }

  const STATUS_OPTS = [
    { value: 'all', label: 'Tất cả trạng thái' },
    { value: 'ASSIGNED', label: 'Đã phân công' },
    { value: 'IN_PROGRESS', label: 'Đang xử lý' },
    { value: 'RESOLVED', label: 'Đã giải quyết' },
    { value: 'COMPLETED', label: 'Hoàn thành' },
    { value: 'OPEN', label: 'Mở' },
    { value: 'CANCELLED', label: 'Đã hủy' },
  ];

  return (
    <div className="p-6 space-y-5">
      {/* 1. Header khu vực nội dung chính: Typography thuần túy, không có icon minh họa lớn */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-1">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Hồ sơ tiếp nhận & xử lý</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Danh sách các phản ánh và sự cố kỹ thuật hạ tầng được phân công cho đơn vị xử lý
          </p>
        </div>

        {/* Bộ đếm và nút làm mới trên cùng 1 hàng */}
        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          <div className="inline-flex items-center h-10 px-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600 font-medium">
            <span>Hiển thị:</span>
            <span className="font-semibold text-slate-900 ml-1">{filtered.length}</span>
            <span className="text-slate-400 mx-1">/</span>
            <span>{tickets.length} hồ sơ</span>
          </div>

          <button
            type="button"
            onClick={fetchAssignedTickets}
            disabled={loading}
            className="h-10 px-3.5 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed shadow-2xs active:scale-[0.98]"
            title="Làm mới danh sách hồ sơ"
          >
            <svg
              className={`w-4 h-4 text-slate-500 ${loading ? 'animate-spin text-orange-600' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg
              className="w-4 h-4 text-red-500 flex-shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-700 font-bold px-2 py-1 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* 2. Thanh công cụ tìm kiếm và lọc dữ liệu (Toolbar gọn gàng, h-10 đồng nhất) */}
      <div className="bg-white border border-slate-200 rounded-lg p-3 flex flex-wrap items-center gap-2.5">
        {/* Input tìm kiếm */}
        <div className="relative flex-1 min-w-[240px] sm:min-w-[280px]">
          <svg
            className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo mã hồ sơ, danh mục, địa chỉ, mô tả..."
            className="w-full h-10 pl-9 pr-3 text-xs bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-lg text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-orange-500/15 transition-all font-medium"
          />
        </div>

        {/* Bộ lọc Trạng thái */}
        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className="h-10 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-lg px-3 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/15 cursor-pointer transition-all"
        >
          {STATUS_OPTS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>

        {/* Bộ lọc Mức độ nghiêm trọng */}
        <select
          value={sevF}
          onChange={(e) => setSevF(e.target.value)}
          className="h-10 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-lg px-3 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/15 cursor-pointer transition-all"
        >
          <option value="all">Tất cả mức độ</option>
          <option value="CRITICAL">Cực kỳ nghiêm trọng</option>
          <option value="HIGH">Cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>

        {/* Bộ lọc Độ ưu tiên */}
        <select
          value={priorityF}
          onChange={(e) => setPriorityF(e.target.value)}
          className="h-10 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200 focus:border-orange-500 rounded-lg px-3 text-xs text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/15 cursor-pointer transition-all"
        >
          <option value="all">Tất cả độ ưu tiên</option>
          <option value="CRITICAL">Khẩn cấp</option>
          <option value="HIGH">Ưu tiên cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>

        {/* Nút xóa nhanh bộ lọc nếu đang có filter */}
        {isFiltered && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-10 px-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-orange-600 hover:bg-orange-50/80 rounded-lg transition-colors cursor-pointer"
            title="Khôi phục bộ lọc mặc định"
          >
            <svg
              className="w-3.5 h-3.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>Xóa lọc</span>
          </button>
        )}
      </div>

      {/* 3. Bảng dữ liệu hồ sơ (Data Table Enterprise) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/80">
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Mã hồ sơ
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Địa chỉ
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Mức độ
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Độ ưu tiên
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Người xử lý
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    {loading ? (
                      <div className="inline-flex items-center gap-2 text-slate-600 font-medium">
                        <svg
                          className="w-4 h-4 animate-spin text-orange-600"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <circle cx="12" cy="12" r="10" strokeDasharray="32" strokeLinecap="round" />
                        </svg>
                        <span>Đang đồng bộ dữ liệu hồ sơ từ hệ thống...</span>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-slate-700">Không tìm thấy hồ sơ phù hợp</p>
                        <p className="text-xs text-slate-400">
                          Thử thay đổi từ khóa tìm kiếm hoặc làm mới lại các bộ lọc phía trên
                        </p>
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

                return (
                  <tr
                    key={ticketId}
                    onClick={() => onOpenTicket(t)}
                    className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                  >
                    {/* Mã hồ sơ */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {t.isLifeThreatening && (
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" title="Khẩn cấp" />
                        )}
                        <span className="font-mono-cf text-xs font-semibold text-slate-700 group-hover:text-orange-600 transition-colors">
                          #{ticketId.slice(0, 8)}
                        </span>
                      </div>
                    </td>

                    {/* Danh mục */}
                    <td className="px-4 py-3 font-medium text-slate-900 max-w-[160px] truncate">
                      {t.categoryName || 'Chưa phân loại'}
                    </td>

                    {/* Địa chỉ */}
                    <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={t.address || ''}>
                      {t.address || '—'}
                    </td>

                    {/* Mức độ */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${sv.cls}`}>
                        {sv.label}
                      </span>
                    </td>

                    {/* Độ ưu tiên */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded border ${pi.cls}`}>
                        {pi.label}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${si.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                        {si.label}
                      </span>
                    </td>

                    {/* Người xử lý */}
                    <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                      {t.assigneeName ? (
                        <span className="font-medium text-slate-800">{t.assigneeName}</span>
                      ) : (
                        <span className="text-slate-400 italic">Cán bộ đơn vị</span>
                      )}
                    </td>

                    {/* Ngày tạo */}
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap text-[11px]">
                      {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                    </td>

                    {/* Thao tác */}
                    <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onOpenTicket(t)}
                        className="px-3 py-1 rounded-md border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50 hover:text-orange-600 text-slate-700 text-xs font-medium transition-colors cursor-pointer shadow-2xs"
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
