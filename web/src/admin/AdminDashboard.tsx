import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  Ticket,
  Department,
  statusInfo,
  priorityInfo,
} from '../data';
import {
  getAccessToken,
  fetchAllDepartmentsForAdmin,
  fetchSystemLocationsForAdmin,
  SystemLocationPair,
  matchesSearch,
  matchesLocation,
  normalizeLocationKey,
  getAdminDashboardSummary,
  getAdminTickets,
  mapAdminTicketToUiTicket,
  AdminDashboardSummaryResponse,
} from '../services';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

interface Props {
  onOpenTicket: (id: string, ticketObj?: Ticket) => void;
  onViewAll?: () => void;
}

type TicketTabKey = 'all' | 'pending' | 'in_progress' | 'critical' | 'completed';
type DeptLevelTab = 'ALL' | 'CITY' | 'WARD';

export default function AdminDashboard({ onOpenTicket, onViewAll }: Props) {
  const [summary, setSummary] = useState<AdminDashboardSummaryResponse | null>(null);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [systemLocations, setSystemLocations] = useState<SystemLocationPair[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  // Bộ lọc cho cột Danh sách Hồ sơ mới nhất
  const [activeTab, setActiveTab] = useState<TicketTabKey>('all');
  const [filterSearch, setFilterSearch] = useState('');
  const [filterDept, setFilterDept] = useState('ALL');
  const [filterProvince, setFilterProvince] = useState('ALL');
  const [filterWard, setFilterWard] = useState('ALL');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 7;

  // Bộ lọc cho cột Tình trạng Giải quyết theo Đơn vị
  const [deptSearch, setDeptSearch] = useState('');
  const [deptLevelFilter, setDeptLevelFilter] = useState<DeptLevelTab>('ALL');

  const loadDashboardData = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const [summaryRes, ticketsPageRes, deptsRes, locsRes] = await Promise.all([
        getAdminDashboardSummary().catch((err) => {
          console.warn('Lỗi tải summary dashboard:', err);
          return null;
        }),
        getAdminTickets({ page: 0, size: 100, sort: 'createdAt,desc' }).catch((err) => {
          console.warn('Lỗi tải danh sách hồ sơ mới nhất:', err);
          return null;
        }),
        fetchAllDepartmentsForAdmin(),
        fetchSystemLocationsForAdmin(),
      ]);

      if (summaryRes) {
        setSummary(summaryRes);
      }

      const mappedDepts: Department[] = deptsRes || [];
      setDepartments(mappedDepts);
      setSystemLocations(locsRes || []);

      if (ticketsPageRes && Array.isArray(ticketsPageRes.content)) {
        const deptNameMap = new Map(mappedDepts.map((d) => [d.departmentId, d.name]));
        const mappedTickets = ticketsPageRes.content.map((item) => {
          const uiTicket = mapAdminTicketToUiTicket(item);
          if (
            (!uiTicket.departmentName || uiTicket.departmentName === uiTicket.departmentId) &&
            uiTicket.departmentId &&
            deptNameMap.has(uiTicket.departmentId)
          ) {
            uiTicket.departmentName = deptNameMap.get(uiTicket.departmentId);
          }
          return uiTicket;
        });
        setTickets(mappedTickets);
      } else {
        setTickets([]);
      }

      if (!summaryRes && !ticketsPageRes) {
        setErrorMsg('Không thể tải dữ liệu tổng quan từ máy chủ. Vui lòng thử lại.');
      }

      setLastRefreshed(
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      );
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Lỗi tải dữ liệu tổng quan hệ thống.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  // ── KPI tổng hợp từ API GET /api/v1/admin/dashboard/summary ────────────────
  const totalTickets = summary?.ticketSummary?.totalTickets ?? tickets.length;
  const completedTickets =
    summary?.ticketSummary != null
      ? (summary.ticketSummary.resolvedTickets ?? 0) + (summary.ticketSummary.completedTickets ?? 0)
      : tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'COMPLETED').length;
  const inProgressTickets =
    summary?.ticketSummary != null
      ? (summary.ticketSummary.assignedTickets ?? 0) + (summary.ticketSummary.inProgressTickets ?? 0)
      : tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
  const pendingTickets =
    summary?.ticketSummary != null
      ? summary.ticketSummary.initiatedTickets ?? 0
      : tickets.filter((t) => t.status === 'INITIATED' || t.status === 'PENDING_REVIEW' || t.status === 'OPEN').length;
  const unassignedCount = summary?.ticketSummary?.unassignedTickets ?? 0;
  const sosCount =
    summary?.ticketSummary != null
      ? summary.ticketSummary.lifeThreateningTickets ?? 0
      : tickets.filter((t) => t.isLifeThreatening && t.status !== 'COMPLETED' && t.status !== 'RESOLVED').length;

  const completionRate =
    summary?.ticketSummary?.overallResolutionRate != null
      ? Math.round(summary.ticketSummary.overallResolutionRate)
      : totalTickets > 0
      ? Math.round((completedTickets / totalTickets) * 100)
      : 0;
  const inProgressPct = totalTickets > 0 ? Math.round((inProgressTickets / totalTickets) * 100) : 0;
  const pendingPct = totalTickets > 0 ? Math.max(0, 100 - completionRate - inProgressPct) : 0;

  const totalDepts = summary?.configSummary?.totalDepartments ?? departments.length;
  const cityDeptsCount = departments.filter((d) => d.level === 'CITY').length;
  const wardDeptsCount = departments.filter((d) => d.level === 'WARD').length;

  const totalUsersCount = summary?.accountSummary?.totalUsers ?? 0;
  const activeUsersCount = summary?.accountSummary?.activeUsers ?? 0;
  const staffAndManagerCount =
    (summary?.accountSummary?.staffCount ?? 0) + (summary?.accountSummary?.managerCount ?? 0);

  const totalCategoriesCount = summary?.configSummary?.totalCategories ?? 0;
  const totalSubCategoriesCount = summary?.configSummary?.totalSubCategories ?? 0;
  const totalRoutingRulesCount = summary?.configSummary?.totalRoutingRules ?? 0;
  const totalStepsCount = summary?.configSummary?.totalSteps ?? 0;

  // Danh sách Tỉnh/Thành phố & Phường/Xã thực tế trích xuất từ API (100% không dùng mock)
  const actualProvinces = useMemo(() => {
    const map = new Map<string, string>();
    const addProv = (p?: string) => {
      if (!p || p === 'Chưa xác định') return;
      const key = normalizeLocationKey(p);
      if (!key) return;
      if (!map.has(key)) map.set(key, p);
    };
    systemLocations.forEach((loc) => addProv(loc.province));
    tickets.forEach((t) => addProv(t.province));
    return Array.from(map.values());
  }, [systemLocations, tickets]);

  const actualWards = useMemo(() => {
    const map = new Map<string, string>();
    const addWard = (p?: string, w?: string) => {
      if (!w || w === 'Chưa xác định') return;
      if (filterProvince !== 'ALL' && !matchesLocation(p, filterProvince)) return;
      const key = normalizeLocationKey(w);
      if (!key) return;
      if (!map.has(key)) map.set(key, w);
    };
    systemLocations.forEach((loc) => addWard(loc.province, loc.ward));
    tickets.forEach((t) => addWard(t.province, t.ward));
    return Array.from(map.values());
  }, [systemLocations, tickets, filterProvince]);

  // Phân nhóm theo Tab
  const pendingList = useMemo(
    () => tickets.filter((t) => t.status === 'INITIATED' || t.status === 'PENDING_REVIEW' || t.status === 'OPEN'),
    [tickets],
  );
  const inProgressList = useMemo(
    () => tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED'),
    [tickets],
  );
  const criticalList = useMemo(
    () => tickets.filter((t) => t.isLifeThreatening || t.severity === 'CRITICAL'),
    [tickets],
  );
  const completedList = useMemo(
    () => tickets.filter((t) => t.status === 'RESOLVED' || t.status === 'COMPLETED'),
    [tickets],
  );

  // Lọc danh sách hồ sơ mới nhất
  const filteredTickets = useMemo(() => {
    let base = tickets;
    if (activeTab === 'pending') base = pendingList;
    else if (activeTab === 'in_progress') base = inProgressList;
    else if (activeTab === 'critical') base = criticalList;
    else if (activeTab === 'completed') base = completedList;

    return base.filter((t) => {
      const q = filterSearch.trim();
      const shortId = t.ticketId.length > 10 ? `#${t.ticketId.slice(0, 8)}` : t.ticketId;
      const matchSearch =
        !q ||
        matchesSearch(t.ticketId, q) ||
        matchesSearch(shortId, q) ||
        matchesSearch(t.description, q) ||
        matchesSearch(t.categoryName, q) ||
        matchesSearch(t.subCategoryName, q) ||
        matchesSearch(t.address, q) ||
        matchesSearch(t.ward, q) ||
        matchesSearch(t.province, q) ||
        matchesSearch(t.departmentName, q) ||
        matchesSearch(t.assigneeName, q) ||
        matchesSearch(t.reporterName, q) ||
        matchesSearch(t.reporterPhone, q);

      const matchDept =
        filterDept === 'ALL'
          ? true
          : filterDept === 'UNASSIGNED'
          ? !t.departmentId
          : t.departmentId === filterDept;

      const matchProvince = matchesLocation(t.province, filterProvince);
      const matchWard = matchesLocation(t.ward, filterWard);

      return matchSearch && matchDept && matchProvince && matchWard;
    });
  }, [
    tickets,
    activeTab,
    pendingList,
    inProgressList,
    criticalList,
    completedList,
    filterSearch,
    filterDept,
    filterProvince,
    filterWard,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredTickets.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedTickets = filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  // Tiến độ xử lý theo từng cơ quan từ summary.departmentSummaries
  const deptProgress = useMemo(() => {
    const levelMap = new Map<string, 'CITY' | 'WARD'>();
    departments.forEach((d) => levelMap.set(d.departmentId, d.level));

    if (summary?.departmentSummaries && summary.departmentSummaries.length > 0) {
      return summary.departmentSummaries
        .map((ds) => {
          const deptId = String(ds.departmentId || '');
          const name = ds.departmentName || 'Chưa phân công';
          const isWardByName = /ubnd|phường|xã/i.test(name);
          const level = levelMap.get(deptId) || (isWardByName ? 'WARD' : 'CITY');
          const total = Number(ds.totalAssignedTickets ?? 0);
          const inProg = Number(ds.inProgressTickets ?? 0);
          const done = Number(ds.resolvedOrCompletedTickets ?? 0);
          const overdue = Number(ds.overdueTickets ?? 0);
          const pct =
            ds.resolutionRate != null
              ? Math.round(ds.resolutionRate)
              : total > 0
              ? Math.round((done / total) * 100)
              : 0;

          return {
            departmentId: deptId,
            name,
            level,
            total,
            inProg,
            done,
            overdue,
            pct,
          };
        })
        .sort((a, b) => b.total - a.total);
    }

    return departments
      .map((d) => {
        const dTickets = tickets.filter((t) => t.departmentId === d.departmentId);
        const done = dTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'COMPLETED').length;
        const inProg = dTickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
        const total = dTickets.length;
        const pct = total > 0 ? Math.round((done / total) * 100) : 0;
        return {
          departmentId: d.departmentId,
          name: d.name,
          level: d.level,
          total,
          done,
          inProg,
          overdue: 0,
          pct,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [summary, departments, tickets]);

  const filteredDepts = useMemo(() => {
    return deptProgress.filter((d) => {
      const matchLevel = deptLevelFilter === 'ALL' || d.level === deptLevelFilter;
      const q = deptSearch.trim();
      const matchName =
        !q ||
        matchesSearch(d.name, q) ||
        matchesSearch(d.departmentId, q);
      return matchLevel && matchName;
    });
  }, [deptProgress, deptLevelFilter, deptSearch]);

  // Xuất CSV & Excel đồng bộ với Manager & Staff
  const handleExportCsv = () => {
    downloadCsvFile(
      'CityFix_Tong_Quan_He_Thong',
      [
        'Mã hồ sơ',
        'Danh mục',
        'Nội dung phản ánh',
        'Địa chỉ',
        'Cơ quan phụ trách',
        'Độ ưu tiên',
        'Trạng thái',
        'Thời gian tạo',
      ],
      tickets.map((t) => [
        t.ticketId,
        t.categoryName || 'Chưa phân loại',
        t.description,
        t.address,
        t.departmentName || 'Chưa phân tuyến',
        priorityInfo(t.severity).label,
        statusInfo(t.status).label,
        t.createdAt,
      ]),
    );
    message.success('Đã xuất danh sách hồ sơ hệ thống (.csv) thành công!');
  };

  const handleExportExcel = () => {
    downloadExcelReport(
      'CityFix_Bao_Cao_Quan_Tri_He_Thong',
      'BÁO CÁO TỔNG QUAN QUẢN TRỊ HỆ THỐNG CITYFIX',
      `Tổng số hồ sơ: ${totalTickets} • Đã giải quyết: ${completedTickets} (${completionRate}%) • Cơ quan: ${totalDepts}`,
      [
        {
          heading: '1. Tổng hợp Chỉ số Vận hành Toàn Hệ thống',
          headers: ['Chỉ tiêu', 'Số lượng', 'Ghi chú'],
          rows: [
            ['Tổng số hồ sơ trên hệ thống', totalTickets, `Tỷ lệ hoàn thành: ${completionRate}%`],
            ['Hồ sơ đã giải quyết / hoàn thành', completedTickets, 'RESOLVED + COMPLETED'],
            ['Hồ sơ đang xử lý', inProgressTickets, 'ASSIGNED + IN_PROGRESS'],
            ['Hồ sơ mới khởi tạo / chờ duyệt', pendingTickets, 'INITIATED'],
            ['Sự cố khẩn cấp (SOS)', sosCount, 'Ưu tiên điều phối'],
            ['Tổng số cơ quan phụ trách', totalDepts, `${cityDeptsCount} Cấp TP / ${wardDeptsCount} Cấp Phường-Xã`],
            ['Tổng số tài khoản hệ thống', totalUsersCount, `${activeUsersCount} tài khoản đang hoạt động`],
          ],
        },
        {
          heading: '2. Tình trạng Giải quyết theo Đơn vị Phụ trách',
          headers: ['Mã đơn vị', 'Tên cơ quan', 'Cấp quản lý', 'Tổng hồ sơ', 'Đang xử lý', 'Đã hoàn thành', 'Tỷ lệ (%)'],
          rows: deptProgress.map((d) => [
            d.departmentId,
            d.name,
            d.level === 'CITY' ? 'Cấp Thành phố' : 'Cấp Phường/Xã',
            d.total,
            d.inProg,
            d.done,
            `${d.pct}%`,
          ]),
        },
      ],
    );
    message.success('Đã xuất Báo cáo Tổng quan Hệ thống (.xls) thành công!');
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* =========================================================================
          1. CLEAN COMMAND HEADER (ĐỒNG BỘ VỚI MANAGER & STAFF DASHBOARD)
         ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Bảng Điều hành Quản trị Hệ thống
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Trực tuyến • API Thời gian thực
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 inline-flex items-center gap-1.5">
              Quản trị Toàn Hệ thống
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mt-1">
            Giám sát tập trung <strong className="text-gray-800">{totalDepts}</strong> cơ quan xử lý •{' '}
            <strong className="text-gray-800">{totalCategoriesCount}</strong> danh mục sự cố ({totalSubCategoriesCount} danh mục con) •{' '}
            <strong className="text-gray-800">{totalRoutingRulesCount}</strong> quy tắc định tuyến tự động
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <span className="text-[11px] text-gray-400 hidden sm:inline mr-1">
            Cập nhật: <strong className="text-gray-600 font-semibold">{lastRefreshed}</strong>
          </span>

          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : 'text-gray-500'}`} />
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

          {onViewAll && (
            <button
              onClick={onViewAll}
              className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
            >
              Xem tất cả ({totalTickets}) →
            </button>
          )}
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={loadDashboardData}
            className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-100 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* =========================================================================
          3. 4 THẺ KPI ĐỒNG BỘ + THANH TIẾN ĐỘ TOÀN HỆ THỐNG
         ========================================================================= */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {
              label: 'Tổng Hồ Sơ Hệ Thống',
              val: totalTickets,
              unit: 'hồ sơ',
              sub: `Tỷ lệ hoàn tất: ${completionRate}% (${completedTickets} đã xong)`,
              icon: <ClipboardIcon />,
              iconBox: 'bg-orange-50 text-orange-600',
              valCls: 'text-gray-900',
              subCls: 'text-orange-600 font-semibold',
              onClick: () => {
                setActiveTab('all');
                setPage(1);
              },
              active: activeTab === 'all',
            },
            {
              label: 'Đang Giải Quyết',
              val: inProgressTickets,
              unit: 'hồ sơ',
              sub: `${pendingTickets} chờ duyệt • ${unassignedCount} chưa phân công`,
              icon: <ClockIcon />,
              iconBox: 'bg-amber-50 text-amber-600',
              valCls: 'text-orange-600',
              subCls: 'text-gray-500',
              onClick: () => {
                setActiveTab('in_progress');
                setPage(1);
              },
              active: activeTab === 'in_progress',
            },
            {
              label: 'Cơ Quan Phụ Trách',
              val: totalDepts,
              unit: 'đơn vị',
              sub: `${cityDeptsCount} Cấp Thành phố • ${wardDeptsCount} Cấp Phường/Xã`,
              icon: <BuildingIcon />,
              iconBox: 'bg-slate-100 text-slate-700',
              valCls: 'text-gray-900',
              subCls: 'text-gray-500',
              onClick: () => setDeptLevelFilter('ALL'),
              active: false,
            },
            {
              label: 'Tài Khoản & Cấu Hình',
              val: totalUsersCount,
              unit: 'tài khoản',
              sub: `${activeUsersCount} hoạt động • ${totalCategoriesCount} danh mục • ${totalRoutingRulesCount} quy tắc`,
              icon: <UsersGroupIcon />,
              iconBox: 'bg-emerald-50 text-emerald-600',
              valCls: 'text-emerald-600',
              subCls: 'text-emerald-600 font-semibold',
              onClick: () => {},
              active: false,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              onClick={kpi.onClick}
              className={`bg-white border rounded-2xl p-5 shadow-xs cursor-pointer transition-all flex flex-col justify-between ${
                kpi.active
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
                <span className="text-xs text-gray-400">{kpi.unit}</span>
              </div>

              <div className={`text-[11px] pt-2 border-t border-gray-100 truncate ${kpi.subCls}`}>
                {kpi.sub}
              </div>
            </div>
          ))}
        </div>

        {/* Sơ đồ Phân bổ & Tiến độ Giải quyết Toàn Hệ Thống */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-display text-sm font-bold text-gray-900">
                  Sơ đồ Phân bổ & Tiến độ Giải quyết Hồ sơ Toàn Hệ thống
                </h3>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  {completionRate}% hoàn tất
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">
                Tỷ trọng hoàn thành dứt điểm hồ sơ và các giai đoạn điều phối hiện trường
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-xl bg-orange-50 text-orange-700 font-bold border border-orange-200 shadow-2xs">
                {staffAndManagerCount} Cán bộ & Quản lý
              </span>
              <span className="px-2.5 py-1 rounded-xl bg-slate-100 text-slate-700 font-bold border border-slate-200 shadow-2xs">
                {totalStepsCount} Bước quy trình
              </span>
            </div>
          </div>

          {/* Thanh Tiến Độ Đa Đoạn (Multi-segment Visual Progress Track) */}
          <div className="space-y-2">
            <div className="w-full h-3.5 bg-gray-100/80 rounded-full p-0.5 overflow-hidden flex gap-0.5 shadow-inner">
              <div
                title={`Đã hoàn thành: ${completedTickets} hồ sơ (${completionRate}%)`}
                className="h-full rounded-l-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-500 hover:brightness-110 cursor-pointer"
                style={{ width: `${Math.max(completionRate > 0 ? 2 : 0, completionRate)}%` }}
              />
              <div
                title={`Đang xử lý: ${inProgressTickets} hồ sơ (${inProgressPct}%)`}
                className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 transition-all duration-500 hover:brightness-110 cursor-pointer"
                style={{ width: `${Math.max(inProgressPct > 0 ? 2 : 0, inProgressPct)}%` }}
              />
              <div
                title={`Chờ duyệt: ${pendingTickets} hồ sơ (${pendingPct}%)`}
                className="h-full rounded-r-full bg-gradient-to-r from-amber-400 to-yellow-300 transition-all duration-500 hover:brightness-110 cursor-pointer"
                style={{ width: `${Math.max(pendingPct > 0 ? 2 : 0, pendingPct)}%` }}
              />
            </div>

            {/* 3 Khối Chỉ Số Phân Bổ Trực Quan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                  <span className="text-xs font-semibold text-emerald-900">Đã giải quyết xong</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono-cf text-xs font-black text-emerald-700">{completedTickets}</span>
                  <span className="text-[10px] text-emerald-600">({completionRate}%)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-xs" />
                  <span className="text-xs font-semibold text-orange-900">Đang điều phối & xử lý</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono-cf text-xs font-black text-orange-700">{inProgressTickets}</span>
                  <span className="text-[10px] text-orange-600">({inProgressPct}%)</span>
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                  <span className="text-xs font-semibold text-amber-900">Mới tiếp nhận / Chờ duyệt</span>
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="font-mono-cf text-xs font-black text-amber-700">{pendingTickets}</span>
                  <span className="text-[10px] text-amber-600">({pendingPct}%)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          4. WORKSPACE 2 CỘT CÂN ĐỐI (7/12 TRÁI — 5/12 PHẢI) GIỐNG MANAGER & STAFF
         ========================================================================= */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5 items-start">
        {/* CỘT TRÁI (7/12): DANH SÁCH HỒ SƠ MỚI NHẤT TOÀN HỆ THỐNG */}
        <div className="xl:col-span-7 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs flex flex-col justify-between">
          <div className="p-4 sm:px-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">
                Hồ sơ Phản ánh Mới nhất Toàn Hệ thống
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Bấm vào từng hồ sơ để xem chi tiết thông tin định tuyến, ảnh hiện trường và nhật ký xử lý
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-full sm:w-56">
                <span className="text-gray-400 absolute left-3 top-2.5">
                  <SearchSmIcon />
                </span>
                <input
                  type="text"
                  placeholder="Tìm mã (#...), nội dung, danh mục, địa chỉ..."
                  value={filterSearch}
                  onChange={(e) => {
                    setFilterSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Thanh lọc Tab trạng thái + Cơ quan & Tỉnh/TP + Phường/Xã từ dữ liệu thật */}
          <div className="px-5 py-2.5 border-b border-gray-100 bg-gray-50/50 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none text-[11px] font-semibold">
              {[
                { key: 'all', label: `Tất cả (${tickets.length})` },
                { key: 'pending', label: `Chờ duyệt (${pendingList.length})` },
                { key: 'in_progress', label: `Đang xử lý (${inProgressList.length})` },
                { key: 'critical', label: `Khẩn cấp (${criticalList.length})` },
                { key: 'completed', label: `Đã xong (${completedList.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => {
                    setActiveTab(tab.key as TicketTabKey);
                    setPage(1);
                  }}
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

            <div className="flex flex-wrap items-center gap-1.5">
              <select
                value={filterProvince}
                onChange={(e) => {
                  setFilterProvince(e.target.value);
                  setFilterWard('ALL');
                  setPage(1);
                }}
                className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
              >
                <option value="ALL">Tất cả Tỉnh/TP ({actualProvinces.length})</option>
                {actualProvinces.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>

              <select
                value={filterWard}
                onChange={(e) => {
                  setFilterWard(e.target.value);
                  setPage(1);
                }}
                className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-700 outline-none focus:border-orange-500 cursor-pointer max-w-[155px]"
              >
                <option value="ALL">Tất cả Phường/Xã ({actualWards.length})</option>
                {actualWards.map((w) => (
                  <option key={w} value={w}>
                    {w}
                  </option>
                ))}
              </select>

              <select
                value={filterDept}
                onChange={(e) => {
                  setFilterDept(e.target.value);
                  setPage(1);
                }}
                className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1 bg-white text-gray-700 outline-none focus:border-orange-500 cursor-pointer max-w-[165px]"
              >
                <option value="ALL">Tất cả Cơ quan ({departments.length})</option>
                <option value="UNASSIGNED">Chưa phân tuyến</option>
                {departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.name}
                  </option>
                ))}
              </select>

              {(filterSearch || activeTab !== 'all' || filterProvince !== 'ALL' || filterWard !== 'ALL' || filterDept !== 'ALL') && (
                <button
                  onClick={() => {
                    setFilterSearch('');
                    setActiveTab('all');
                    setFilterProvince('ALL');
                    setFilterWard('ALL');
                    setFilterDept('ALL');
                    setPage(1);
                  }}
                  className="text-[11px] text-red-600 hover:text-red-700 font-semibold px-2 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 cursor-pointer"
                >
                  Xóa lọc
                </button>
              )}
            </div>
          </div>

          {/* Danh sách Hồ sơ */}
          <div className="divide-y divide-gray-100">
            {pagedTickets.length === 0 ? (
              <div className="p-10 text-center text-gray-400 text-xs">
                {loading
                  ? 'Đang đồng bộ danh sách hồ sơ từ máy chủ...'
                  : 'Không có hồ sơ nào phù hợp với bộ lọc hiện tại.'}
              </div>
            ) : (
              pagedTickets.map((t) => {
                const shortId = t.ticketId.length > 10 ? `#${t.ticketId.slice(0, 8)}` : t.ticketId;
                const si = statusInfo(t.status);
                const pi = priorityInfo(t.severity);
                const deptName =
                  t.departmentName ||
                  departments.find((d) => d.departmentId === t.departmentId)?.name ||
                  'Chưa phân tuyến';

                return (
                  <div
                    key={t.ticketId}
                    onClick={() => onOpenTicket(t.ticketId, t)}
                    className="p-4 sm:px-5 hover:bg-orange-50/40 transition-colors cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        {t.isLifeThreatening && (
                          <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold">
                            SOS
                          </span>
                        )}
                        <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                          {shortId}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200/70 text-[10px] font-semibold">
                          {deptName}
                        </span>
                        {t.assigneeName && (
                          <span className="text-[11px] text-gray-500">
                            • Cán bộ: <strong className="text-gray-700">{t.assigneeName}</strong>
                          </span>
                        )}
                      </div>

                      <p className="text-[13px] font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                        {t.description}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-gray-400 truncate">
                        <span className="font-medium text-gray-600">{t.categoryName || 'Sự cố hạ tầng'}</span>
                        <span>•</span>
                        <span className="truncate">{t.address}</span>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1.5 flex-shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${pi.cls}`}>
                          {pi.label}
                        </span>
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${si.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${si.dot}`} />
                          {si.label}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-gray-400">{t.createdAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer Phân trang */}
          <div className="px-5 py-3 border-t border-gray-100 bg-gray-50/40 flex items-center justify-between text-xs text-gray-500">
            <span>
              Hiển thị{' '}
              <strong className="text-gray-800">
                {filteredTickets.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
                {Math.min(currentPage * PAGE_SIZE, filteredTickets.length)}
              </strong>{' '}
              / <strong className="text-gray-800">{filteredTickets.length}</strong> hồ sơ
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                ‹ Trước
              </button>
              <span className="px-2 font-mono text-[11px] font-semibold text-gray-700">
                {currentPage}/{totalPages}
              </span>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
              >
                Sau ›
              </button>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI (5/12): TÌNH TRẠNG GIẢI QUYẾT THEO ĐƠN VỊ */}
        <div className="xl:col-span-5 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs flex flex-col">
          <div className="p-4 sm:px-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-[14px] font-bold text-gray-900">
                Tình trạng Giải quyết theo Đơn vị
              </h2>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Tiến độ xử lý tại {filteredDepts.length}/{deptProgress.length} cơ quan phụ trách
              </p>
            </div>

            <div className="relative w-full sm:w-44">
              <span className="text-gray-400 absolute left-3 top-2.5">
                <SearchSmIcon />
              </span>
              <input
                value={deptSearch}
                onChange={(e) => setDeptSearch(e.target.value)}
                placeholder="Tìm tên cơ quan..."
                className="w-full pl-8 pr-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 transition-colors"
              />
            </div>
          </div>

          {/* Filter Tabs Cấp Hành Chính */}
          <div className="px-5 py-2 border-b border-gray-100 bg-gray-50/50 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              {(
                [
                  { k: 'ALL', l: `Tất cả (${deptProgress.length})` },
                  { k: 'CITY', l: 'Sở / Ngành TP' },
                  { k: 'WARD', l: 'UBND Phường / Xã' },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.k}
                  onClick={() => setDeptLevelFilter(tab.k)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    deptLevelFilter === tab.k
                      ? 'bg-orange-600 text-white font-bold shadow-2xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  {tab.l}
                </button>
              ))}
            </div>
          </div>

          {/* Danh sách cơ quan */}
          <div className="p-4 space-y-3 max-h-[540px] overflow-y-auto scrollbar-thin">
            {filteredDepts.length === 0 ? (
              <div className="p-8 text-center text-xs text-gray-400">
                {loading ? 'Đang tải dữ liệu đơn vị...' : 'Không tìm thấy cơ quan phù hợp.'}
              </div>
            ) : (
              filteredDepts.map((d) => (
                <div
                  key={d.departmentId || d.name}
                  className="p-3.5 rounded-xl border border-gray-100 bg-gray-50/60 hover:bg-white hover:border-orange-200 transition-all"
                >
                  <div className="flex items-center justify-between text-xs mb-2 gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 ${
                          d.level === 'CITY'
                            ? 'bg-orange-50 text-orange-700 border border-orange-200'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {d.level === 'CITY' ? 'Cấp TP' : 'Phường/Xã'}
                      </span>
                      <span className="font-bold text-gray-800 truncate">{d.name}</span>
                    </div>
                    <span className="font-mono font-bold text-gray-900 text-xs flex-shrink-0">
                      {d.pct}%
                    </span>
                  </div>

                  <div className="h-2.5 bg-gray-100/90 rounded-full overflow-hidden flex gap-0.5 p-0.5 mb-2 shadow-inner">
                    <div
                      title={`Đã hoàn thành: ${d.done} hồ sơ`}
                      className="h-full rounded-l-full bg-gradient-to-r from-emerald-600 via-emerald-500 to-teal-400 transition-all duration-500"
                      style={{ width: `${d.total > 0 ? (d.done / d.total) * 100 : 0}%` }}
                    />
                    <div
                      title={`Đang xử lý: ${d.inProg} hồ sơ`}
                      className="h-full bg-gradient-to-r from-orange-600 via-orange-500 to-amber-400 transition-all duration-500"
                      style={{ width: `${d.total > 0 ? (d.inProg / d.total) * 100 : 0}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-gray-500">
                    <span>
                      Tổng giao: <strong className="text-gray-800">{d.total}</strong> hồ sơ
                    </span>
                    <div className="flex items-center gap-2.5">
                      <span>
                        <strong className="text-emerald-600">{d.done}</strong> xong
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-orange-600">{d.inProg}</strong> đang làm
                      </span>
                      {d.overdue > 0 && (
                        <>
                          <span>•</span>
                          <span className="text-red-600 font-semibold">{d.overdue} quá hạn</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function ClipboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}
function BuildingIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" />
      <path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01" />
    </svg>
  );
}
function UsersGroupIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
    </svg>
  );
}
function SearchSmIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}
function RefreshIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
    </svg>
  );
}
