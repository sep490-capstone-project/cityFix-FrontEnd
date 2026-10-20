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
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Resolve current staff user — fallback to U010 (Trần Minh Quân) for demo
  const initialUser = getUser(userId) ?? USERS.find(u => u.role === 'STAFF') ?? USERS[2];
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
    if (typeof ticketOrId === 'object' && ticketOrId !== null) {
      setSelectedTicketData(ticketOrId);
      setSelectedId(ticketOrId.id || ticketOrId.ticketId);
    } else {
      setSelectedId(ticketOrId);
      setSelectedTicketData(null);
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

  const NAV = [
    { key: 'dashboard', label: 'Dashboard',     icon: <GridIcon /> },
    { key: 'tickets',   label: 'Hồ sơ của tôi', icon: <TicketIcon /> },
    { key: 'profile',   label: 'Hồ sơ cá nhân', icon: <UserIcon /> },
  ] as const;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden font-sans">
      {/* Sidebar Enterprise */}
      <aside className="w-56 h-screen bg-white border-r border-slate-200 flex flex-col flex-shrink-0">
        {/* Logo */}
        <div className="relative px-4 py-3 border-b border-gray-200">
          <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />
          <div className="flex items-center">
            <img src={cityfixLogo} alt="CityFix" className="h-16 w-28 object-contain object-left" />
            <p className="text-[9px] text-orange-500/70 uppercase tracking-widest ml-1">Staff Portal</p>
          </div>
        </div>

        {/* User badge */}
        <div className="px-3 py-2.5 border-b border-slate-200">
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-2.5 py-2 flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-orange-50 border border-orange-200 flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 truncate">{currentUser.fullName}</p>
              <p className="text-[11px] text-slate-500 font-medium truncate">Nhân viên xử lý</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-1">
          {NAV.map((item) => {
            const active = page === item.key || (page === 'ticket-detail' && item.key === 'tickets');
            return (
              <button
                key={item.key}
                onClick={() => setPage(item.key as StaffPage)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-orange-50 text-orange-600 font-semibold border-l-2 border-orange-500 rounded-l-none'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`}
              >
                <span className={`flex-shrink-0 ${active ? 'text-orange-500' : 'text-slate-400'}`}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Dept info */}
        <div className="mx-3 mb-2 bg-slate-50 border border-slate-200/80 rounded-lg p-2.5">
          <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
            Cơ quan phụ trách
          </p>
          <p className="text-xs text-slate-700 font-medium line-clamp-2">
            {departmentName ||
              (currentUser.departmentId
                ? (DEPARTMENTS.find((d) => d.departmentId === currentUser.departmentId)?.name ?? 'Đang tải...')
                : 'Chưa phân công')}
          </p>
        </div>

        {/* Logout */}
        <div className="px-3 pb-3 border-t border-slate-200 pt-2.5">
          <button
            onClick={onLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer"
          >
            <LogoutIcon />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header trên cùng */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1">
            <h1 className="text-base sm:text-lg font-bold text-slate-900 uppercase tracking-tight">
              {page === 'dashboard' ? 'DASHBOARD' :
               page === 'tickets' || page === 'ticket-detail' ? 'HỒ SƠ CỦA TÔI' : 'HỒ SƠ CÁ NHÂN'}
            </h1>
          </div>
          <p className="font-mono-cf text-xs text-slate-400 tracking-wider">10/09/2026</p>
          <div className="w-px h-5 bg-slate-200" />
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-xs font-semibold text-slate-700">
              {currentUser.fullName ? currentUser.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <p className="text-xs text-slate-700 font-medium">{currentUser.fullName}</p>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin city-background">
          {page === 'dashboard' && <StaffDashboard currentUser={currentUser} onOpenTicket={openTicket} onViewAll={() => setPage('tickets')} />}
          {page === 'tickets' && <StaffTickets currentUser={currentUser} onOpenTicket={openTicket} />}
          {page === 'ticket-detail' && selectedTicket && (
            <StaffTicketDetail ticket={selectedTicket} currentUser={currentUser} onBack={() => setPage('tickets')} />
          )}
          {page === 'ticket-detail' && !selectedTicket && (
            <div className="flex items-center justify-center h-full">
              <p className="text-slate-400 text-sm">Không tìm thấy hồ sơ</p>
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

function GridIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function TicketIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>; }
function UserIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
