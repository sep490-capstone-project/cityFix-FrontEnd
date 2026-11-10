import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BuildingIcon,
  UserIcon,
  TicketIcon,
  SlidersIcon,
  MapPinIcon,
} from '../components/Icons';
import {
  TICKETS as MOCK_TICKETS,
  DEPARTMENTS as MOCK_DEPTS,
  CATEGORIES as MOCK_CATS,
  ROUTING_RULES as MOCK_RULES,
  USERS as MOCK_USERS,
  getDept,
  getCat,
  statusInfo,
  Ticket as MockTicket,
  StatusKey,
  Severity,
  DangerLevel,
} from '../data';
import { getDepartments, DepartmentItem } from '../services/departments';
import { getDepartmentTicketsForAdmin, ManagerTicketItem, extractTicketImages } from '../services/manager';
import { getAdminCategories } from '../services/categories';
import { getRoutingRules } from '../services/routingRules';
import { getAdminUsers } from '../services/users';
import { message } from 'antd';
import { downloadExcelReport } from '../utils/exportFile';

interface Props {
  onOpenTicket: (id: string, ticketObj?: MockTicket) => void;
  onViewAll: () => void;
}

interface DeptPerformanceItem {
  deptId: string;
  name: string;
  level?: string;
  total: number;
  inProgress: number;
  completed: number;
  pct: number;
}

type FilterTab = 'all' | 'sos' | 'pending' | 'in_progress' | 'completed';

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

export default function Dashboard({ onOpenTicket, onViewAll }: Props) {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isUsingMock, setIsUsingMock] = useState<boolean>(false);
  const [tickets, setTickets] = useState<MockTicket[]>([]);
  const [deptPerf, setDeptPerf] = useState<DeptPerformanceItem[]>([]);
  const [departmentsMap, setDepartmentsMap] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [lastRefreshed, setLastRefreshed] = useState<string>('Vừa xong');

  // System-wide summary counts
  const [systemStats, setSystemStats] = useState({
    totalDepts: MOCK_DEPTS.length,
    cityDepts: MOCK_DEPTS.filter((d) => d.level === 'CITY').length,
    wardDepts: MOCK_DEPTS.filter((d) => d.level === 'WARD').length,
    totalUsers: MOCK_USERS.length,
    totalCategories: MOCK_CATS.length,
    totalRules: MOCK_RULES.length,
  });

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
      imageUrl: extractTicketImages(t)[0] || undefined,
      evidenceUrls: extractTicketImages(t),
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

  const fetchDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [deptsRes, catsRes, rulesRes, usersRes] = await Promise.all([
        getDepartments({ page: 0, size: 50 }).catch(() => null),
        getAdminCategories().catch(() => null),
        getRoutingRules({ page: 0, size: 100 }).catch(() => null),
        getAdminUsers().catch(() => null),
      ]);

      let depts: DepartmentItem[] = [];
      if (Array.isArray(deptsRes)) {
        depts = deptsRes;
      } else if (deptsRes && Array.isArray((deptsRes as any).content)) {
        depts = (deptsRes as any).content;
      }

      const rulesList = Array.isArray(rulesRes)
        ? rulesRes
        : Array.isArray((rulesRes as any)?.content)
        ? (rulesRes as any).content
        : MOCK_RULES;

      const catsList = Array.isArray(catsRes) && catsRes.length > 0 ? catsRes : MOCK_CATS;
      const usersList = Array.isArray(usersRes) && usersRes.length > 0 ? usersRes : MOCK_USERS;

      if (depts.length > 0) {
        setSystemStats({
          totalDepts: depts.length,
          cityDepts: depts.filter((d) => d.level === 'CITY').length,
          wardDepts: depts.filter((d) => d.level === 'WARD').length,
          totalUsers: usersList.length,
          totalCategories: catsList.length,
          totalRules: rulesList.length,
        });
      }

      if (!depts || depts.length === 0) {
        throw new Error('Chưa có dữ liệu cơ quan từ API');
      }

      const deptNames: Record<string, string> = {};
      depts.forEach((d) => {
        deptNames[d.departmentId] = d.name;
      });
      setDepartmentsMap(deptNames);

      const ticketPromises = depts.slice(0, 8).map(async (d) => {
        try {
          const res = await getDepartmentTicketsForAdmin({
            departmentId: d.departmentId,
            size: 50,
          });
          return {
            dept: d,
            tickets: res.content || [],
          };
        } catch {
          return {
            dept: d,
            tickets: [] as ManagerTicketItem[],
          };
        }
      });

      const results = await Promise.all(ticketPromises);
      const allApiTickets: MockTicket[] = [];
      const computedDeptPerf: DeptPerformanceItem[] = [];

      results.forEach(({ dept, tickets: deptTickets }) => {
        const total = deptTickets.length;
        const inProgress = deptTickets.filter(
          (t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED'
        ).length;
        const completed = deptTickets.filter(
          (t) => t.status === 'COMPLETED' || t.status === 'RESOLVED'
        ).length;
        const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

        computedDeptPerf.push({
          deptId: dept.departmentId,
          name: dept.name,
          level: dept.level,
          total,
          inProgress,
          completed,
          pct,
        });

        deptTickets.forEach((t) => {
          allApiTickets.push(mapApiTicketToMockTicket(t, dept.name));
        });
      });

      if (allApiTickets.length > 0) {
        setTickets(allApiTickets);
        setDeptPerf(computedDeptPerf);
        setIsUsingMock(false);
      } else {
        setTickets(MOCK_TICKETS);
        setDeptPerf(
          MOCK_DEPTS.slice(0, 5).map((d, i) => ({
            deptId: d.departmentId,
            name: d.name,
            level: d.level,
            total: 12 - i,
            inProgress: 3,
            completed: 9 - i,
            pct: Math.round(((9 - i) / (12 - i)) * 100),
          }))
        );
        setIsUsingMock(true);
      }
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } catch {
      setTickets(MOCK_TICKETS);
      setDeptPerf(
        MOCK_DEPTS.slice(0, 5).map((d, i) => ({
          deptId: d.departmentId,
          name: d.name,
          level: d.level,
          total: 12 - i,
          inProgress: 3,
          completed: 9 - i,
          pct: Math.round(((9 - i) / (12 - i)) * 100),
        }))
      );
      setIsUsingMock(true);
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }));
    } finally {
      setIsLoading(false);
    }
  }, [mapApiTicketToMockTicket]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derived ticket counts
  const sosTickets = useMemo(() => tickets.filter((t) => t.isLifeThreatening || t.severity === 'CRITICAL'), [tickets]);
  const pendingReview = useMemo(
    () => tickets.filter((t) => t.status === 'PENDING_REVIEW' || t.status === 'INITIATED'),
    [tickets]
  );
  const inProgress = useMemo(
    () => tickets.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'ASSIGNED' || t.status === 'OPEN'),
    [tickets]
  );
  const completed = useMemo(
    () => tickets.filter((t) => t.status === 'COMPLETED' || t.status === 'RESOLVED'),
    [tickets]
  );

  const displayedTickets = useMemo(() => {
    let list = tickets;
    if (activeTab === 'sos') {
      list = sosTickets;
    } else if (activeTab === 'pending') {
      list = pendingReview;
    } else if (activeTab === 'in_progress') {
      list = inProgress;
    } else if (activeTab === 'completed') {
      list = completed;
    }
    return list.slice(0, 7);
  }, [tickets, activeTab, sosTickets, pendingReview, inProgress, completed]);

  const completionPct = tickets.length > 0 ? Math.round((completed.length / tickets.length) * 100) : 0;

  const handleExportDashboard = () => {
    downloadExcelReport(
      'CityFix_Tong_Quan_He_Thong',
      'BÁO CÁO TỔNG QUAN QUẢN TRỊ HỆ THỐNG CITYFIX',
      `Tỷ lệ giải quyết toàn hệ thống: ${completionPct}%`,
      [
        {
          heading: '1. Thống kê Tổng quan Hệ thống',
          headers: ['Chỉ tiêu', 'Số lượng', 'Ghi chú'],
          rows: [
            ['Tổng số hồ sơ sự cố', tickets.length, `${completed.length} hoàn thành, ${inProgress.length} đang xử lý, ${pendingReview.length} chờ duyệt`],
            ['Tổng số Cơ quan / Đơn vị', systemStats.totalDepts, `${systemStats.cityDepts} Cấp Tỉnh/TP, ${systemStats.wardDepts} Cấp Xã/Phường`],
            ['Tài khoản Người dùng', systemStats.totalUsers, 'Quản trị viên, Quản lý, Nhân viên & Cư dân'],
            ['Danh mục & Quy tắc định tuyến', `${systemStats.totalCategories} danh mục`, `${systemStats.totalRules} quy tắc định tuyến`],
          ],
        },
        {
          heading: '2. Tình trạng xử lý theo Cơ quan / Đơn vị',
          headers: ['Mã đơn vị', 'Tên Cơ quan / Đơn vị', 'Tổng tiếp nhận', 'Đang xử lý', 'Đã hoàn thành', 'Tỷ lệ hoàn thành'],
          rows: deptPerf.map((dp) => [dp.deptId, dp.name, dp.total, dp.inProgress, dp.completed, `${dp.pct}%`]),
        },
        {
          heading: '3. Danh sách Hồ sơ Ghi nhận Mới nhất',
          headers: ['Mã hồ sơ', 'Nội dung phản ánh', 'Phường/Xã', 'Tỉnh/Thành phố', 'Đơn vị phụ trách', 'Trạng thái', 'Ngày tiếp nhận'],
          rows: tickets.map((t) => [
            t.ticketId,
            t.description,
            t.ward,
            t.province,
            t.departmentName || departmentsMap[t.departmentId] || getDept(t.departmentId)?.name || 'Chưa phân công',
            statusInfo(t.status).label,
            t.createdAt,
          ]),
        },
      ]
    );
    message.success('Đã xuất Báo cáo Tổng quan Hệ thống (.xls) thành công!');
  };

  return (
    <div className="p-6 space-y-5 max-w-7xl mx-auto screen-enter">
      {/* 1. HEADER WITH BRAND ACCENT */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Tổng quan Quản trị Hệ thống
            </h1>
            {!isUsingMock ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Dữ liệu Trực tuyến API
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                Dữ liệu Mẫu Hệ thống
              </span>
            )}
          </div>
          <p className="text-[12px] text-gray-500 mt-1">
            Giám sát tổng thể hồ sơ phản ánh, đơn vị hành chính, danh mục và người dùng trên toàn hệ thống CityFix
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <span className="text-[11px] text-gray-400 hidden md:inline mr-1">
            Cập nhật: <strong className="text-gray-600 font-semibold">{lastRefreshed}</strong>
          </span>
          <button
            onClick={fetchDashboardData}
            disabled={isLoading}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? 'Đang tải...' : '↻ Làm mới'}
          </button>
          <button
            onClick={handleExportDashboard}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Xuất Báo cáo (.xls)
          </button>
          <button
            onClick={onViewAll}
            className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Tra cứu Hồ sơ →
          </button>
        </div>
      </div>

      {/* 2. 4 SYSTEM KPI CARDS (BRAND ORANGE & CONTEXTUAL SEMANTIC COLORS) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Tickets (Primary Orange Context) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Tổng Hồ Sơ Hệ Thống
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <TicketIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-gray-900">{tickets.length}</span>
            <span className="text-xs text-gray-400">hồ sơ</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-2 pt-2 border-t border-gray-100">
            <span className="text-emerald-600 font-semibold">{completed.length} hoàn thành</span>
            <span className="text-gray-300">•</span>
            <span className="text-orange-600 font-semibold">{inProgress.length} đang xử lý</span>
          </div>
        </div>

        {/* KPI 2: Departments (Administrative Blue Context) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Cơ Quan / Đơn Vị
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <BuildingIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-gray-900">{systemStats.totalDepts}</span>
            <span className="text-xs text-gray-400">đơn vị hoạt động</span>
          </div>
          <div className="text-[11px] text-gray-500 flex items-center gap-2 pt-2 border-t border-gray-100">
            <span><strong className="text-blue-700">{systemStats.cityDepts}</strong> Cấp Tỉnh/TP</span>
            <span className="text-gray-300">•</span>
            <span><strong className="text-gray-700">{systemStats.wardDepts}</strong> Cấp Xã/Phường</span>
          </div>
        </div>

        {/* KPI 3: Users (Amber/Warm Context) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Tài Khoản Người Dùng
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UserIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-gray-900">{systemStats.totalUsers}</span>
            <span className="text-xs text-gray-400">tài khoản</span>
          </div>
          <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 truncate">
            Quản trị viên, Quản lý, Nhân viên & Cư dân
          </div>
        </div>

        {/* KPI 4: Categories & Routing Rules (Emerald/Active Configuration Context) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Danh Mục & Định Tuyến
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <SlidersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-2.5">
            <div>
              <span className="font-display text-3xl font-black text-gray-900">{systemStats.totalCategories}</span>
              <span className="text-xs text-gray-400 ml-1">danh mục</span>
            </div>
            <span className="text-gray-300">/</span>
            <div>
              <span className="font-display text-2xl font-black text-orange-600">{systemStats.totalRules}</span>
              <span className="text-xs text-gray-400 ml-1">quy tắc</span>
            </div>
          </div>
          <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 truncate">
            Định tuyến theo Tỉnh/TP → Phường/Xã
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE: 2 COLUMNS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column (8/12): Recent Tickets Table (Read-only Lookup) */}
        <div className="lg:col-span-8 bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="p-4 sm:px-5 border-b border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-[14px] font-bold text-gray-900">
                Hồ sơ Phản ánh Mới nhất Toàn Hệ thống
              </h3>
              <p className="text-[11px] text-gray-400 mt-0.5">
                Bấm vào một hồ sơ để xem chi tiết thông tin và lịch sử xử lý (Chế độ Xem)
              </p>
            </div>

            {/* Filter Pills with Brand Orange Active State */}
            <div className="flex items-center bg-gray-100 p-1 rounded-xl text-[11px] font-semibold flex-wrap gap-0.5">
              {[
                { key: 'all', label: `Tất cả (${tickets.length})` },
                { key: 'sos', label: `Khẩn cấp (${sosTickets.length})` },
                { key: 'pending', label: `Chờ duyệt (${pendingReview.length})` },
                { key: 'in_progress', label: `Đang xử lý (${inProgress.length})` },
                { key: 'completed', label: `Hoàn thành (${completed.length})` },
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as FilterTab)}
                  className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                    activeTab === tab.key
                      ? 'bg-white text-orange-600 shadow-2xs font-bold'
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/70 text-[10px] font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <th className="py-3 px-4">Mã hồ sơ</th>
                  <th className="py-3 px-4">Nội dung & Danh mục</th>
                  <th className="py-3 px-4">Địa bàn (Phường/Xã, Tỉnh/TP)</th>
                  <th className="py-3 px-4">Đơn vị phụ trách</th>
                  <th className="py-3 px-4 text-right">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[12px]">
                {displayedTickets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-10 text-center text-gray-400">
                      Không có hồ sơ nào trong mục này.
                    </td>
                  </tr>
                ) : (
                  displayedTickets.map((t) => {
                    const deptName =
                      t.departmentName ||
                      departmentsMap[t.departmentId] ||
                      getDept(t.departmentId)?.name ||
                      'Chưa phân công';
                    const catName = t.categoryName || getCat(t.categoryId)?.name || 'Hạ tầng đô thị';
                    const st = statusInfo(t.status);

                    return (
                      <tr
                        key={t.ticketId}
                        onClick={() => onOpenTicket(t.ticketId, t)}
                        className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            {t.isLifeThreatening && (
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" title="Khẩn cấp SOS" />
                            )}
                            <span className="font-mono text-[11px] font-bold text-gray-700 bg-gray-100 px-2 py-0.5 rounded group-hover:bg-orange-100 group-hover:text-orange-700 transition-colors">
                              {t.ticketId}
                            </span>
                          </div>
                        </td>

                        <td className="py-3 px-4 max-w-[230px]">
                          <p className="font-semibold text-gray-900 truncate group-hover:text-orange-600 transition-colors">
                            {t.description}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate">
                            {catName} • {t.createdAt}
                          </p>
                        </td>

                        <td className="py-3 px-4 max-w-[180px]">
                          <div className="flex items-center gap-1 text-gray-700 font-medium truncate">
                            <MapPinIcon className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" />
                            <span className="truncate">{t.ward}</span>
                          </div>
                          <p className="text-[11px] text-gray-400 truncate pl-4">{t.province}</p>
                        </td>

                        <td className="py-3 px-4 max-w-[180px]">
                          <p className="text-gray-700 font-medium truncate">{deptName}</p>
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <span className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border inline-flex items-center gap-1.5 ${st.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                            {st.label}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 bg-gray-50/70 border-t border-gray-100 flex items-center justify-between text-[12px]">
            <span className="text-gray-500">
              Hiển thị {displayedTickets.length} / {tickets.length} hồ sơ
            </span>
            <button
              onClick={onViewAll}
              className="font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
            >
              Xem toàn bộ danh sách →
            </button>
          </div>
        </div>

        {/* Right Column (4/12): System Status & Department Progress */}
        <div className="lg:col-span-4 space-y-5">
          {/* Card 1: Overall Progress (Contextual Status Colors) */}
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-gray-900">
                Tỷ lệ Giải quyết Toàn Hệ thống
              </h3>
              <span className="font-display text-lg font-black text-emerald-600">
                {completionPct}%
              </span>
            </div>

            <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${completionPct}%` }}
              />
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="p-2.5 rounded-xl bg-amber-50/60 border border-amber-200/70">
                <p className="font-display text-lg font-black text-amber-600">{pendingReview.length}</p>
                <p className="text-[10px] font-semibold text-amber-700">Chờ duyệt</p>
              </div>
              <div className="p-2.5 rounded-xl bg-orange-50/60 border border-orange-200/70">
                <p className="font-display text-lg font-black text-orange-600">{inProgress.length}</p>
                <p className="text-[10px] font-semibold text-orange-700">Đang xử lý</p>
              </div>
              <div className="p-2.5 rounded-xl bg-emerald-50/60 border border-emerald-200/70">
                <p className="font-display text-lg font-black text-emerald-600">{completed.length}</p>
                <p className="text-[10px] font-semibold text-emerald-700">Hoàn thành</p>
              </div>
            </div>
          </div>

          {/* Card 2: Department Resolution Breakdown */}
          <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-[14px] font-bold text-gray-900">
                Tiến độ theo Cơ quan / Đơn vị
              </h3>
              <span className="text-[11px] font-semibold text-orange-600 bg-orange-50 px-2 py-0.5 rounded-full">
                {deptPerf.length} đơn vị
              </span>
            </div>

            <div className="divide-y divide-gray-100 max-h-[320px] overflow-y-auto scrollbar-thin">
              {deptPerf.map((dp) => (
                <div key={dp.deptId} className="px-5 py-3 space-y-1.5 hover:bg-orange-50/20 transition-colors">
                  <div className="flex items-center justify-between gap-2 text-[12px]">
                    <p className="font-semibold text-gray-800 truncate">{dp.name}</p>
                    <span className="text-[11px] font-bold text-gray-600 flex-shrink-0">
                      {dp.completed}/{dp.total} ({dp.pct}%)
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        dp.pct >= 80 ? 'bg-emerald-500' : 'bg-orange-500'
                      }`}
                      style={{ width: `${dp.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
