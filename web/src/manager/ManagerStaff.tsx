import { useState, useEffect, useMemo } from 'react';
import {
  getManagerDepartments,
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

/* =========================================================================
   SVG ICONS THAY THẾ EMOJI (Chuẩn Modern SaaS Dashboard)
   ========================================================================= */

function BuildingOfficeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 21h16.5M4.5 3h15M5.25 3v18m13.5-18v18M9 6.75h1.5m-1.5 3h1.5m-1.5 3h1.5m3-6H15m-1.5 3H15m-1.5 3H15M9 21v-3.375c0-.621.504-1.125 1.125-1.125h3.75c.621 0 1.125.504 1.125 1.125V21" />
    </svg>
  );
}

function UsersIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function UserShieldIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
    </svg>
  );
}

function UserBadgeIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
    </svg>
  );
}

function ArrowPathIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
    </svg>
  );
}

function MagnifyingGlassIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
    </svg>
  );
}

function ClipboardDocumentIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.666 3.888A2.25 2.25 0 0013.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 01-.75.75H9a.75.75 0 01-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 01-2.25 2.25H6.75A2.25 2.25 0 014.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 011.927-.184" />
    </svg>
  );
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  );
}

function EnvelopeIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
    </svg>
  );
}

function PhoneIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 01-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
    </svg>
  );
}

function XMarkIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  );
}

function ShieldCheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
    </svg>
  );
}

/* =========================================================================
   MAIN COMPONENT: MANAGER STAFF
   ========================================================================= */

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

  // Thông tin Quản lý từ tài khoản đăng nhập thực tế (không dùng mock)
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
        const formatted = data.map((dept: any) => {
          const deptName = dept.departmentName || dept.name || 'Phòng ban';
          const rawStaffs: any[] = Array.isArray(dept.staffs)
            ? dept.staffs
            : Array.isArray(dept.users)
            ? dept.users
            : [];

          // Map danh sách cán bộ thực hiện từ backend (role STAFF)
          const mappedStaffs: DepartmentStaffUser[] = rawStaffs.map((u: any) => ({
            userId: u.userId || u.id || '',
            id: u.userId || u.id || '',
            email: u.email || '—',
            fullName: u.fullName || u.name || 'Cán bộ',
            phoneNumber: u.phoneNumber || u.phone || '—',
            role: 'STAFF',
            status: u.status || 'ACTIVE',
            departmentId: dept.departmentId,
            departmentName: deptName,
            province: u.province,
            ward: u.ward,
            address: u.address,
          }));

          // Danh sách nhân sự của phòng ban:
          // 1. Quản lý phụ trách (tài khoản Manager đang đăng nhập)
          // 2. Các cán bộ STAFF (loại trừ nếu tài khoản trùng với Manager)
          const deptUsers: DepartmentStaffUser[] = [];
          if (loggedInManager) {
            deptUsers.push({
              ...loggedInManager,
              departmentId: dept.departmentId,
              departmentName: deptName,
            });
          }

          mappedStaffs.forEach((st) => {
            const isSameAsManager =
              loggedInManager &&
              ((st.userId && loggedInManager.userId && st.userId === loggedInManager.userId) ||
                (st.email && loggedInManager.email && st.email.toLowerCase() === loggedInManager.email.toLowerCase()));
            if (!isSameAsManager) {
              deptUsers.push(st);
            }
          });

          return {
            ...dept,
            name: deptName,
            departmentName: deptName,
            users: deptUsers,
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

  // Đồng bộ lại danh sách phòng ban và nhân sự trực tiếp từ GET /api/v1/manager/tickets/departments
  async function refreshDepartmentUsers(deptId: string) {
    setRefreshingDeptId(deptId);
    try {
      await loadDepartments();
    } finally {
      setRefreshingDeptId(null);
    }
  }

  useEffect(() => {
    loadDepartments();
  }, [loggedInManager]);

  // Phân loại danh sách cán bộ (loại bỏ trùng lặp theo ID/Email)
  const { allManagers, allFieldStaff, allStaff } = useMemo(() => {
    const managersMap = new Map<string, DepartmentStaffUser>();
    const staffMap = new Map<string, DepartmentStaffUser>();
    const fullMap = new Map<string, DepartmentStaffUser>();

    departments.forEach((dept) => {
      (dept.users || []).forEach((u) => {
        const item: DepartmentStaffUser = {
          ...u,
          departmentId: dept.departmentId,
          departmentName: dept.name,
        };
        const key = u.userId || u.email;
        if (key && !fullMap.has(key)) {
          fullMap.set(key, item);
        }
        if (u.role === 'MANAGER') {
          if (key && !managersMap.has(key)) {
            managersMap.set(key, item);
          }
        } else {
          if (key && !staffMap.has(key)) {
            staffMap.set(key, item);
          }
        }
      });
    });

    return {
      allManagers: Array.from(managersMap.values()),
      allFieldStaff: Array.from(staffMap.values()),
      allStaff: Array.from(fullMap.values()),
    };
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
    setTimeout(() => setCopiedKey(null), 1800);
  }

  return (
    <div className="p-5 sm:p-7 max-w-7xl mx-auto space-y-6">
      
      {/* =========================================================================
          1. HEADER NỘI DUNG TRANG (Modern SaaS Admin Style)
         ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-orange-600 mb-1">
            <span>CityFix Manager</span>
            <span className="text-slate-300">/</span>
            <span className="text-slate-500">Quản lý nhân sự</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Cán bộ & Phòng ban
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Mô hình tổ chức tiếp nhận: Cán bộ Quản lý giám sát và phân công cho Cán bộ hiện trường xử lý.
          </p>
        </div>

        {/* Action Controls: Segmented Switch + Refresh Button */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80">
            <button
              type="button"
              onClick={() => setViewMode('by-dept')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'by-dept'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <BuildingOfficeIcon className="w-4 h-4" />
              <span>Cơ cấu phòng ban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all-staff')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                viewMode === 'all-staff'
                  ? 'bg-white text-orange-600 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UsersIcon className="w-4 h-4" />
              <span>Bảng nhân sự ({allStaff.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadDepartments}
            disabled={loading}
            className="inline-flex items-center gap-2 h-9 px-3.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 shadow-2xs"
            title="Làm mới dữ liệu từ máy chủ"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 text-slate-500 ${loading ? 'animate-spin text-orange-600' : ''}`} />
            <span>Làm mới</span>
          </button>
        </div>
      </div>

      {/* =========================================================================
          ERROR ALERT (Khi API có lỗi)
         ========================================================================= */}
      {error && (
        <div className="p-4 rounded-xl bg-red-50/80 border border-red-200 text-red-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <div>
              <span className="font-semibold">Lỗi đồng bộ dữ liệu:</span> {error}
            </div>
          </div>
          <button
            type="button"
            onClick={loadDepartments}
            className="px-2.5 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-300 rounded-lg text-xs font-semibold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* =========================================================================
          2. THẺ THỐNG KÊ (KPI Cards - 4 chỉ số gọn gàng, đồng bộ)
         ========================================================================= */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Tổng số phòng ban */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Phòng ban quản lý</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <BuildingOfficeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {departments.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">đơn vị</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Các đơn vị phụ trách chuyên môn
          </p>
        </div>

        {/* KPI 2: Quản lý phụ trách */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cán bộ Quản lý</span>
            <div className="w-8 h-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center">
              <UserShieldIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {allManagers.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">quản lý</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Phụ trách xét duyệt & điều phối
          </p>
        </div>

        {/* KPI 3: Cán bộ thực hiện */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cán bộ Thực hiện</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <UserBadgeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {allFieldStaff.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">cán bộ</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Khảo sát & thi công hiện trường
          </p>
        </div>

        {/* KPI 4: Tổng số nhân sự */}
        <div className="bg-white border border-slate-200 rounded-xl p-4.5 shadow-2xs hover:border-slate-300 transition-colors">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Tổng nhân sự</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5 flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-slate-900 tracking-tight">
              {allStaff.length}
            </span>
            <span className="text-xs text-slate-400 font-medium">tài khoản</span>
          </div>
          <p className="text-[11px] text-slate-400 mt-1 truncate">
            Đã đồng bộ từ danh mục phòng ban
          </p>
        </div>
      </div>

      {/* =========================================================================
          3. THANH TÌM KIẾM VÀ BỘ LỌC (Cân đối, đồng nhất kích thước h-10)
         ========================================================================= */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 flex flex-col md:flex-row items-center gap-2.5 shadow-2xs">
        {/* Input Tìm kiếm */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên cán bộ, email, số điện thoại, phòng ban..."
            className="w-full h-10 pl-9 pr-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:bg-white transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Dropdown Lọc Phòng Ban */}
        <div className="w-full md:w-64 flex-shrink-0">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">Tất cả phòng ban ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Dropdown Lọc Vai Trò (khi ở chế độ bảng) */}
        {viewMode === 'all-staff' && (
          <div className="w-full md:w-52 flex-shrink-0">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as any)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-800 outline-none focus:border-orange-500 focus:bg-white transition-colors cursor-pointer"
            >
              <option value="all">Tất cả vai trò ({allStaff.length})</option>
              <option value="STAFF">Cán bộ thực hiện (Staff)</option>
              <option value="MANAGER">Cán bộ Quản lý (Manager)</option>
            </select>
          </div>
        )}
      </div>

      {/* =========================================================================
          4. NỘI DUNG CHÍNH (LOADING / EMPTY / BY-DEPT / ALL-STAFF)
         ========================================================================= */}

      {/* Trạng thái Loading */}
      {loading ? (
        <div className="py-20 text-center bg-white border border-slate-200 rounded-xl shadow-2xs">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-semibold text-slate-700">Đang tải dữ liệu phòng ban và cán bộ...</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Vui lòng đợi máy chủ phản hồi</p>
        </div>
      ) : departments.length === 0 ? (
        /* Trạng thái Danh sách trống */
        <div className="py-16 text-center bg-white border border-slate-200 rounded-xl shadow-2xs space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-xl flex items-center justify-center mx-auto">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-800">Không tìm thấy dữ liệu phòng ban</h3>
            <p className="text-xs text-slate-400 mt-0.5 max-w-sm mx-auto">
              Chưa có phòng ban nào được gán cho tài khoản của bạn trên hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDepartments}
            className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Tải lại dữ liệu
          </button>
        </div>
      ) : viewMode === 'by-dept' ? (
        /* -----------------------------------------------------------------------
           CHẾ ĐỘ 1: CƠ CẤU THEO PHÒNG BAN (Modern Minimalist Cards)
           ----------------------------------------------------------------------- */
        <div className="space-y-4">
          {filteredDepartments.length === 0 ? (
            <div className="py-12 text-center bg-white border border-dashed border-slate-200 rounded-xl">
              <p className="text-xs font-medium text-slate-600">Không tìm thấy phòng ban phù hợp</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Thử đổi từ khóa tìm kiếm hoặc chọn phòng ban khác</p>
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
                  className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs hover:border-slate-300 transition-colors"
                >
                  {/* Card Header */}
                  <div className="px-5 py-3.5 bg-slate-50/60 border-b border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="w-2 h-2 rounded-full bg-orange-500 flex-shrink-0" />
                        <h3 className="text-sm font-bold text-slate-900 tracking-tight">
                          {dept.name}
                        </h3>
                        {dept.level && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {dept.level === 'CITY' ? 'Cấp Thành phố' : dept.level}
                          </span>
                        )}
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {staffMembers.length} cán bộ
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        {dept.contactEmail && (
                          <span className="inline-flex items-center gap-1.5">
                            <EnvelopeIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dept.contactEmail}</span>
                          </span>
                        )}
                        {dept.phoneNumber && (
                          <span className="inline-flex items-center gap-1.5">
                            <PhoneIcon className="w-3.5 h-3.5 text-slate-400" />
                            <span>{dept.phoneNumber}</span>
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-slate-400">
                          Mã: {dept.departmentId}
                        </span>
                      </div>
                    </div>

                    {/* Refresh Dept Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => refreshDepartmentUsers(dept.departmentId)}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[11px] font-medium text-slate-700 cursor-pointer disabled:opacity-50 transition-colors"
                        title="Tải lại danh sách nhân sự của phòng ban"
                      >
                        <ArrowPathIcon className={`w-3.5 h-3.5 text-slate-400 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
                        <span>Đồng bộ</span>
                      </button>
                    </div>
                  </div>

                  {/* Card Content: 2 Columns (Manager & Staff) */}
                  <div className="p-4 sm:p-5">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      
                      {/* VỊ TRÍ 1: CÁN BỘ QUẢN LÝ (MANAGER) */}
                      {manager ? (
                        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between pb-2.5 border-b border-slate-200/70">
                              <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider inline-flex items-center gap-1.5">
                                <UserShieldIcon className="w-3.5 h-3.5 text-orange-600" />
                                <span>Quản lý phụ trách</span>
                              </span>
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-orange-50 text-orange-700 border border-orange-200">
                                MANAGER
                              </span>
                            </div>

                            <div className="flex items-start gap-3 mt-3">
                              <div className="w-9 h-9 rounded-lg bg-slate-800 text-white font-bold text-xs flex items-center justify-center flex-shrink-0">
                                {manager.fullName ? manager.fullName.charAt(0) : 'M'}
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="text-sm font-bold text-slate-900 truncate">
                                  {manager.fullName}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                  {manager.email || '—'}
                                </p>
                                <div className="mt-2 space-y-1 text-xs text-slate-600">
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Điện thoại:</span>
                                    <span className="font-medium text-slate-800">
                                      {manager.phoneNumber || '—'}
                                    </span>
                                  </div>
                                  <div className="flex items-center justify-between">
                                    <span className="text-slate-400">Phạm vi:</span>
                                    <span className="text-slate-700 font-medium text-[11px]">
                                      Giám sát các phòng ban
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3.5 pt-2.5 border-t border-slate-200/70 flex items-center justify-between">
                            <span className="text-[11px] text-slate-400">Phê duyệt & điều phối vé</span>
                            <button
                              type="button"
                              onClick={() => setSelectedUser(manager)}
                              className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
                            >
                              Xem hồ sơ →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                          <p className="font-semibold text-slate-600">Chưa xác định Quản lý</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Tài khoản quản lý chưa được liên kết</p>
                        </div>
                      )}

                      {/* VỊ TRÍ 2: CÁN BỘ THỰC HIỆN (STAFF) */}
                      {staffMembers.length === 0 ? (
                        <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-xl p-5 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
                          <UserBadgeIcon className="w-5 h-5 text-slate-300 mb-1" />
                          <p className="font-semibold text-slate-600">Chưa có Cán bộ thực hiện</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            Phòng ban này hiện chưa có nhân sự trực tiếp
                          </p>
                        </div>
                      ) : (
                        staffMembers.map((staff) => {
                          const isCopied = staff.userId ? copiedKey === staff.userId : false;
                          return (
                            <div
                              key={staff.userId || staff.email}
                              className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between hover:border-slate-300 transition-colors"
                            >
                              <div>
                                <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider inline-flex items-center gap-1.5">
                                    <UserBadgeIcon className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Cán bộ thực hiện</span>
                                  </span>
                                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                                    STAFF
                                  </span>
                                </div>

                                <div className="flex items-start gap-3 mt-3">
                                  <div className="w-9 h-9 rounded-lg bg-orange-600 text-white font-bold text-xs flex items-center justify-center flex-shrink-0 shadow-2xs">
                                    {staff.fullName ? staff.fullName.charAt(0) : 'S'}
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-bold text-slate-900 truncate">
                                      {staff.fullName}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                      {staff.email}
                                    </p>
                                    <div className="mt-2 space-y-1 text-xs text-slate-600">
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Điện thoại:</span>
                                        <span className="font-medium text-slate-800">
                                          {staff.phoneNumber || '—'}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-slate-400">Mã cán bộ:</span>
                                        <span className="font-mono text-[10px] text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200 truncate max-w-[140px]">
                                          {staff.userId || '—'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-3.5 pt-2.5 border-t border-slate-100 flex items-center justify-between">
                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(staff)}
                                  className="text-xs font-semibold text-slate-700 hover:text-orange-600 cursor-pointer"
                                >
                                  Chi tiết hồ sơ →
                                </button>

                                {staff.userId && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(staff.userId!, staff.userId!)}
                                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium border transition-colors cursor-pointer ${
                                      isCopied
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                                    }`}
                                    title="Sao chép User ID để điều phối vé"
                                  >
                                    {isCopied ? (
                                      <>
                                        <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                                        <span>Đã chép</span>
                                      </>
                                    ) : (
                                      <>
                                        <ClipboardDocumentIcon className="w-3.5 h-3.5 text-slate-400" />
                                        <span>Sao chép ID</span>
                                      </>
                                    )}
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
        /* -----------------------------------------------------------------------
           CHẾ ĐỘ 2: BẢNG TOÀN BỘ CÁN BỘ (Clean SaaS Data Table)
           ----------------------------------------------------------------------- */
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3 px-4">Nhân sự</th>
                  <th className="py-3 px-4">Vai trò</th>
                  <th className="py-3 px-4">Phòng ban</th>
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
                        className="hover:bg-slate-50/70 transition-colors"
                      >
                        {/* Nhân sự (Avatar + Name) */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-7 h-7 rounded-md font-bold text-xs flex items-center justify-center flex-shrink-0 text-white ${
                                isManager ? 'bg-slate-800' : 'bg-orange-600'
                              }`}
                            >
                              {st.fullName ? st.fullName.charAt(0) : 'U'}
                            </div>
                            <span className="font-semibold text-slate-900">{st.fullName}</span>
                          </div>
                        </td>

                        {/* Vai trò */}
                        <td className="py-3 px-4">
                          <span
                            className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border ${
                              isManager
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isManager ? 'MANAGER' : 'STAFF'}
                          </span>
                        </td>

                        {/* Phòng ban */}
                        <td className="py-3 px-4 text-slate-700 font-medium">
                          {st.departmentName || '—'}
                        </td>

                        {/* Email */}
                        <td className="py-3 px-4 text-slate-600">{st.email}</td>

                        {/* Số điện thoại */}
                        <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">
                          {st.phoneNumber || '—'}
                        </td>

                        {/* User ID (assigneeId) */}
                        <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                          {st.userId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="truncate max-w-[120px] bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                {st.userId}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(st.userId!, st.userId!)}
                                className={`p-1 rounded cursor-pointer transition-colors ${
                                  isCopied ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 hover:text-slate-700'
                                }`}
                                title="Sao chép User ID"
                              >
                                {isCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            <span>Hoạt động</span>
                          </span>
                        </td>

                        {/* Thao tác */}
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(st)}
                            className="text-xs font-semibold text-orange-600 hover:text-orange-700 cursor-pointer"
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

      {/* =========================================================================
          5. MODAL CHI TIẾT CÁN BỘ (Sleek, Responsive, Scrollable)
         ========================================================================= */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-xl max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div
                  className={`w-11 h-11 rounded-xl text-white font-bold text-sm flex items-center justify-center shadow-xs ${
                    selectedUser.role === 'MANAGER' ? 'bg-slate-800' : 'bg-orange-600'
                  }`}
                >
                  {selectedUser.fullName ? selectedUser.fullName.charAt(0) : 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedUser.fullName}
                  </h3>
                  <span
                    className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded border mt-0.5 ${
                      selectedUser.role === 'MANAGER'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {selectedUser.role === 'MANAGER' ? 'CÁN BỘ QUẢN LÝ' : 'CÁN BỘ THỰC HIỆN'}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Đóng modal"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="space-y-3 text-xs">
              <div className="p-3.5 bg-slate-50 rounded-xl space-y-2.5 border border-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Email công vụ:</span>
                  <span className="font-semibold text-slate-900">{selectedUser.email || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Số điện thoại:</span>
                  <span className="font-semibold text-slate-900">{selectedUser.phoneNumber || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Phòng ban:</span>
                  <span className="font-semibold text-slate-900">{selectedUser.departmentName || '—'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Trạng thái:</span>
                  <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    <span>Đang hoạt động (ACTIVE)</span>
                  </span>
                </div>
              </div>

              {/* Box User ID & Copy */}
              {selectedUser.userId && (
                <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-200/80 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-orange-900">
                      User ID (assigneeId điều phối vé):
                    </span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(selectedUser.userId!, 'modal')}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold border transition-colors cursor-pointer ${
                        copiedKey === 'modal'
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                          : 'bg-white border-orange-300 text-orange-700 hover:bg-orange-50'
                      }`}
                    >
                      {copiedKey === 'modal' ? (
                        <>
                          <CheckIcon className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã sao chép</span>
                        </>
                      ) : (
                        <>
                          <ClipboardDocumentIcon className="w-3.5 h-3.5 text-orange-600" />
                          <span>Sao chép ID</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="font-mono text-xs text-orange-950 font-medium break-all bg-white px-2 py-1.5 rounded border border-orange-200/60">
                    {selectedUser.userId}
                  </p>
                  <p className="text-[10px] text-orange-700/80">
                    Sử dụng mã ID này khi cấu hình các bước trong modal Điều phối & Duyệt vé.
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-semibold text-xs transition-colors cursor-pointer"
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
