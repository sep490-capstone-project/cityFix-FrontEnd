import { useState, useEffect } from 'react';
import { message } from 'antd';
import { User, statusInfo, sevInfo, priorityInfo } from '../data';
import { getStaffAssignedTickets, StaffTicketItem, ApiError } from '../services';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

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
      if (statusF === 'all') {
        const [activeRes, completedRes] = await Promise.allSettled([
          getStaffAssignedTickets({ page: 0, size: 100 }),
          getStaffAssignedTickets({ status: 'COMPLETED', page: 0, size: 100 }),
        ]);

        const activeList: StaffTicketItem[] =
          activeRes.status === 'fulfilled'
            ? Array.isArray(activeRes.value)
              ? activeRes.value
              : activeRes.value?.content || (activeRes.value as any)?.data || []
            : [];
        const completedList: StaffTicketItem[] =
          completedRes.status === 'fulfilled'
            ? Array.isArray(completedRes.value)
              ? completedRes.value
              : completedRes.value?.content || (completedRes.value as any)?.data || []
            : [];

        const map = new Map<string, StaffTicketItem>();
        activeList.forEach((t) => {
          const key = t.id || t.ticketId || '';
          if (key) map.set(key, t);
        });
        completedList.forEach((t) => {
          const key = t.id || t.ticketId || '';
          if (key) map.set(key, t);
        });

        setTickets(Array.from(map.values()));
      } else {
        const res = await getStaffAssignedTickets({
          status: statusF,
          page: 0,
          size: 100,
        });
        const list = Array.isArray(res) ? res : res?.content || (res as any)?.data || [];
        setTickets(list);
      }
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

  const handleExportCsv = () => {
    downloadCsvFile(
      'CityFix_Danh_Sach_Ho_So_Can_Bo',
      [
        'Mã hồ sơ',
        'Danh mục',
        'Địa chỉ hiện trường',
        'Mức độ',
        'Độ ưu tiên',
        'Trạng thái',
        'Người xử lý',
        'Ngày tạo',
      ],
      filtered.map((t) => [
        t.id || t.ticketId || '',
        t.categoryName || 'Sự cố hạ tầng',
        t.address || '—',
        sevInfo(t.severity || 'LOW').label,
        priorityInfo(t.priority || t.subCategories?.[0]?.priority).label,
        statusInfo(t.status as any).label,
        t.assigneeName || currentUser.fullName || 'Cán bộ đơn vị',
        t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—',
      ])
    );
    message.success(`Đã xuất ${filtered.length} hồ sơ ra file CSV!`);
  };

  const handleExportExcel = () => {
    downloadExcelReport(
      'CityFix_Ho_So_Duoc_Giao_Can_Bo',
      `DANH SÁCH HỒ SƠ TIẾP NHẬN & XỬ LÝ — ${currentUser.fullName.toUpperCase()}`,
      `Cán bộ kỹ thuật: ${currentUser.fullName} • Số lượng: ${filtered.length} hồ sơ`,
      [
        {
          heading: 'Danh sách Hồ sơ theo Bộ lọc hiện tại',
          headers: [
            'Mã hồ sơ',
            'Danh mục',
            'Địa chỉ hiện trường',
            'Mức độ',
            'Độ ưu tiên',
            'Trạng thái',
            'Người xử lý',
            'Ngày tạo',
          ],
          rows: filtered.map((t) => [
            t.id || t.ticketId || '',
            t.categoryName || 'Sự cố hạ tầng',
            t.address || '—',
            sevInfo(t.severity || 'LOW').label,
            priorityInfo(t.priority || t.subCategories?.[0]?.priority).label,
            statusInfo(t.status as any).label,
            t.assigneeName || currentUser.fullName || 'Cán bộ đơn vị',
            t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—',
          ]),
        },
      ]
    );
    message.success(`Đã xuất ${filtered.length} hồ sơ ra Báo cáo Excel (.xls)!`);
  };

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
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* 1. Header khu vực nội dung chính */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="font-display text-xl font-extrabold text-gray-900 tracking-tight">
            Hồ sơ Tiếp nhận & Xử lý Hiện trường
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Danh sách các phản ánh và sự cố kỹ thuật hạ tầng được phân công xử lý
          </p>
        </div>

        {/* Bộ đếm, xuất file và nút làm mới */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex items-center px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-xl text-xs text-orange-700 font-bold">
            <span>Hiển thị: {filtered.length}/{tickets.length} hồ sơ</span>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 text-xs font-semibold transition-colors cursor-pointer"
          >
            Xuất CSV
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-colors shadow-2xs cursor-pointer"
          >
            Xuất Excel (.xls)
          </button>

          <button
            type="button"
            onClick={fetchAssignedTickets}
            disabled={loading}
            className="px-3 py-1.5 inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-60"
            title="Làm mới danh sách hồ sơ"
          >
            <svg
              className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin text-orange-600' : ''}`}
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
        <div className="p-3.5 bg-red-50 border border-red-200 rounded-2xl text-xs text-red-700 flex items-center justify-between">
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

      {/* 2. Thanh công cụ tìm kiếm và lọc dữ liệu */}
      <div className="bg-white border border-gray-200 rounded-2xl p-3.5 flex flex-wrap items-center gap-2.5 shadow-xs">
        <div className="relative flex-1 min-w-[240px] sm:min-w-[280px]">
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
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
            className="w-full h-10 pl-9 pr-3 text-xs bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-orange-500 rounded-xl text-gray-800 placeholder:text-gray-400 outline-none transition-all font-medium"
          />
        </div>

        <select
          value={statusF}
          onChange={(e) => setStatusF(e.target.value)}
          className="h-10 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-orange-500 rounded-xl px-3 text-xs text-gray-700 font-semibold outline-none cursor-pointer transition-all"
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
          className="h-10 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-orange-500 rounded-xl px-3 text-xs text-gray-700 font-semibold outline-none cursor-pointer transition-all"
        >
          <option value="all">Tất cả mức độ</option>
          <option value="CRITICAL">Cực kỳ nghiêm trọng</option>
          <option value="HIGH">Cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>

        <select
          value={priorityF}
          onChange={(e) => setPriorityF(e.target.value)}
          className="h-10 bg-gray-50 hover:bg-white focus:bg-white border border-gray-200 focus:border-orange-500 rounded-xl px-3 text-xs text-gray-700 font-semibold outline-none cursor-pointer transition-all"
        >
          <option value="all">Tất cả độ ưu tiên</option>
          <option value="CRITICAL">Khẩn cấp</option>
          <option value="HIGH">Ưu tiên cao</option>
          <option value="MEDIUM">Trung bình</option>
          <option value="LOW">Thấp</option>
        </select>

        {isFiltered && (
          <button
            type="button"
            onClick={handleResetFilters}
            className="h-10 px-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-orange-600 hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
            title="Khôi phục bộ lọc mặc định"
          >
            <span>✕ Xóa lọc</span>
          </button>
        )}
      </div>

      {/* 3. Bảng dữ liệu hồ sơ */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[920px]">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/80">
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Mã hồ sơ
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Danh mục
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Địa chỉ
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Mức độ
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Độ ưu tiên
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Trạng thái
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Người xử lý
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  Ngày tạo
                </th>
                <th className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider text-right">
                  Thao tác
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs">
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center">
                    {loading ? (
                      <div className="inline-flex items-center gap-2 text-gray-600 font-medium">
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
                        <p className="text-sm font-bold text-gray-700">Không tìm thấy hồ sơ phù hợp</p>
                        <p className="text-xs text-gray-400">
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
                    className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                  >
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        {t.isLifeThreatening && (
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Khẩn cấp" />
                        )}
                        <span className="font-mono-cf text-xs font-bold text-gray-800 group-hover:text-orange-600 transition-colors">
                          #{ticketId.slice(0, 8)}
                        </span>
                      </div>
                    </td>

                    <td className="px-4 py-3.5 font-bold text-gray-900 max-w-[160px] truncate">
                      {t.categoryName ||
                        (Array.isArray(t.subCategories) &&
                          (t.subCategories[0]?.name || (t.subCategories[0] as any)?.subCategoryName)) ||
                        '—'}
                    </td>

                    <td className="px-4 py-3.5 text-gray-600 max-w-[200px] truncate" title={t.address || ''}>
                      {t.address || '—'}
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sv.cls}`}>
                        {sv.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pi.cls}`}>
                        {pi.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${si.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                        {si.label}
                      </span>
                    </td>

                    <td className="px-4 py-3.5 text-gray-700 whitespace-nowrap">
                      {t.assigneeName ? (
                        <span className="font-semibold text-gray-800">{t.assigneeName}</span>
                      ) : (
                        <span className="text-gray-400 italic">Cán bộ đơn vị</span>
                      )}
                    </td>

                    <td className="px-4 py-3.5 text-gray-400 font-mono text-[10px] whitespace-nowrap">
                      {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                    </td>

                    <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => onOpenTicket(t)}
                        className="px-3 py-1 rounded-lg border border-gray-200 bg-gray-50 group-hover:bg-orange-600 group-hover:border-orange-600 group-hover:text-white text-gray-700 text-[11px] font-bold transition-all cursor-pointer"
                      >
                        Chi tiết →
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
