import { useState, useEffect } from 'react';
import { USERS, TICKETS, DEPARTMENTS, getUser, User } from '../data';
import StaffDashboard from './StaffDashboard';
import StaffTickets from './StaffTickets';
import StaffTicketDetail from './StaffTicketDetail';
import StaffProfile from './StaffProfile';
import cityfixLogo from '../assets/cityfix-logo.png';
import { getProfile, getDepartments, getDepartmentById, DepartmentItem, UserProfile } from '../services';

type StaffPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'profile';

interface Props {
  userId: string;
  onLogout: () => void;
}

export default function StaffApp({ userId, onLogout }: Props) {
  const [page, setPage] = useState<StaffPage>('dashboard');
  const [previousStaffPage, setPreviousStaffPage] = useState<StaffPage>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const initialUser: User = getUser(userId) ?? {
    userId: userId || 'STAFF',
    fullName: 'Cán bộ Kỹ thuật',
    email: '',
    phoneNumber: '',
    province: '',
    ward: '',
    address: '',
    role: 'STAFF',
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

        let currentDeptId = currentUser?.departmentId;

        if (profileRes.status === 'fulfilled' && profileRes.value && mounted) {
          const p = profileRes.value;
          currentDeptId = p.departmentId || currentDeptId;
          setCurrentUser((prev) => ({
            ...prev,
            fullName: p.fullName || prev.fullName,
            phoneNumber: p.phoneNumber || prev.phoneNumber,
            address: p.address || prev.address,
            province: p.province || prev.province,
            ward: p.ward || prev.ward,
            departmentId: p.departmentId || prev.departmentId,
            email: p.email || prev.email,
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
        console.warn('Lỗi khi tải thông tin StaffApp:', err);
      }
    }

    fetchUserData();

    return () => {
      mounted = false;
    };
  }, [userId]);

  const [selectedTicketData, setSelectedTicketData] = useState<any>(null);
  const selectedTicket = selectedTicketData || TICKETS.find(t => t.ticketId === selectedId);

  function openTicket(ticketOrId: any) {
    setPreviousStaffPage(page === 'ticket-detail' ? previousStaffPage : page);
    if (typeof ticketOrId === 'object' && ticketOrId !== null) {
      setSelectedTicketData(ticketOrId);
      setSelectedId(ticketOrId.id || ticketOrId.ticketId);
    } else {
      setSelectedTicketData(null);
      setSelectedId(ticketOrId);
    }
    setPage('ticket-detail');
  }

  function handleProfileUpdated(updated: UserProfile) {
    setCurrentUser(prev => ({
      ...prev,
      fullName: updated.fullName || prev.fullName,
      phoneNumber: updated.phoneNumber || prev.phoneNumber,
      address: updated.address || prev.address,
      province: updated.province || prev.province,
      ward: updated.ward || prev.ward,
      email: updated.email || prev.email,
    }));
  }

  const resolvedDeptLabel =
    departmentName ||
    (currentUser?.departmentId
      ? DEPARTMENTS.find((d) => d.departmentId === currentUser.departmentId)?.name ?? 'Đang tải...'
      : 'Đơn vị Hiện trường');

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: <GridIcon /> },
    { key: 'tickets', label: 'Hồ sơ tiếp nhận', icon: <TicketIcon /> },
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
              Staff
            </span>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto scrollbar-hide">
          {NAV.map((item) => {
            const active = page === item.key || (page === 'ticket-detail' && item.key === 'tickets');
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key as StaffPage)}
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
              {currentUser?.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-gray-900 truncate">{currentUser?.fullName || 'Cán bộ Kỹ thuật'}</p>
              <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">
                Cán bộ kỹ thuật
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

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header trên cùng */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-extrabold text-gray-900 tracking-tight truncate">
              {page === 'dashboard' ? 'Tổng quan Công việc' :
               page === 'tickets' || page === 'ticket-detail' ? 'Hồ sơ Tiếp nhận & Xử lý' : 'Hồ sơ cá nhân'}
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hidden sm:inline-block truncate max-w-[260px]">
            {resolvedDeptLabel}
          </span>
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
          <p className="font-mono-cf text-xs text-gray-500">
            {new Date().toLocaleDateString('vi-VN')}
          </p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin workspace-bg">
          {page === 'dashboard' && <StaffDashboard currentUser={currentUser} onOpenTicket={openTicket} onViewAll={() => setPage('tickets')} />}
          {page === 'tickets' && <StaffTickets currentUser={currentUser} onOpenTicket={openTicket} />}
          {page === 'ticket-detail' && selectedTicket && (
            <StaffTicketDetail ticket={selectedTicket} currentUser={currentUser} onBack={() => setPage(previousStaffPage || 'dashboard')} />
          )}
          {page === 'ticket-detail' && !selectedTicket && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400 text-sm">Không tìm thấy hồ sơ</p>
            </div>
          )}
          {page === 'profile' && (
            <StaffProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} />
          )}
        </main>
      </div>
    </div>
  );
}

function GridIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function TicketIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>; }
function UserIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
