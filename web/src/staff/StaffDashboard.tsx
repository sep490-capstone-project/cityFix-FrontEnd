import { useState, useEffect, useMemo } from 'react';
import { message } from 'antd';
import { User, statusInfo, priorityInfo, DEPARTMENTS } from '../data';
import { getStaffAssignedTickets, getStaffTicketSteps, StaffTicketItem, StaffTicketStep } from '../services';
import {
  BuildingIcon,
  AlertTriangleIcon,
  FileTextIcon,
  ClockIcon,
  AlertCircleIcon,
  CheckCircleIcon,
  MapPinIcon,
} from './StaffIcons';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

interface Props {
  currentUser: User;
  onOpenTicket: (ticketOrId: any) => void;
  onViewAll: () => void;
}

type FilterTab = 'all' | 'in_progress' | 'urgent' | 'resolved' | 'completed';

function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

export default function StaffDashboard({ currentUser, onOpenTicket, onViewAll }: Props) {
  const [tickets, setTickets] = useState<StaffTicketItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
  const [activeSteps, setActiveSteps] = useState<Array<{ ticket: StaffTicketItem; step: StaffTicketStep }>>([]);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  async function loadDashboardTickets() {
    setLoading(true);
    try {
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

      const list = Array.from(map.values());
      setTickets(list);

      const activeTickets = list
        .filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'RESOLVED')
        .slice(0, 6);
      const stepsPromises = activeTickets.map(async (t) => {
        try {
          const tSteps =
            t.steps && t.steps.length > 0
              ? t.steps
              : await getStaffTicketSteps(t.id || t.ticketId || '');
          return (tSteps || [])
            .filter((s) => s.status !== 'COMPLETED' && s.status !== 'CANCELLED')
            .map((s) => ({ ticket: t, step: s }));
        } catch {
          return [];
        }
      });
      const settled = await Promise.all(stepsPromises);
      setActiveSteps(settled.flat().slice(0, 6));
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch (err) {
      console.warn('Lỗi tải dữ liệu dashboard cán bộ:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboardTickets();
  }, [currentUser.userId]);

  const totalCount = tickets.length;

  const inProgressTickets = useMemo(
    () => tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'OPEN'),
    [tickets]
  );

  const criticalTickets = useMemo(
    () =>
      tickets.filter(
        (t) =>
          t.severity === 'CRITICAL' ||
          t.isLifeThreatening ||
          (t.priority || t.subCategories?.[0]?.priority || '').toUpperCase() === 'CRITICAL'
      ),
    [tickets]
  );

  const activeCriticalTickets = useMemo(
    () => criticalTickets.filter((t) => t.status !== 'COMPLETED'),
    [criticalTickets]
  );

  const completedTickets = useMemo(
    () => tickets.filter((t) => t.status === 'COMPLETED'),
    [tickets]
  );

  const resolvedPendingTickets = useMemo(
    () => tickets.filter((t) => t.status === 'RESOLVED'),
    [tickets]
  );

  const recentFinished = useMemo(
    () => tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'RESOLVED').slice(0, 5),
    [tickets]
  );

  const completionRate = totalCount > 0 ? Math.round((completedTickets.length / totalCount) * 100) : 0;
  const resolvedPct = totalCount > 0 ? Math.round((resolvedPendingTickets.length / totalCount) * 100) : 0;
  const inProgressPct = totalCount > 0 ? Math.max(0, 100 - completionRate - resolvedPct) : 0;

  const displayedTickets = useMemo(() => {
    let list = tickets;
    if (filterTab === 'in_progress') {
      list = inProgressTickets;
    } else if (filterTab === 'completed') {
      list = completedTickets;
    } else if (filterTab === 'resolved') {
      list = resolvedPendingTickets;
    } else if (filterTab === 'urgent') {
      list = criticalTickets;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => {
        const id = (t.id || t.ticketId || '').toLowerCase();
        const cat = (t.categoryName || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const addr = (t.address || '').toLowerCase();
        return id.includes(q) || cat.includes(q) || desc.includes(q) || addr.includes(q);
      });
    }

    return list.slice(0, 8);
  }, [tickets, filterTab, search, inProgressTickets, completedTickets, resolvedPendingTickets, criticalTickets]);

  const deptName =
    DEPARTMENTS.find((d) => d.departmentId === currentUser.departmentId)?.name ||
    'Đơn vị tiếp nhận & xử lý kỹ thuật';

  const handleExportCsv = () => {
    downloadCsvFile(
      'CityFix_Cong_Viec_Can_Bo',
      [
        'Mã hồ sơ',
        'Danh mục',
        'Nội dung phản ánh',
        'Địa chỉ hiện trường',
        'Độ ưu tiên',
        'Trạng thái',
        'Ngày tiếp nhận',
      ],
      tickets.map((t) => [
        t.id || t.ticketId || '',
        t.categoryName || 'Sự cố hạ tầng',
        t.description || '',
        t.address || 'Hiện trường',
        priorityInfo(t.priority || t.subCategories?.[0]?.priority).label,
        statusInfo(t.status as any).label,
        t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '',
      ])
    );
    message.success(`Đã xuất ${tickets.length} hồ sơ công việc ra file CSV!`);
  };

  const handleExportExcel = () => {
    downloadExcelReport(
      'CityFix_Bao_Cao_Cong_Viec_Can_Bo',
      `BÁO CÁO KẾT QUẢ XỬ LÝ HIỆN TRƯỜNG — ${currentUser.fullName.toUpperCase()}`,
      `Cán bộ kỹ thuật: ${currentUser.fullName} • Đơn vị: ${deptName} • Tỷ lệ hoàn tất: ${completionRate}%`,
      [
        {
          heading: '1. Tổng hợp Chỉ số Thực hiện Cá nhân / Đơn vị',
          headers: ['Chỉ tiêu', 'Số lượng', 'Ghi chú'],
          rows: [
            ['Tổng hồ sơ được phân công', totalCount, 'Toàn bộ hồ sơ tiếp nhận'],
            ['Đang xử lý tại hiện trường', inProgressTickets.length, 'Đang thực hiện các bước kỹ thuật'],
            ['Chờ Quản lý nghiệm thu (RESOLVED)', resolvedPendingTickets.length, 'Đã tải minh chứng hoàn tất bước'],
            ['Đã hoàn thành chính thức (COMPLETED)', completedTickets.length, `Đạt tỷ lệ ${completionRate}%`],
            ['Hồ sơ Khẩn cấp (CRITICAL / SOS)', criticalTickets.length, 'Ưu tiên xử lý hàng đầu'],
          ],
        },
        {
          heading: '2. Các Bước Công Việc Đang Giao Cần Xử Lý',
          headers: ['Mã hồ sơ', 'Tên bước công việc', 'Địa chỉ hiện trường', 'Trạng thái bước'],
          rows: activeSteps.map(({ ticket, step }, idx) => [
            ticket.id || ticket.ticketId || '',
            step.stepName || (step as any).name || step.notes || `Bước ${idx + 1}`,
            ticket.address || 'Hiện trường',
            statusInfo(step.status || 'PENDING').label,
          ]),
        },
        {
          heading: '3. Danh sách Hồ sơ Tiếp nhận & Xử lý',
          headers: ['Mã hồ sơ', 'Danh mục', 'Nội dung', 'Địa chỉ', 'Độ ưu tiên', 'Trạng thái', 'Ngày tạo'],
          rows: tickets.map((t) => [
            t.id || t.ticketId || '',
            t.categoryName || 'Sự cố hạ tầng',
            t.description || '',
            t.address || 'Hiện trường',
            priorityInfo(t.priority || t.subCategories?.[0]?.priority).label,
            statusInfo(t.status as any).label,
            t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '',
          ]),
        },
      ]
    );
    message.success('Đã xuất Báo cáo Công việc Cán bộ (.xls) thành công!');
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* =========================================================================
          1. CLEAN COMMAND HEADER (ĐỒNG BỘ VỚI ADMIN & MANAGER DASHBOARD)
         ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Bảng Điều hành Công việc Hiện trường
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Đang trực ca kỹ thuật
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 inline-flex items-center gap-1.5">
              <BuildingIcon className="w-3.5 h-3.5 text-orange-600" />
              {deptName}
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mt-1">
            Cán bộ phụ trách: <strong className="text-gray-800">{currentUser.fullName}</strong> • Tiếp nhận bước xử lý, khắc phục sự cố hiện trường và tải ảnh minh chứng nghiệm thu
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <span className="text-[11px] text-gray-400 hidden sm:inline mr-1">
            Cập nhật: <strong className="text-gray-600 font-semibold">{lastRefreshed}</strong>
          </span>

          <button
            onClick={loadDashboardTickets}
            disabled={loading}
            className="px-3 py-1.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 text-[12px] font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : 'text-gray-500'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[12px] font-semibold transition-colors cursor-pointer"
          >
            Xuất CSV
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 text-[12px] font-semibold transition-colors cursor-pointer"
          >
            Xuất Báo cáo (.xls)
          </button>

          <button
            onClick={onViewAll}
            className="px-3.5 py-1.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-[12px] font-bold transition-colors shadow-2xs cursor-pointer"
          >
            Xem tất cả ({totalCount}) →
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. CẢNH BÁO KHẨN CẤP (CHỈ HIỆN KHI CÓ SỰ CỐ NGUY HIỂM CHƯA XONG)
         ========================================================================= */}
      {activeCriticalTickets.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/85 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse flex-shrink-0" />
            <div className="text-[12px]">
              <span className="font-bold text-red-900">
                Cảnh báo Khẩn cấp ({activeCriticalTickets.length} hồ sơ):
              </span>{' '}
              <span className="text-red-800">
                Có sự cố mức nguy hiểm cần ưu tiên tiếp cận hiện trường ngay ({activeCriticalTickets.map((t) => `#${(t.id || t.ticketId || '').slice(0, 8)}`).join(', ')})
              </span>
            </div>
          </div>

          <button
            onClick={() => setFilterTab('urgent')}
            className="px-3.5 py-1.5 rounded-xl bg-white border border-red-200 text-red-700 text-[11px] font-bold hover:bg-red-100 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Lọc hồ sơ khẩn cấp →
          </button>
        </div>
      )}

      {/* =========================================================================
          3. 4 THẺ KPI CÂN ĐỐI + THANH TIẾN ĐỘ CA TRỰC (KHÔNG TRÙNG LẶP)
         ========================================================================= */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Tổng Hồ Sơ Được Giao',
              val: totalCount,
              sub: `Tỷ lệ hoàn tất: ${completionRate}% (${completedTickets.length}/${totalCount})`,
              icon: <FileTextIcon className="w-4 h-4" />,
              iconBox: 'bg-orange-50 text-orange-600',
              valCls: 'text-gray-900',
              subCls: 'text-orange-600 font-semibold',
              tab: 'all' as FilterTab,
            },
            {
              label: 'Đang Xử Lý Hiện Trường',
              val: inProgressTickets.length,
              sub: `${activeSteps.length} bước kỹ thuật đang thực hiện`,
              icon: <ClockIcon className="w-4 h-4" />,
              iconBox: 'bg-blue-50 text-blue-600',
              valCls: 'text-blue-600',
              subCls: 'text-gray-500',
              tab: 'in_progress' as FilterTab,
            },
            {
              label: 'Sự Cố Khẩn Cấp / SOS',
              val: criticalTickets.length,
              sub: activeCriticalTickets.length > 0 ? `${activeCriticalTickets.length} sự cố chưa hoàn tất` : 'Không có sự cố nguy cấp tồn đọng',
              icon: <AlertCircleIcon className="w-4 h-4" />,
              iconBox: 'bg-red-50 text-red-600',
              valCls: 'text-red-600',
              subCls: activeCriticalTickets.length > 0 ? 'text-red-600 font-semibold' : 'text-gray-500',
              tab: 'urgent' as FilterTab,
            },
            {
              label: 'Đã Hoàn Thành Nghiệm Thu',
              val: completedTickets.length,
              sub:
                resolvedPendingTickets.length > 0
                  ? `+${resolvedPendingTickets.length} hồ sơ chờ Quản lý duyệt`
                  : 'Đã đóng & nghiệm thu chính thức',
              icon: <CheckCircleIcon className="w-4 h-4" />,
              iconBox: 'bg-emerald-50 text-emerald-600',
              valCls: 'text-emerald-600',
              subCls: resolvedPendingTickets.length > 0 ? 'text-amber-600 font-semibold' : 'text-emerald-600 font-semibold',
              tab: 'completed' as FilterTab,
            },
          ].map((kpi) => {
            const isSelected = filterTab === kpi.tab;
            return (
              <div
                key={kpi.tab}
                onClick={() => setFilterTab(kpi.tab)}
                className={`bg-white border rounded-2xl p-5 shadow-xs cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-orange-400 ring-2 ring-orange-500/15'
                    : 'border-gray-200 hover:border-orange-200'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    {kpi.label}
                  </span>
                  <div className={`w-8 h-8 rounded-xl ${kpi.iconBox} flex items-center justify-center`}>
                    {kpi.icon}
                  </div>
                </div>

                <div className="my-2 flex items-baseline gap-1.5">
                  <span className={`font-display text-3xl font-black ${kpi.valCls}`}>
                    {loading ? '...' : kpi.val}
                  </span>
                  <span className="text-xs text-gray-400">hồ sơ</span>
                </div>

                <div className={`text-[11px] pt-2 border-t border-gray-100 truncate ${kpi.subCls}`}>
                  {kpi.sub}
                </div>
              </div>
            );
          })}
        </div>

        {/* Thanh Tiến Độ Hoàn Tất Công Việc Cá Nhân */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-[12px] flex-wrap gap-2">
              <span className="font-bold text-gray-800">
                Tiến độ hoàn thành công việc được giao
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Đã nghiệm thu: {completedTickets.length} ({completionRate}%)
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Chờ duyệt: {resolvedPendingTickets.length} ({resolvedPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Đang xử lý: {inProgressTickets.length} ({inProgressPct}%)
                </span>
              </div>
            </div>

            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
              <div
                title={`Đã hoàn thành: ${completedTickets.length}`}
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${completionRate}%` }}
              />
              <div
                title={`Chờ Quản lý duyệt: ${resolvedPendingTickets.length}`}
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${resolvedPct}%` }}
              />
              <div
                title={`Đang xử lý: ${inProgressTickets.length}`}
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${inProgressPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2.5 text-[11px] flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-2 sm:pt-0 sm:pl-4">
            <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 font-bold border border-orange-200">
              {activeSteps.length} bước cần làm
            </span>
            {resolvedPendingTickets.length > 0 && (
              <button
                onClick={() => setFilterTab('resolved')}
                className="px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 font-bold border border-amber-200 hover:bg-amber-100 transition-colors cursor-pointer"
              >
                {resolvedPendingTickets.length} chờ nghiệm thu
              </button>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. WORKSPACE 2 CỘT CÂN ĐỐI (7/12 TRÁI — 5/12 PHẢI)
         ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (7/12): DANH SÁCH HỒ SƠ ĐƯỢC PHÂN CÔNG */}
        <div className="xl:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="p-4 sm:px-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">
                Danh sách Hồ sơ Được Phân công
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Bấm vào từng hồ sơ để cập nhật tiến độ bước xử lý và tải ảnh bằng chứng
              </p>
            </div>

            <div className="relative w-full sm:w-56">
              <SearchIcon className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Tìm mã, nội dung, địa chỉ..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-semibold">
            {[
              { key: 'all', label: `Tất cả (${totalCount})` },
              { key: 'in_progress', label: `Đang xử lý (${inProgressTickets.length})` },
              { key: 'urgent', label: `Khẩn cấp (${criticalTickets.length})` },
              { key: 'resolved', label: `Chờ duyệt (${resolvedPendingTickets.length})` },
              { key: 'completed', label: `Đã xong (${completedTickets.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setFilterTab(tab.key as FilterTab)}
                className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  filterTab === tab.key
                    ? 'bg-orange-600 text-white font-bold shadow-2xs'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Ticket Rows */}
          <div className="divide-y divide-gray-100">
            {displayedTickets.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-xs">
                {loading ? 'Đang tải danh sách hồ sơ...' : 'Không có hồ sơ nào phù hợp với bộ lọc hiện tại'}
              </div>
            ) : (
              displayedTickets.map((t) => {
                const ticketId = t.id || t.ticketId || '';
                const shortId = ticketId.length > 8 ? `#${ticketId.slice(0, 8)}` : ticketId;
                const si = statusInfo(t.status as any);
                const pi = priorityInfo(t.priority || t.subCategories?.[0]?.priority);
                const catName =
                  t.categoryName ||
                  (Array.isArray(t.subCategories) &&
                    (t.subCategories[0]?.name || (t.subCategories[0] as any)?.subCategoryName)) ||
                  'Sự cố hạ tầng';

                return (
                  <div
                    key={ticketId}
                    onClick={() => onOpenTicket(t)}
                    className="p-4 sm:px-5 hover:bg-orange-50/40 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        {t.isLifeThreatening && (
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse flex-shrink-0" title="Khẩn cấp SOS" />
                        )}
                        <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                          {shortId}
                        </span>
                        <span className="text-[11px] font-medium text-gray-500 truncate">
                          {catName}
                        </span>
                      </div>

                      <p className="text-[13px] font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                        {t.description || catName}
                      </p>

                      <div className="flex items-center gap-2.5 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1 truncate max-w-[260px]">
                          <MapPinIcon className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <span>{t.address || 'Hiện trường'}</span>
                        </span>
                        <span>•</span>
                        <span className="font-mono text-[10px]">
                          {t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : 'Vừa xong'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${pi.cls}`}>
                        {pi.label}
                      </span>

                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${si.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                        {si.label}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTicket(t);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-orange-50 hover:bg-orange-600 text-orange-700 hover:text-white border border-orange-200 hover:border-orange-600 text-[11px] font-bold transition-colors cursor-pointer"
                      >
                        Xử lý →
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-[12px]">
            <span className="text-gray-500">
              Hiển thị <strong>{displayedTickets.length}</strong> / <strong>{totalCount}</strong> hồ sơ
            </span>
            <button
              onClick={onViewAll}
              className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              Xem toàn bộ hồ sơ được giao →
            </button>
          </div>
        </div>

        {/* CỘT PHẢI (5/12): BƯỚC KỸ THUẬT CẦN THỰC HIỆN & KẾT QUẢ GẦN ĐÂY */}
        <div className="xl:col-span-5 space-y-5">
          {/* Card 1: Các bước kỹ thuật đang giao xử lý */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">
                  Bước Kỹ Thuật Cần Thực Hiện
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Các bước công việc cụ thể đang giao cho bạn tại hiện trường
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                {activeSteps.length} bước
              </span>
            </div>

            {activeSteps.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs flex flex-col items-center gap-1">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-gray-700 mt-1">Không có bước kỹ thuật tồn đọng</span>
                <span className="text-[11px]">Tất cả các bước được giao hiện đã hoàn tất</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[300px] overflow-y-auto scrollbar-thin">
                {activeSteps.map(({ ticket, step }, sIdx) => {
                  const sInfo = statusInfo(step.status || 'PENDING');
                  const stepTitle =
                    step.stepName ||
                    (step as any).name ||
                    (step as any).title ||
                    (step as any).stepTitle ||
                    (step as any).step?.stepName ||
                    (step as any).step?.name ||
                    step.notes ||
                    `Bước xử lý ${sIdx + 1}`;

                  return (
                    <div
                      key={step.id || step.stepId || sIdx}
                      onClick={() => onOpenTicket(ticket)}
                      className="p-3.5 px-5 hover:bg-orange-50/30 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-gray-500">
                            #{(ticket.id || ticket.ticketId || '').slice(0, 8)}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${sInfo.cls}`}>
                            {sInfo.label}
                          </span>
                        </div>
                        <p className="text-[12px] font-bold text-gray-900 truncate mt-0.5 group-hover:text-orange-600 transition-colors">
                          {stepTitle}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {ticket.address || ticket.categoryName || 'Hiện trường'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTicket(ticket);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      >
                        Cập nhật →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Card 2: Hồ sơ đã giải quyết / Hoàn thành gần đây & Quy trình chuẩn SOP */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">
                  Kết Quả Xử Lý Gần Đây
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Hồ sơ đã tải minh chứng hoàn tất hoặc đã nghiệm thu
                </p>
              </div>
              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {recentFinished.length} hồ sơ
              </span>
            </div>

            {recentFinished.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                Chưa có hồ sơ nào hoàn tất trong ca trực này.
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[240px] overflow-y-auto scrollbar-thin">
                {recentFinished.map((t, rIdx) => {
                  const sInfo = statusInfo(t.status as any);
                  return (
                    <div
                      key={t.id || t.ticketId || rIdx}
                      onClick={() => onOpenTicket(t)}
                      className="p-3.5 px-5 hover:bg-emerald-50/30 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-bold text-gray-500">
                            #{(t.id || t.ticketId || '').slice(0, 8)}
                          </span>
                          <span className="text-[11px] font-bold text-gray-900 truncate group-hover:text-emerald-700">
                            {t.categoryName || 'Sự cố hạ tầng'}
                          </span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5 flex items-center gap-1">
                          <MapPinIcon className="w-3 h-3 text-gray-400 flex-shrink-0" />
                          <span>{t.address || 'Hiện trường'}</span>
                        </p>
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border flex-shrink-0 ${sInfo.cls}`}>
                        {sInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Thanh Quy trình 3 bước SOP gọn gàng ở chân thẻ */}
            <div className="px-5 py-3 bg-gray-50/80 border-t border-gray-100">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Quy trình tác nghiệp 3 bước chuẩn SOP
              </p>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <div className="p-2 rounded-lg bg-white border border-gray-200/80">
                  <span className="font-bold text-orange-600">1. Nhận bước</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Bấm Bắt đầu xử lý</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-gray-200/80">
                  <span className="font-bold text-blue-600">2. Thi công</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Khắc phục tại chỗ</p>
                </div>
                <div className="p-2 rounded-lg bg-white border border-gray-200/80">
                  <span className="font-bold text-emerald-600">3. Nghiệm thu</span>
                  <p className="text-[10px] text-gray-500 mt-0.5">Tải ảnh minh chứng</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
