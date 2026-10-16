import { useState, useEffect, useMemo } from 'react';
import {
  getManagerDepartments,
  getDepartmentUsers,
  ManagerDepartment,
  DepartmentStaffUser,
  ApiError,
} from '../services';

interface Props {
  currentUser?: {
    userId?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    departmentId?: string;
  };
}

export default function ManagerStaff({ currentUser }: Props) {
  const [departments, setDepartments] = useState<ManagerDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingDeptId, setRefreshingDeptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'STAFF' | 'MANAGER'>('all');
  const [viewMode, setViewMode] = useState<'by-dept' | 'all-staff'>('by-dept');
  const [selectedUser, setSelectedUser] = useState<DepartmentStaffUser | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Thông tin Quản lý từ tài khoản đăng nhập thực tế (không dùng dữ liệu cứng)
  const loggedInManager: DepartmentStaffUser | null = useMemo(() => {
    if (!currentUser?.userId && !currentUser?.fullName) return null;
    return {
      userId: currentUser.userId || '',
      id: currentUser.userId || '',
      email: currentUser.email || '',
      fullName: currentUser.fullName || 'Cán bộ Quản lý',
      phoneNumber: currentUser.phoneNumber || '',
      role: 'MANAGER',
      status: 'ACTIVE',
      departmentName: 'Phụ trách điều phối các phòng ban',
    };
  }, [currentUser]);

  // Tải danh sách phòng ban và nhân sự từ API: GET /api/v1/manager/tickets/departments
  async function loadDepartments() {
    setLoading(true);
    setError(null);
    try {
      const data = await getManagerDepartments();
      if (data && data.length > 0) {
        // Chuẩn hóa danh sách cán bộ cho từng phòng ban (1 Manager + các Staff)
        const formatted = data.map((dept) => {
          const rawUsers =
            dept.users ||
            dept.staffs ||
            dept.officers ||
            dept.members ||
            dept.employees ||
            [];

          const mappedUsers: DepartmentStaffUser[] = rawUsers.map((u: any) => ({
            userId: u.userId || u.id || '',
            id: u.userId || u.id || '',
            email: u.email || '—',
            fullName: u.fullName || u.name || 'Cán bộ',
            phoneNumber: u.phoneNumber || u.phone || '—',
            role:
              u.role?.toUpperCase() === 'MANAGER' || u.role?.toUpperCase() === 'LEADER'
                ? 'MANAGER'
                : 'STAFF',
            status: u.status || 'ACTIVE',
            departmentId: dept.departmentId,
            departmentName: dept.name,
            province: u.province,
            ward: u.ward,
            address: u.address,
          }));

          // Đảm bảo phòng ban có Manager phụ trách
          const hasManager = mappedUsers.some((u) => u.role === 'MANAGER');
          if (!hasManager && loggedInManager) {
            mappedUsers.unshift({
              ...loggedInManager,
              departmentId: dept.departmentId,
              departmentName: dept.name,
            });
          }

          return {
            ...dept,
            users: mappedUsers,
          };
        });
        setDepartments(formatted);
      } else {
        setDepartments([]);
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải GET /api/v1/manager/tickets/departments:', err);
      const msg = err instanceof ApiError ? err.message : 'Không thể kết nối đến máy chủ để tải danh sách phòng ban.';
      setError(msg);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }

  // Tải riêng danh sách nhân sự của 1 phòng ban: GET /api/v1/departments/{id}/users
  async function refreshDepartmentUsers(deptId: string) {
    setRefreshingDeptId(deptId);
    try {
      const users = await getDepartmentUsers(deptId);
      if (users && Array.isArray(users)) {
        setDepartments((prev) =>
          prev.map((d) => {
            if (d.departmentId === deptId) {
              const mapped: DepartmentStaffUser[] = users.map((u) => ({
                ...u,
                role: u.role?.toUpperCase() === 'MANAGER' ? 'MANAGER' : 'STAFF',
                departmentId: deptId,
                departmentName: d.name,
              }));

              const hasManager = mapped.some((u) => u.role === 'MANAGER');
              if (!hasManager && loggedInManager) {
                mapped.unshift({
                  ...loggedInManager,
                  departmentId: deptId,
                  departmentName: d.name,
                });
              }

              return {
                ...d,
                users: mapped,
              };
            }
            return d;
          })
        );
      }
    } catch (err) {
      console.warn(`Lỗi khi tải GET /api/v1/departments/${deptId}/users:`, err);
    } finally {
      setRefreshingDeptId(null);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, [loggedInManager]);

  // Danh sách cán bộ được phân loại
  const { allManagers, allFieldStaff, allStaff } = useMemo(() => {
    const managers: DepartmentStaffUser[] = [];
    const staffList: DepartmentStaffUser[] = [];
    const fullList: DepartmentStaffUser[] = [];

    departments.forEach((dept) => {
      (dept.users || []).forEach((u) => {
        const item: DepartmentStaffUser = {
          ...u,
          departmentId: dept.departmentId,
          departmentName: dept.name,
        };
        fullList.push(item);
        if (u.role === 'MANAGER') {
          if (!managers.some((m) => m.userId && m.userId === u.userId)) {
            managers.push(item);
          }
        } else {
          staffList.push(item);
        }
      });
    });

    return { allManagers: managers, allFieldStaff: staffList, allStaff: fullList };
  }, [departments]);

  // Bộ lọc phòng ban
  const filteredDepartments = useMemo(() => {
    return departments.filter((d) => {
      if (selectedDeptId !== 'all' && d.departmentId !== selectedDeptId) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      const matchDept =
        d.name?.toLowerCase().includes(q) ||
        d.contactEmail?.toLowerCase().includes(q) ||
        d.phoneNumber?.includes(q);
      const matchStaff = (d.users || []).some(
        (u) =>
          u.fullName?.toLowerCase().includes(q) ||
          u.email?.toLowerCase().includes(q) ||
          u.phoneNumber?.includes(q) ||
          u.userId?.toLowerCase().includes(q)
      );
      return matchDept || matchStaff;
    });
  }, [departments, selectedDeptId, search]);

  // Bộ lọc danh sách bảng cán bộ
  const filteredStaffList = useMemo(() => {
    return allStaff.filter((u) => {
      if (selectedDeptId !== 'all' && u.departmentId !== selectedDeptId) {
        return false;
      }
      if (roleFilter !== 'all' && u.role !== roleFilter) {
        return false;
      }
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        u.fullName?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.phoneNumber?.includes(q) ||
        u.departmentName?.toLowerCase().includes(q) ||
        u.userId?.toLowerCase().includes(q)
      );
    });
  }, [allStaff, selectedDeptId, roleFilter, search]);

  function copyToClipboard(text: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* 1. Header Trang Hiện Đại */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-orange-500 to-orange-700 text-white flex items-center justify-center font-black text-xl shadow-md shadow-orange-500/25 flex-shrink-0">
            🏢
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                Cán bộ & Phòng ban Quản lý
              </h2>
              <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                1 Manager · Đa Phòng ban
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Sơ đồ tổ chức nhân sự, thông tin cán bộ trực tiếp tiếp nhận và xử lý hiện trường sự cố
            </p>
          </div>
        </div>

        {/* Nút hành động & Chuyển chế độ xem */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('by-dept')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'by-dept'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>🏢</span> Cơ cấu phòng ban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all-staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                viewMode === 'all-staff'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>👥</span> Bảng nhân sự ({allStaff.length})
            </button>
          </div>

          <button
            type="button"
            onClick={loadDepartments}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs hover:border-slate-300"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-orange-600' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
            </svg>
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* Thông báo lỗi nếu API gặp sự cố */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center justify-between animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2.5">
            <span className="text-base">⚠️</span>
            <div>
              <p className="font-bold">Không thể tải dữ liệu phòng ban từ máy chủ</p>
              <p className="text-[11px] text-red-700 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            onClick={loadDepartments}
            className="px-3 py-1 bg-white hover:bg-red-100 text-red-700 border border-red-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* 2. KPI Cards Thống Kê Nhanh (Dữ liệu thực tế từ API) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Card 1: Tổng số phòng ban */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400">
              Phòng ban trực thuộc
            </span>
            <span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center text-xs">
              🏢
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-slate-900">
              {departments.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">đơn vị</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Được phân bổ trong phạm vi quản lý
          </p>
        </div>

        {/* Card 2: Quản lý phụ trách */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-700">
              Cán bộ Quản lý (Manager)
            </span>
            <span className="w-7 h-7 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center text-xs">
              👑
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-purple-700">
              {allManagers.length}
            </span>
            <span className="text-xs font-semibold text-purple-600">quản lý</span>
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1 truncate">
            Giám sát đồng thời các phòng ban
          </p>
        </div>

        {/* Card 3: Cán bộ thực hiện */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600">
              Cán bộ thực hiện (Staff)
            </span>
            <span className="w-7 h-7 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center text-xs">
              👷
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-orange-600">
              {allFieldStaff.length}
            </span>
            <span className="text-xs font-semibold text-slate-500">nhân sự</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Cán bộ hiện trường & thi công
          </p>
        </div>

        {/* Card 4: Tổng số cán bộ */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-xs transition-shadow">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-600">
              Tổng nhân sự ghi nhận
            </span>
            <span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs">
              👥
            </span>
          </div>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-600">
              {allStaff.length}
            </span>
            <span className="text-xs font-semibold text-emerald-600">nhân sự</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Đã đồng bộ từ hệ thống phòng ban
          </p>
        </div>
      </div>

      {/* 3. Thanh Tìm kiếm & Lọc Tương tác */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3.5 flex flex-col md:flex-row items-center gap-3 shadow-2xs">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1 w-full">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
            🔍
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên cán bộ, email, số điện thoại, tên phòng ban, User ID..."
            className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all shadow-2xs"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Lọc theo phòng ban */}
        <div className="w-full md:w-64">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer shadow-2xs"
          >
            <option value="all">Tất cả phòng ban ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo vai trò (khi ở chế độ bảng) */}
        {viewMode === 'all-staff' && (
          <div className="w-full md:w-48">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer shadow-2xs"
            >
              <option value="all">Tất cả vai trò ({allStaff.length})</option>
              <option value="STAFF">Cán bộ thực hiện (Staff)</option>
              <option value="MANAGER">Cán bộ Quản lý (Manager)</option>
            </select>
          </div>
        )}
      </div>

      {/* 4. Nội Dung Chính */}
      {loading ? (
        <div className="py-24 text-center bg-white border border-slate-200 rounded-2xl shadow-2xs">
          <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-700">
            Đang tải dữ liệu cơ cấu phòng ban và danh sách cán bộ...
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Vui lòng đợi trong giây lát</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="py-20 text-center bg-white border border-dashed border-slate-300 rounded-2xl shadow-2xs space-y-3">
          <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center text-2xl mx-auto text-slate-400">
            📭
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-800">
              Không có dữ liệu phòng ban nào từ hệ thống
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Chưa tìm thấy phòng ban nào được gán cho tài khoản Quản lý hiện tại trên máy chủ.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDepartments}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 inline-flex items-center gap-1.5"
          >
            <span>🔄</span> Tải lại dữ liệu
          </button>
        </div>
      ) : viewMode === 'by-dept' ? (
        /* CHẾ ĐỘ 1: THẺ CƠ CẤU THEO PHÒNG BAN */
        <div className="space-y-5">
          {filteredDepartments.length === 0 ? (
            <div className="py-16 text-center bg-white border border-dashed border-slate-300 rounded-2xl">
              <p className="text-sm font-bold text-slate-700">Không tìm thấy phòng ban phù hợp</p>
              <p className="text-xs text-slate-400 mt-1">Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc</p>
            </div>
          ) : (
            filteredDepartments.map((dept) => {
              const users = dept.users || [];
              const manager = users.find((u) => u.role === 'MANAGER') || loggedInManager;
              const staffMembers = users.filter((u) => u.role !== 'MANAGER');
              const isRefreshing = refreshingDeptId === dept.departmentId;

              return (
                <div
                  key={dept.departmentId}
                  className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-2xs hover:border-slate-300 transition-all"
                >
                  {/* Department Card Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-50 via-white to-slate-50 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <h3 className="text-base font-extrabold text-slate-900 tracking-tight">
                          {dept.name}
                        </h3>
                        {dept.level && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                              dept.level === 'CITY'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            }`}
                          >
                            {dept.level === 'CITY' ? 'Cấp Thành phố' : dept.level}
                          </span>
                        )}
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          {staffMembers.length} Cán bộ thực hiện
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {dept.contactEmail && (
                          <span className="flex items-center gap-1">
                            <span>✉️</span> {dept.contactEmail}
                          </span>
                        )}
                        {dept.phoneNumber && (
                          <span className="flex items-center gap-1">
                            <span>📞</span> {dept.phoneNumber}
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                          Mã PB: {dept.departmentId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => refreshDepartmentUsers(dept.departmentId)}
                        disabled={isRefreshing}
                        title="Tải lại danh sách nhân sự của phòng ban này"
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-bold text-slate-700 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs hover:border-slate-300"
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
                        </svg>
                        <span>Làm mới</span>
                      </button>
                    </div>
                  </div>

                  {/* Body: Cơ cấu 2 Khối (Manager & Staff) */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* VỊ TRÍ 1: CÁN BỘ QUẢN LÝ (MANAGER) */}
                      {manager ? (
                        <div className="bg-purple-50/40 border border-purple-200 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-300 transition-all shadow-2xs">
                          <div>
                            <div className="flex items-center justify-between pb-2.5 border-b border-purple-100">
                              <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1.5">
                                <span>👑</span> Quản lý phụ trách phòng ban
                              </span>
                              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-purple-100 text-purple-800 border border-purple-200">
                                MANAGER
                              </span>
                            </div>

                            <div className="flex items-start gap-3 mt-3">
                              <div className="w-10 h-10 rounded-xl bg-purple-700 text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                                {manager.fullName ? manager.fullName.charAt(0) : 'M'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-extrabold text-slate-900 truncate">
                                  {manager.fullName}
                                </p>
                                <p className="text-[11px] text-purple-700 font-medium truncate mt-0.5">
                                  {manager.email || '—'}
                                </p>
                                <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Điện thoại:</span>
                                    <span className="font-semibold text-slate-800">
                                      {manager.phoneNumber || '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Phạm vi:</span>
                                    <span className="font-bold text-purple-800 bg-purple-100/70 px-1.5 py-0.2 rounded text-[10px]">
                                      Quản lý {departments.length} phòng ban
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between">
                            <span className="text-[10px] text-purple-600 font-medium">
                              Giám sát & Phê duyệt điều phối
                            </span>
                            <button
                              type="button"
                              onClick={() => setSelectedUser(manager)}
                              className="text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                            >
                              Xem chi tiết →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                          <p className="font-bold text-slate-600">Chưa xác định Quản lý</p>
                          <p className="text-[11px] text-slate-400 mt-1">Tài khoản quản lý chưa được liên kết.</p>
                        </div>
                      )}

                      {/* VỊ TRÍ 2: CÁN BỘ THỰC HIỆN (STAFF) */}
                      {staffMembers.length === 0 ? (
                        <div className="bg-slate-50/70 border border-dashed border-slate-300 rounded-2xl p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                          <span className="text-xl mb-1">👷</span>
                          <p className="font-bold text-slate-700">Chưa có Cán bộ thực hiện (Staff)</p>
                          <p className="text-[11px] text-slate-400 mt-1 max-w-xs">
                            Phòng ban này hiện chưa có nhân sự nào mang vai trò Cán bộ tiếp nhận hiện trường.
                          </p>
                        </div>
                      ) : (
                        staffMembers.map((staff) => {
                          const isCopied = staff.userId ? copiedKey === staff.userId : false;
                          return (
                            <div
                              key={staff.userId || staff.email}
                              className="bg-orange-50/40 border border-orange-200 rounded-2xl p-4 flex flex-col justify-between hover:border-orange-300 transition-all shadow-2xs"
                            >
                              <div>
                                <div className="flex items-center justify-between pb-2.5 border-b border-orange-100">
                                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-900 flex items-center gap-1.5">
                                    <span>👷</span> Cán bộ thực hiện hiện trường
                                  </span>
                                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 border border-orange-200">
                                    STAFF
                                  </span>
                                </div>

                                <div className="flex items-start gap-3 mt-3">
                                  <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-extrabold text-sm flex items-center justify-center flex-shrink-0 shadow-xs">
                                    {staff.fullName ? staff.fullName.charAt(0) : 'S'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-extrabold text-slate-900 truncate">
                                      {staff.fullName}
                                    </p>
                                    <p className="text-[11px] text-orange-700 font-medium truncate mt-0.5">
                                      {staff.email}
                                    </p>
                                    <div className="mt-2 space-y-1 text-[11px] text-slate-600">
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Điện thoại:</span>
                                        <span className="font-semibold text-slate-800">
                                          {staff.phoneNumber || '—'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">User ID (assigneeId):</span>
                                        <span className="font-mono text-[10px] text-orange-800 font-bold truncate max-w-[150px]">
                                          {staff.userId || '—'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-4 pt-3 border-t border-orange-100 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(staff)}
                                  className="text-xs font-bold text-orange-700 hover:text-orange-900 cursor-pointer"
                                >
                                  Chi tiết cán bộ →
                                </button>

                                {staff.userId && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(staff.userId!, staff.userId!)}
                                    className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 ${
                                      isCopied
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                        : 'bg-white border-orange-300 text-orange-700 hover:bg-orange-50'
                                    }`}
                                  >
                                    {isCopied ? '✓ Đã chép' : '📋 Sao chép ID'}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}

                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* CHẾ ĐỘ 2: BẢNG TOÀN BỘ CÁN BỘ VÀ QUẢN LÝ */
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-extrabold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Nhân sự</th>
                  <th className="py-3 px-4">Vai trò cơ cấu</th>
                  <th className="py-3 px-4">Phòng ban phụ trách</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Điện thoại</th>
                  <th className="py-3 px-4">User ID (assigneeId)</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                  <th className="py-3 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredStaffList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      Không tìm thấy nhân sự nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredStaffList.map((st, idx) => {
                    const isCopied = st.userId ? copiedKey === st.userId : false;
                    const isManager = st.role === 'MANAGER';
                    return (
                      <tr
                        key={`${st.userId || st.email}-${st.departmentId || idx}`}
                        className="hover:bg-orange-50/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg font-extrabold text-xs flex items-center justify-center flex-shrink-0 text-white shadow-2xs ${
                                isManager ? 'bg-purple-700' : 'bg-orange-600'
                              }`}
                            >
                              {st.fullName ? st.fullName.charAt(0) : 'U'}
                            </div>
                            <div>
                              <p className="font-extrabold text-slate-900">{st.fullName}</p>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md border ${
                              isManager
                                ? 'bg-purple-50 text-purple-700 border-purple-200'
                                : 'bg-orange-50 text-orange-700 border-orange-200'
                            }`}
                          >
                            {isManager ? '👑 MANAGER' : '👷 STAFF'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-slate-800">
                            {st.departmentName || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">{st.email}</td>
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {st.phoneNumber || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                          {st.userId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[120px]">{st.userId}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(st.userId!, st.userId!)}
                                className="text-slate-400 hover:text-orange-600 text-xs cursor-pointer"
                                title="Sao chép User ID"
                              >
                                {isCopied ? '✓' : '📋'}
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              st.status === 'ACTIVE'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {st.status || 'ACTIVE'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(st)}
                            className="px-2.5 py-1 text-[11px] font-bold text-orange-600 hover:bg-orange-50 rounded-lg transition-all cursor-pointer"
                          >
                            Chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. Modal Chi Tiết Cán Bộ / Quản Lý */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-slate-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl text-white font-extrabold text-base flex items-center justify-center shadow-sm ${
                    selectedUser.role === 'MANAGER' ? 'bg-purple-700' : 'bg-orange-600'
                  }`}
                >
                  {selectedUser.fullName ? selectedUser.fullName.charAt(0) : 'U'}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {selectedUser.fullName}
                  </h3>
                  <span
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded border inline-block mt-1 ${
                      selectedUser.role === 'MANAGER'
                        ? 'bg-purple-50 text-purple-700 border-purple-200'
                        : 'bg-orange-50 text-orange-700 border-orange-200'
                    }`}
                  >
                    {selectedUser.role === 'MANAGER' ? '👑 CÁN BỘ QUẢN LÝ' : '👷 CÁN BỘ THỰC HIỆN'}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer text-base font-bold"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-2 border border-slate-200">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Email công vụ:</span>
                  <span className="font-bold text-slate-900">{selectedUser.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Số điện thoại:</span>
                  <span className="font-semibold text-slate-800">{selectedUser.phoneNumber || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Phòng ban:</span>
                  <span className="font-semibold text-slate-800">{selectedUser.departmentName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Trạng thái:</span>
                  <span className="font-bold text-emerald-600">{selectedUser.status || 'ACTIVE'}</span>
                </div>
              </div>

              {selectedUser.userId && (
                <div className="p-3 bg-orange-50/60 rounded-xl border border-orange-200 space-y-1">
                  <span className="text-[10px] font-bold text-orange-800 uppercase block">
                    User ID (Dùng làm assigneeId khi điều phối):
                  </span>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[11px] text-orange-950 truncate font-semibold">
                      {selectedUser.userId}
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedUser.userId!, 'modal')}
                      className="px-2.5 py-1 bg-white hover:bg-orange-100 text-orange-700 border border-orange-300 rounded-lg text-[10px] font-bold cursor-pointer transition-all shadow-2xs"
                    >
                      {copiedKey === 'modal' ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl font-bold text-xs cursor-pointer transition-colors"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
