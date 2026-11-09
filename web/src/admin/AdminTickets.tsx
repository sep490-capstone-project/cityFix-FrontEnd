import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { message } from 'antd';
import {
  MapPinIcon,
  BuildingIcon,
  UserIcon,
  SlidersIcon,
} from '../components/Icons';
import {
  TICKETS as MOCK_TICKETS,
  PROVINCE_WARDS,
  STATUS_MAP,
  SEV_MAP,
  StatusKey,
  Severity,
  DangerLevel,
  getDept,
  getCat,
  statusInfo,
  sevInfo,
  Ticket as MockTicket,
} from '../data';
import { getDepartments, DepartmentItem } from '../services/departments';
import { getDepartmentTicketsForAdmin, ManagerTicketItem } from '../services/manager';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

interface Props {
  onOpenTicket: (id: string, ticketObj?: MockTicket) => void;
}

type TabFilter = 'all' | 'sos' | 'pending' | 'in_progress' | 'resolved';

function parseLocationFromAddress(address?: string): { province: string; ward: string } {
  if (!address) return { province: 'Chưa xác định', ward: '—' };
  const parts = address.split(',').map((p) => p.trim()).filter(Boolean);
  const wardMatch = address.match(/(Phường\s+[^,]+|P\.\s*[^,]+|Xã\s+[^,]+|Thị trấn\s+[^,]+)/i);
  const ward = wardMatch ? wardMatch[0].trim() : parts.length >= 2 ? parts[parts.length - 2] : '—';

  const lower = address.toLowerCase();
  let province = parts.length >= 1 ? parts[parts.length - 1] : 'Chưa xác định';
  if (lower.includes('hồ chí minh') || lower.includes('tp.hcm') || lower.includes('tphcm')) {
    province = 'TP. Hồ Chí Minh';
  } else if (lower.includes('hà nội') || lower.includes('ha noi')) {
    province = 'TP. Hà Nội';
  } else if (lower.includes('đà nẵng') || lower.includes('da nang')) {
    province = 'TP. Đà Nẵng';
  } else if (lower.includes('cần thơ')) {
    province = 'TP. Cần Thơ';
  } else if (lower.includes('hải phòng')) {
    province = 'TP. Hải Phòng';
  }
  return { province, ward };
}

export default function TicketList({ onOpenTicket }: Props) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<TabFilter>('all');
  const [statusF, setStatusF] = useState<StatusKey | 'all'>('all');
  const [sevF, setSevF] = useState<Severity | 'all'>('all');
  const [deptF, setDeptF] = useState<string>('all');
  const [provinceF, setProvinceF] = useState<string>('all');
  const [wardF, setWardF] = useState<string>('all');

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [rawTickets, setRawTickets] = useState<MockTicket[]>([]);
  const [departments, setDepartments] = useState<DepartmentItem[]>([]);
  const [departmentsMap, setDepartmentsMap] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isUsingMock, setIsUsingMock] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  const mapApiTicketToMockTicket = useCallback((t: ManagerTicketItem, deptNameFallback?: string): MockTicket => {
    let mappedSeverity: Severity = 'MEDIUM';
    const prio = (t.priority || t.severity || '').toUpperCase();
    if (prio === 'CRITICAL' || prio === 'HIGH' || prio === 'MEDIUM' || prio === 'LOW') {
      mappedSeverity = prio as Severity;
    }

    let mappedDanger: DangerLevel = 'SAFE';
    if (t.isLifeThreatening || prio === 'CRITICAL') {
      mappedDanger = 'CRITICAL';
    } else if (t.dangerLevel) {
      mappedDanger = t.dangerLevel;
    } else if (mappedSeverity === 'HIGH') {
      mappedDanger = 'DANGEROUS';
    }

    const categoryName =
      t.categoryName ||
      (t.categories && t.categories[0]?.categoryName) ||
      (t.subCategories && t.subCategories[0]?.subCategoryName) ||
      (t.subCategories && t.subCategories[0]?.name) ||
      'Hạ tầng đô thị';

    const addr = t.address || 'Chưa cập nhật địa chỉ';
    const { province, ward } = parseLocationFromAddress(addr);

    const formattedDate = t.createdAt
      ? new Date(t.createdAt).toLocaleString('vi-VN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : 'Vừa xong';

    return {
      ticketId: t.ticketId || (t.id ? `CF-${t.id.slice(0, 6).toUpperCase()}` : 'CF-LIVE'),
      rawId: t.id || t.ticketId,
      userId: t.creatorFullName || t.createdBy || 'Cư dân',
      reporterName: t.creatorFullName,
      reporterPhone: t.creatorPhoneNumber,
      departmentId: t.departmentId || 'D-LIVE',
      departmentName: t.departmentName || deptNameFallback,
      categoryId: t.categoryId || (t.categories && t.categories[0]?.categoryId) || 'CAT001',
      categoryName,
      assigneeId: t.assigneeName || (t.assigneeId ? `CB-${t.assigneeId.slice(0, 4)}` : undefined),
      description: t.description || categoryName,
      imageUrl: t.imageUrl || (Array.isArray(t.images) && t.images[0]) || undefined,
      evidenceUrls: Array.isArray(t.images) ? t.images : undefined,
      severity: mappedSeverity,
      dangerLevel: mappedDanger,
      locationMethod: t.locationMethod || 'AUTO_GPS',
      location: {
        lat: t.latitude || 10.7769,
        lng: t.longitude || 106.7009,
      },
      address: addr,
      province,
      ward,
      status: (t.status as StatusKey) || 'IN_PROGRESS',
      createdAt: formattedDate,
      updatedAt: formattedDate,
      isLifeThreatening: Boolean(t.isLifeThreatening || prio === 'CRITICAL'),
      needsManualReview: t.status === 'INITIATED',
      deadline: t.deadline ? new Date(t.deadline).toLocaleDateString('vi-VN') : undefined,
    };
  }, []);

  const fetchTickets = useCallback(async () => {
    setIsLoading(true);
    try {
      const deptsRes = await getDepartments({ page: 0, size: 50 });
      let depts: DepartmentItem[] = [];
      if (Array.isArray(deptsRes)) {
        depts = deptsRes;
      } else if (deptsRes && Array.isArray((deptsRes as any).content)) {
        depts = (deptsRes as any).content;
      }

      setDepartments(depts);
      const deptMap: Record<string, string> = {};
      depts.forEach((d) => {
        deptMap[d.departmentId] = d.name;
      });
      setDepartmentsMap(deptMap);

      const promises = depts.slice(0, 10).map(async (d) => {
        try {
          const res = await getDepartmentTicketsForAdmin({
            departmentId: d.departmentId,
            size: 50,
          });
          const items: ManagerTicketItem[] = res.content || [];
          return items.map((item) => mapApiTicketToMockTicket(item, d.name));
        } catch {
          return [] as MockTicket[];
        }
      });

      const results = await Promise.all(promises);
      const combined = results.flat();

      if (combined.length > 0) {
        setRawTickets(combined);
        setIsUsingMock(false);
      } else {
        setRawTickets(MOCK_TICKETS);
        setIsUsingMock(true);
      }
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setRawTickets(MOCK_TICKETS);
      setIsUsingMock(true);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsLoading(false);
    }
  }, [mapApiTicketToMockTicket]);

  useEffect(() => {
    fetchTickets();
  }, [fetchTickets]);

  const tabCounts = useMemo(() => {
    const sosCount = rawTickets.filter((t) => t.isLifeThreatening || t.severity === 'CRITICAL').length;
    const pendingCount = rawTickets.filter((t) => t.status === 'INITIATED' || t.status === 'PENDING_REVIEW').length;
    const inProgressCount = rawTickets.filter(
      (t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'OPEN'
    ).length;
    const resolvedCount = rawTickets.filter((t) => t.status === 'COMPLETED' || t.status === 'RESOLVED').length;
    return {
      all: rawTickets.length,
      sos: sosCount,
      pending: pendingCount,
      in_progress: inProgressCount,
      resolved: resolvedCount,
    };
  }, [rawTickets]);

  // Available Wards based on selected Province
  const availableWards = useMemo(() => {
    if (provinceF === 'all') {
      const allStatic = Object.values(PROVINCE_WARDS).flat();
      const fromTickets = rawTickets.map((t) => t.ward).filter((w) => w && w !== '—');
      return Array.from(new Set([...allStatic, ...fromTickets]));
    }
    const staticForProv = PROVINCE_WARDS[provinceF] || [];
    const fromTickets = rawTickets
      .filter((t) => t.province === provinceF)
      .map((t) => t.ward)
      .filter((w) => w && w !== '—');
    return Array.from(new Set([...staticForProv, ...fromTickets]));
  }, [provinceF, rawTickets]);

  const filteredTickets = useMemo(() => {
    return rawTickets.filter((t) => {
      if (activeTab === 'sos') {
        if (!t.isLifeThreatening && t.severity !== 'CRITICAL') return false;
      } else if (activeTab === 'pending') {
        if (t.status !== 'INITIATED' && t.status !== 'PENDING_REVIEW') return false;
      } else if (activeTab === 'in_progress') {
        if (t.status !== 'IN_PROGRESS' && t.status !== 'ASSIGNED' && t.status !== 'OPEN') return false;
      } else if (activeTab === 'resolved') {
        if (t.status !== 'COMPLETED' && t.status !== 'RESOLVED') return false;
      }

      if (statusF !== 'all' && t.status !== statusF) return false;
      if (sevF !== 'all' && t.severity !== sevF) return false;
      if (deptF !== 'all' && t.departmentId !== deptF) return false;

      if (provinceF !== 'all') {
        const pNorm = (t.province || '').toLowerCase();
        if (!pNorm.includes(provinceF.toLowerCase())) return false;
      }
      if (wardF !== 'all') {
        const wNorm = (t.ward || t.address || '').toLowerCase();
        if (!wNorm.includes(wardF.toLowerCase())) return false;
      }

      if (search.trim()) {
        const query = search.toLowerCase();
        const matchId = t.ticketId.toLowerCase().includes(query);
        const matchDesc = t.description.toLowerCase().includes(query);
        const matchAddr = t.address.toLowerCase().includes(query);
        const matchWard = t.ward.toLowerCase().includes(query);
        const matchProv = t.province.toLowerCase().includes(query);
        const matchDept = (t.departmentName || departmentsMap[t.departmentId] || '').toLowerCase().includes(query);
        if (!matchId && !matchDesc && !matchAddr && !matchWard && !matchProv && !matchDept) {
          return false;
        }
      }

      return true;
    });
  }, [rawTickets, activeTab, statusF, sevF, deptF, provinceF, wardF, search, departmentsMap]);

  const totalItems = filteredTickets.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedTickets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredTickets.slice(start, start + pageSize);
  }, [filteredTickets, currentPage, pageSize]);

  const handleResetFilters = () => {
    setSearch('');
    setActiveTab('all');
    setStatusF('all');
    setSevF('all');
    setDeptF('all');
    setProvinceF('all');
    setWardF('all');
    setCurrentPage(1);
  };

  const isFiltered = Boolean(
    search ||
      activeTab !== 'all' ||
      statusF !== 'all' ||
      sevF !== 'all' ||
      deptF !== 'all' ||
      provinceF !== 'all' ||
      wardF !== 'all'
  );

  const handleExportCSV = () => {
    if (filteredTickets.length === 0) {
      message.warning('Không có dữ liệu để xuất file.');
      return;
    }

    const headers = [
      'Mã hồ sơ',
      'Nội dung sự cố',
      'Địa chỉ',
      'Phường/Xã',
      'Tỉnh/Thành phố',
      'Cơ quan phụ trách',
      'Cán bộ',
      'Mức độ',
      'Trạng thái',
      'Ngày tạo',
    ];
    const rows = filteredTickets.map((t) => [
      t.ticketId,
      t.description || '',
      t.address || '',
      t.ward || '',
      t.province || '',
      t.departmentName || departmentsMap[t.departmentId] || getDept(t.departmentId)?.name || 'Chưa phân công',
      t.assigneeId || 'Chưa phân công',
      sevInfo(t.severity).label,
      statusInfo(t.status).label,
      t.createdAt,
    ]);

    downloadCsvFile('CityFix_Danh_Sach_Ho_So', headers, rows);
    message.success(`Đã xuất ${filteredTickets.length} hồ sơ ra file CSV!`);
  };

  const handleExportExcel = () => {
    if (filteredTickets.length === 0) {
      message.warning('Không có dữ liệu để xuất file.');
      return;
    }

    downloadExcelReport(
      'CityFix_Danh_Sach_Ho_So',
      'DANH SÁCH HỒ SƠ SỰ CỐ HỆ THỐNG CITYFIX',
      `Tổng số: ${filteredTickets.length} hồ sơ`,
      [
        {
          heading: 'Danh sách hồ sơ sự cố',
          headers: [
            'Mã hồ sơ',
            'Nội dung sự cố',
            'Địa chỉ',
            'Phường / Xã',
            'Tỉnh / Thành phố',
            'Cơ quan phụ trách',
            'Cán bộ',
            'Mức độ',
            'Trạng thái',
            'Ngày tiếp nhận',
          ],
          rows: filteredTickets.map((t) => [
            t.ticketId,
            t.description || '',
            t.address || '',
            t.ward || '',
            t.province || '',
            t.departmentName || departmentsMap[t.departmentId] || getDept(t.departmentId)?.name || 'Chưa phân công',
            t.assigneeId || 'Chưa phân công',
            sevInfo(t.severity).label,
            statusInfo(t.status).label,
            t.createdAt,
          ]),
        },
      ]
    );
    message.success(`Đã xuất ${filteredTickets.length} hồ sơ ra file Excel (.xls)!`);
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* 1. HEADER & STATUS TABS */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
                Tra cứu Hồ sơ Sự cố Toàn Hệ thống
              </h1>
              {isUsingMock ? (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  Dữ liệu Mẫu Hệ thống
                </span>
              ) : (
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Dữ liệu Trực tuyến API ({rawTickets.length} hồ sơ)
                </span>
              )}
            </div>
            <p className="text-[12px] text-gray-500 mt-1">
              Giám sát và tra cứu thông tin hồ sơ sự cố theo địa bàn Tỉnh/Thành phố → Phường/Xã (Chế độ Xem - Read-only)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            <span className="text-[11px] text-gray-400 hidden md:inline">
              Cập nhật: <strong className="text-gray-600">{lastRefreshed}</strong>
            </span>
            <button
              onClick={fetchTickets}
              disabled={isLoading}
              className="px-3 py-2 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? 'Đang tải...' : '↻ Làm mới'}
            </button>
            <button
              onClick={handleExportCSV}
              className="px-3 py-2 text-[12px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
            >
              Xuất CSV
            </button>
            <button
              onClick={handleExportExcel}
              className="px-3.5 py-2 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors cursor-pointer"
            >
              Xuất Excel (.xls)
            </button>
          </div>
        </div>

        {/* Clean Status Tabs */}
        <div className="pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-gray-100 p-1 rounded-xl text-[12px] font-semibold flex-wrap gap-0.5">
            {[
              { key: 'all', label: `Tất cả (${tabCounts.all})` },
              { key: 'sos', label: `Khẩn cấp SOS (${tabCounts.sos})` },
              { key: 'pending', label: `Chờ duyệt (${tabCounts.pending})` },
              { key: 'in_progress', label: `Đang xử lý (${tabCounts.in_progress})` },
              { key: 'resolved', label: `Đã hoàn thành (${tabCounts.resolved})` },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setActiveTab(tab.key as TabFilter);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  activeTab === tab.key
                    ? 'bg-white text-orange-600 shadow-2xs font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {isFiltered && (
            <button
              onClick={handleResetFilters}
              className="text-[11px] font-semibold text-orange-600 hover:text-orange-700 underline cursor-pointer"
            >
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* 2. FILTER BAR (Province -> Ward + Department + Status + Search) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
          {/* Search (4 cols) */}
          <div className="lg:col-span-4">
            <input
              type="text"
              placeholder="Tìm mã hồ sơ, nội dung, địa chỉ..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3.5 py-2 text-[12px] bg-gray-50 border border-gray-200 rounded-xl outline-none focus:bg-white focus:border-orange-500 transition-colors"
            />
          </div>

          {/* 1. Province Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={provinceF}
              onChange={(e) => {
                setProvinceF(e.target.value);
                setWardF('all');
                setCurrentPage(1);
              }}
              className="w-full text-[12px] text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Tất cả Tỉnh/TP</option>
              <option value="TP. Hồ Chí Minh">TP. Hồ Chí Minh</option>
              <option value="TP. Hà Nội">TP. Hà Nội</option>
              <option value="TP. Đà Nẵng">TP. Đà Nẵng</option>
            </select>
          </div>

          {/* 2. Ward Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={wardF}
              onChange={(e) => {
                setWardF(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[12px] text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Tất cả Phường/Xã</option>
              {availableWards.map((w) => (
                <option key={w} value={w}>
                  {w}
                </option>
              ))}
            </select>
          </div>

          {/* Department Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={deptF}
              onChange={(e) => {
                setDeptF(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full text-[12px] text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Tất cả Cơ quan</option>
              {departments.length > 0 ? (
                departments.map((d) => (
                  <option key={d.departmentId} value={d.departmentId}>
                    {d.name}
                  </option>
                ))
              ) : (
                <>
                  <option value="D001">Sở Giao thông Vận tải TP.HCM</option>
                  <option value="D002">UBND Phường Võ Thị Sáu</option>
                  <option value="D003">Tổng Công ty Điện lực TP.HCM</option>
                  <option value="D005">Sở Xây dựng TP. Hà Nội</option>
                  <option value="D007">Sở Tài nguyên & Môi trường Đà Nẵng</option>
                </>
              )}
            </select>
          </div>

          {/* Severity Filter (2 cols) */}
          <div className="lg:col-span-2">
            <select
              value={sevF}
              onChange={(e) => {
                setSevF(e.target.value as any);
                setCurrentPage(1);
              }}
              className="w-full text-[12px] text-gray-700 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 outline-none focus:border-orange-500 cursor-pointer"
            >
              <option value="all">Mọi mức độ</option>
              {Object.entries(SEV_MAP).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 3. DATA TABLE */}
      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs relative">
        {isLoading && (
          <div className="absolute inset-0 bg-white/70 z-20 flex flex-col items-center justify-center gap-2">
            <div className="w-7 h-7 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" />
            <span className="text-[11px] font-semibold text-gray-600">Đang tải dữ liệu...</span>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[980px] border-collapse">
            <thead>
              <tr className="bg-gray-50/80 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-200">
                <th className="py-3 px-4">Mã hồ sơ</th>
                <th className="py-3 px-4">Sự cố & Danh mục</th>
                <th className="py-3 px-4">Địa bàn (Phường/Xã, Tỉnh/TP)</th>
                <th className="py-3 px-4">Đơn vị phụ trách</th>
                <th className="py-3 px-3 text-center">Mức độ</th>
                <th className="py-3 px-4 text-center">Trạng thái</th>
                <th className="py-3 px-4">Ngày gửi</th>
                <th className="py-3 px-4 text-right">Thao tác</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100 text-[12px]">
              {paginatedTickets.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center">
                    <div className="max-w-xs mx-auto space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-gray-100 flex items-center justify-center mx-auto text-gray-400">
                        <SlidersIcon className="w-5 h-5" />
                      </div>
                      <p className="font-bold text-gray-700">Không tìm thấy hồ sơ phù hợp</p>
                      {isFiltered && (
                        <button
                          onClick={handleResetFilters}
                          className="px-3 py-1.5 rounded-lg bg-orange-50 text-orange-600 border border-orange-200 text-[11px] font-bold hover:bg-orange-100 cursor-pointer"
                        >
                          Đặt lại bộ lọc
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedTickets.map((t) => {
                  const deptName =
                    t.departmentName ||
                    departmentsMap[t.departmentId] ||
                    getDept(t.departmentId)?.name ||
                    'Chưa phân công';
                  const catName = t.categoryName || getCat(t.categoryId)?.name || 'Hạ tầng đô thị';
                  const sev = sevInfo(t.severity);
                  const st = statusInfo(t.status);

                  return (
                    <tr
                      key={t.ticketId}
                      onClick={() => onOpenTicket(t.ticketId, t)}
                      className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          {t.isLifeThreatening && (
                            <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Khẩn cấp SOS" />
                          )}
                          <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded group-hover:bg-orange-100 group-hover:text-orange-700">
                            {t.ticketId}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 max-w-[260px]">
                        <p className="font-semibold text-gray-900 group-hover:text-orange-600 truncate">
                          {t.description || catName}
                        </p>
                        <p className="text-[11px] text-gray-400 truncate mt-0.5">{catName}</p>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                          <MapPinIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{t.ward}</span>
                        </div>
                        <p className="text-[11px] text-gray-400 truncate pl-5">{t.province}</p>
                      </td>

                      <td className="py-3.5 px-4 max-w-[200px]">
                        <div className="flex items-center gap-1.5 text-gray-800 font-medium">
                          <BuildingIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                          <span className="truncate">{deptName}</span>
                        </div>
                        <div className="flex items-center gap-1 text-[11px] text-gray-400 mt-0.5 pl-5">
                          <UserIcon className="w-3 h-3 text-gray-300" />
                          <span className="truncate">{t.assigneeId || 'Chưa phân công'}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-3 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${sev.cls}`}>
                          {sev.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${st.cls}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                          {st.label}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400 whitespace-nowrap">
                        {t.createdAt}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onOpenTicket(t.ticketId, t);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded-lg transition-colors cursor-pointer"
                        >
                          Xem →
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-[12px] text-gray-500">
          <div className="flex items-center gap-3">
            <span>
              Hiển thị{' '}
              <strong className="text-gray-900">
                {totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1} -{' '}
                {Math.min(currentPage * pageSize, totalItems)}
              </strong>{' '}
              / <strong className="text-gray-900">{totalItems}</strong> hồ sơ
            </span>

            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-gray-200 rounded-lg px-2 py-0.5 text-[11px] font-bold text-gray-700 outline-none cursor-pointer"
            >
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
              <option value={50}>50 / trang</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-[11px] font-semibold cursor-pointer"
            >
              ← Trước
            </button>
            <span className="px-2.5 py-1 text-[11px] font-bold text-gray-700">
              Trang {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-2.5 py-1 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 disabled:opacity-40 text-[11px] font-semibold cursor-pointer"
            >
              Sau →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
