import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  AlertCircleIcon,
  CheckCircleIcon,
  ClockIcon,
  MapPinIcon,
  BuildingIcon,
  UserIcon,
  TicketIcon,
} from '../components/Icons';
import { User, statusInfo, priorityInfo, USERS } from '../data';
import {
  getManagerTickets,
  getDepartmentUsers,
  ManagerTicketItem,
  DepartmentStaffUser,
} from '../services/manager';
import { getDepartmentById } from '../services/departments';
import { message } from 'antd';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

function SearchIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function RefreshIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}

function PhoneIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  );
}

interface Props {
  currentUser: User;
  onOpenTicket: (ticketOrId: any) => void;
  onViewAll: () => void;
}

type TabKey = 'all' | 'unassigned' | 'in_progress' | 'critical' | 'completed';
type StaffFilter = 'all' | 'staff' | 'manager';

export default function ManagerDashboard({ currentUser, onOpenTicket, onViewAll }: Props) {
  const [tickets, setTickets] = useState<ManagerTicketItem[]>([]);
  const [staffUsers, setStaffUsers] = useState<DepartmentStaffUser[]>([]);
  const [departmentName, setDepartmentName] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [activeTab, setActiveTab] = useState<TabKey>('all');
  const [staffFilter, setStaffFilter] = useState<StaffFilter>('all');
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const deptId = currentUser.departmentId || undefined;

      const ticketsPromise = getManagerTickets({
        departmentId: deptId,
        page: 0,
        size: 50,
      });

      const staffPromise = deptId ? getDepartmentUsers(deptId) : Promise.resolve([]);

      const deptDetailPromise =
        deptId && deptId.length > 5 ? getDepartmentById(deptId) : Promise.resolve(null);

      const [ticketsRes, staffRes, deptRes] = await Promise.allSettled([
        ticketsPromise,
        staffPromise,
        deptDetailPromise,
      ]);

      if (ticketsRes.status === 'fulfilled' && ticketsRes.value) {
        setTickets(ticketsRes.value.content || []);
      }

      if (staffRes.status === 'fulfilled' && Array.isArray(staffRes.value)) {
        setStaffUsers(staffRes.value);
      }

      if (deptRes.status === 'fulfilled' && deptRes.value) {
        setDepartmentName(deptRes.value.name || '');
      }

      setLastRefreshed(
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
      );
    } catch (err) {
      console.warn('Lỗi tải dữ liệu ManagerDashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.departmentId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived groups
  const unassignedTickets = useMemo(
    () => tickets.filter((t) => !t.assigneeId || t.status === 'OPEN' || t.status === 'INITIATED'),
    [tickets]
  );

  const inProgressTickets = useMemo(
    () => tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED'),
    [tickets]
  );

  const criticalTickets = useMemo(
    () => tickets.filter((t) => t.severity === 'CRITICAL' || t.isLifeThreatening),
    [tickets]
  );

  const completedTickets = useMemo(
    () => tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'COMPLETED'),
    [tickets]
  );

  const activeLifeThreats = useMemo(
    () => criticalTickets.filter((t) => t.isLifeThreatening && t.status !== 'COMPLETED' && t.status !== 'RESOLVED'),
    [criticalTickets]
  );

  const displayedTickets = useMemo(() => {
    let list = tickets;

    if (activeTab === 'unassigned') {
      list = unassignedTickets;
    } else if (activeTab === 'in_progress') {
      list = inProgressTickets;
    } else if (activeTab === 'critical') {
      list = criticalTickets;
    } else if (activeTab === 'completed') {
      list = completedTickets;
    }

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((t) => {
        const id = (t.id || t.ticketId || '').toLowerCase();
        const desc = (t.description || '').toLowerCase();
        const cat = (t.categoryName || '').toLowerCase();
        const addr = (t.address || '').toLowerCase();
        const assignee = (t.assigneeName || '').toLowerCase();
        return id.includes(q) || desc.includes(q) || cat.includes(q) || addr.includes(q) || assignee.includes(q);
      });
    }

    return list;
  }, [tickets, activeTab, search, unassignedTickets, inProgressTickets, criticalTickets, completedTickets]);

  const effectiveStaffUsers = useMemo<DepartmentStaffUser[]>(() => {
    if (staffUsers && staffUsers.length > 0) {
      return staffUsers;
    }
    const deptId = currentUser.departmentId;
    const mockStaff = USERS.filter((u) => u.role === 'STAFF' || u.role === 'MANAGER');
    const matchedDept = deptId ? mockStaff.filter((u) => u.departmentId === deptId) : mockStaff;
    const pool = matchedDept.length > 0 ? matchedDept : mockStaff;

    return pool.map((u) => ({
      userId: u.userId,
      id: u.userId,
      email: u.email,
      fullName: u.fullName,
      phoneNumber: u.phoneNumber,
      role: u.role,
      departmentId: u.departmentId,
      departmentName: departmentName || 'Cơ quan Phụ trách',
      address: u.address,
      ward: u.ward,
      province: u.province,
    }));
  }, [staffUsers, currentUser.departmentId, departmentName]);

  const enrichedStaffList = useMemo(() => {
    const workloadMap: Record<string, number> = {};
    tickets.forEach((t) => {
      if (t.assigneeId && t.status !== 'COMPLETED' && t.status !== 'RESOLVED') {
        workloadMap[t.assigneeId] = (workloadMap[t.assigneeId] || 0) + 1;
      }
    });

    return effectiveStaffUsers.map((member) => {
      const id = member.userId || member.id || '';
      const activeCount = workloadMap[id] || 0;
      const roleStr = (member.role || '').toUpperCase();
      const isStaff = !roleStr.includes('MANAGER');

      return {
        ...member,
        activeCount,
        isStaff,
        displayRole: isStaff ? 'STAFF • Kỹ thuật' : 'MANAGER • Điều phối',
        roleBadgeCls: isStaff
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-orange-50 text-orange-700 border-orange-200',
        avatarCls: isStaff
          ? 'bg-blue-50 text-blue-700 border-blue-200'
          : 'bg-orange-50 text-orange-700 border-orange-200',
      };
    });
  }, [tickets, effectiveStaffUsers]);

  const filteredStaffList = useMemo(() => {
    if (staffFilter === 'staff') {
      return enrichedStaffList.filter((s) => s.isStaff);
    }
    if (staffFilter === 'manager') {
      return enrichedStaffList.filter((s) => !s.isStaff);
    }
    return enrichedStaffList;
  }, [enrichedStaffList, staffFilter]);

  const totalStaffCount = useMemo(
    () => enrichedStaffList.filter((s) => s.isStaff).length,
    [enrichedStaffList]
  );
  const totalManagerCount = useMemo(
    () => enrichedStaffList.filter((s) => !s.isStaff).length,
    [enrichedStaffList]
  );

  const totalCount = tickets.length;
  const resolutionMetrics = useMemo(() => {
    if (totalCount === 0) {
      return {
        completedPct: 0,
        inProgressPct: 0,
        unassignedPct: 0,
        overallRate: 0,
      };
    }
    const cPct = Math.round((completedTickets.length / totalCount) * 100);
    const pPct = Math.round((inProgressTickets.length / totalCount) * 100);
    const uPct = Math.max(0, 100 - cPct - pPct);

    return {
      completedPct: cPct,
      inProgressPct: pPct,
      unassignedPct: uPct,
      overallRate: cPct,
    };
  }, [totalCount, completedTickets.length, inProgressTickets.length]);

  const handleExportCsv = () => {
    downloadCsvFile(
      'CityFix_Bao_Cao_Don_Vi',
      [
        'Mã hồ sơ',
        'Danh mục',
        'Nội dung phản ánh',
        'Địa chỉ',
        'Cán bộ phụ trách',
        'Độ ưu tiên',
        'Trạng thái',
        'Ngày tiếp nhận',
      ],
      tickets.map((t) => [
        t.id || t.ticketId || '',
        t.categoryName || 'Sự cố hạ tầng',
        t.description || '',
        t.address || 'Chưa cập nhật',
        t.assigneeName || 'Chưa phân công',
        priorityInfo(t.priority || 'LOW').label,
        statusInfo(t.status as any).label,
        t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '',
      ])
    );
    message.success('Đã xuất danh sách hồ sơ đơn vị (.csv) thành công!');
  };

  const handleExportExcel = () => {
    const deptTitle = departmentName || 'Cơ quan Đô thị phụ trách';
    downloadExcelReport(
      'CityFix_Tong_Quan_Don_Vi',
      `BÁO CÁO ĐIỀU HÀNH ĐƠN VỊ — ${deptTitle.toUpperCase()}`,
      `${deptTitle} • Người xuất: ${currentUser.fullName || 'Quản lý đơn vị'}`,
      [
        {
          heading: '1. Tổng hợp Chỉ số Xử lý của Đơn vị',
          headers: ['Chỉ tiêu', 'Số lượng', 'Tỷ lệ / Ghi chú'],
          rows: [
            ['Tổng hồ sơ tiếp nhận', tickets.length, '100% hồ sơ thuộc đơn vị'],
            ['Đã giải quyết / Hoàn thành', completedTickets.length, `${resolutionMetrics.overallRate}% tổng số hồ sơ`],
            ['Đang xử lý tại hiện trường', inProgressTickets.length, `${resolutionMetrics.inProgressPct}% tổng số hồ sơ`],
            ['Chờ điều phối / Phân công', unassignedTickets.length, `${resolutionMetrics.unassignedPct}% tổng số hồ sơ`],
            ['Sự cố Khẩn cấp (SOS)', criticalTickets.length, 'Cần ưu tiên xử lý'],
          ],
        },
        {
          heading: '2. Danh sách Nhân sự & Khối lượng Công việc',
          headers: ['Họ và tên', 'Vai trò', 'Số điện thoại / Email', 'Số việc đang thực hiện'],
          rows: enrichedStaffList.map((s) => [
            s.fullName || 'Cán bộ',
            s.displayRole,
            s.phoneNumber || s.email || '—',
            s.activeCount,
          ]),
        },
        {
          heading: '3. Danh sách Hồ sơ của Đơn vị',
          headers: ['Mã hồ sơ', 'Danh mục', 'Nội dung', 'Địa chỉ', 'Người phụ trách', 'Trạng thái', 'Ngày tạo'],
          rows: tickets.map((t) => [
            t.id || t.ticketId || '',
            t.categoryName || 'Sự cố hạ tầng',
            t.description || '',
            t.address || 'Chưa cập nhật',
            t.assigneeName || 'Chưa phân công',
            statusInfo(t.status as any).label,
            t.createdAt ? t.createdAt.replace('T', ' ').slice(0, 16) : '',
          ]),
        },
      ]
    );
    message.success('Đã xuất Báo cáo Điều hành Đơn vị (.xls) thành công!');
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* 1. HEADER WITH BRAND ORANGE ACCENT */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Bảng Điều hành Cơ quan
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 inline-flex items-center gap-1.5">
              <BuildingIcon className="w-3.5 h-3.5 text-orange-600" />
              {departmentName || 'Cơ quan Đô thị phụ trách'}
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mt-1">
            Xin chào, <strong className="text-gray-800">{currentUser.fullName || 'Cán bộ Quản lý'}</strong> • Giám sát tiếp nhận, phân công cán bộ kỹ thuật và nghiệm thu hồ sơ của đơn vị
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] text-gray-400 hidden sm:inline mr-1">
            Cập nhật: <strong className="text-gray-600 font-semibold">{lastRefreshed}</strong>
          </span>

          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshIcon className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Xuất CSV
          </button>

          <button
            onClick={handleExportExcel}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Xuất Báo cáo (.xls)
          </button>

          <button
            onClick={onViewAll}
            className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Xem tất cả ({tickets.length}) →
          </button>
        </div>
      </div>

      {/* 2. SOS BANNER (SEMANTIC RED CONTEXT) */}
      {activeLifeThreats.length > 0 && (
        <div className="rounded-2xl border border-red-200 bg-red-50/80 px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 animate-pulse flex-shrink-0" />
            <div className="text-[12px]">
              <span className="font-bold text-red-900">
                Cảnh báo SOS Khẩn cấp ({activeLifeThreats.length} sự cố):
              </span>{' '}
              <span className="text-red-800">
                Cần ưu tiên điều phối ngay ({activeLifeThreats.map((t) => `#${(t.id || t.ticketId || '').slice(0, 8)}`).join(', ')})
              </span>
            </div>
          </div>

          <button
            onClick={() => setActiveTab('critical')}
            className="text-[11px] font-bold text-red-700 bg-white hover:bg-red-100 border border-red-200 rounded-xl px-3.5 py-1.5 transition-colors self-start sm:self-auto cursor-pointer"
          >
            Lọc hồ sơ khẩn cấp →
          </button>
        </div>
      )}

      {/* 3. 4 CONTEXTUAL KPI CARDS + RESOLUTION PROGRESS BAR */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Tổng Hồ Sơ Đơn Vị',
              val: tickets.length,
              sub: `Tỷ lệ hoàn thành: ${resolutionMetrics.overallRate}%`,
              icon: <TicketIcon className="w-4 h-4" />,
              iconBox: 'bg-orange-50 text-orange-600',
              valCls: 'text-gray-900',
              subCls: 'text-orange-600 font-semibold',
              tab: 'all' as TabKey,
            },
            {
              label: 'Chờ Điều Phối / Giao Việc',
              val: unassignedTickets.length,
              sub: `${resolutionMetrics.unassignedPct}% tổng số hồ sơ`,
              icon: <AlertCircleIcon className="w-4 h-4" />,
              iconBox: 'bg-amber-50 text-amber-600',
              valCls: 'text-amber-600',
              subCls: 'text-gray-500',
              tab: 'unassigned' as TabKey,
            },
            {
              label: 'Đang Xử Lý Thực Địa',
              val: inProgressTickets.length,
              sub: `${resolutionMetrics.inProgressPct}% tổng số hồ sơ`,
              icon: <ClockIcon className="w-4 h-4" />,
              iconBox: 'bg-blue-50 text-blue-600',
              valCls: 'text-blue-600',
              subCls: 'text-gray-500',
              tab: 'in_progress' as TabKey,
            },
            {
              label: 'Đã Giải Quyết Xong',
              val: completedTickets.length,
              sub: criticalTickets.length > 0 ? `${criticalTickets.length} sự cố mức Khẩn cấp` : 'Đã nghiệm thu hoàn tất',
              icon: <CheckCircleIcon className="w-4 h-4" />,
              iconBox: 'bg-emerald-50 text-emerald-600',
              valCls: 'text-emerald-600',
              subCls: criticalTickets.length > 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold',
              tab: 'completed' as TabKey,
            },
          ].map((kpi) => {
            const isSelected = activeTab === kpi.tab;
            return (
              <div
                key={kpi.tab}
                onClick={() => setActiveTab(kpi.tab)}
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

        {/* Clean Contextual Progress Bar */}
        <div className="bg-white border border-gray-200 rounded-2xl px-5 py-3.5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 space-y-1.5">
            <div className="flex items-center justify-between text-[12px]">
              <span className="font-bold text-gray-800">
                Tiến độ giải quyết của đơn vị
              </span>
              <div className="flex items-center gap-3 text-[11px] font-semibold">
                <span className="flex items-center gap-1.5 text-emerald-700">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Hoàn thành: {completedTickets.length} ({resolutionMetrics.completedPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-blue-700">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Đang làm: {inProgressTickets.length} ({resolutionMetrics.inProgressPct}%)
                </span>
                <span className="flex items-center gap-1.5 text-amber-700">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  Chờ giao: {unassignedTickets.length} ({resolutionMetrics.unassignedPct}%)
                </span>
              </div>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden flex gap-0.5">
              <div
                title={`Hoàn thành: ${completedTickets.length}`}
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${resolutionMetrics.completedPct}%` }}
              />
              <div
                title={`Đang xử lý: ${inProgressTickets.length}`}
                className="h-full bg-blue-500 transition-all duration-500"
                style={{ width: `${resolutionMetrics.inProgressPct}%` }}
              />
              <div
                title={`Chờ giao: ${unassignedTickets.length}`}
                className="h-full bg-amber-400 transition-all duration-500"
                style={{ width: `${resolutionMetrics.unassignedPct}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-[11px] flex-shrink-0 border-t sm:border-t-0 sm:border-l border-gray-100 pt-2 sm:pt-0 sm:pl-4">
            <span className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 font-bold border border-blue-200/80">
              {totalStaffCount} Cán bộ Kỹ thuật (STAFF)
            </span>
            {criticalTickets.length > 0 && (
              <button
                onClick={() => setActiveTab('critical')}
                className="px-2.5 py-1 rounded-lg bg-red-50 text-red-700 font-bold border border-red-200 hover:bg-red-100 transition-colors cursor-pointer"
              >
                {criticalTickets.length} Khẩn cấp
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 4. MAIN 2-COLUMN WORKSPACE */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN (7/12): DEPARTMENT TICKETS */}
        <div className="xl:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="p-4 sm:px-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">
                Danh sách Hồ sơ Cơ quan
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Bấm vào từng hồ sơ để xem chi tiết, duyệt quy trình hoặc cập nhật tiến độ
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

          {/* Filter Tabs with Brand Orange Active State */}
          <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-semibold">
            {[
              { key: 'all', label: `Tất cả (${tickets.length})` },
              { key: 'unassigned', label: `Chờ giao (${unassignedTickets.length})` },
              { key: 'in_progress', label: `Đang xử lý (${inProgressTickets.length})` },
              { key: 'critical', label: `Khẩn cấp (${criticalTickets.length})` },
              { key: 'completed', label: `Đã xong (${completedTickets.length})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as TabKey)}
                className={`px-3 py-1 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  activeTab === tab.key
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
                {loading ? 'Đang đồng bộ dữ liệu...' : 'Không có hồ sơ nào phù hợp với bộ lọc hiện tại'}
              </div>
            ) : (
              displayedTickets.slice(0, 7).map((t) => {
                const ticketId = t.id || t.ticketId || '';
                const shortId = ticketId.length > 8 ? `#${ticketId.slice(0, 8)}` : ticketId;
                const si = statusInfo(t.status as any);
                const pi = priorityInfo(t.priority || 'LOW');

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
                          <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Khẩn cấp SOS" />
                        )}
                        <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                          {shortId}
                        </span>

                        {t.assigneeName ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-gray-600">
                            <UserIcon className="w-3 h-3 text-gray-400" />
                            <span>{t.assigneeName}</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Chưa phân công
                          </span>
                        )}
                      </div>

                      <p className="text-[13px] font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                        {t.description || catName}
                      </p>

                      <div className="flex items-center gap-2.5 text-[11px] text-gray-400">
                        <span className="flex items-center gap-1 truncate max-w-[240px]">
                          <MapPinIcon className="w-3 h-3 text-orange-500 flex-shrink-0" />
                          <span>{t.address || 'Chưa cập nhật địa chỉ'}</span>
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
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-[12px]">
            <span className="text-gray-500">
              Hiển thị <strong>{Math.min(displayedTickets.length, 7)}</strong> / <strong>{tickets.length}</strong> hồ sơ
            </span>
            <button
              onClick={onViewAll}
              className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              Xem toàn bộ hồ sơ phòng ban →
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN (5/12): DISPATCH QUEUE & STAFF WORKLOAD */}
        <div className="xl:col-span-5 space-y-5">
          {/* 1. DISPATCH QUEUE (CONTEXTUAL AMBER/ORANGE) */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-[14px] font-bold text-gray-900">
                  Hàng đợi Cần Điều phối
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Hồ sơ mới tiếp nhận đang chờ duyệt và phân công cán bộ
                </p>
              </div>

              <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                {unassignedTickets.length} chờ giao
              </span>
            </div>

            {unassignedTickets.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs flex flex-col items-center gap-1">
                <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
                <span className="font-semibold text-gray-700 mt-1">Không còn hồ sơ chờ điều phối</span>
                <span className="text-[11px]">Tất cả hồ sơ trong đơn vị đã được phân công</span>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[260px] overflow-y-auto scrollbar-thin">
                {unassignedTickets.slice(0, 5).map((t) => {
                  const ticketId = t.id || t.ticketId || '';
                  const pi = priorityInfo(t.priority || 'LOW');

                  return (
                    <div
                      key={ticketId}
                      onClick={() => onOpenTicket(t)}
                      className="p-3.5 px-5 hover:bg-orange-50/30 transition-colors cursor-pointer flex items-center justify-between gap-3 group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] text-gray-500 font-bold">
                            #{ticketId.slice(0, 8)}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border ${pi.cls}`}>
                            {pi.label}
                          </span>
                        </div>
                        <p className="text-[12px] font-bold text-gray-900 truncate mt-0.5 group-hover:text-orange-600 transition-colors">
                          {t.categoryName || t.description || 'Sự cố cần giao việc'}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                          {t.address || 'Chưa cập nhật địa chỉ'}
                        </p>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenTicket(t);
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                      >
                        Giao việc →
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* 2. STAFF WORKLOAD */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 pt-4 pb-3 border-b border-gray-100 space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-[14px] font-bold text-gray-900">
                    Đội ngũ Cán bộ Đơn vị
                  </h3>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    Theo dõi khối lượng công việc của nhân sự trực thuộc
                  </p>
                </div>

                <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                  {totalStaffCount} STAFF
                </span>
              </div>

              <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-xl text-[11px] font-semibold">
                <button
                  onClick={() => setStaffFilter('all')}
                  className={`flex-1 py-1 rounded-lg transition-colors text-center cursor-pointer ${
                    staffFilter === 'all'
                      ? 'bg-white text-orange-600 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Tất cả ({enrichedStaffList.length})
                </button>
                <button
                  onClick={() => setStaffFilter('staff')}
                  className={`flex-1 py-1 rounded-lg transition-colors text-center cursor-pointer ${
                    staffFilter === 'staff'
                      ? 'bg-white text-orange-600 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Kỹ thuật ({totalStaffCount})
                </button>
                <button
                  onClick={() => setStaffFilter('manager')}
                  className={`flex-1 py-1 rounded-lg transition-colors text-center cursor-pointer ${
                    staffFilter === 'manager'
                      ? 'bg-white text-orange-600 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-900'
                  }`}
                >
                  Điều phối ({totalManagerCount})
                </button>
              </div>
            </div>

            {filteredStaffList.length === 0 ? (
              <div className="p-6 text-center text-gray-400 text-xs">
                Không tìm thấy cán bộ nào trong nhóm này
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-[340px] overflow-y-auto scrollbar-thin">
                {filteredStaffList.slice(0, 6).map((staff, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 px-5 flex items-center justify-between gap-3 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center border flex-shrink-0 ${staff.avatarCls}`}>
                        {(staff.fullName || 'CB').slice(0, 2).toUpperCase()}
                      </div>

                      <div className="min-w-0 space-y-0.5">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-[12px] font-bold text-gray-900 truncate">
                            {staff.fullName || 'Cán bộ kỹ thuật'}
                          </p>
                          <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold border ${staff.roleBadgeCls}`}>
                            {staff.isStaff ? 'STAFF • Kỹ thuật' : 'MANAGER'}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 text-[11px] text-gray-400 truncate">
                          {staff.phoneNumber ? (
                            <span className="flex items-center gap-1 text-gray-500 font-mono">
                              <PhoneIcon className="w-3 h-3 text-gray-400" />
                              {staff.phoneNumber}
                            </span>
                          ) : (
                            <span>{staff.email}</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span
                        className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                          staff.activeCount > 0
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {staff.activeCount > 0 ? `${staff.activeCount} việc đang làm` : 'Sẵn sàng'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="px-5 py-2.5 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
              <span>
                Cán bộ trực ca: <strong className="text-gray-800">{totalStaffCount} kỹ thuật viên</strong>
              </span>
              <span className="text-emerald-600 font-semibold">Sẵn sàng nhận việc</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
