import { useState, useEffect } from 'react';
import { User, statusInfo, sevInfo, priorityInfo, DEPARTMENTS } from '../data';
import { getStaffAssignedTickets, getStaffTicketSteps, StaffTicketItem, StaffTicketStep } from '../services';

interface Props {
  currentUser: User;
  onOpenTicket: (ticketOrId: any) => void;
  onViewAll: () => void;
}

export default function StaffDashboard({ currentUser, onOpenTicket, onViewAll }: Props) {
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterTab, setFilterTab] = useState<'all' | 'in_progress' | 'completed' | 'urgent'>('all');
  const [activeSteps, setActiveSteps] = useState<Array<{ ticket: StaffTicketItem; step: StaffTicketStep }>>([]);
  const [recentCompleted, setRecentCompleted] = useState<StaffTicketItem[]>([]);

  async function loadDashboardTickets() {
    setLoading(true);
    try {
      // Backend /api/v1/staff/tickets/assigned khi không truyền status chỉ trả về các vé đang xử lý (không bao gồm COMPLETED).
      // Để Dashboard hiển thị đầy đủ tổng số, tỷ lệ và danh sách đã hoàn thành, ta đồng thời tải thêm các vé COMPLETED.
      const [activeRes, completedRes] = await Promise.allSettled([
        getStaffAssignedTickets({ page: 0, size: 100 }),
        getStaffAssignedTickets({ status: 'COMPLETED', page: 0, size: 100 }),
      ]);

      const activeList: StaffTicketItem[] =
        activeRes.status === 'fulfilled'
          ? (Array.isArray(activeRes.value) ? activeRes.value : activeRes.value?.content || (activeRes.value as any)?.data || [])
          : [];
      const completedList: StaffTicketItem[] =
        completedRes.status === 'fulfilled'
          ? (Array.isArray(completedRes.value) ? completedRes.value : completedRes.value?.content || (completedRes.value as any)?.data || [])
          : [];

      // Hợp nhất danh sách và loại bỏ trùng lặp theo ID
      const map = new Map<string, StaffTicketItem>();
      activeList.forEach((t) => {
        const key = t.id || t.ticketId || '';
        if (key) map.set(key, t);
      });
      completedList.forEach((t) => {
        const key = t.id || t.ticketId || '';
        if (key) map.set(key, t);
      });

      const list = Array.from(map.values());
      setTickets(list);

      // Lưu danh sách hồ sơ đã hoàn thành chính thức (COMPLETED) gần đây để cán bộ theo dõi kết quả
      const finishedList = list.filter((t) => t.status === 'COMPLETED').slice(0, 5);
      setRecentCompleted(finishedList);

      // Gọi API tải bước cho các hồ sơ đang xử lý & đã giải quyết để cán bộ theo dõi trực tiếp tại Dashboard
      const activeTickets = list.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'RESOLVED').slice(0, 6);
      const stepsPromises = activeTickets.map(async (t) => {
        try {
          const tSteps = t.steps && t.steps.length > 0 ? t.steps : await getStaffTicketSteps(t.id || t.ticketId || '');
          return (tSteps || [])
            .filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')
            .map((s) => ({ ticket: t, step: s }));
        } catch {
          return [];
        }
      });
      const settled = await Promise.all(stepsPromises);
      setActiveSteps(settled.flat().slice(0, 5));
    } catch (err) {
      console.warn('Lỗi tải dữ liệu dashboard cán bộ:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardTickets();
  }, [currentUser.userId]);

  // Bộ số liệu tổng hợp cho toàn đơn vị của cán bộ
  const totalCount = tickets.length;
  const inProgressTickets = tickets.filter(
    (t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED'
  );
  const criticalTickets = tickets.filter(
    (t) =>
      t.severity === 'CRITICAL' ||
      t.isLifeThreatening ||
      (t.priority || t.subCategories?.[0]?.priority || '').toUpperCase() === 'CRITICAL'
  );

  // Hồ sơ khẩn cấp cần giải quyết gấp (chưa hoàn thành) để cảnh báo hiện trường
  const activeCriticalTickets = criticalTickets.filter((t) => t.status !== 'COMPLETED');

  // Lấy chính xác các vé đã COMPLETED (Đã được Quản lý phê duyệt nghiệm thu)
  const completedTickets = tickets.filter((t) => t.status === 'COMPLETED');
  const resolvedPendingTickets = tickets.filter((t) => t.status === 'RESOLVED');

  // Tỷ lệ hoàn tất tính toán chuẩn xác dựa trên các vé đã COMPLETED
  const completionRate = totalCount > 0 ? Math.round((completedTickets.length / totalCount) * 100) : 0;

  // Lọc danh sách hiển thị trong bảng theo tab
  const displayedTickets = tickets
    .filter((t) => {
      if (filterTab === 'in_progress') {
        return t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED';
      }
      if (filterTab === 'completed') {
        return t.status === 'COMPLETED';
      }
      if (filterTab === 'urgent') {
        return (
          t.severity === 'CRITICAL' ||
          t.isLifeThreatening ||
          (t.priority || '').toUpperCase() === 'CRITICAL' ||
          t.status === 'IN_PROGRESS'
        );
      }
      return true; // Tab 'all' hiển thị toàn bộ
    })
    .slice(0, 10);

  const deptName =
    DEPARTMENTS.find((d) => d.departmentId === currentUser.departmentId)?.name ||
    'Đơn vị tiếp nhận & xử lý kỹ thuật';

  return (
    <div className="p-6 space-y-6 screen-enter">
      {/* 1. HERO BANNER CHÀO MỪNG & THÔNG TIN CA TRỰC */}
      <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-orange-500/10 via-amber-500/5 to-white border border-orange-200/70 p-6 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-linear-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-xl shadow-md shadow-orange-500/20 flex-shrink-0">
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-extrabold text-gray-900 tracking-tight">
                  Xin chào, {currentUser.fullName}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  Đang trực ca xử lý
                </span>
              </div>
              <p className="text-xs text-gray-600 mt-1 flex items-center gap-1.5 font-medium">
                <span>🏢</span>
                <span className="font-bold text-gray-800">{deptName}</span>
                <span className="text-gray-300">|</span>
                <span>Đại diện cơ quan tiếp nhận hồ sơ & giải quyết hiện trường</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-start md:self-auto">
            <button
              onClick={loadDashboardTickets}
              disabled={loading}
              className="px-3.5 py-2 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Làm mới số liệu"
            >
              <svg
                className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : 'text-gray-500'}`}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
              </svg>
              <span>Làm mới</span>
            </button>

            <button
              onClick={onViewAll}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-sm shadow-orange-600/20 flex items-center gap-1.5 cursor-pointer active:scale-95"
            >
              <span>Xem toàn bộ hồ sơ</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. CẢNH BÁO KHẨN CẤP NẾU CÓ HỒ SƠ NGUY HIỂM CẦN GIẢI QUYẾT GẤP (CHƯA HOÀN THÀNH) */}
      {activeCriticalTickets.length > 0 && (
        <div className="rounded-2xl border border-red-300 bg-red-50/90 p-4 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-600 text-white flex items-center justify-center text-base font-bold shadow-xs flex-shrink-0 animate-bounce">
              ⚠️
            </div>
            <div>
              <p className="text-xs font-bold text-red-900">
                Có {activeCriticalTickets.length} hồ sơ khẩn cấp hoặc đe dọa an toàn cần giải quyết gấp!
              </p>
              <p className="text-[11px] text-red-700 mt-0.5">
                Vui lòng ưu tiên tiếp cận hiện trường và cập nhật tiến độ khắc phục sự cố.
              </p>
            </div>
          </div>
          <button
            onClick={() => setFilterTab('urgent')}
            className="px-3 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-bold hover:bg-red-700 transition-colors shadow-2xs cursor-pointer ml-auto"
          >
            Lọc hồ sơ khẩn cấp
          </button>
        </div>
      )}

      {/* 3. THẺ CHỈ SỐ KPI CHUYÊN NGHIỆP */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* KPI 1: Tổng số */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tổng tiếp nhận</span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">📋</span>
          </div>
          <p className="text-2xl font-black text-gray-900 mt-2">{totalCount}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Toàn bộ hồ sơ của cơ quan</p>
        </div>

        {/* KPI 2: Đang xử lý */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đang xử lý</span>
            <span className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs">⏳</span>
          </div>
          <p className="text-2xl font-black text-orange-600 mt-2">{inProgressTickets.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Đang khắc phục hiện trường</p>
        </div>

        {/* KPI 3: Khẩn cấp */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Khẩn cấp</span>
            <span className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center text-xs">🚨</span>
          </div>
          <p className="text-2xl font-black text-red-600 mt-2">{criticalTickets.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 font-medium">Ưu tiên xử lý hàng đầu</p>
        </div>

        {/* KPI 4: Đã hoàn thành (Dựa trên vé COMPLETED) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Đã hoàn thành</span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">✅</span>
          </div>
          <p className="text-2xl font-black text-emerald-600 mt-2">{completedTickets.length}</p>
          <p className="text-[11px] text-gray-400 mt-0.5 font-medium">
            {resolvedPendingTickets.length > 0 ? `+${resolvedPendingTickets.length} vé chờ Quản lý duyệt` : 'Đã nghiệm thu chính thức'}
          </p>
        </div>

        {/* KPI 5: Tỷ lệ hoàn tất (Dựa trên vé COMPLETED) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Tỷ lệ hoàn tất</span>
            <span className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 flex items-center justify-center text-xs">📈</span>
          </div>
          <p className="text-2xl font-black text-teal-600 mt-2">{completionRate}%</p>
          <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2 overflow-hidden">
            <div
              className="bg-linear-to-r from-orange-500 to-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
          <p className="text-[10px] text-gray-400 mt-1 font-medium">
            {completedTickets.length}/{totalCount} hồ sơ đã duyệt xong
          </p>
        </div>
      </div>

      {/* 4. BỐ CỤC 2 CỘT NỘI DUNG CHÍNH */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* CỘT TRÁI (2/3): BẢNG HỒ SƠ TRỌNG ĐIỂM */}
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-xs flex flex-col">
          {/* Header bảng & tab chọn */}
          <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
              <h2 className="text-sm font-extrabold text-gray-900 tracking-tight uppercase">
                Hồ sơ trọng điểm cần xử lý
              </h2>
            </div>

            <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl flex-wrap">
              <button
                onClick={() => setFilterTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'all'
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Tất cả ({totalCount})
              </button>
              <button
                onClick={() => setFilterTab('in_progress')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'in_progress'
                    ? 'bg-white text-orange-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Đang xử lý ({inProgressTickets.length})
              </button>
              <button
                onClick={() => setFilterTab('completed')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'completed'
                    ? 'bg-white text-emerald-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Đã hoàn thành ({completedTickets.length})
              </button>
              <button
                onClick={() => setFilterTab('urgent')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  filterTab === 'urgent'
                    ? 'bg-white text-red-600 shadow-2xs'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Khẩn cấp ({criticalTickets.length})
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto scrollbar-thin flex-1">
            <table className="w-full text-left min-w-[680px]">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/70">
                  {['MÃ HỒ SƠ', 'DANH MỤC', 'ĐỊA CHỈ', 'ĐỘ ƯU TIÊN', 'TRẠNG THÁI', 'NGÀY TẠO', 'THAO TÁC'].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {displayedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center">
                      <p className="text-sm font-semibold text-gray-500">
                        {loading ? 'Đang tải dữ liệu hồ sơ...' : 'Không có hồ sơ nào trong mục này'}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Chuyển sang tab "Tất cả" hoặc "Đã giải quyết / Hoàn tất" để xem toàn bộ danh sách hồ sơ.
                      </p>
                    </td>
                  </tr>
                ) : (
                  displayedTickets.map((t) => {
                    const ticketId = t.id || t.ticketId || '';
                    const si = statusInfo(t.status as any);
                    const pi = priorityInfo(t.priority || t.subCategories?.[0]?.priority);

                    return (
                      <tr
                        key={ticketId}
                        onClick={() => onOpenTicket(t)}
                        className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            {t.isLifeThreatening && (
                              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
                            )}
                            <span className="font-mono-cf text-xs font-bold text-gray-900 group-hover:text-orange-600">
                              #{ticketId.slice(0, 8)}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5 text-xs font-bold text-gray-800 max-w-[150px] truncate">
                          {t.categoryName || 'Sự cố hạ tầng'}
                        </td>

                        <td className="px-4 py-3.5 text-[11px] text-gray-600 max-w-[160px] truncate">
                          {t.address || 'Hiện trường'}
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pi.cls}`}>
                            {pi.label}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border inline-flex items-center gap-1 ${si.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                            {si.label}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 font-mono-cf text-[10px] text-gray-400 whitespace-nowrap">
                          {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '—'}
                        </td>

                        <td className="px-4 py-3.5" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={() => onOpenTicket(t)}
                            className="px-2.5 py-1 rounded-lg bg-gray-50 group-hover:bg-orange-600 text-gray-600 group-hover:text-white border border-gray-200 group-hover:border-orange-600 text-[11px] font-bold transition-all cursor-pointer"
                          >
                            Chi tiết →
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-3 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between text-xs text-gray-500 px-5">
            <span>Hiển thị {displayedTickets.length} hồ sơ mới nhất</span>
            <button
              onClick={onViewAll}
              className="text-orange-600 hover:text-orange-700 font-bold cursor-pointer"
            >
              Xem toàn bộ danh sách →
            </button>
          </div>
        </div>

        {/* CỘT PHẢI (1/3): PHÂN BỔ TRẠNG THÁI & HƯỚNG DẪN QUY TRÌNH */}
        <div className="space-y-5">
          {/* Card 1: Phân bổ trạng thái */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
              <span>📊</span> Phân bổ trạng thái hồ sơ
            </h3>

            {/* Segmented bar */}
            <div className="w-full h-3 rounded-full bg-gray-100 overflow-hidden flex">
              <div
                style={{ width: `${totalCount > 0 ? (inProgressTickets.length / totalCount) * 100 : 0}%` }}
                className="bg-orange-500 h-full"
                title="Đang xử lý"
              />
              <div
                style={{ width: `${totalCount > 0 ? (criticalTickets.length / totalCount) * 100 : 0}%` }}
                className="bg-red-500 h-full"
                title="Khẩn cấp"
              />
              <div
                style={{ width: `${totalCount > 0 ? (completedTickets.length / totalCount) * 100 : 0}%` }}
                className="bg-emerald-500 h-full"
                title="Đã hoàn thành"
              />
            </div>

            <div className="space-y-2 pt-1">
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                  Đang xử lý
                </span>
                <span className="font-bold text-gray-900">{inProgressTickets.length} hồ sơ</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
                  Khẩn cấp / Nguy hiểm
                </span>
                <span className="font-bold text-red-600">{criticalTickets.length} hồ sơ</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="flex items-center gap-1.5 text-gray-600 font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  Đã hoàn thành (Completed)
                </span>
                <span className="font-bold text-emerald-600">{completedTickets.length} hồ sơ</span>
              </div>
            </div>
          </div>

          {/* Card 2: Quy trình xử lý hiện trường chuẩn (SOP) - Nền Trắng Doanh Nghiệp */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-3.5">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h3 className="text-xs font-extrabold text-orange-600 uppercase tracking-wider flex items-center gap-2">
                <span>⚡</span> Quy trình xử lý hiện trường
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                Chuẩn SOP
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 shadow-xs">
                  1
                </span>
                <div>
                  <p className="font-bold text-gray-900">Tiếp nhận & Bắt đầu xử lý</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Xác nhận hồ sơ đúng chuyên môn, bấm "Bắt đầu xử lý" để chuyển trạng thái sang Đang xử lý.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-gray-50/80 border border-gray-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-orange-500 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 shadow-xs">
                  2
                </span>
                <div>
                  <p className="font-bold text-gray-900">Khắc phục sự cố theo từng bước</p>
                  <p className="text-[11px] text-gray-500 mt-0.5 leading-relaxed">
                    Đến hiện trường khảo sát, dặm vá, sửa chữa hạ tầng kỹ thuật theo từng bước được giao.
                  </p>
                </div>
              </div>

              <div className="p-2.5 rounded-2xl bg-emerald-50/70 border border-emerald-100 flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-[10px] flex-shrink-0 mt-0.5 shadow-xs">
                  3
                </span>
                <div>
                  <p className="font-bold text-emerald-900">Tải ảnh bằng chứng & Hoàn tất</p>
                  <p className="text-[11px] text-emerald-700 mt-0.5 leading-relaxed">
                    Tải ảnh/video kết quả tại bước. Bước sẽ chuyển sang <strong className="text-emerald-800">Đã giải quyết</strong> để Quản lý duyệt hoàn tất.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Card Phụ: Các bước quy trình đang giao xử lý (API getStaffTicketSteps) */}
          {activeSteps.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span>📋</span> Bước cần xử lý ({activeSteps.length})
                </h3>
                <span className="text-[10px] font-bold text-orange-600">Đang giao</span>
              </div>
              <div className="space-y-2">
                {activeSteps.map(({ ticket, step }, sIdx) => {
                  const sInfo = statusInfo(step.status || 'PENDING');
                  return (
                    <div
                      key={step.id || step.stepId || sIdx}
                      onClick={() => onOpenTicket(ticket)}
                      className="p-2.5 bg-gray-50/90 hover:bg-orange-50/60 border border-gray-200/80 rounded-xl transition-all cursor-pointer space-y-1 group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-extrabold text-gray-800 group-hover:text-orange-600 truncate">
                          {step.stepName || `Bước ${sIdx + 1}`}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sInfo.cls}`}>
                          {sInfo.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        #{ticket.id?.slice(0, 8)} • {ticket.address || ticket.categoryName || 'Hiện trường'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card Phụ 2: Hồ sơ đã giải quyết & Hoàn thành gần đây (kể cả khi đã COMPLETED) */}
          {recentCompleted.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                <h3 className="text-xs font-extrabold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <span>🏆</span> Hồ sơ đã giải quyết xong ({recentCompleted.length})
                </h3>
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                  Nghiệm thu
                </span>
              </div>
              <div className="space-y-2">
                {recentCompleted.map((t, rIdx) => {
                  const sInfo = statusInfo(t.status as any);
                  return (
                    <div
                      key={t.id || t.ticketId || rIdx}
                      onClick={() => onOpenTicket(t)}
                      className="p-2.5 bg-emerald-50/20 hover:bg-emerald-50/60 border border-emerald-200/70 rounded-xl transition-all cursor-pointer space-y-1 group"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[11px] font-extrabold text-gray-900 group-hover:text-emerald-700 truncate">
                          #{t.id?.slice(0, 8)} • {t.categoryName || 'Sự cố hạ tầng'}
                        </span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${sInfo.cls}`}>
                          {sInfo.label}
                        </span>
                      </div>
                      <p className="text-[10px] text-gray-500 truncate">
                        📍 {t.address || 'Hiện trường đã hoàn tất'}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Card 3: Thông tin cán bộ trực */}
          <div className="bg-white border border-gray-200 rounded-3xl p-5 shadow-xs space-y-2.5">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Thông tin cán bộ trực ca</h3>
            <div className="space-y-1.5 text-xs text-gray-700">
              <p className="flex items-center justify-between">
                <span className="text-gray-400">Họ và tên:</span>
                <span className="font-bold text-gray-900">{currentUser.fullName}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-gray-400">Số điện thoại:</span>
                <span className="font-semibold text-gray-800">{currentUser.phoneNumber || '—'}</span>
              </p>
              <p className="flex items-center justify-between">
                <span className="text-gray-400">Email công vụ:</span>
                <span className="font-semibold text-gray-800">{currentUser.email || '—'}</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
