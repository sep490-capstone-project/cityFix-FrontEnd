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

type ManagerPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'dispatch' | 'staff' | 'profile';

interface Props {
  userId: string;
  onLogout: () => void;
}

export default function ManagerApp({ userId, onLogout }: Props) {
  const [page, setPage] = useState<ManagerPage>('dashboard');
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
          // 1. Thử tìm trong danh sách departments vừa tải
          let foundName = '';
          if (deptListRes.status === 'fulfilled' && deptListRes.value) {
            const list: DepartmentItem[] = Array.isArray(deptListRes.value)
              ? deptListRes.value
              : (deptListRes.value as any).content || [];
            const d = list.find((item) => item.departmentId === currentDeptId);
            if (d?.name) foundName = d.name;
          }

          // 2. Thử tìm trong mock data nếu có
          if (!foundName) {
            const mockD = DEPARTMENTS.find((d) => d.departmentId === currentDeptId);
            if (mockD?.name) foundName = mockD.name;
          }

          // 3. Nếu vẫn chưa có và là UUID từ backend, gọi trực tiếp API chi tiết cơ quan
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

  const selectedTicket = TICKETS.find(t => t.ticketId === selectedId);

  function openTicket(id: string) {
    setSelectedId(id);
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

  const NAV = [
    { key: 'dashboard', label: 'Dashboard', icon: <GridIcon /> },
    { key: 'tickets', label: 'Quản lý Hồ sơ', icon: <TicketIcon /> },
    { key: 'dispatch', label: 'Điều phối & Duyệt vé', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg> },
    { key: 'staff', label: 'Cán bộ phòng ban', icon: <StaffIcon /> },
    { key: 'profile', label: 'Tài khoản', icon: <UserIcon /> }
  ] as const;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-56 h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="relative px-4 py-3 border-b border-gray-200">
          <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />
          <div className="flex items-center">
            <img src={cityfixLogo} alt="CityFix" className="h-16 w-28 object-contain object-left" />
            <p className="text-[9px] text-orange-500/70 uppercase tracking-widest ml-1">Manager Portal</p>
          </div>
        </div>

        {/* Role badge */}
        <div className="px-4 py-2.5 border-b border-gray-200">
          <div className="flex items-center gap-2 bg-orange-500/8 border border-orange-500/15 rounded-xl px-3 py-2">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-gray-800 truncate">{currentUser.fullName}</p>
              <p className="text-[10px] text-orange-400/70 uppercase tracking-wide">Nhân viên xử lý</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5">
          {NAV.map(item => {
            const active = page === item.key || (page === 'ticket-detail' && item.key === 'tickets');
            return (
              <button key={item.key} onClick={() => setPage(item.key as ManagerPage)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.97]
                  ${active
                    ? 'bg-orange-500/12 border border-orange-500/20 text-orange-400'
                    : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-transparent'
                  }`}>
                <span className={`flex-shrink-0 ${active ? 'text-orange-400' : ''}`}>{item.icon}</span>
                <span className="text-[13px] font-semibold">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Dept info */}
        <div className="mx-3 mb-3 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2.5">
          <p className="text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] mb-1">Cơ quan</p>
          <p className="text-[11px] text-gray-700 font-medium leading-snug">
            {departmentName ||
              (currentUser.departmentId
                ? (DEPARTMENTS.find((d) => d.departmentId === currentUser.departmentId)?.name ?? 'Đang tải...')
                : 'Chưa phân công')}
          </p>
        </div>

        {/* Logout */}
        <div className="px-3 pb-4 border-t border-gray-200 pt-3">
          <button onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-transparent transition-all active:scale-[0.97]">
            <LogoutIcon />
            <span className="text-[13px] font-semibold">Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="font-display text-[20px] font-extrabold text-gray-900 uppercase tracking-tight">
              {page === 'dashboard' ? 'Dashboard' :
               page === 'tickets' || page === 'ticket-detail' ? 'Hồ sơ của tôi' :
               page === 'dispatch' ? 'Điều phối & Duyệt vé' :
               page === 'staff' ? 'Cán bộ & Phòng ban' : 'Hồ sơ cá nhân'}
            </h1>
          </div>
          <p className="font-mono-cf text-[11px] text-gray-400 tracking-wider">10/09/2026</p>
          <div className="w-px h-6 bg-gray-100" />
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gray-100 flex items-center justify-center">
              <span className="font-display text-[11px] font-bold text-gray-600">{currentUser.fullName.charAt(0)}</span>
            </div>
            <p className="text-[12px] text-gray-700 font-semibold">{currentUser.fullName}</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin city-background">
          {page === 'dashboard' && <ManagerDashboard currentUser={currentUser} onOpenTicket={openTicket} onViewAll={() => setPage('tickets')} />}
          {page === 'tickets' && <ManagerTickets currentUser={currentUser} onOpenTicket={openTicket} />}
          {page === 'dispatch' && <ManagerDispatch onOpenTicket={openTicket} />}
          {page === 'staff' && <ManagerStaff currentUser={currentUser} />}
          {page === 'ticket-detail' && selectedTicket && (
            <ManagerTicketDetail ticket={selectedTicket} currentUser={currentUser} onBack={() => setPage('tickets')} />
          )}
          {page === 'ticket-detail' && !selectedTicket && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Không tìm thấy hồ sơ</p>
            </div>
          )}
          {page === 'profile' && (
            <ManagerProfile currentUser={currentUser} onProfileUpdated={handleProfileUpdated} />
          )}
        </main>
      </div>
    </div>
  );
}

function GridIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function TicketIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>; }
function StaffIcon()  { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>; }
function UserIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
