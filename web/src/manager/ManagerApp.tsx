import { useState, useEffect } from 'react';
import { USERS, TICKETS, DEPARTMENTS, getUser, User } from '../data';
import ManagerDashboard from './ManagerDashboard';
import ManagerTickets from './ManagerTickets';
import ManagerTicketDetail from './ManagerTicketDetail';
import ManagerDispatch from './ManagerDispatch';
import ManagerStaff from './ManagerStaff';
import ManagerProfile from './ManagerProfile';
import cityfixLogo from '../assets/cityfix-logo.png';
import { getProfile, getDepartments, getDepartmentById, DepartmentItem, UserProfile } from '../services';
import { NotificationBell } from '../components';

type ManagerPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'dispatch' | 'staff' | 'profile';

interface Props {
  userId: string;
  onLogout: () => void;
}

export default function ManagerApp({ userId, onLogout }: Props) {
  const [page, setPage] = useState<ManagerPage>('dashboard');
  const [previousPage, setPreviousPage] = useState<ManagerPage>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Khởi tạo user cho MANAGER, ưu tiên thông tin thực tế từ backend
  const initialUser: User = getUser(userId) ?? {
    userId: userId || 'MANAGER',
    fullName: 'Cán bộ Quản lý',
    email: '',
    phoneNumber: '',
    province: '',
    ward: '',
    address: '',
    role: 'MANAGER',
    status: 'ACTIVE',
    createdAt: '',
    updatedAt: '',
  };
  const [currentUser, setCurrentUser] = useState<User>(initialUser);
  const [departmentName, setDepartmentName] = useState<string>('');

  useEffect(() => {
    let mounted = true;

    async function fetchUserData() {
      try {
        const [profileRes, deptListRes] = await Promise.allSettled([
          getProfile(),
          getDepartments(),
        ]);

        let currentDeptId = currentUser.departmentId;

        if (profileRes.status === 'fulfilled' && profileRes.value && mounted) {
          const p = profileRes.value;
          currentDeptId = p.departmentId || currentDeptId;
          setCurrentUser((prev) => ({
            ...prev,
            userId: p.userId || prev.userId,
            fullName: p.fullName || prev.fullName,
            phoneNumber: p.phoneNumber || prev.phoneNumber,
            address: p.address || prev.address,
            province: p.province || prev.province,
            ward: p.ward || prev.ward,
            departmentId: p.departmentId || prev.departmentId,
            email: p.email || prev.email,
            role: 'MANAGER',
          }));
        }

        if (currentDeptId) {
          let foundName = '';
          if (deptListRes.status === 'fulfilled' && deptListRes.value) {
            const list: DepartmentItem[] = Array.isArray(deptListRes.value)
              ? deptListRes.value
              : (deptListRes.value as any).content || [];
            const d = list.find((item) => item.departmentId === currentDeptId);
            if (d?.name) foundName = d.name;
          }

          if (!foundName) {
            const mockD = DEPARTMENTS.find((d) => d.departmentId === currentDeptId);
            if (mockD?.name) foundName = mockD.name;
          }

          if (!foundName && currentDeptId.length > 5) {
            try {
              const dDetail = await getDepartmentById(currentDeptId);
              if (dDetail?.name) foundName = dDetail.name;
            } catch (e) {
              console.warn('Không thể lấy chi tiết cơ quan:', e);
            }
          }

          if (mounted && foundName) {
            setDepartmentName(foundName);
          }
        }
      } catch (err) {
        console.warn('Lỗi khi tải thông tin ManagerApp:', err);
      }
    }

    fetchUserData();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const [selectedTicketData, setSelectedTicketData] = useState<any>(null);

  function openTicket(ticketOrId: any) {
    setPreviousPage(page === 'ticket-detail' ? previousPage : page);
    if (typeof ticketOrId === 'object' && ticketOrId !== null) {
      setSelectedId(ticketOrId.id || ticketOrId.ticketId || '');
      setSelectedTicketData(ticketOrId);
    } else {
      setSelectedId(ticketOrId);
      const found = TICKETS.find(t => t.ticketId === ticketOrId);
      setSelectedTicketData(found || null);
    }
    setPage('ticket-detail');
  }

  function handleProfileUpdated(updated: UserProfile) {
    setCurrentUser((prev) => ({
      ...prev,
      fullName: updated.fullName || prev.fullName,
      phoneNumber: updated.phoneNumber || prev.phoneNumber,
      address: updated.address || prev.address,
      province: updated.province || prev.province,
      ward: updated.ward || prev.ward,
      departmentId: updated.departmentId || prev.departmentId,
    }));
  }

  const resolvedDeptLabel =
    departmentName ||
    (currentUser.departmentId
      ? DEPARTMENTS.find((d) => d.departmentId === currentUser.departmentId)?.name ?? 'Đang tải...'
      : 'Cơ quan Quản lý');

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: <GridIcon /> },
    { key: 'tickets', label: 'Quản lý Hồ sơ', icon: <TicketIcon /> },
    { key: 'dispatch', label: 'Điều phối & Duyệt vé', icon: <DispatchIcon /> },
    { key: 'staff', label: 'Cán bộ & Phòng ban', icon: <StaffIcon /> },
    { key: 'profile', label: 'Hồ sơ cá nhân', icon: <UserIcon /> },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-60 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="relative px-4 py-3 border-b border-gray-100">
          <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />
          <div className="flex items-center gap-2">
            <img src={cityfixLogo} alt="CityFix" className="h-12 w-24 object-contain object-left" />
            <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold uppercase tracking-wider">
              Manager
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto scrollbar-hide">
          {NAV.map(item => {
            const active = page === item.key || (page === 'ticket-detail' && item.key === 'tickets');
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key as ManagerPage)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                  active
                    ? 'bg-orange-50 border border-orange-200 text-orange-600 font-bold'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent font-medium'
                }`}
              >
                <span className={`flex-shrink-0 ${active ? 'text-orange-600' : 'text-gray-400'}`}>
                  {item.icon}
                </span>
                <span className="text-[13px] flex-1">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Dept info */}
        <div className="mx-3 mb-2.5 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">
            Cơ quan phụ trách
          </p>
          <p className="text-xs text-gray-800 font-semibold leading-snug line-clamp-2">
            {resolvedDeptLabel}
          </p>
        </div>

        {/* User Footer */}
        <div className="px-3 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'M'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 truncate">{currentUser.fullName}</p>
              <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                Quản lý cơ quan
              </p>
            </div>
            <button
              onClick={onLogout}
              title="Đăng xuất"
              className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
            >
              <LogoutIcon />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-extrabold text-gray-900 tracking-tight truncate">
              {page === 'dashboard' ? 'Tổng quan Đơn vị' :
               page === 'tickets' || page === 'ticket-detail' ? 'Quản lý Hồ sơ Tiếp nhận' :
               page === 'dispatch' ? 'Điều phối & Duyệt vé' :
               page === 'staff' ? 'Cán bộ & Phòng ban' : 'Hồ sơ cá nhân'}
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hidden md:inline-block truncate max-w-[260px]">
            {resolvedDeptLabel}
          </span>
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
          <NotificationBell onOpenTicket={(ticketId) => openTicket(ticketId)} />
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
          <p className="font-mono-cf text-xs text-gray-500">
            {new Date().toLocaleDateString('vi-VN')}
          </p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin workspace-bg">
          {page === 'dashboard' && <ManagerDashboard currentUser={currentUser} onOpenTicket={openTicket} onViewAll={() => setPage('tickets')} />}
          {page === 'tickets' && <ManagerTickets currentUser={currentUser} onOpenTicket={openTicket} />}
          {page === 'dispatch' && <ManagerDispatch onOpenTicket={openTicket} />}
          {page === 'staff' && <ManagerStaff currentUser={currentUser} />}
          {page === 'ticket-detail' && (
            <ManagerTicketDetail
              ticketId={selectedId || ''}
              ticket={selectedTicketData}
              currentUser={currentUser}
              onBack={() => setPage(previousPage || 'dashboard')}
            />
          )}
          {page === 'profile' && (
            <ManagerProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} />
          )}
        </main>
      </div>
    </div>
  );
}

function GridIcon()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function TicketIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>; }
function DispatchIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>; }
function StaffIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function UserIcon()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function LogoutIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
