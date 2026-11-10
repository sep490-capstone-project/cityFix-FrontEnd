import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { message } from 'antd';
import {
  Ticket,
  Department,
  STATUS_META,
  SEVERITY_META,
  StatusKey,
  Severity,
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
  getAdminCategories,
  AdminCategory,
  getAdminTickets,
  getAdminDashboardSummary,
  mapAdminTicketToUiTicket,
  AdminDashboardSummaryResponse,
} from '../services';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

interface Props {
  onOpenTicket: (id: string, ticketObj?: Ticket) => void;
}

const BACKEND_STATUS_KEYS: StatusKey[] = [
  'INITIATED',
  'ASSIGNED',
  'IN_PROGRESS',
  'RESOLVED',
  'COMPLETED',
  'REJECTED',
  'CANCELLED',
];

export default function AdminTickets({ onOpenTicket }: Props) {
  const [rawTickets, setRawTickets] = useState<Ticket[]>([]);
  const [summary, setSummary] = useState<AdminDashboardSummaryResponse | null>(null);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [dbLocations, setDbLocations] = useState<SystemLocationPair[]>([]);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  const [search, setSearch] = useState('');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [wardFilter, setWardFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusKey | 'ALL'>('ALL');
  const [severityFilter, setSeverityFilter] = useState<Severity | 'ALL'>('ALL');
  const [onlySOS, setOnlySOS] = useState(false);
  const [quickTicket, setQuickTicket] = useState<Ticket | null>(null);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 10;

  // Tải danh sách Cơ quan, Danh mục, Tổng quan KPI & Địa bàn thực tế từ API (100% không dùng mock)
  const loadMetadata = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;
    try {
      const [deptsRes, catsRes, summaryRes, locsRes] = await Promise.all([
        fetchAllDepartmentsForAdmin(),
        getAdminCategories().catch(() => []),
        getAdminDashboardSummary().catch(() => null),
        fetchSystemLocationsForAdmin(),
      ]);
      setDepartments(deptsRes || []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
      if (summaryRes) {
        setSummary(summaryRes);
      }
      setDbLocations(locsRes || []);
    } catch {
      // ignore metadata error
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  // Gọi API GET /api/v1/admin/tickets
  const loadTickets = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await getAdminTickets({
        departmentId:
          deptFilter !== 'ALL' && deptFilter !== 'UNASSIGNED' ? deptFilter : undefined,
        unassigned: deptFilter === 'UNASSIGNED' ? true : undefined,
        categoryId: catFilter !== 'ALL' ? catFilter : undefined,
        status:
          statusFilter !== 'ALL' && BACKEND_STATUS_KEYS.includes(statusFilter)
            ? statusFilter
            : undefined,
        priority: severityFilter !== 'ALL' ? severityFilter : undefined,
        isLifeThreatening: onlySOS ? true : undefined,
        page: 0,
        size: 200,
        sort: 'createdAt,desc',
      });

      const deptNameMap = new Map(departments.map((d) => [d.departmentId, d.name]));
      const mapped = (res.content || []).map((item) => {
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

      setRawTickets(mapped);
      setLastRefreshed(
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      );
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Không thể tải danh sách hồ sơ từ máy chủ.');
      setRawTickets([]);
    } finally {
      setLoading(false);
    }
  }, [
    deptFilter,
    catFilter,
    statusFilter,
    severityFilter,
    onlySOS,
    departments,
  ]);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  // Danh sách Tỉnh/Thành phố thực tế 100% từ dữ liệu hệ thống (không dùng mock)
  const provinceList = useMemo(() => {
    const map = new Map<string, string>();
    const addProv = (p?: string) => {
      if (!p || p === 'Chưa xác định') return;
      const key = normalizeLocationKey(p);
      if (!key) return;
      if (!map.has(key)) map.set(key, p);
    };
    dbLocations.forEach((loc) => addProv(loc.province));
    rawTickets.forEach((t) => addProv(t.province));
    return Array.from(map.values());
  }, [dbLocations, rawTickets]);

  // Danh sách Phường/Xã thực tế 100% từ dữ liệu hệ thống (theo Tỉnh/TP đã chọn, không dùng mock)
  const wardList = useMemo(() => {
    const map = new Map<string, string>();
    const addWard = (p?: string, w?: string) => {
      if (!w || w === 'Chưa xác định') return;
      if (provinceFilter !== 'ALL' && !matchesLocation(p, provinceFilter)) return;
      const key = normalizeLocationKey(w);
      if (!key) return;
      if (!map.has(key)) map.set(key, w);
    };
    dbLocations.forEach((loc) => addWard(loc.province, loc.ward));
    rawTickets.forEach((t) => addWard(t.province, t.ward));
    return Array.from(map.values());
  }, [provinceFilter, dbLocations, rawTickets]);

  // Lọc chính xác theo từ khóa tìm kiếm (hỗ trợ cả mã rút gọn #..., danh mục, cơ quan, cán bộ, người gửi) & địa bàn
  const filteredTickets = useMemo(() => {
    const q = search.trim();
    return rawTickets.filter((t) => {
      const shortId = t.ticketId.length > 12 ? `#${t.ticketId.slice(0, 8)}` : t.ticketId;
      const deptName =
        t.departmentName ||
        departments.find((d) => d.departmentId === t.departmentId)?.name ||
        '';
      const catName = t.categoryName || '';

      const matchKeyword =
        !q ||
        matchesSearch(t.ticketId, q) ||
        matchesSearch(shortId, q) ||
        matchesSearch(t.description, q) ||
        matchesSearch(catName, q) ||
        matchesSearch(t.subCategoryName, q) ||
        matchesSearch(t.address, q) ||
        matchesSearch(t.ward, q) ||
        matchesSearch(t.province, q) ||
        matchesSearch(deptName, q) ||
        matchesSearch(t.assigneeName, q) ||
        matchesSearch(t.reporterName, q) ||
        matchesSearch(t.reporterPhone, q) ||
        matchesSearch(t.reporterEmail, q);

      const matchProv =
        provinceFilter === 'ALL' ||
        matchesLocation(t.province, provinceFilter) ||
        matchesLocation(t.address, provinceFilter);

      const matchWard =
        wardFilter === 'ALL' ||
        matchesLocation(t.ward, wardFilter) ||
        matchesLocation(t.address, wardFilter);

      const matchDept =
        deptFilter === 'ALL'
          ? true
          : deptFilter === 'UNASSIGNED'
          ? !t.departmentId
          : t.departmentId === deptFilter;

      const matchCat = catFilter === 'ALL' || t.categoryId === catFilter;
      const matchStatus = statusFilter === 'ALL' || t.status === statusFilter;
      const matchSev = severityFilter === 'ALL' || t.severity === severityFilter;
      const matchSos = !onlySOS || t.isLifeThreatening;

      return (
        matchKeyword &&
        matchProv &&
        matchWard &&
        matchDept &&
        matchCat &&
        matchStatus &&
        matchSev &&
        matchSos
      );
    });
  }, [
    rawTickets,
    search,
    provinceFilter,
    wardFilter,
    deptFilter,
    catFilter,
    statusFilter,
    severityFilter,
    onlySOS,
    departments,
  ]);

  const totalElements = filteredTickets.length;
  const totalPages = Math.max(1, Math.ceil(totalElements / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const tickets = useMemo(
    () => filteredTickets.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE),
    [filteredTickets, currentPage],
  );

  // Số liệu 4 thẻ KPI đầu trang từ API summary
  const kpiTotal = summary?.ticketSummary?.totalTickets ?? rawTickets.length;
  const kpiPending =
    summary?.ticketSummary?.initiatedTickets ??
    rawTickets.filter((t) => t.status === 'INITIATED').length;
  const kpiInProgress =
    summary?.ticketSummary != null
      ? (summary.ticketSummary.assignedTickets ?? 0) + (summary.ticketSummary.inProgressTickets ?? 0)
      : rawTickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED').length;
  const kpiDone =
    summary?.ticketSummary != null
      ? (summary.ticketSummary.resolvedTickets ?? 0) + (summary.ticketSummary.completedTickets ?? 0)
      : rawTickets.filter((t) => t.status === 'RESOLVED' || t.status === 'COMPLETED').length;
  const kpiSos =
    summary?.ticketSummary?.lifeThreateningTickets ??
    rawTickets.filter((t) => t.isLifeThreatening).length;
  const kpiRate =
    summary?.ticketSummary?.overallResolutionRate != null
      ? Math.round(summary.ticketSummary.overallResolutionRate)
      : kpiTotal > 0
      ? Math.round((kpiDone / kpiTotal) * 100)
      : 0;

  function resetAllFilters() {
    setSearch('');
    setProvinceFilter('ALL');
    setWardFilter('ALL');
    setDeptFilter('ALL');
    setCatFilter('ALL');
    setStatusFilter('ALL');
    setSeverityFilter('ALL');
    setOnlySOS(false);
    setPage(1);
  }

  const hasActiveFilter =
    search !== '' ||
    provinceFilter !== 'ALL' ||
    wardFilter !== 'ALL' ||
    deptFilter !== 'ALL' ||
    catFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    severityFilter !== 'ALL' ||
    onlySOS;

  async function fetchExportList(): Promise<Ticket[]> {
    return filteredTickets;
  }

  async function handleExportCSV() {
    setExporting(true);
    try {
      const rowsToExport = await fetchExportList();
      downloadCsvFile(
        'CityFix_Tra_Cuu_Ho_So',
        [
          'Mã Hồ sơ',
          'Danh mục',
          'Nội dung sự cố',
          'Cơ quan phụ trách',
          'Địa chỉ',
          'Phường/Xã',
          'Tỉnh/Thành phố',
          'Độ ưu tiên',
          'Khẩn cấp SOS',
          'Trạng thái',
          'Người gửi',
          'Số điện thoại',
          'Thời gian tạo',
        ],
        rowsToExport.map((t) => [
          t.ticketId,
          t.categoryName || 'Chưa phân loại',
          t.description,
          t.departmentName || 'Chưa phân tuyến',
          t.address,
          t.ward,
          t.province,
          priorityInfo(t.severity).label,
          t.isLifeThreatening ? 'SOS Khẩn cấp' : 'Bình thường',
          statusInfo(t.status).label,
          t.reporterName || 'Người dân',
          t.reporterPhone || '—',
          t.createdAt,
        ]),
      );
      message.success(`Đã xuất ${rowsToExport.length} hồ sơ ra file CSV!`);
    } finally {
      setExporting(false);
    }
  }

  async function handleExportExcel() {
    setExporting(true);
    try {
      const rowsToExport = await fetchExportList();
      downloadExcelReport(
        'CityFix_Danh_Sach_Ho_So_He_Thong',
        'DANH SÁCH TRA CỨU HỒ SƠ SỰ CỐ TOÀN HỆ THỐNG',
        `Tổng số kết quả: ${rowsToExport.length} hồ sơ • Tỷ lệ hoàn thành toàn hệ thống: ${kpiRate}%`,
        [
          {
            heading: 'Danh sách Hồ sơ theo Bộ lọc hiện tại',
            headers: [
              'Mã hồ sơ',
              'Danh mục',
              'Nội dung phản ánh',
              'Địa chỉ',
              'Cơ quan phụ trách',
              'Độ ưu tiên',
              'Trạng thái',
              'Thời gian tạo',
            ],
            rows: rowsToExport.map((t) => [
              t.ticketId,
              t.categoryName || 'Chưa phân loại',
              t.description,
              t.address,
              t.departmentName || 'Chưa phân tuyến',
              priorityInfo(t.severity).label,
              statusInfo(t.status).label,
              t.createdAt,
            ]),
          },
        ],
      );
      message.success(`Đã xuất Báo cáo Excel (${rowsToExport.length} hồ sơ) thành công!`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* =========================================================================
          1. CLEAN COMMAND HEADER (ĐỒNG BỘ VỚI MANAGER & STAFF)
         ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Tra cứu & Giám sát Hồ sơ Sự cố
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
              Toàn hệ thống ({totalElements} kết quả)
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mt-1">
            Tra cứu tập trung toàn bộ hồ sơ sự cố theo Cơ quan phụ trách, Danh mục, Tỉnh/Thành phố, Phường/Xã và Trạng thái xử lý thực tế
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <span className="text-[11px] text-gray-400 hidden sm:inline mr-1">
            Cập nhật: <strong className="text-gray-600 font-semibold">{lastRefreshed}</strong>
          </span>

          <button
            onClick={() => {
              loadMetadata();
              loadTickets();
            }}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : 'text-gray-500'}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exporting || totalElements === 0}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            Xuất CSV
          </button>

          <button
            onClick={handleExportExcel}
            disabled={exporting || totalElements === 0}
            className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            Xuất Báo cáo (.xls)
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. 4 THẺ KPI TƯƠNG TÁC (ĐỒNG BỘ STYLE VỚI MANAGER & STAFF)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Tổng Hồ Sơ Hệ Thống',
            val: kpiTotal,
            sub: `Tỷ lệ hoàn thành: ${kpiRate}%`,
            valCls: 'text-gray-900',
            subCls: 'text-orange-600 font-semibold',
            active: statusFilter === 'ALL' && !onlySOS,
            onClick: () => {
              setStatusFilter('ALL');
              setOnlySOS(false);
              setPage(1);
            },
          },
          {
            label: 'Chờ Duyệt / Mới Tạo',
            val: kpiPending,
            sub: 'Hồ sơ mới khởi tạo (INITIATED)',
            valCls: 'text-amber-600',
            subCls: 'text-gray-500',
            active: statusFilter === 'INITIATED' && !onlySOS,
            onClick: () => {
              setStatusFilter('INITIATED');
              setOnlySOS(false);
              setPage(1);
            },
          },
          {
            label: 'Đang Giải Quyết',
            val: kpiInProgress,
            sub: 'Đã phân công & đang thực hiện',
            valCls: 'text-orange-600',
            subCls: 'text-gray-500',
            active: statusFilter === 'IN_PROGRESS' && !onlySOS,
            onClick: () => {
              setStatusFilter('IN_PROGRESS');
              setOnlySOS(false);
              setPage(1);
            },
          },
          {
            label: 'Sự Cố Khẩn Cấp (SOS)',
            val: kpiSos,
            sub: `${kpiDone} hồ sơ đã hoàn thành trên hệ thống`,
            valCls: 'text-red-600',
            subCls: onlySOS ? 'text-red-600 font-bold' : 'text-emerald-600 font-semibold',
            active: onlySOS,
            onClick: () => {
              setOnlySOS((v) => !v);
              setPage(1);
            },
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
              <span className="px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-bold">
                Lọc nhanh
              </span>
            </div>

            <div className="my-2 flex items-baseline gap-1.5">
              <span className={`font-display text-3xl font-black ${kpi.valCls}`}>
                {kpi.val}
              </span>
              <span className="text-xs text-gray-400">hồ sơ</span>
            </div>

            <div className={`text-[11px] pt-2 border-t border-gray-100 truncate ${kpi.subCls}`}>
              {kpi.sub}
            </div>
          </div>
        ))}
      </div>

      {/* =========================================================================
          3. BỘ LỌC CHUYÊN SÂU ĐA CHIỀU (100% DỮ LIỆU THẬT TỪ API)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5">
          {/* Tìm kiếm */}
          <div className="relative lg:col-span-2">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              <SearchIcon />
            </span>
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm mã (#...), nội dung, danh mục, địa chỉ, cơ quan, người gửi..."
              className="w-full pl-9 pr-4 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-xl text-gray-800 placeholder-gray-400 outline-none focus:border-orange-500 focus:bg-white transition-all"
            />
          </div>

          {/* Cơ quan phụ trách */}
          <select
            value={deptFilter}
            onChange={(e) => {
              setDeptFilter(e.target.value);
              setPage(1);
            }}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả Cơ quan ({departments.length})</option>
            <option value="UNASSIGNED">Chưa phân tuyến</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Danh mục sự cố */}
          <select
            value={catFilter}
            onChange={(e) => {
              setCatFilter(e.target.value);
              setPage(1);
            }}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả Danh mục ({categories.length})</option>
            {categories.map((c) => {
              const cid = c.id || c.categoryId || '';
              return (
                <option key={cid} value={cid}>
                  {c.name}
                </option>
              );
            })}
          </select>

          {/* Tỉnh / Thành phố */}
          <select
            value={provinceFilter}
            onChange={(e) => {
              setProvinceFilter(e.target.value);
              setWardFilter('ALL');
              setPage(1);
            }}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả Tỉnh / Thành phố ({provinceList.length})</option>
            {provinceList.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          {/* Phường / Xã */}
          <select
            value={wardFilter}
            onChange={(e) => {
              setWardFilter(e.target.value);
              setPage(1);
            }}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">
              {provinceFilter === 'ALL'
                ? `Tất cả Phường / Xã (${wardList.length})`
                : `Phường / Xã (${provinceFilter}) (${wardList.length})`}
            </option>
            {wardList.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {/* Các nút chọn nhanh Trạng thái & Mức độ ưu tiên (Đồng bộ style với Manager) */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
          <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold">
            <button
              onClick={() => {
                setStatusFilter('ALL');
                setPage(1);
              }}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-orange-600 text-white font-bold shadow-2xs'
                  : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
              }`}
            >
              Tất cả trạng thái ({kpiTotal})
            </button>
            {BACKEND_STATUS_KEYS.map((key) => {
              const val = STATUS_META[key];
              if (!val) return null;
              const active = statusFilter === key;
              return (
                <button
                  key={key}
                  onClick={() => {
                    setStatusFilter(key);
                    setPage(1);
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                    active
                      ? 'bg-orange-600 text-white font-bold shadow-2xs'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white' : val.dot}`} />
                  {val.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <select
              value={severityFilter}
              onChange={(e) => {
                setSeverityFilter(e.target.value as Severity | 'ALL');
                setPage(1);
              }}
              className="text-[11px] border border-gray-200 rounded-lg px-2.5 py-1 bg-gray-50 text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="ALL">Mọi độ ưu tiên</option>
              {Object.entries(SEVERITY_META).map(([k, v]) => (
                <option key={k} value={k}>
                  Mức độ: {v.label}
                </option>
              ))}
            </select>

            {hasActiveFilter && (
              <button
                onClick={resetAllFilters}
                className="text-[11px] font-semibold text-red-600 hover:text-red-700 px-2.5 py-1 rounded-lg bg-red-50 hover:bg-red-100 border border-red-200 transition-colors cursor-pointer"
              >
                Xóa bộ lọc
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={loadTickets}
            className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-100 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* =========================================================================
          4. BẢNG DANH SÁCH HỒ SƠ (ĐỒNG BỘ STYLE VỚI MANAGER TICKETS)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {[
                  'Mã Hồ sơ',
                  'Nội dung & Danh mục',
                  'Địa bàn hành chính',
                  'Cơ quan phụ trách',
                  'Độ ưu tiên',
                  'Trạng thái',
                  'Thời gian tạo',
                  'Thao tác',
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-[10px] font-bold text-gray-500 uppercase tracking-[0.14em] whitespace-nowrap"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-400 text-xs">
                    {loading
                      ? 'Đang tải danh sách hồ sơ từ máy chủ...'
                      : 'Không tìm thấy hồ sơ sự cố nào phù hợp với điều kiện lọc.'}
                  </td>
                </tr>
              ) : (
                tickets.map((t) => {
                  const st = statusInfo(t.status);
                  const pi = priorityInfo(t.severity);
                  const deptName =
                    t.departmentName ||
                    departments.find((d) => d.departmentId === t.departmentId)?.name ||
                    t.departmentId ||
                    'Chưa phân tuyến';
                  const catName = t.categoryName || t.categoryId || 'Chưa phân loại';

                  return (
                    <tr
                      key={t.ticketId}
                      onClick={() => setQuickTicket(t)}
                      className="hover:bg-orange-50/40 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {t.isLifeThreatening && (
                            <span className="px-1.5 py-0.5 rounded bg-red-600 text-white font-mono text-[9px] font-bold">
                              SOS
                            </span>
                          )}
                          <span
                            className="font-mono text-xs font-bold text-orange-600"
                            title={t.ticketId}
                          >
                            {t.ticketId.length > 12 ? `#${t.ticketId.slice(0, 8)}` : t.ticketId}
                          </span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 max-w-[280px]">
                        <p className="text-[13px] font-bold text-gray-900 truncate">{t.description}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 text-[10px] font-semibold">
                            {catName}
                          </span>
                          <span className="text-[11px] text-gray-400 truncate">{t.address}</span>
                        </div>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <p className="text-xs font-semibold text-gray-800">{t.ward}</p>
                        <p className="text-[11px] text-gray-400">{t.province}</p>
                      </td>

                      <td className="px-4 py-3.5">
                        <span className="text-xs font-semibold text-gray-700">{deptName}</span>
                        {t.assigneeName && (
                          <p className="text-[11px] text-gray-400 mt-0.5">Cán bộ: {t.assigneeName}</p>
                        )}
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${pi.cls}`}>
                          {pi.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${st.cls}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>

                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="font-mono text-[11px] text-gray-400">{t.createdAt}</span>
                      </td>

                      <td className="px-4 py-3.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => onOpenTicket(t.ticketId, t)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-orange-600 bg-orange-50 hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
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

        {/* Phân trang */}
        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 bg-gray-50/40">
          <span>
            Hiển thị{' '}
            <strong className="text-gray-800">
              {totalElements === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}–
              {Math.min(currentPage * PAGE_SIZE, totalElements)}
            </strong>{' '}
            trên tổng <strong className="text-gray-800">{totalElements}</strong> hồ sơ sự cố
          </span>
          <div className="flex items-center gap-1.5">
            <button
              disabled={currentPage <= 1 || loading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              ‹ Trang trước
            </button>
            <span className="px-2.5 py-1 font-mono font-semibold text-gray-700">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage >= totalPages || loading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 disabled:opacity-40 cursor-pointer"
            >
              Trang sau ›
            </button>
          </div>
        </div>
      </div>

      {/* Quick-View Drawer Xem nhanh Hồ sơ */}
      {quickTicket && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-[1px] animate-fade-in"
          onClick={() => setQuickTicket(null)}
        >
          <div
            className="w-full max-w-md bg-white h-full shadow-2xl border-l border-gray-200 flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/60">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-extrabold text-orange-600">
                    {quickTicket.ticketId.length > 12
                      ? `#${quickTicket.ticketId.slice(0, 8)}`
                      : quickTicket.ticketId}
                  </span>
                  {quickTicket.isLifeThreatening && (
                    <span className="px-2 py-0.5 rounded-full bg-red-600 text-white text-[10px] font-bold">
                      SOS KHẨN CẤP
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Xem nhanh thông tin hồ sơ (Chế độ Quản trị viên)
                </p>
              </div>
              <button
                onClick={() => setQuickTicket(null)}
                className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-500 hover:text-gray-800 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4">
              {quickTicket.imageUrl && (
                <div className="rounded-xl overflow-hidden border border-gray-200 h-44 bg-gray-100">
                  <img
                    src={quickTicket.imageUrl}
                    alt={quickTicket.ticketId}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <div>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                    statusInfo(quickTicket.status).cls
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${statusInfo(quickTicket.status).dot}`} />
                  {statusInfo(quickTicket.status).label}
                </span>
                <h4 className="font-display text-sm font-bold text-gray-900 mt-2.5 leading-snug">
                  {quickTicket.description}
                </h4>
              </div>

              <div className="bg-gray-50 rounded-xl p-3.5 border border-gray-100 space-y-2.5 text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Danh mục:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {quickTicket.categoryName || quickTicket.categoryId || 'Chưa phân loại'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Cơ quan phụ trách:</span>
                  <span className="font-semibold text-orange-600 text-right">
                    {quickTicket.departmentName ||
                      departments.find((d) => d.departmentId === quickTicket.departmentId)?.name ||
                      quickTicket.departmentId ||
                      'Chưa phân tuyến'}
                  </span>
                </div>
                {quickTicket.assigneeName && (
                  <div className="flex justify-between gap-2">
                    <span className="text-gray-400">Cán bộ xử lý:</span>
                    <span className="font-semibold text-gray-800 text-right">
                      {quickTicket.assigneeName}
                    </span>
                  </div>
                )}
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Địa chỉ hiện trường:</span>
                  <span className="font-medium text-gray-800 text-right">{quickTicket.address}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Địa bàn hành chính:</span>
                  <span className="font-semibold text-gray-800 text-right">
                    {quickTicket.ward} · {quickTicket.province}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Người phản ánh:</span>
                  <span className="font-medium text-gray-800">
                    {quickTicket.reporterName ?? 'Người dân'} ({quickTicket.reporterPhone ?? '—'})
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-400">Thời điểm gửi:</span>
                  <span className="font-mono text-gray-700">{quickTicket.createdAt}</span>
                </div>
              </div>
            </div>

            <div className="px-5 py-3.5 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-2">
              <button
                onClick={() => setQuickTicket(null)}
                className="px-4 py-2 rounded-xl border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                Đóng
              </button>
              <button
                onClick={() => {
                  const target = quickTicket;
                  setQuickTicket(null);
                  onOpenTicket(target.ticketId, target);
                }}
                className="flex-1 py-2 px-4 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold text-center transition-colors cursor-pointer"
              >
                Xem đầy đủ Chi tiết & Nhật ký Xử lý →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SearchIcon() {
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
