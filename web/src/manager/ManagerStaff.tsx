import { useState, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { message } from 'antd';
import {
  getManagerDepartments,
  getManagerTickets,
  ManagerDepartment,
  DepartmentStaffUser,
  ManagerTicketItem,
  ApiError,
} from '../services';
import { downloadCsvFile, downloadExcelReport } from '../utils/exportFile';

interface Props {
  currentUser?: {
    userId?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    departmentId?: string;
  };
}

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

type WorkloadFilter = 'all' | 'available' | 'busy';

export default function ManagerStaff({ currentUser }: Props) {
  const [departments, setDepartments] = useState<ManagerDepartment[]>([]);
  const [tickets, setTickets] = useState<ManagerTicketItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshingDeptId, setRefreshingDeptId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [selectedDeptId, setSelectedDeptId] = useState<string>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'STAFF' | 'MANAGER'>('all');
  const [workloadFilter, setWorkloadFilter] = useState<WorkloadFilter>('all');
  const [viewMode, setViewMode] = useState<'by-dept' | 'all-staff'>('by-dept');
  const [selectedUser, setSelectedUser] = useState<DepartmentStaffUser | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
      departmentName: 'Quản lý Điều phối Đơn vị',
    };
  }, [currentUser]);

  const loadDepartments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deptData, ticketsData] = await Promise.allSettled([
        getManagerDepartments(),
        getManagerTickets({
          departmentId: currentUser?.departmentId || undefined,
          page: 0,
          size: 50,
        }),
      ]);

      if (ticketsData.status === 'fulfilled' && ticketsData.value) {
        setTickets(ticketsData.value.content || []);
      }

      if (deptData.status === 'rejected') {
        throw deptData.reason;
      }

      const data = deptData.value;
      if (data && data.length > 0) {
        const formatted = data.map((dept: any) => {
          const deptName = dept.departmentName || dept.name || 'Phòng ban';
          const rawStaffs: any[] = Array.isArray(dept.staffs)
            ? dept.staffs
            : Array.isArray(dept.users)
            ? dept.users
            : [];

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
      const msg =
        err instanceof ApiError
          ? err.message
          : 'Không thể kết nối đến máy chủ để tải danh sách phòng ban.';
      setError(msg);
      setDepartments([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.departmentId, loggedInManager]);

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
  }, [loadDepartments]);

  // Tính khối lượng công việc của từng cán bộ từ danh sách hồ sơ của đơn vị
  const staffWorkloadMap = useMemo(() => {
    const activeMap: Record<string, number> = {};
    const doneMap: Record<string, number> = {};

    tickets.forEach((t) => {
      const uid = t.assigneeId;
      if (uid) {
        if (t.status === 'COMPLETED' || t.status === 'RESOLVED') {
          doneMap[uid] = (doneMap[uid] || 0) + 1;
        } else if (t.status !== 'REJECTED') {
          activeMap[uid] = (activeMap[uid] || 0) + 1;
        }
      }
      if (Array.isArray(t.steps)) {
        t.steps.forEach((s) => {
          if (s.assigneeId && s.assigneeId !== uid) {
            if (s.status === 'RESOLVED') {
              doneMap[s.assigneeId] = (doneMap[s.assigneeId] || 0) + 1;
            } else {
              activeMap[s.assigneeId] = (activeMap[s.assigneeId] || 0) + 1;
            }
          }
        });
      }
    });

    return { activeMap, doneMap };
  }, [tickets]);

  const getActiveTaskCount = useCallback(
    (userId?: string) => (userId ? staffWorkloadMap.activeMap[userId] || 0 : 0),
    [staffWorkloadMap]
  );

  const getCompletedTaskCount = useCallback(
    (userId?: string) => (userId ? staffWorkloadMap.doneMap[userId] || 0 : 0),
    [staffWorkloadMap]
  );

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

  const availableStaffCount = useMemo(
    () => allFieldStaff.filter((s) => getActiveTaskCount(s.userId) === 0).length,
    [allFieldStaff, getActiveTaskCount]
  );

  const busyStaffCount = useMemo(
    () => allFieldStaff.filter((s) => getActiveTaskCount(s.userId) > 0).length,
    [allFieldStaff, getActiveTaskCount]
  );

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
      const activeTasks = getActiveTaskCount(u.userId);
      if (workloadFilter === 'available' && activeTasks > 0) {
        return false;
      }
      if (workloadFilter === 'busy' && activeTasks === 0) {
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
  }, [allStaff, selectedDeptId, roleFilter, workloadFilter, search, getActiveTaskCount]);

  function copyToClipboard(text: string, key: string) {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    message.success('Đã sao chép Mã nhân sự (User ID)!');
    setTimeout(() => setCopiedKey(null), 1800);
  }

  const handleExportCsv = () => {
    downloadCsvFile(
      'CityFix_Danh_Sach_Can_Bo_Don_Vi',
      [
        'Họ và tên',
        'Vai trò',
        'Phòng ban / Đơn vị',
        'Email công vụ',
        'Số điện thoại',
        'Việc đang xử lý',
        'Việc đã hoàn thành',
        'Trạng thái',
        'Mã nhân sự (User ID)',
      ],
      filteredStaffList.map((u) => [
        u.fullName || 'Cán bộ',
        u.role === 'MANAGER' ? 'MANAGER (Quản lý điều phối)' : 'STAFF (Cán bộ kỹ thuật)',
        u.departmentName || '—',
        u.email || '—',
        u.phoneNumber || '—',
        getActiveTaskCount(u.userId),
        getCompletedTaskCount(u.userId),
        u.status || 'ACTIVE',
        u.userId || '—',
      ])
    );
    message.success(`Đã xuất ${filteredStaffList.length} nhân sự ra file CSV!`);
  };

  const handleExportExcel = () => {
    downloadExcelReport(
      'CityFix_Bao_Cao_Nhan_Su_Don_Vi',
      'BÁO CÁO ĐỘI NGŨ CÁN BỘ & PHÒNG BAN TRỰC THUỘC',
      `Quản lý phụ trách: ${currentUser?.fullName || 'Cán bộ Quản lý'} • Tổng số: ${allStaff.length} nhân sự (${departments.length} đơn vị)`,
      [
        {
          heading: '1. Tổng quan Cơ cấu Nhân sự Đơn vị',
          headers: ['Chỉ tiêu', 'Số lượng', 'Ghi chú'],
          rows: [
            ['Tổng số Phòng ban / Đơn vị phụ trách', departments.length, 'Đơn vị chuyên môn được phân quyền'],
            ['Cán bộ Quản lý (MANAGER)', allManagers.length, 'Phụ trách xét duyệt, phân công & nghiệm thu'],
            ['Cán bộ Kỹ thuật Hiện trường (STAFF)', allFieldStaff.length, 'Trực tiếp xử lý các bước sự cố'],
            ['Cán bộ đang sẵn sàng nhận việc', availableStaffCount, 'Không có việc tồn đọng'],
            ['Cán bộ đang thực hiện nhiệm vụ', busyStaffCount, 'Đang xử lý hồ sơ hiện trường'],
          ],
        },
        {
          heading: '2. Danh sách Chi tiết Cán bộ theo Bộ lọc',
          headers: [
            'Họ và tên',
            'Vai trò',
            'Phòng ban / Đơn vị',
            'Email công vụ',
            'Số điện thoại',
            'Việc đang làm',
            'Việc hoàn thành',
            'Mã nhân sự (User ID)',
          ],
          rows: filteredStaffList.map((u) => [
            u.fullName || 'Cán bộ',
            u.role === 'MANAGER' ? 'MANAGER' : 'STAFF',
            u.departmentName || '—',
            u.email || '—',
            u.phoneNumber || '—',
            getActiveTaskCount(u.userId),
            getCompletedTaskCount(u.userId),
            u.userId || '—',
          ]),
        },
      ]
    );
    message.success('Đã xuất Báo cáo Nhân sự Phòng ban (.xls) thành công!');
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-5 screen-enter">
      {/* =========================================================================
          1. HEADER ĐỒNG BỘ MÀU CHỦ ĐẠO HỆ THỐNG (BRAND ORANGE)
         ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="font-display text-xl lg:text-2xl font-extrabold text-gray-900">
              Cán bộ & Phòng ban Trực thuộc
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-orange-50 text-orange-700 border border-orange-200 inline-flex items-center gap-1.5">
              <BuildingOfficeIcon className="w-3.5 h-3.5 text-orange-600" />
              {departments.length} đơn vị phụ trách
            </span>
          </div>
          <p className="text-[12px] text-gray-500 mt-1">
            Quản lý danh bạ cán bộ kỹ thuật (<strong className="text-gray-700">STAFF</strong>), theo dõi khối lượng công việc thực tế và điều phối nhân sự theo phòng ban
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Chuyển chế độ hiển thị */}
          <div className="inline-flex bg-gray-100 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setViewMode('by-dept')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                viewMode === 'by-dept'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <BuildingOfficeIcon className="w-3.5 h-3.5" />
              <span>Theo phòng ban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all-staff')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                viewMode === 'all-staff'
                  ? 'bg-white text-orange-600 shadow-2xs font-bold'
                  : 'text-gray-500 hover:text-gray-900'
              }`}
            >
              <UsersIcon className="w-3.5 h-3.5" />
              <span>Bảng nhân sự ({allStaff.length})</span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadDepartments}
            disabled={loading}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors disabled:opacity-50 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowPathIcon className={`w-3.5 h-3.5 text-gray-500 ${loading ? 'animate-spin text-orange-500' : ''}`} />
            <span>{loading ? 'Đang tải...' : 'Làm mới'}</span>
          </button>

          <button
            type="button"
            onClick={handleExportCsv}
            className="px-3 py-1.5 text-[12px] font-semibold text-gray-700 bg-white hover:bg-gray-50 border border-gray-200 rounded-xl transition-colors cursor-pointer"
          >
            Xuất CSV
          </button>

          <button
            type="button"
            onClick={handleExportExcel}
            className="px-3.5 py-1.5 text-[12px] font-bold text-white bg-orange-600 hover:bg-orange-700 rounded-xl transition-colors shadow-2xs cursor-pointer"
          >
            Xuất Báo cáo (.xls)
          </button>
        </div>
      </div>

      {/* =========================================================================
          ERROR ALERT (Khi API có lỗi)
         ========================================================================= */}
      {error && (
        <div className="p-4 rounded-2xl bg-red-50/80 border border-red-200 text-red-900 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            <div>
              <span className="font-bold">Lỗi đồng bộ dữ liệu:</span> {error}
            </div>
          </div>
          <button
            type="button"
            onClick={loadDepartments}
            className="px-3 py-1 bg-white hover:bg-red-50 text-red-700 border border-red-200 rounded-xl text-xs font-bold cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      )}

      {/* =========================================================================
          2. 4 THẺ KPI THEO NGỮ CẢNH NGHIỆP VỤ (CONTEXTUAL SEMANTIC COLORS)
         ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Đơn vị phụ trách (Brand Orange) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Phòng Ban Phụ Trách
            </span>
            <div className="w-8 h-8 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center">
              <BuildingOfficeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-gray-900">{departments.length}</span>
            <span className="text-xs text-gray-400">đơn vị</span>
          </div>
          <div className="text-[11px] text-orange-600 font-semibold pt-2 border-t border-gray-100 truncate">
            {allManagers.length} Quản lý điều phối trực tiếp
          </div>
        </div>

        {/* KPI 2: Cán bộ Kỹ thuật STAFF (Technical Blue) */}
        <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Cán Bộ Kỹ Thuật (STAFF)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <UserBadgeIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-blue-600">{allFieldStaff.length}</span>
            <span className="text-xs text-gray-400">kỹ thuật viên</span>
          </div>
          <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 truncate">
            Trực tiếp khảo sát & xử lý hiện trường
          </div>
        </div>

        {/* KPI 3: Sẵn sàng nhận việc (Semantic Emerald) */}
        <div
          onClick={() => {
            setWorkloadFilter(workloadFilter === 'available' ? 'all' : 'available');
          }}
          className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            workloadFilter === 'available'
              ? 'border-emerald-400 ring-2 ring-emerald-500/15'
              : 'border-gray-200 hover:border-emerald-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Sẵn Sàng Nhận Việc
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-emerald-600">{availableStaffCount}</span>
            <span className="text-xs text-gray-400">cán bộ rảnh</span>
          </div>
          <div className="text-[11px] text-emerald-700 font-semibold pt-2 border-t border-gray-100 truncate">
            Có thể phân công xử lý sự cố ngay
          </div>
        </div>

        {/* KPI 4: Đang thực hiện nhiệm vụ (Semantic Amber) */}
        <div
          onClick={() => {
            setWorkloadFilter(workloadFilter === 'busy' ? 'all' : 'busy');
          }}
          className={`bg-white border rounded-2xl p-5 shadow-xs flex flex-col justify-between cursor-pointer transition-all ${
            workloadFilter === 'busy'
              ? 'border-amber-400 ring-2 ring-amber-500/15'
              : 'border-gray-200 hover:border-amber-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">
              Đang Xử Lý Hiện Trường
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <UsersIcon className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2 flex items-baseline gap-1.5">
            <span className="font-display text-3xl font-black text-amber-600">{busyStaffCount}</span>
            <span className="text-xs text-gray-400">cán bộ đang bận</span>
          </div>
          <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 truncate">
            Tổng nhân sự hệ thống: <strong className="text-gray-800">{allStaff.length} tài khoản</strong>
          </div>
        </div>
      </div>

      {/* =========================================================================
          3. THANH TÌM KIẾM & BỘ LỌC NHÂN SỰ
         ========================================================================= */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col md:flex-row items-center gap-3 shadow-xs">
        {/* Tìm kiếm */}
        <div className="relative flex-1 w-full">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
            <MagnifyingGlassIcon className="w-4 h-4" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo họ tên cán bộ, email, số điện thoại, phòng ban hoặc mã ID..."
            className="w-full h-10 pl-9 pr-9 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 placeholder:text-gray-400 outline-none focus:border-orange-500 focus:bg-white transition-colors"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 cursor-pointer"
              title="Xóa tìm kiếm"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Lọc theo Phòng ban */}
        <div className="w-full md:w-60 flex-shrink-0">
          <select
            value={selectedDeptId}
            onChange={(e) => setSelectedDeptId(e.target.value)}
            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-orange-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">Tất cả phòng ban ({departments.length})</option>
            {departments.map((d) => (
              <option key={d.departmentId} value={d.departmentId}>
                {d.name}
              </option>
            ))}
          </select>
        </div>

        {/* Lọc theo Vai trò */}
        <div className="w-full md:w-48 flex-shrink-0">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as any)}
            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-orange-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">Mọi vai trò ({allStaff.length})</option>
            <option value="STAFF">Cán bộ Kỹ thuật ({allFieldStaff.length})</option>
            <option value="MANAGER">Quản lý ({allManagers.length})</option>
          </select>
        </div>

        {/* Lọc theo Tải công việc */}
        <div className="w-full md:w-48 flex-shrink-0">
          <select
            value={workloadFilter}
            onChange={(e) => setWorkloadFilter(e.target.value as WorkloadFilter)}
            className="w-full h-10 px-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold text-gray-700 outline-none focus:border-orange-500 focus:bg-white transition-colors cursor-pointer"
          >
            <option value="all">Mọi trạng thái việc</option>
            <option value="available">Sẵn sàng ({availableStaffCount})</option>
            <option value="busy">Đang có việc ({busyStaffCount})</option>
          </select>
        </div>
      </div>

      {/* =========================================================================
          4. NỘI DUNG CHÍNH
         ========================================================================= */}
      {loading ? (
        <div className="py-20 text-center bg-white border border-gray-200 rounded-2xl shadow-xs">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-gray-700">Đang đồng bộ danh sách phòng ban và cán bộ...</p>
          <p className="text-[11px] text-gray-400 mt-0.5">Vui lòng đợi trong giây lát</p>
        </div>
      ) : departments.length === 0 ? (
        <div className="py-16 text-center bg-white border border-gray-200 rounded-2xl shadow-xs space-y-3">
          <div className="w-12 h-12 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center mx-auto">
            <BuildingOfficeIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-gray-800">Không tìm thấy dữ liệu phòng ban</h3>
            <p className="text-xs text-gray-400 mt-0.5 max-w-sm mx-auto">
              Chưa có phòng ban nào được gán cho tài khoản của bạn trên hệ thống.
            </p>
          </div>
          <button
            type="button"
            onClick={loadDepartments}
            className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Tải lại dữ liệu
          </button>
        </div>
      ) : viewMode === 'by-dept' ? (
        /* -----------------------------------------------------------------------
           CHẾ ĐỘ 1: HIỂN THỊ THEO TỪNG PHÒNG BAN
           ----------------------------------------------------------------------- */
        <div className="space-y-5">
          {filteredDepartments.length === 0 ? (
            <div className="py-12 text-center bg-white border border-dashed border-gray-200 rounded-2xl">
              <p className="text-xs font-semibold text-gray-600">Không tìm thấy phòng ban hoặc nhân sự phù hợp</p>
              <p className="text-[11px] text-gray-400 mt-0.5">Thử đổi từ khóa tìm kiếm hoặc chọn phòng ban khác</p>
            </div>
          ) : (
            filteredDepartments.map((dept) => {
              const users = dept.users || [];
              const manager = users.find((u) => u.role === 'MANAGER') || loggedInManager;
              const rawStaffMembers = users.filter((u) => u.role !== 'MANAGER');

              // Áp dụng bộ lọc vai trò và trạng thái việc bên trong phòng ban
              const staffMembers = rawStaffMembers.filter((st) => {
                if (roleFilter === 'MANAGER') return false;
                const activeCount = getActiveTaskCount(st.userId);
                if (workloadFilter === 'available' && activeCount > 0) return false;
                if (workloadFilter === 'busy' && activeCount === 0) return false;
                if (search.trim()) {
                  const q = search.toLowerCase();
                  const matchSelf =
                    st.fullName?.toLowerCase().includes(q) ||
                    st.email?.toLowerCase().includes(q) ||
                    st.phoneNumber?.includes(q) ||
                    st.userId?.toLowerCase().includes(q);
                  const matchDeptName = dept.name?.toLowerCase().includes(q);
                  return matchSelf || matchDeptName;
                }
                return true;
              });

              const isRefreshing = refreshingDeptId === dept.departmentId;
              const isWardLevel = dept.level === 'WARD' || dept.name?.toLowerCase().includes('phường') || dept.name?.toLowerCase().includes('xã');

              return (
                <div
                  key={dept.departmentId}
                  className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs"
                >
                  {/* Header Phòng ban + Thanh thông tin Quản lý phụ trách gọn gàng */}
                  <div className="px-5 py-4 bg-gray-50/70 border-b border-gray-100 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="w-2.5 h-2.5 rounded-full bg-orange-500 flex-shrink-0" />
                        <h3 className="text-[15px] font-bold text-gray-900">
                          {dept.name}
                        </h3>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                            isWardLevel
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          {isWardLevel ? 'Cấp Xã/Phường' : 'Cấp Thành phố/Tỉnh'}
                        </span>
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
                          {rawStaffMembers.length} Cán bộ Kỹ thuật
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                        {dept.contactEmail && (
                          <span className="inline-flex items-center gap-1.5">
                            <EnvelopeIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{dept.contactEmail}</span>
                          </span>
                        )}
                        {dept.phoneNumber && (
                          <span className="inline-flex items-center gap-1.5">
                            <PhoneIcon className="w-3.5 h-3.5 text-gray-400" />
                            <span>{dept.phoneNumber}</span>
                          </span>
                        )}
                        <span className="font-mono text-[11px] text-gray-400">
                          Mã đơn vị: {dept.departmentId}
                        </span>
                      </div>
                    </div>

                    {/* Khối Quản lý điều phối & Nút Đồng bộ */}
                    <div className="flex flex-wrap items-center gap-3">
                      {manager && (
                        <div
                          onClick={() => setSelectedUser(manager)}
                          className="px-3 py-1.5 rounded-xl bg-white border border-gray-200 hover:border-orange-300 transition-colors cursor-pointer flex items-center gap-2.5 shadow-2xs"
                          title="Bấm để xem thông tin Quản lý phụ trách"
                        >
                          <div className="w-7 h-7 rounded-lg bg-orange-100 text-orange-700 font-bold text-xs flex items-center justify-center">
                            <UserShieldIcon className="w-4 h-4" />
                          </div>
                          <div className="text-[11px]">
                            <p className="text-gray-400 font-medium leading-none">Quản lý điều phối</p>
                            <p className="font-bold text-gray-900 mt-0.5">{manager.fullName}</p>
                          </div>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => refreshDepartmentUsers(dept.departmentId)}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 text-[11px] font-semibold text-gray-700 cursor-pointer disabled:opacity-50 transition-colors"
                      >
                        <ArrowPathIcon className={`w-3.5 h-3.5 text-gray-500 ${isRefreshing ? 'animate-spin text-orange-600' : ''}`} />
                        <span>Đồng bộ</span>
                      </button>
                    </div>
                  </div>

                  {/* Danh sách Cán bộ Kỹ thuật (STAFF) trong phòng ban */}
                  <div className="p-5">
                    {roleFilter === 'MANAGER' && manager ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="bg-orange-50/40 border border-orange-200 rounded-xl p-4 flex flex-col justify-between">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-xl bg-orange-600 text-white font-bold text-sm flex items-center justify-center">
                                {manager.fullName ? manager.fullName.charAt(0).toUpperCase() : 'M'}
                              </div>
                              <div>
                                <p className="text-sm font-bold text-gray-900">{manager.fullName}</p>
                                <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded bg-orange-100 text-orange-800 mt-0.5">
                                  MANAGER • Điều phối
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 pt-3 border-t border-orange-200/60 space-y-1 text-xs text-gray-600">
                            <p>Email: <strong className="text-gray-800">{manager.email || '—'}</strong></p>
                            <p>Điện thoại: <strong className="text-gray-800">{manager.phoneNumber || '—'}</strong></p>
                          </div>
                        </div>
                      </div>
                    ) : staffMembers.length === 0 ? (
                      <div className="py-10 text-center bg-gray-50/60 border border-dashed border-gray-200 rounded-xl">
                        <UserBadgeIcon className="w-6 h-6 text-gray-300 mx-auto mb-1.5" />
                        <p className="text-xs font-semibold text-gray-600">
                          Không có cán bộ kỹ thuật nào khớp với bộ lọc hiện tại
                        </p>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                          Phòng ban này hiện có {rawStaffMembers.length} cán bộ kỹ thuật
                        </p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {staffMembers.map((staff) => {
                          const isCopied = staff.userId ? copiedKey === staff.userId : false;
                          const activeTasks = getActiveTaskCount(staff.userId);
                          const completedTasks = getCompletedTaskCount(staff.userId);

                          return (
                            <div
                              key={staff.userId || staff.email}
                              onClick={() => setSelectedUser(staff)}
                              className="bg-white border border-gray-200 hover:border-orange-300 rounded-xl p-4 flex flex-col justify-between transition-all cursor-pointer group shadow-2xs"
                            >
                              <div>
                                {/* Top row: Avatar, Name, Role & Workload Status */}
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <div className="relative flex-shrink-0">
                                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 font-bold text-xs flex items-center justify-center">
                                        {(staff.fullName || 'CB').slice(0, 2).toUpperCase()}
                                      </div>
                                      <span
                                        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
                                          activeTasks === 0 ? 'bg-emerald-500' : 'bg-blue-500'
                                        }`}
                                      />
                                    </div>
                                    <div className="min-w-0">
                                      <p className="text-[13px] font-bold text-gray-900 group-hover:text-orange-600 transition-colors truncate">
                                        {staff.fullName}
                                      </p>
                                      <span className="inline-block text-[10px] font-bold px-2 py-0.2 rounded bg-blue-50 text-blue-700 border border-blue-200 mt-0.5">
                                        STAFF • Kỹ thuật
                                      </span>
                                    </div>
                                  </div>

                                  <span
                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex-shrink-0 ${
                                      activeTasks > 0
                                        ? 'bg-amber-50 text-amber-700 border-amber-200'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    {activeTasks > 0 ? `${activeTasks} việc đang làm` : 'Sẵn sàng'}
                                  </span>
                                </div>

                                {/* Contact Details */}
                                <div className="mt-3.5 pt-3 border-t border-gray-100 space-y-1.5 text-[12px]">
                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-400 text-[11px] flex items-center gap-1">
                                      <EnvelopeIcon className="w-3.5 h-3.5" />
                                      Email:
                                    </span>
                                    <span className="font-medium text-gray-700 truncate max-w-[180px]">
                                      {staff.email || '—'}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-400 text-[11px] flex items-center gap-1">
                                      <PhoneIcon className="w-3.5 h-3.5" />
                                      Điện thoại:
                                    </span>
                                    <span className="font-mono font-semibold text-gray-800 text-[11px]">
                                      {staff.phoneNumber || '—'}
                                    </span>
                                  </div>

                                  <div className="flex items-center justify-between gap-2">
                                    <span className="text-gray-400 text-[11px]">Đã hoàn thành:</span>
                                    <span className="font-semibold text-emerald-700 text-[11px]">
                                      {completedTasks} nhiệm vụ
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Bottom Action Bar */}
                              <div
                                className="mt-3.5 pt-2.5 border-t border-gray-100 flex items-center justify-between"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <button
                                  type="button"
                                  onClick={() => setSelectedUser(staff)}
                                  className="text-[11px] font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
                                >
                                  Xem hồ sơ →
                                </button>

                                {staff.userId && (
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(staff.userId!, staff.userId!)}
                                    className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                                      isCopied
                                        ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-orange-50 hover:text-orange-700 hover:border-orange-200'
                                    }`}
                                    title={`Mã cán bộ: ${staff.userId}`}
                                  >
                                    {isCopied ? (
                                      <>
                                        <CheckIcon className="w-3 h-3 text-emerald-600" />
                                        <span>Đã chép mã</span>
                                      </>
                                    ) : (
                                      <>
                                        <ClipboardDocumentIcon className="w-3 h-3" />
                                        <span>Chép mã ID</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* -----------------------------------------------------------------------
           CHẾ ĐỘ 2: BẢNG DANH BẠ TOÀN BỘ NHÂN SỰ
           ----------------------------------------------------------------------- */
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50/80 border-b border-gray-100 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                  <th className="py-3.5 px-4">Họ và tên</th>
                  <th className="py-3.5 px-4">Vai trò</th>
                  <th className="py-3.5 px-4">Đơn vị / Phòng ban</th>
                  <th className="py-3.5 px-4">Thông tin liên hệ</th>
                  <th className="py-3.5 px-4">Khối lượng công việc</th>
                  <th className="py-3.5 px-4">Mã nhân sự</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-[12px]">
                {filteredStaffList.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-gray-400">
                      Không tìm thấy nhân sự nào phù hợp với bộ lọc
                    </td>
                  </tr>
                ) : (
                  filteredStaffList.map((st, idx) => {
                    const isCopied = st.userId ? copiedKey === st.userId : false;
                    const isManager = st.role === 'MANAGER';
                    const activeTasks = getActiveTaskCount(st.userId);
                    const completedTasks = getCompletedTaskCount(st.userId);

                    return (
                      <tr
                        key={`${st.userId || st.email}-${st.departmentId || idx}`}
                        onClick={() => setSelectedUser(st)}
                        className="hover:bg-orange-50/40 transition-colors cursor-pointer group"
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div
                              className={`w-8 h-8 rounded-xl font-bold text-xs flex items-center justify-center flex-shrink-0 border ${
                                isManager
                                  ? 'bg-orange-50 text-orange-700 border-orange-200'
                                  : 'bg-blue-50 text-blue-700 border-blue-200'
                              }`}
                            >
                              {(st.fullName || 'CB').slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900 group-hover:text-orange-600 transition-colors">
                                {st.fullName}
                              </p>
                              <p className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                Đang hoạt động
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-block text-[10px] font-bold px-2.5 py-0.5 rounded-lg border ${
                              isManager
                                ? 'bg-orange-50 text-orange-700 border-orange-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {isManager ? 'MANAGER • Điều phối' : 'STAFF • Kỹ thuật'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-gray-700 font-semibold">
                          {st.departmentName || '—'}
                        </td>

                        <td className="py-3.5 px-4">
                          <p className="text-gray-800 font-medium">{st.email || '—'}</p>
                          <p className="text-[11px] text-gray-400 font-mono">{st.phoneNumber || '—'}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          {isManager ? (
                            <span className="text-[11px] text-gray-500">Quản lý & Duyệt hồ sơ</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                                  activeTasks > 0
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}
                              >
                                {activeTasks > 0 ? `${activeTasks} đang làm` : 'Sẵn sàng'}
                              </span>
                              <span className="text-[11px] text-gray-400">
                                ({completedTasks} xong)
                              </span>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 font-mono text-[11px] text-gray-600" onClick={(e) => e.stopPropagation()}>
                          {st.userId ? (
                            <div className="flex items-center gap-1.5">
                              <span className="bg-gray-100 px-2 py-0.5 rounded text-gray-700 font-semibold">
                                #{st.userId.slice(0, 8)}
                              </span>
                              <button
                                type="button"
                                onClick={() => copyToClipboard(st.userId!, st.userId!)}
                                className={`p-1 rounded-lg cursor-pointer transition-colors ${
                                  isCopied
                                    ? 'text-emerald-600 bg-emerald-50'
                                    : 'text-gray-400 hover:text-orange-600 hover:bg-orange-50'
                                }`}
                                title={`Sao chép đầy đủ ID: ${st.userId}`}
                              >
                                {isCopied ? <CheckIcon className="w-3.5 h-3.5" /> : <ClipboardDocumentIcon className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                          ) : (
                            '—'
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedUser(st)}
                            className="text-xs font-bold text-orange-600 hover:text-orange-700 cursor-pointer"
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
        </div>
      )}

      {/* =========================================================================
          5. MODAL HỒ SƠ CHI TIẾT CÁN BỘ (RENDER VIA PORTAL TRÊN VIEWPORT MÀN HÌNH)
         ========================================================================= */}
      {selectedUser &&
        createPortal(
          <div
            onClick={() => setSelectedUser(null)}
            className="fixed inset-0 z-[100] bg-gray-900/45 backdrop-blur-xs flex items-center justify-center p-4"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="bg-white border border-gray-200 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl max-h-[88vh] overflow-y-auto screen-enter"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between pb-3.5 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl font-bold text-sm flex items-center justify-center border ${
                      selectedUser.role === 'MANAGER'
                        ? 'bg-orange-50 text-orange-700 border-orange-200'
                        : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {(selectedUser.fullName || 'CB').slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-gray-900">
                      {selectedUser.fullName}
                    </h3>
                    <span
                      className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded border mt-0.5 ${
                        selectedUser.role === 'MANAGER'
                          ? 'bg-orange-50 text-orange-700 border-orange-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {selectedUser.role === 'MANAGER'
                        ? 'MANAGER • CÁN BỘ QUẢN LÝ'
                        : 'STAFF • CÁN BỘ KỸ THUẬT HIỆN TRƯỜNG'}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                  title="Đóng"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="space-y-3 text-xs">
                {/* Khối thống kê công việc của cán bộ */}
                {selectedUser.role !== 'MANAGER' && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200/80 text-center">
                      <p className="font-display text-xl font-black text-amber-600">
                        {getActiveTaskCount(selectedUser.userId)}
                      </p>
                      <p className="text-[11px] font-semibold text-amber-800 mt-0.5">
                        Nhiệm vụ đang xử lý
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200/80 text-center">
                      <p className="font-display text-xl font-black text-emerald-600">
                        {getCompletedTaskCount(selectedUser.userId)}
                      </p>
                      <p className="text-[11px] font-semibold text-emerald-800 mt-0.5">
                        Nhiệm vụ đã hoàn thành
                      </p>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-gray-50 rounded-xl space-y-2.5 border border-gray-200/80">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Đơn vị công tác:</span>
                    <span className="font-bold text-gray-900">{selectedUser.departmentName || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Email công vụ:</span>
                    <span className="font-semibold text-gray-900">{selectedUser.email || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Số điện thoại:</span>
                    <span className="font-mono font-semibold text-gray-900">{selectedUser.phoneNumber || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Trạng thái tài khoản:</span>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-700">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      <span>Đang hoạt động (ACTIVE)</span>
                    </span>
                  </div>
                </div>

                {selectedUser.userId && (
                  <div className="p-3.5 bg-orange-50/50 rounded-xl border border-orange-200/80 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-orange-900">
                        Mã định danh cán bộ (User ID):
                      </span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(selectedUser.userId!, 'modal')}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors cursor-pointer ${
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
                    <p className="font-mono text-xs text-orange-950 font-medium break-all bg-white px-2.5 py-1.5 rounded-lg border border-orange-200/60">
                      {selectedUser.userId}
                    </p>
                  </div>
                )}
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedUser(null)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-xl font-bold text-xs transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
