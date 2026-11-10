import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { message } from 'antd';
import { Department } from '../data';
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
  getAdminAnalytics,
  exportAdminAnalyticsCsv,
  AdminAnalyticsResponse,
  AdminAnalyticsParams,
} from '../services';
import { downloadExcelReport } from '../utils/exportFile';

type TimeRange = 'all' | '7d' | 'month' | 'quarter' | 'year';

const RANGE_META: Record<
  TimeRange,
  { label: string; groupBy: 'DAY' | 'WEEK' | 'MONTH'; subtitle: string }
> = {
  all:     { label: 'Toàn thời gian', groupBy: 'MONTH', subtitle: 'Thống kê toàn bộ dữ liệu lịch sử trên hệ thống' },
  '7d':    { label: '7 ngày qua',     groupBy: 'DAY',   subtitle: 'Dữ liệu thống kê trong 7 ngày gần nhất' },
  month:   { label: '30 ngày qua',    groupBy: 'DAY',   subtitle: 'Dữ liệu thống kê trong 30 ngày gần nhất' },
  quarter: { label: '90 ngày qua',    groupBy: 'WEEK',  subtitle: 'Dữ liệu thống kê tổng hợp theo tuần trong 90 ngày qua' },
  year:    { label: 'Năm nay',        groupBy: 'MONTH', subtitle: 'Dữ liệu lũy kế theo tháng trong năm hiện tại' },
};

function normalizeLocationParam(val: string): string | undefined {
  if (!val || val === 'ALL') return undefined;
  return val.replace(/^(TP\.|Tỉnh|Thành phố|Phường|Xã|Thị trấn|P\.|X\.|TT\.)\s+/i, '').trim();
}

function toLocalIsoString(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function buildDateRangeParams(range: TimeRange): { fromDate?: string; toDate?: string; groupBy: 'DAY' | 'WEEK' | 'MONTH' } {
  const now = new Date();
  const groupBy = RANGE_META[range].groupBy;
  if (range === 'all') {
    return { groupBy };
  }
  const from = new Date(now);
  if (range === '7d') {
    from.setDate(now.getDate() - 7);
  } else if (range === 'month') {
    from.setDate(now.getDate() - 30);
  } else if (range === 'quarter') {
    from.setDate(now.getDate() - 90);
  } else if (range === 'year') {
    from.setMonth(0, 1);
    from.setHours(0, 0, 0, 0);
  }
  return {
    fromDate: toLocalIsoString(from),
    toDate: toLocalIsoString(now),
    groupBy,
  };
}

export default function AdminAnalytics() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [provinceFilter, setProvinceFilter] = useState<string>('ALL');
  const [wardFilter, setWardFilter] = useState<string>('ALL');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [catFilter, setCatFilter] = useState<string>('ALL');

  const [analytics, setAnalytics] = useState<AdminAnalyticsResponse | null>(null);
  const [allGeoItems, setAllGeoItems] = useState<SystemLocationPair[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);

  // Bộ lọc tìm kiếm phụ trong bảng Địa bàn & bảng Cơ quan
  const [areaSearch, setAreaSearch] = useState<string>('');
  const [deptTableSearch, setDeptTableSearch] = useState<string>('');
  const [deptTableLevel, setDeptTableLevel] = useState<'ALL' | 'CITY' | 'WARD'>('ALL');

  const [loading, setLoading] = useState<boolean>(true);
  const [exportingCsv, setExportingCsv] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  // Tải danh sách Cơ quan, Danh mục & Địa bàn thực tế từ API (100% không dùng mock)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    Promise.all([
      fetchAllDepartmentsForAdmin(),
      getAdminCategories().catch(() => []),
      fetchSystemLocationsForAdmin(),
    ]).then(([deptsRes, catsRes, locsRes]) => {
      setDepartments(deptsRes || []);
      setCategories(Array.isArray(catsRes) ? catsRes : []);
      if (locsRes && locsRes.length > 0) {
        setAllGeoItems(locsRes);
      }
    });
  }, []);

  const queryParams = useMemo<AdminAnalyticsParams>(() => {
    const { fromDate, toDate, groupBy } = buildDateRangeParams(timeRange);
    return {
      fromDate,
      toDate,
      groupBy,
      province: normalizeLocationParam(provinceFilter),
      ward: normalizeLocationParam(wardFilter),
      departmentId: deptFilter !== 'ALL' ? deptFilter : undefined,
      categoryId: catFilter !== 'ALL' ? catFilter : undefined,
    };
  }, [timeRange, provinceFilter, wardFilter, deptFilter, catFilter]);

  const loadAnalytics = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const analyticsRes = await getAdminAnalytics(queryParams);
      setAnalytics(analyticsRes);

      if (
        provinceFilter === 'ALL' &&
        wardFilter === 'ALL' &&
        Array.isArray(analyticsRes?.geographicBreakdown)
      ) {
        setAllGeoItems((prev) => {
          const next = [...prev];
          analyticsRes.geographicBreakdown.forEach((g) => {
            if (g.province && g.province !== 'Chưa xác định') {
              next.push({
                province: g.province,
                ward: g.ward && g.ward !== 'Chưa xác định' ? g.ward : '',
              });
            }
          });
          return next;
        });
      }

      setLastRefreshed(
        new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      );
    } catch (e: unknown) {
      setErrorMsg(e instanceof Error ? e.message : 'Không thể tải dữ liệu báo cáo & thống kê.');
    } finally {
      setLoading(false);
    }
  }, [queryParams, provinceFilter, wardFilter]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  // Danh sách Tỉnh/Thành phố thực tế 100% từ dữ liệu hệ thống (không dùng mock)
  const provinceList = useMemo(() => {
    const map = new Map<string, string>();
    const addProv = (p?: string) => {
      if (!p || p === 'Chưa xác định') return;
      const key = normalizeLocationKey(p);
      if (!key) return;
      if (!map.has(key)) map.set(key, p);
    };
    allGeoItems.forEach((g) => addProv(g.province));
    (analytics?.geographicBreakdown || []).forEach((g) => addProv(g.province));
    return Array.from(map.values());
  }, [allGeoItems, analytics]);

  // Danh sách Phường/Xã thực tế 100% từ dữ liệu hệ thống (không dùng mock)
  const wardList = useMemo(() => {
    const map = new Map<string, string>();
    const addWard = (p?: string, w?: string) => {
      if (!w || w === 'Chưa xác định') return;
      if (provinceFilter !== 'ALL' && !matchesLocation(p, provinceFilter)) return;
      const key = normalizeLocationKey(w);
      if (!key) return;
      if (!map.has(key)) map.set(key, w);
    };
    allGeoItems.forEach((g) => addWard(g.province, g.ward));
    (analytics?.geographicBreakdown || []).forEach((g) => addWard(g.province, g.ward));
    return Array.from(map.values());
  }, [provinceFilter, allGeoItems, analytics]);

  // Chỉ số tổng hợp từ overview & statusBreakdown
  const overview = analytics?.overview;
  const statusMap = analytics?.statusBreakdown || {};

  const summary = useMemo(() => {
    const total = Number(overview?.totalTickets ?? 0);
    const done = Number(overview?.resolvedOrCompletedTickets ?? 0);
    const inProgress = Number(overview?.inProgressTickets ?? 0);
    const pending = Number(
      statusMap.INITIATED ??
        Math.max(0, total - done - inProgress - Number(overview?.rejectedOrCancelledTickets ?? 0)),
    );
    const overdue = Number(overview?.overdueTickets ?? 0);
    const rate =
      overview?.resolutionRate != null
        ? Math.round(overview.resolutionRate)
        : total > 0
        ? Math.round((done / total) * 100)
        : 0;
    const onTimeRate =
      overview?.onTimeResolutionRate != null ? Math.round(overview.onTimeResolutionRate) : 0;
    const avgHours =
      overview?.averageResolutionHours != null
        ? Math.round(overview.averageResolutionHours * 10) / 10
        : 0;
    const avgRating =
      overview?.averageRating != null ? Math.round(overview.averageRating * 10) / 10 : 0;

    return { total, done, inProgress, pending, overdue, rate, onTimeRate, avgHours, avgRating };
  }, [overview, statusMap]);

  // Chuỗi thời gian (TimeSeries) từ API
  const trendSeries = useMemo(() => {
    return (analytics?.timeSeries || []).map((ts) => ({
      period: ts.period,
      total: Number(ts.totalCreated ?? 0),
      done: Number(ts.resolvedOrCompleted ?? 0),
      inProgress: Number(ts.inProgress ?? 0),
    }));
  }, [analytics]);

  const maxTrendVal = Math.max(...trendSeries.map((d) => d.total), 1);

  // Thống kê theo Địa bàn (Geographic Breakdown) từ API
  const filteredAreas = useMemo(() => {
    const q = areaSearch.trim();
    return (analytics?.geographicBreakdown || [])
      .map((g) => ({
        province: g.province || 'Chưa xác định',
        ward: g.ward || 'Chưa xác định',
        count: Number(g.totalTickets ?? 0),
        done: Number(g.resolvedOrCompletedTickets ?? 0),
        inProgress: Number(g.inProgressTickets ?? 0),
        overdue: Number(g.overdueTickets ?? 0),
        rate: g.resolutionRate != null ? Math.round(g.resolutionRate) : 0,
      }))
      .filter((a) => {
        if (provinceFilter !== 'ALL' && !matchesLocation(a.province, provinceFilter)) return false;
        if (wardFilter !== 'ALL' && !matchesLocation(a.ward, wardFilter)) return false;
        if (q && !matchesSearch(a.province, q) && !matchesSearch(a.ward, q)) return false;
        return true;
      });
  }, [analytics, provinceFilter, wardFilter, areaSearch]);

  const maxAreaCount = Math.max(...filteredAreas.map((a) => a.count), 1);

  // Thống kê theo Cơ quan Phụ trách (Department Breakdown) từ API
  const filteredDepts = useMemo(() => {
    const levelMap = new Map<string, 'CITY' | 'WARD'>();
    departments.forEach((d) => levelMap.set(d.departmentId, d.level));
    const q = deptTableSearch.trim();

    return (analytics?.departmentBreakdown || [])
      .map((d) => {
        const deptId = String(d.departmentId || '');
        const name = d.departmentName || 'Chưa phân tuyến';
        const isWardByName = /ubnd|phường|xã/i.test(name);
        const level = levelMap.get(deptId) || (isWardByName ? 'WARD' : 'CITY');
        const total = Number(d.totalTickets ?? 0);
        const completed = Number(d.resolvedOrCompletedTickets ?? 0);
        const inProgress = Number(d.inProgressTickets ?? 0);
        const overdue = Number(d.overdueTickets ?? 0);
        const rate =
          d.resolutionRate != null
            ? Math.round(d.resolutionRate)
            : total > 0
            ? Math.round((completed / total) * 100)
            : 0;
        const avgHours =
          d.averageResolutionHours != null ? Math.round(d.averageResolutionHours * 10) / 10 : 0;

        return {
          id: deptId,
          name,
          level,
          total,
          inProgress,
          completed,
          overdue,
          rate,
          avgHours,
        };
      })
      .filter((d) => {
        if (deptTableLevel !== 'ALL' && d.level !== deptTableLevel) return false;
        if (q && !matchesSearch(d.name, q) && !matchesSearch(d.id, q)) return false;
        return true;
      });
  }, [analytics, departments, deptTableLevel, deptTableSearch]);

  // Xuất CSV từ API GET /api/v1/admin/analytics/export
  async function handleExportCSV() {
    setExportingCsv(true);
    try {
      const csvText = await exportAdminAnalyticsCsv(queryParams);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CityFix_BaoCaoThongKe_${timeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      message.success('Đã xuất file CSV báo cáo thống kê thành công!');
    } catch (e: unknown) {
      message.error(e instanceof Error ? e.message : 'Lỗi khi xuất file CSV từ máy chủ.');
    } finally {
      setExportingCsv(false);
    }
  }

  // Xuất Báo cáo Excel (.xls) đồng bộ với Manager & Staff
  function handleExportExcel() {
    downloadExcelReport(
      `CityFix_BaoCaoThongKe_${timeRange}`,
      `BÁO CÁO THỐNG KÊ HỆ THỐNG CITYFIX (${RANGE_META[timeRange].label.toUpperCase()})`,
      `Tổng tiếp nhận: ${summary.total} • Đã giải quyết: ${summary.done} (${summary.rate}%) • Đang xử lý: ${summary.inProgress}`,
      [
        {
          heading: '1. Tổng hợp Chỉ số Giải quyết Hồ sơ',
          headers: ['Chỉ tiêu', 'Giá trị', 'Ghi chú'],
          rows: [
            ['Tổng số hồ sơ tiếp nhận', summary.total, RANGE_META[timeRange].label],
            ['Hồ sơ đã giải quyết', summary.done, `Tỷ lệ hoàn thành: ${summary.rate}%`],
            ['Hồ sơ đang xử lý', summary.inProgress, `Quá hạn SLA: ${summary.overdue}`],
            ['Chờ phân công / Mới tạo', summary.pending, `Thời gian xử lý TB: ${summary.avgHours}h`],
          ],
        },
        {
          heading: '2. Kết quả Xử lý theo Cơ quan Phụ trách',
          headers: [
            'Mã Đơn vị',
            'Tên Cơ quan Phụ trách',
            'Cấp quản lý',
            'Tổng Hồ sơ',
            'Đang xử lý',
            'Đã Hoàn thành',
            'Quá hạn SLA',
            'Thời gian TB (Giờ)',
            'Tỷ lệ (%)',
          ],
          rows: filteredDepts.map((d) => [
            d.id,
            d.name,
            d.level === 'CITY' ? 'Cấp Thành phố' : 'Cấp Phường/Xã',
            d.total,
            d.inProgress,
            d.completed,
            d.overdue,
            d.avgHours,
            `${d.rate}%`,
          ]),
        },
      ],
    );
    message.success('Đã xuất Báo cáo Thống kê (.xls) thành công!');
  }

  const hasActiveFilter =
    timeRange !== 'all' ||
    provinceFilter !== 'ALL' ||
    wardFilter !== 'ALL' ||
    deptFilter !== 'ALL' ||
    catFilter !== 'ALL';

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* =========================================================================
          1. CLEAN COMMAND HEADER (ĐỒNG BỘ VỚI MANAGER & STAFF)
         ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Thống kê & Báo cáo Hệ thống
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
              {RANGE_META[timeRange].label}
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mt-1">{RANGE_META[timeRange].subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          <span className="text-[11px] text-gray-400 hidden sm:inline mr-1">
            Cập nhật: <strong className="text-gray-600 font-semibold">{lastRefreshed}</strong>
          </span>

          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshIcon className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-500' : 'text-gray-500'}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={exportingCsv || loading}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            {exportingCsv ? 'Đang xuất...' : 'Xuất CSV'}
          </button>

          <button
            onClick={handleExportExcel}
            disabled={loading}
            className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-2xs cursor-pointer disabled:opacity-50"
          >
            Xuất Báo cáo (.xls)
          </button>
        </div>
      </div>

      {/* =========================================================================
          2. BỘ LỌC KỲ THỜI GIAN, ĐỊA BÀN, CƠ QUAN & DANH MỤC (100% DỮ LIỆU THẬT)
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-4 shadow-xs space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Chọn kỳ thời gian */}
          <div className="flex flex-wrap items-center gap-1 text-[11px] font-semibold">
            {(Object.keys(RANGE_META) as TimeRange[]).map((k) => (
              <button
                key={k}
                onClick={() => setTimeRange(k)}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  timeRange === k
                    ? 'bg-orange-600 text-white font-bold shadow-2xs'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                {RANGE_META[k].label}
              </button>
            ))}
          </div>

          {hasActiveFilter && (
            <button
              onClick={() => {
                setTimeRange('all');
                setProvinceFilter('ALL');
                setWardFilter('ALL');
                setDeptFilter('ALL');
                setCatFilter('ALL');
              }}
              className="px-2.5 py-1 rounded-lg bg-red-50 text-red-600 border border-red-200 text-[11px] font-semibold hover:bg-red-100 cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-2 border-t border-gray-100">
          {/* Cơ quan phụ trách */}
          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            className="text-[12px] border border-gray-200 rounded-xl px-3 py-2 bg-gray-50 text-gray-700 outline-none focus:border-orange-500 focus:bg-white cursor-pointer"
          >
            <option value="ALL">Tất cả Cơ quan ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>

          {/* Danh mục sự cố */}
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
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
            onChange={(e) => setWardFilter(e.target.value)}
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
      </div>

      {/* Thông báo lỗi nếu có */}
      {errorMsg && (
        <div className="px-4 py-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center justify-between">
          <span>{errorMsg}</span>
          <button
            onClick={loadAnalytics}
            className="px-2.5 py-1 rounded-lg bg-white border border-red-200 text-red-600 font-semibold hover:bg-red-100 cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* =========================================================================
          3. 4 THẺ KPI ĐỒNG BỘ STYLE VỚI MANAGER & STAFF
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Tổng Hồ Sơ Tiếp Nhận',
            val: summary.total.toLocaleString('vi-VN'),
            unit: 'hồ sơ',
            sub: `Kỳ báo cáo: ${RANGE_META[timeRange].label}`,
            valCls: 'text-gray-900',
            subCls: 'text-orange-600 font-semibold',
          },
          {
            label: 'Hồ Sơ Đã Giải Quyết',
            val: summary.done.toLocaleString('vi-VN'),
            unit: 'hồ sơ',
            sub: `Tỷ lệ hoàn tất: ${summary.rate}% • Đúng hạn: ${summary.onTimeRate}%`,
            valCls: 'text-emerald-600',
            subCls: 'text-emerald-600 font-semibold',
          },
          {
            label: 'Đang Trong Quy Trình',
            val: summary.inProgress.toLocaleString('vi-VN'),
            unit: 'hồ sơ',
            sub: `Hồ sơ quá hạn SLA: ${summary.overdue}`,
            valCls: 'text-orange-600',
            subCls: summary.overdue > 0 ? 'text-red-600 font-semibold' : 'text-gray-500',
          },
          {
            label: 'Chờ Phân Công / Mới Tạo',
            val: summary.pending.toLocaleString('vi-VN'),
            unit: 'hồ sơ',
            sub: `Xử lý TB: ${summary.avgHours}h • Đánh giá: ${summary.avgRating}/5★`,
            valCls: 'text-amber-600',
            subCls: 'text-gray-500',
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="bg-white border border-gray-200 hover:border-orange-200 rounded-2xl p-5 shadow-xs transition-all flex flex-col justify-between"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                {kpi.label}
              </span>
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

      {/* =========================================================================
          4. BIỂU ĐỒ XU HƯỚNG & TỶ TRỌNG TRẠNG THÁI (TRỰC QUAN HÓA CAO CẤP)
         ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Biểu đồ Cột SVG: Tiếp nhận vs Đã giải quyết */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-[14px] font-bold text-gray-900">
                  Xu hướng Tiếp nhận & Hoàn thành Hồ sơ
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-50 text-orange-600 border border-orange-200">
                  {RANGE_META[timeRange].label}
                </span>
              </div>
              <p className="text-[11px] text-gray-400 mt-0.5">
                So sánh lượng phản ánh phát sinh mới và số lượng sự cố đã giải quyết dứt điểm
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs">
              <span className="flex items-center gap-1.5 font-medium text-gray-600">
                <span className="w-3 h-3 rounded-md bg-gradient-to-t from-orange-600 to-amber-500 shadow-2xs inline-block" /> Tiếp nhận mới
              </span>
              <span className="flex items-center gap-1.5 font-medium text-gray-600">
                <span className="w-3 h-3 rounded-md bg-gradient-to-t from-emerald-600 to-teal-400 shadow-2xs inline-block" /> Đã hoàn thành
              </span>
            </div>
          </div>

          {trendSeries.length === 0 ? (
            <div className="h-56 flex items-center justify-center text-xs text-gray-400 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
              {loading ? 'Đang tải biểu đồ xu hướng...' : 'Chưa có dữ liệu chuỗi thời gian trong kỳ đã chọn.'}
            </div>
          ) : (
            <div className="relative pt-2">
              {/* Lưới trục Y ngang */}
              <div className="absolute inset-x-0 top-3 bottom-9 flex flex-col justify-between pointer-events-none opacity-40">
                <div className="border-b border-gray-200 border-dashed w-full" />
                <div className="border-b border-gray-200 border-dashed w-full" />
                <div className="border-b border-gray-200 border-dashed w-full" />
                <div className="border-b border-gray-200 border-dashed w-full" />
              </div>

              {/* Các cột dữ liệu */}
              <div className="relative flex items-end gap-3 h-52 px-2 overflow-x-auto scrollbar-thin">
                {trendSeries.map((d) => {
                  const totalH = Math.round((d.total / maxTrendVal) * 135);
                  const doneH = Math.round((d.done / maxTrendVal) * 135);
                  const pct = d.total > 0 ? Math.round((d.done / d.total) * 100) : 0;
                  return (
                    <div key={d.period} className="flex-1 min-w-[50px] flex flex-col items-center gap-1.5 z-10 group">
                      {/* Badge tỷ lệ hoàn thành */}
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs group-hover:scale-105 transition-transform">
                        {pct}%
                      </span>

                      {/* Khối 2 cột kép song song */}
                      <div className="w-full flex items-end justify-center gap-1.5 h-36 relative">
                        {/* Cột Tiếp nhận */}
                        <div
                          className="flex-1 max-w-[18px] rounded-t-md bg-gradient-to-t from-orange-600 via-orange-500 to-amber-400 shadow-xs hover:brightness-110 transition-all cursor-pointer relative"
                          style={{ height: `${Math.max(6, totalH)}px` }}
                          title={`Kỳ ${d.period} • Tiếp nhận: ${d.total} hồ sơ`}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md pointer-events-none whitespace-nowrap shadow-md z-20">
                            {d.total}
                          </div>
                        </div>

                        {/* Cột Hoàn thành */}
                        <div
                          className="flex-1 max-w-[18px] rounded-t-md bg-gradient-to-t from-emerald-600 via-emerald-500 to-teal-400 shadow-xs hover:brightness-110 transition-all cursor-pointer relative"
                          style={{ height: `${Math.max(6, doneH)}px` }}
                          title={`Kỳ ${d.period} • Đã xử lý xong: ${d.done} hồ sơ`}
                        >
                          <div className="absolute -top-6 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-emerald-900 text-white font-mono text-[9px] px-1.5 py-0.5 rounded-md pointer-events-none whitespace-nowrap shadow-md z-20">
                            {d.done}
                          </div>
                        </div>
                      </div>

                      {/* Nhãn kỳ */}
                      <span className="font-mono-cf text-[11px] font-bold text-gray-600 truncate max-w-[72px] mt-1">
                        {d.period}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Biểu đồ Donut SVG: Tỷ trọng Trạng thái Hồ sơ */}
        <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-gray-900">
                Tỷ trọng Trạng thái Hồ sơ
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Toàn hệ thống
              </span>
            </div>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Phân bổ cơ cấu xử lý hồ sơ thực tế
            </p>
          </div>

          {/* SVG Donut Ring tương tác */}
          {(() => {
            const total = summary.total > 0 ? summary.total : 1;
            const c = 2 * Math.PI * 52; // ~326.72
            const donePct = (summary.done / total);
            const inProgPct = (summary.inProgress / total);
            const pendingPct = (summary.pending / total);
            const overduePct = Math.max(0, 1 - donePct - inProgPct - pendingPct);

            const doneDash = donePct * c;
            const inProgDash = inProgPct * c;
            const pendingDash = pendingPct * c;
            const overdueDash = overduePct * c;

            const doneOffset = 0;
            const inProgOffset = -doneDash;
            const pendingOffset = -(doneDash + inProgDash);
            const overdueOffset = -(doneDash + inProgDash + pendingDash);

            return (
              <div className="my-4 flex flex-col items-center justify-center">
                <div className="relative w-40 h-40 flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 140 140">
                    {/* Vòng nền mờ */}
                    <circle
                      cx="70"
                      cy="70"
                      r="52"
                      fill="transparent"
                      stroke="#f1f5f9"
                      strokeWidth="16"
                    />

                    {/* Phân đoạn: Đã hoàn thành (Emerald) */}
                    {doneDash > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="transparent"
                        stroke="#10b981"
                        strokeWidth="16"
                        strokeDasharray={`${doneDash} ${c}`}
                        strokeDashoffset={doneOffset}
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Phân đoạn: Đang xử lý (Orange) */}
                    {inProgDash > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="transparent"
                        stroke="#f97316"
                        strokeWidth="16"
                        strokeDasharray={`${inProgDash} ${c}`}
                        strokeDashoffset={inProgOffset}
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Phân đoạn: Chờ xử lý / Mới tạo (Amber) */}
                    {pendingDash > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="transparent"
                        stroke="#fbbf24"
                        strokeWidth="16"
                        strokeDasharray={`${pendingDash} ${c}`}
                        strokeDashoffset={pendingOffset}
                        className="transition-all duration-700"
                      />
                    )}

                    {/* Phân đoạn: Quá hạn / Khác (Red) */}
                    {overdueDash > 0 && (
                      <circle
                        cx="70"
                        cy="70"
                        r="52"
                        fill="transparent"
                        stroke="#ef4444"
                        strokeWidth="16"
                        strokeDasharray={`${overdueDash} ${c}`}
                        strokeDashoffset={overdueOffset}
                        className="transition-all duration-700"
                      />
                    )}
                  </svg>

                  {/* Tâm vòng tròn Donut */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                    <span className="font-display text-2xl font-black text-gray-900 leading-none">
                      {summary.rate}%
                    </span>
                    <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider mt-1">
                      Hoàn thành
                    </span>
                    <span className="text-[9px] text-gray-400 font-mono-cf mt-0.5">
                      {summary.done}/{summary.total}
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Chú giải Donut */}
          <div className="space-y-2 text-xs">
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs" /> Đã hoàn thành
              </span>
              <span className="font-mono-cf font-bold text-gray-900">
                {summary.done.toLocaleString('vi-VN')} ({summary.rate}%)
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5 border-b border-gray-100">
              <span className="flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-2xs" /> Đang xử lý
              </span>
              <span className="font-mono-cf font-bold text-gray-900">
                {summary.inProgress.toLocaleString('vi-VN')} ({summary.total > 0 ? Math.round((summary.inProgress / summary.total) * 100) : 0}%)
              </span>
            </div>
            <div className="flex items-center justify-between py-1.5">
              <span className="flex items-center gap-2 text-gray-600">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-2xs" /> Chờ phân công / Mới
              </span>
              <span className="font-mono-cf font-bold text-gray-900">
                {summary.pending.toLocaleString('vi-VN')} ({summary.total > 0 ? Math.round((summary.pending / summary.total) * 100) : 0}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          5. PHÂN BỐ HỒ SƠ THEO ĐỊA BÀN HÀNH CHÍNH TỪ API
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-xs">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="text-[14px] font-bold text-gray-900">
              Phân bố Hồ sơ theo Địa bàn Hành chính (Tỉnh/TP — Phường/Xã)
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Thống kê số lượng phản ánh và tỷ lệ hoàn thành tại từng Phường/Xã thực tế ({filteredAreas.length} địa bàn)
            </p>
          </div>
          <input
            type="text"
            value={areaSearch}
            onChange={(e) => setAreaSearch(e.target.value)}
            placeholder="Tìm Tỉnh/TP hoặc Phường/Xã..."
            className="px-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 w-full sm:w-56"
          />
        </div>

        {filteredAreas.length === 0 ? (
          <p className="text-center py-8 text-xs text-gray-400">
            {loading ? 'Đang tải thống kê địa bàn...' : 'Không có dữ liệu địa bàn phù hợp với bộ lọc.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3.5">
            {filteredAreas.map((a, idx) => {
              const rate = a.rate || (a.count > 0 ? Math.round((a.done / a.count) * 100) : 0);
              return (
                <div key={`${a.province}-${a.ward}-${idx}`} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-700 border border-orange-200 text-[10px] font-bold flex-shrink-0">
                        {a.province}
                      </span>
                      <span className="font-semibold text-gray-800 truncate">{a.ward}</span>
                    </div>
                    <span className="font-mono text-gray-600 flex-shrink-0">
                      <strong className="text-emerald-600">{a.done}</strong>/{a.count} hồ sơ ({rate}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${(a.count / maxAreaCount) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================================
          6. BẢNG THỐNG KÊ KẾT QUẢ XỬ LÝ THEO CƠ QUAN PHỤ TRÁCH
         ========================================================================= */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-[14px] font-bold text-gray-900">
              Bảng Thống kê Kết quả Xử lý theo Cơ quan Phụ trách
            </h3>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Tổng hợp khối lượng hồ sơ và tỷ lệ hoàn thành tại từng Sở/Ngành & UBND Phường/Xã
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={deptTableLevel}
              onChange={(e) => setDeptTableLevel(e.target.value as 'ALL' | 'CITY' | 'WARD')}
              className="px-2.5 py-1.5 text-[11px] font-semibold bg-gray-50 border border-gray-200 rounded-xl text-gray-700 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="ALL">Mọi cấp quản lý</option>
              <option value="CITY">Cấp Thành phố</option>
              <option value="WARD">Cấp Phường / Xã</option>
            </select>
            <input
              type="text"
              value={deptTableSearch}
              onChange={(e) => setDeptTableSearch(e.target.value)}
              placeholder="Tìm tên hoặc mã đơn vị..."
              className="px-3 py-1.5 text-[12px] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 w-48"
            />
            <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-semibold">
              {filteredDepts.length} đơn vị
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80">
                {[
                  'Cơ quan Phụ trách',
                  'Cấp quản lý',
                  'Tổng tiếp nhận',
                  'Đang xử lý',
                  'Đã hoàn thành',
                  'Quá hạn SLA',
                  'Tỷ lệ hoàn thành',
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
              {filteredDepts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-10 text-gray-400 text-xs">
                    {loading ? 'Đang tải bảng thống kê đơn vị...' : 'Chưa có dữ liệu thống kê đơn vị.'}
                  </td>
                </tr>
              ) : (
                filteredDepts.map((d) => (
                  <tr key={d.id || d.name} className="hover:bg-orange-50/40 transition-colors">
                    <td className="px-4 py-3.5">
                      <p className="text-[13px] font-bold text-gray-900">{d.name}</p>
                      <p className="font-mono text-[10px] text-gray-400">
                        {d.id && d.id.length > 12 ? `#${d.id.slice(0, 8)}` : d.id || '—'}
                      </p>
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                          d.level === 'CITY'
                            ? 'bg-orange-50 text-orange-700 border-orange-200'
                            : 'bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {d.level === 'CITY' ? 'Cấp Thành phố' : 'Cấp Phường / Xã'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-bold text-gray-900">
                      {d.total}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-orange-600">
                      {d.inProgress}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-emerald-600">
                      {d.completed}
                    </td>
                    <td className="px-4 py-3.5 font-mono text-xs font-semibold text-red-600">
                      {d.overdue}
                    </td>
                    <td className="px-4 py-3.5 w-48">
                      <div className="flex items-center gap-2.5">
                        <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              d.rate >= 85 ? 'bg-emerald-500' : 'bg-orange-500'
                            }`}
                            style={{ width: `${Math.min(100, d.rate)}%` }}
                          />
                        </div>
                        <span className="font-mono text-xs font-bold text-gray-800 w-10 text-right">
                          {d.rate}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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
