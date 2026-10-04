import { useState } from 'react';
import { USERS, TICKETS, DEPARTMENTS, getUser } from '../data';
import StaffDashboard from './StaffDashboard';
import StaffTickets from './StaffTickets';
import StaffTicketDetail from './StaffTicketDetail';
import StaffProfile from './StaffProfile';
import cityfixLogo from '../assets/cityfix-logo.png';

type StaffPage = 'dashboard' | 'tickets' | 'ticket-detail' | 'profile';

interface Props {
  userId: string;
  onLogout: () => void;
}

export default function StaffApp({ userId, onLogout }: Props) {
  const [page, setPage] = useState<StaffPage>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Resolve current staff user — fallback to U010 (Trần Minh Quân) for demo
  const currentUser = getUser(userId) ?? USERS.find(u => u.role === 'STAFF') ?? USERS[2];
  const selectedTicket = TICKETS.find(t => t.ticketId === selectedId);

  function openTicket(id: string) {
    setSelectedId(id);
    setPage('ticket-detail');
  }

  const NAV = [
    { key: 'dashboard', label: 'Dashboard',    icon: <GridIcon /> },
    { key: 'tickets',   label: 'Hồ sơ của tôi',   icon: <TicketIcon /> },
    { key: 'profile',   label: 'Hồ sơ',        icon: <UserIcon /> },
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
            <p className="text-[9px] text-orange-500/70 uppercase tracking-widest ml-1">Staff Portal</p>
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
              <button key={item.key} onClick={() => setPage(item.key as StaffPage)}
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
          <p className="text-[11px] text-gray-600 leading-tight">
            {currentUser.departmentId
              ? (DEPARTMENTS.find(d => d.departmentId === currentUser.departmentId)?.name ?? currentUser.departmentId)
              : 'Chưa phân công'}
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
               page === 'tickets' || page === 'ticket-detail' ? 'Hồ sơ của tôi' : 'Hồ sơ cá nhân'}
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
          {page === 'dashboard' && <StaffDashboard currentUser={currentUser} onOpenTicket={openTicket} onViewAll={() => setPage('tickets')} />}
          {page === 'tickets' && <StaffTickets currentUser={currentUser} onOpenTicket={openTicket} />}
          {page === 'ticket-detail' && selectedTicket && (
            <StaffTicketDetail ticket={selectedTicket} currentUser={currentUser} onBack={() => setPage('tickets')} />
          )}
          {page === 'ticket-detail' && !selectedTicket && (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-400">Không tìm thấy hồ sơ</p>
            </div>
          )}
          {page === 'profile' && <StaffProfile currentUser={currentUser} />}
        </main>
      </div>
    </div>
  );
}

function GridIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function TicketIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>; }
function UserIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>; }
function LogoutIcon() { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
