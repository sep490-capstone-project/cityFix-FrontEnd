import React, { useState } from 'react';
import { ConfigProvider, App as AntdApp, message } from 'antd';
import { cityFixTheme } from './theme/antdTheme';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import TicketList from './pages/TicketList';
import TicketDetail from './pages/TicketDetail';
import ManualReview from './pages/ManualReview';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import Settings from './pages/Settings';
import StaffApp from './staff/StaffApp';
import { TICKETS } from './data';
import cityfixLogo from './assets/cityfix-logo.png';

type Page = 'dashboard' | 'tickets' | 'ticket-detail' | 'manual-review' | 'analytics' | 'users' | 'settings';
type AuthPage = 'login' | 'register' | 'app';

const NAV: { key: string; label: string; icon: () => React.ReactElement; hasSubmenu?: boolean }[] = [
  { key: 'dashboard',     label: 'Dashboard',          icon: GridIcon     },
  { key: 'tickets',       label: 'Quản lý vé',         icon: TicketIcon   },
  { key: 'manual-review', label: 'Xét duyệt thủ công', icon: ReviewIcon   },
  { key: 'analytics',     label: 'Phân tích',          icon: ChartIcon    },
  { key: 'users',         label: 'Người dùng',         icon: UsersIcon    },
  { key: 'settings',      label: 'Cài đặt',            icon: GearIcon,    hasSubmenu: true },
];

function MainApp() {
  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<'STAFF' | 'ADMIN'>('ADMIN');
  const [userId, setUserId] = useState('U006');
  const [page, setPage] = useState<Page>('dashboard');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  function showToast(msg: string) {
    messageApi.open({
      type: 'info',
      content: msg,
      className: 'cityfix-message',
    });
  }

  function handleLogin(email: string, role: 'STAFF' | 'ADMIN', uid: string) {
    setUserEmail(email);
    setUserRole(role);
    setUserId(uid);
    setAuthPage('app');
    messageApi.success('Đăng nhập thành công');
  }

  function handleRegisterSuccess() {
    setAuthPage('login');
    messageApi.success('Đăng ký thành công! Tài khoản đang chờ xét duyệt.');
  }

  function navigate(p: Page, id?: string) {
    setPage(p);
    if (id) setSelectedId(id);
  }

  if (authPage === 'login') return <>{contextHolder}<Login onLogin={handleLogin} onGoRegister={() => setAuthPage('register')} /></>;
  if (authPage === 'register') return <>{contextHolder}<Register onGoLogin={() => setAuthPage('login')} onRegisterSuccess={handleRegisterSuccess} /></>;
  if (authPage === 'app' && userRole === 'STAFF') return <>{contextHolder}<StaffApp userId={userId} onLogout={() => setAuthPage('login')} /></>;

  const ticket = TICKETS.find(t => t.ticketId === selectedId) ?? TICKETS[0];
  const manualCount = TICKETS.filter(t => t.needsManualReview).length;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {contextHolder}
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-64'} h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-200 shadow-sm`}>
        {/* Logo */}
        <div className="relative px-4 py-3 border-b border-gray-100">
          <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />
          <div className={`flex items-center ${collapsed ? 'justify-center' : ''}`}>
            <img
              src={cityfixLogo}
              alt="CityFix"
              className={collapsed ? 'h-10 w-10 object-contain' : 'h-16 w-28 object-contain object-left'}
            />
            {!collapsed && <p className="text-[9px] text-gray-400 uppercase tracking-widest ml-1">Admin Portal</p>}
          </div>
          <button onClick={() => setCollapsed(c => !c)}
            className="absolute right-2 top-1/2 -translate-y-1/2 mt-1.5 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
            {collapsed ? <ChevRIcon /> : <ChevLIcon />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto scrollbar-hide">
          {NAV.map(item => {
            const isActive = page === item.key || (page === 'ticket-detail' && item.key === 'tickets');
            const Icon = item.icon;
            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (item.hasSubmenu) { setSettingsOpen(o => !o); navigate('settings'); }
                    else navigate(item.key as Page);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all active:scale-[0.97] cursor-pointer
                    ${isActive
                      ? 'bg-orange-50 border border-orange-200 text-orange-600'
                      : 'text-gray-500 hover:bg-gray-100 hover:text-gray-700 border border-transparent'
                    }`}
                >
                  <span className={`flex-shrink-0 ${isActive ? 'text-orange-500' : 'text-gray-400'}`}><Icon /></span>
                  {!collapsed && <span className="text-[13px] font-semibold flex-1">{item.label}</span>}
                  {!collapsed && item.key === 'manual-review' && manualCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-[10px] font-bold text-white flex items-center justify-center flex-shrink-0">{manualCount}</span>
                  )}
                  {!collapsed && item.hasSubmenu && (
                    <span className={`text-gray-400 transition-transform ${settingsOpen ? 'rotate-90' : ''}`}><ChevRIcon /></span>
                  )}
                </button>

                {/* Settings submenu */}
                {item.hasSubmenu && settingsOpen && !collapsed && (
                  <div className="ml-4 mt-0.5 space-y-0.5 border-l border-gray-200 pl-3">
                    {[
                      { label: 'Danh mục sự cố', sub: 'categories' },
                      { label: 'Cơ quan',          sub: 'departments' },
                      { label: 'Quy tắc định tuyến', sub: 'routing' },
                    ].map(s => (
                      <button key={s.sub}
                        onClick={() => navigate('settings')}
                        className="w-full text-left px-3 py-2 rounded-xl text-[12px] text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all cursor-pointer">
                        {s.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Emergency */}
        {!collapsed && (
          <div className="mx-3 my-2 relative rounded-xl overflow-hidden border border-red-200 bg-red-50">
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <div className="relative">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="absolute inset-0 w-2 h-2 rounded-full bg-red-500 animate-ping-slow" />
              </div>
              <div>
                <p className="text-[11px] font-bold text-red-600">Cảnh báo khẩn cấp</p>
                <p className="text-[10px] text-red-400">2 khu vực đang hoạt động</p>
              </div>
            </div>
          </div>
        )}

        {/* User */}
        <div className="px-3 py-3 border-t border-gray-100">
          <div className={`flex items-center gap-3 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-[#b94b00] flex items-center justify-center flex-shrink-0">
              <span className="font-display text-[13px] font-bold text-white">
                {userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}
              </span>
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-gray-800 truncate">{userEmail || 'admin@cityfix.vn'}</p>
                <p className="text-[10px] text-orange-500 uppercase tracking-wide">{userRole === 'ADMIN' ? 'Quản trị viên' : 'Nhân viên'}</p>
              </div>
            )}
            {!collapsed && (
              <button onClick={() => setAuthPage('login')} title="Đăng xuất" className="text-gray-400 hover:text-gray-600 transition-colors flex-shrink-0 cursor-pointer">
                <LogoutIcon />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0 shadow-sm">
          <div className="flex-1">
            <h1 className="font-display text-[22px] font-extrabold text-gray-900 uppercase tracking-tight">
              {page === 'dashboard' ? 'Dashboard' :
               page === 'tickets' || page === 'ticket-detail' ? 'Quản lý vé' :
               page === 'manual-review' ? 'Xét duyệt thủ công' :
               page === 'analytics' ? 'Phân tích & Báo cáo' :
               page === 'users' ? 'Người dùng' : 'Cài đặt hệ thống'}
            </h1>
          </div>
          <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 w-64">
            <SearchIcon />
            <input placeholder="Tìm kiếm toàn hệ thống..."
              className="bg-transparent text-[13px] text-gray-600 placeholder-gray-400 outline-none flex-1" />
          </div>
          <button className="relative w-9 h-9 rounded-xl bg-gray-50 border border-gray-200 flex items-center justify-center text-gray-400 hover:text-gray-700 hover:border-gray-300 transition-colors cursor-pointer">
            <BellIcon />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-orange-500" />
          </button>
          <div className="w-px h-6 bg-gray-200" />
          <p className="font-mono-cf text-[11px] text-gray-400 tracking-wider">10/09/2026</p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin city-background">
          {page === 'dashboard' && <Dashboard onOpenTicket={id => navigate('ticket-detail', id)} onViewAll={() => navigate('tickets')} />}
          {page === 'tickets' && <TicketList onOpenTicket={id => navigate('ticket-detail', id)} />}
          {page === 'ticket-detail' && <TicketDetail ticket={ticket} onBack={() => navigate('tickets')} />}
          {page === 'manual-review' && <ManualReview onOpenTicket={id => navigate('ticket-detail', id)} />}
          {page === 'analytics' && <Analytics />}
          {page === 'users' && <UserManagement />}
          {page === 'settings' && <Settings />}
        </main>
      </div>
    </div>
  );
}


export default function App() {
  return (
    <ConfigProvider theme={cityFixTheme}>
      <AntdApp>
        <MainApp />
      </AntdApp>
    </ConfigProvider>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────
function GridIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg>; }
function TicketIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5v2M15 11v2M15 17v2M5 5h14a2 2 0 012 2v3a2 2 0 000 4v3a2 2 0 01-2 2H5a2 2 0 01-2-2v-3a2 2 0 000-4V7a2 2 0 012-2z"/></svg>; }
function ReviewIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>; }
function ChartIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>; }
function UsersIcon()  { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/></svg>; }
function GearIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>; }
function SearchIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>; }
function BellIcon()   { return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>; }
function ChevLIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>; }
function ChevRIcon()  { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>; }
function LogoutIcon() { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"/></svg>; }
