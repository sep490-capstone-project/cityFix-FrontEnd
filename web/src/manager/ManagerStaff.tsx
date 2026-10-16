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

  // Thông tin Quản lý mặc định (1 Manager quản lý nhiều phòng ban)
  const defaultManagerUser: DepartmentStaffUser = useMemo(() => ({
    userId: currentUser?.userId || 'usr-mgr-001',
    id: currentUser?.userId || 'usr-mgr-001',
    email: currentUser?.email || 'manager.test@cityfix.vn',
    fullName: currentUser?.fullName || 'Trần Ngọc Manager',
    phoneNumber: currentUser?.phoneNumber || '0901 234 567',
    role: 'MANAGER',
    status: 'ACTIVE',
    departmentName: 'Toàn bộ các phòng ban quản lý',
  }), [currentUser]);

  // Tải danh sách phòng ban và nhân sự: GET /api/v1/manager/tickets/departments
  async function loadDepartments() {
    setLoading(true);
    setError(null);
    try {
      const data = await getManagerDepartments();
      if (data && data.length > 0) {
        // Chuẩn hóa danh sách cán bộ cho từng phòng ban (1 Manager + 1 Staff)
        const formatted = data.map((dept) => {
          const rawUsers =
            dept.users ||
            dept.staffs ||
            dept.officers ||
            dept.members ||
            dept.employees ||
            [];

          const mappedUsers: DepartmentStaffUser[] = rawUsers.map((u: any) => ({
            userId: u.userId || u.id,
            id: u.userId || u.id,
            email: u.email || '—',
            fullName: u.fullName || u.name || 'Cán bộ',
            phoneNumber: u.phoneNumber || u.phone || '—',
            role: (u.role?.toUpperCase() === 'MANAGER' || u.role?.toUpperCase() === 'LEADER') ? 'MANAGER' : 'STAFF',
            status: u.status || 'ACTIVE',
            departmentId: dept.departmentId,
            departmentName: dept.name,
            province: u.province,
            ward: u.ward,
            address: u.address,
          }));

          // Đảm bảo mỗi phòng ban luôn có 1 Manager phụ trách
          const hasManager = mappedUsers.some((u) => u.role === 'MANAGER');
          if (!hasManager) {
            mappedUsers.unshift({
              ...defaultManagerUser,
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
        // Dữ liệu mẫu chuẩn: 1 Manager quản lý 3 phòng ban, mỗi phòng ban có 1 Staff
        setDepartments(getFallbackDepartments(defaultManagerUser));
      }
    } catch (err: any) {
      console.warn('Lỗi khi tải GET /api/v1/manager/tickets/departments:', err);
      const msg = err instanceof ApiError ? err.message : 'Không thể kết nối đến máy chủ.';
      setError(`${msg} Đang hiển thị cơ cấu phòng ban chuẩn (1 Manager + 1 Staff).`);
      setDepartments(getFallbackDepartments(defaultManagerUser));
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
                role: (u.role?.toUpperCase() === 'MANAGER') ? 'MANAGER' : 'STAFF',
                departmentId: deptId,
                departmentName: d.name,
              }));

              const hasManager = mapped.some((u) => u.role === 'MANAGER');
              if (!hasManager) {
                mapped.unshift({
                  ...defaultManagerUser,
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
  }, [defaultManagerUser]);

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
          if (!managers.some((m) => m.userId === u.userId)) {
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
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-600 text-white flex items-center justify-center font-black text-lg shadow-sm shadow-orange-500/20">
              🏢
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-gray-900 tracking-tight">
                Cơ cấu Phòng ban & Cán bộ
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Mô hình tổ chức: Mỗi phòng ban gồm <strong className="text-gray-700">1 Cán bộ thực hiện (Staff)</strong> và <strong className="text-gray-700">1 Quản lý (Manager)</strong> phụ trách nhiều phòng ban.
              </p>
            </div>
          </div>
        </div>

        {/* Nút hành động & Chuyển chế độ xem */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="bg-gray-100 p-1 rounded-xl flex items-center border border-gray-200">
            <button
              type="button"
              onClick={() => setViewMode('by-dept')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'by-dept'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              🏢 Cơ cấu theo phòng ban
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all-staff')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === 'all-staff'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              👥 Danh sách nhân sự ({allStaff.length})
            </button>
          </div>

          <button
            type="button"
            onClick={loadDepartments}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50 cursor-pointer shadow-2xs"
          >
            <svg
              className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
            </svg>
            Làm mới
          </button>
        </div>
      </div>

      {/* Thông báo lỗi / fallback nếu có */}
      {error && (
        <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span>ℹ️</span>
            <span>{error}</span>
          </div>
          <button
            onClick={() => setError(null)}
            className="text-amber-600 hover:text-amber-800 font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {/* Metrics Thống kê nhanh */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
            Tổng số phòng ban
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-gray-900">
              {departments.length}
            </span>
            <span className="text-xs font-semibold text-gray-500">đơn vị</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">Đô thị, Cấp nước, Điện lực...</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-purple-700">
            Quản lý phụ trách (Manager)
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-purple-700">
              {Math.max(allManagers.length, 1)}
            </span>
            <span className="text-xs font-semibold text-purple-600">quản lý</span>
          </div>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            👑 Quản lý đồng thời {departments.length} phòng ban
          </p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-orange-600">
            Cán bộ thực hiện (Staff)
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-orange-600">
              {allFieldStaff.length}
            </span>
            <span className="text-xs font-semibold text-gray-500">nhân sự</span>
          </div>
          <p className="text-[11px] text-gray-400 mt-1">1 Staff chuyên trách / phòng ban</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-xs">
          <p className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
            Trạng thái hoạt động
          </p>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-extrabold text-emerald-600">
              100%
            </span>
            <span className="text-xs font-semibold text-emerald-600">ACTIVE</span>
          </div>
          <p className="text-[11px] text-emerald-600 mt-1">Sẵn sàng nhận lệnh điều phối</p>
        </div>
      </div>

      {/* Thanh Tìm kiếm & Lọc */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3 shadow-xs">
        {/* Ô tìm kiếm */}
        <div className="relative flex-1 w-full">
          <svg
            className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên cán bộ, email (staff1.qldt@cityfix.vn), số điện thoại, userId..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 outline-none focus:border-orange-500 focus:bg-white transition-all"
          />
          {search && (
            <button
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>

        {/* Lọc phòng ban */}
        <div className="w-full md:w-64">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer"
          >
            <option value="all">Tất cả phòng ban ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc chức vụ nếu đang ở chế độ xem tất cả */}
        {viewMode === 'all-staff' && (
          <div className="w-full md:w-52">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full py-2.5 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-800 outline-none focus:border-orange-500 focus:bg-white transition-all cursor-pointer"
            >
              <option value="all">Tất cả vai trò ({allStaff.length})</option>
              <option value="STAFF">Cán bộ thực hiện (Staff)</option>
              <option value="MANAGER">Cán bộ Quản lý (Manager)</option>
            </select>
          </div>
        )}
      </div>

      {/* NỘI DUNG CHÍNH */}
      {loading ? (
        <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl">
          <div className="w-8 h-8 border-3 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-gray-500">
            Đang tải dữ liệu phòng ban và cán bộ...
          </p>
        </div>
      ) : viewMode === 'by-dept' ? (
        /* CHẾ ĐỘ 1: THEO PHÒNG BAN (MÔ HÌNH 1 MANAGER + 1 STAFF) */
        <div className="space-y-6">
          {filteredDepartments.length === 0 ? (
            <div className="py-16 text-center bg-white border border-dashed border-gray-300 rounded-2xl">
              <p className="text-sm font-bold text-gray-700">Không tìm thấy phòng ban phù hợp</p>
              <p className="text-xs text-gray-400 mt-1">Hãy thử đổi từ khóa tìm kiếm</p>
            </div>
          ) : (
            filteredDepartments.map((dept) => {
              const users = dept.users || [];
              // Tách rõ ràng 1 Manager và 1 Staff cho phòng ban
              const manager = users.find((u) => u.role === 'MANAGER') || defaultManagerUser;
              const staffMembers = users.filter((u) => u.role !== 'MANAGER');
              const isRefreshing = refreshingDeptId === dept.departmentId;

              return (
                <div
                  key={dept.departmentId}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs hover:border-gray-300 transition-all"
                >
                  {/* Department Card Header */}
                  <div className="p-4 sm:p-5 bg-gradient-to-r from-gray-50 via-white to-gray-50/50 border-b border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                        <h3 className="text-base font-extrabold text-gray-900 tracking-tight">
                          {dept.name}
                        </h3>
                        <span
                          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-md uppercase tracking-wider ${
                            dept.level === 'CITY'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {dept.level === 'CITY' ? 'Cấp Thành phố' : 'Cấp Quận/Phường'}
                        </span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200">
                          1 Manager · 1 Staff
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
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
                        <span className="font-mono text-[11px] text-gray-400">
                          ID: {dept.departmentId}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => refreshDepartmentUsers(dept.departmentId)}
                        disabled={isRefreshing}
                        title="Tải lại danh sách nhân sự phòng ban từ GET /api/v1/departments/{id}/users"
                        className="px-3 py-1.5 rounded-xl border border-gray-300 bg-white hover:bg-gray-50 text-[11px] font-bold text-gray-700 flex items-center gap-1.5 transition-all cursor-pointer active:scale-95 shadow-2xs"
                      >
                        <svg
                          className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0118.8-4.3M22 12.5a10 10 0 01-18.8 4.2" />
                        </svg>
                        Làm mới
                      </button>
                    </div>
                  </div>

                  {/* Body: 2 Khối Cơ cấu Chuẩn (1 Manager + 1 Staff) */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* VỊ TRÍ 1: CÁN BỘ QUẢN LÝ (MANAGER) */}
                      <div className="bg-purple-50/40 border border-purple-200/90 rounded-2xl p-4 flex flex-col justify-between hover:border-purple-300 transition-all shadow-2xs">
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
                              {manager.fullName.charAt(0)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm font-extrabold text-gray-900 truncate">
                                {manager.fullName}
                              </p>
                              <p className="text-[11px] text-purple-700 font-medium truncate mt-0.5">
                                {manager.email}
                              </p>
                              <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Điện thoại:</span>
                                  <span className="font-semibold text-gray-800">{manager.phoneNumber || '0901 234 567'}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-gray-400">Phạm vi quản trị:</span>
                                  <span className="font-bold text-purple-800 bg-purple-100/70 px-1.5 py-0.2 rounded">
                                    Quản lý {departments.length} phòng ban
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 pt-3 border-t border-purple-100 flex items-center justify-between">
                          <span className="text-[11px] text-purple-600 font-medium">
                            Giám sát & Phê duyệt điều phối
                          </span>
                          <button
                            type="button"
                            onClick={() => setSelectedUser(manager)}
                            className="text-xs font-bold text-purple-700 hover:text-purple-900 cursor-pointer"
                          >
                            Xem hồ sơ Quản lý →
                          </button>
                        </div>
                      </div>

                      {/* VỊ TRÍ 2: CÁN BỘ THỰC HIỆN (STAFF) */}
                      {staffMembers.length === 0 ? (
                        <div className="bg-gray-50 border border-dashed border-gray-300 rounded-2xl p-6 text-center text-gray-400 text-xs flex flex-col items-center justify-center">
                          <p className="font-bold text-gray-600">Chưa có Cán bộ thực hiện (Staff)</p>
                          <p className="text-[11px] text-gray-400 mt-1">Phòng ban này hiện chưa được gán cán bộ tiếp nhận trực tiếp.</p>
                        </div>
                      ) : (
                        staffMembers.slice(0, 1).map((staff) => {
                          const isCopied = copiedKey === staff.userId;
                          return (
                            <div
                              key={staff.userId || staff.email}
                              className="bg-orange-50/40 border border-orange-200/90 rounded-2xl p-4 flex flex-col justify-between hover:border-orange-300 transition-all shadow-2xs"
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
                                    {staff.fullName.charAt(0)}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-extrabold text-gray-900 truncate">
                                      {staff.fullName}
                                    </p>
                                    <p className="text-[11px] text-orange-700 font-medium truncate mt-0.5">
                                      {staff.email}
                                    </p>
                                    <div className="mt-2 space-y-1 text-[11px] text-gray-600">
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Điện thoại:</span>
                                        <span className="font-semibold text-gray-800">{staff.phoneNumber || '—'}</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-400">User ID (assigneeId):</span>
                                        <span className="font-mono text-[10px] text-orange-700 font-bold truncate max-w-[150px]">
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
                                  Chi tiết cán bộ
                                </button>

                                {staff.userId && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(staff.userId!, staff.userId!)}
                                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold border transition-all cursor-pointer flex items-center gap-1 shadow-2xs active:scale-95 ${
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
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-[11px] font-extrabold uppercase tracking-wider text-gray-500">
                  <th className="py-3.5 px-4">Nhân sự</th>
                  <th className="py-3.5 px-4">Vai trò cơ cấu</th>
                  <th className="py-3.5 px-4">Phòng ban phụ trách</th>
                  <th className="py-3.5 px-4">Email</th>
                  <th className="py-3.5 px-4">Điện thoại</th>
                  <th className="py-3.5 px-4">User ID (assigneeId)</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs">
                {filteredStaffList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-gray-400">
                      Không tìm thấy nhân sự nào phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredStaffList.map((st, idx) => {
                    const isCopied = copiedKey === st.userId;
                    const isManager = st.role === 'MANAGER';
                    return (
                      <tr
                        key={`${st.userId || st.email}-${st.departmentId || idx}`}
                        className="hover:bg-orange-50/30 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-lg font-extrabold text-xs flex items-center justify-center flex-shrink-0 text-white shadow-xs ${
                                isManager ? 'bg-purple-700' : 'bg-orange-600'
                              }`}
                            >
                              {st.fullName.charAt(0)}
                            </div>
                            <div>
                              <p className="font-extrabold text-gray-900">{st.fullName}</p>
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
                          <span className="font-semibold text-gray-800">
                            {st.departmentName || '—'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-700">{st.email}</td>
                        <td className="py-3 px-4 text-gray-600 font-mono text-[11px]">
                          {st.phoneNumber || '—'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-gray-500">
                          {st.userId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[120px]">{st.userId}</span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(st.userId!, st.userId!)}
                                className="text-gray-400 hover:text-orange-600 text-xs cursor-pointer"
                                title="Sao chép User ID"
                              >
                                📋
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
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-gray-100 text-gray-600'
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

      {/* MODAL CHI TIẾT CÁN BỘ / QUẢN LÝ */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white border border-gray-200 rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl text-white font-extrabold text-base flex items-center justify-center shadow-sm ${
                    selectedUser.role === 'MANAGER' ? 'bg-purple-700' : 'bg-orange-600'
                  }`}
                >
                  {selectedUser.fullName.charAt(0)}
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-gray-900">
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
                className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-3 bg-gray-50 rounded-xl space-y-1.5 border border-gray-200">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Email công vụ:</span>
                  <span className="font-bold text-gray-900">{selectedUser.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Số điện thoại:</span>
                  <span className="font-semibold text-gray-800">{selectedUser.phoneNumber || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Phòng ban:</span>
                  <span className="font-semibold text-gray-800">{selectedUser.departmentName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Trạng thái:</span>
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
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs cursor-pointer"
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

// Dữ liệu mẫu dự phòng chuẩn hóa: 1 Manager quản lý 3 phòng ban, mỗi phòng ban có 1 Staff
function getFallbackDepartments(managerUser: DepartmentStaffUser): ManagerDepartment[] {
  return [
    {
      departmentId: 'D002',
      name: 'Phòng Quản lý Đô thị',
      level: 'CITY',
      contactEmail: 'qldt@cityfix.vn',
      phoneNumber: '028.3829.1234',
      officerCount: 2,
      isActive: true,
      users: [
        {
          ...managerUser,
          departmentId: 'D002',
          departmentName: 'Phòng Quản lý Đô thị',
        },
        {
          userId: 'b1a2c3d4-e5f6-7890-abcd-ef1234567890',
          email: 'staff1.qldt@cityfix.vn',
          fullName: 'Nguyễn Văn Minh (Cán bộ Khảo sát & Thi công)',
          phoneNumber: '0901234567',
          role: 'STAFF',
          status: 'ACTIVE',
          departmentId: 'D002',
          departmentName: 'Phòng Quản lý Đô thị',
        },
      ],
    },
    {
      departmentId: 'D003',
      name: 'Công ty Cấp thoát nước Sài Gòn',
      level: 'CITY',
      contactEmail: 'sawaco@cityfix.vn',
      phoneNumber: '028.3829.5678',
      officerCount: 2,
      isActive: true,
      users: [
        {
          ...managerUser,
          departmentId: 'D003',
          departmentName: 'Công ty Cấp thoát nước Sài Gòn',
        },
        {
          userId: 'd3c4e5f6-a7b8-9012-cdef-ab3456789012',
          email: 'staff.water@cityfix.vn',
          fullName: 'Lê Hoàng Nam (Cán bộ Cấp thoát nước)',
          phoneNumber: '0912345678',
          role: 'STAFF',
          status: 'ACTIVE',
          departmentId: 'D003',
          departmentName: 'Công ty Cấp thoát nước Sài Gòn',
        },
      ],
    },
    {
      departmentId: 'D004',
      name: 'Tổng công ty Điện lực TP.HCM',
      level: 'CITY',
      contactEmail: 'evn@cityfix.vn',
      phoneNumber: '1900.545454',
      officerCount: 2,
      isActive: true,
      users: [
        {
          ...managerUser,
          departmentId: 'D004',
          departmentName: 'Tổng công ty Điện lực TP.HCM',
        },
        {
          userId: 'e4d5f6a7-b8c9-0123-defa-bc4567890123',
          email: 'staff.evn@cityfix.vn',
          fullName: 'Phạm Đức Dũng (Kỹ sư Điện lực)',
          phoneNumber: '0987654321',
          role: 'STAFF',
          status: 'ACTIVE',
          departmentId: 'D004',
          departmentName: 'Tổng công ty Điện lực TP.HCM',
        },
      ],
    },
  ];
}
