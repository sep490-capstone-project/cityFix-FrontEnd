import React, { useState, useEffect } from 'react';
import { ConfigProvider, App as AntdApp, message } from 'antd';
import { cityFixTheme } from './theme/antdTheme';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './admin/AdminDashboard';
import TicketList from './admin/AdminTickets';
import TicketDetail from './admin/AdminTicketDetail';
import Analytics from './admin/AdminAnalytics';
import UserManagement from './admin/AdminUserManagement';
import AdminSteps from './admin/AdminSteps';
import Settings, { SettingsTab } from './admin/AdminSettings';
import StaffApp from './staff/StaffApp';
import ManagerApp from './manager/ManagerApp';
import { Ticket } from './data';
import cityfixLogo from './assets/cityfix-logo.png';
import { logout, getAccessToken, decodeJwt, getProfile } from './services';

import { useAppDispatch, useAppSelector } from './store';
import { setCurrentPage, setSettingsTab, setUserInfo, resetUser } from './store/appSlice';

type Page = 'dashboard' | 'tickets' | 'ticket-detail' | 'analytics' | 'users' | 'settings' | 'steps';
type AuthPage = 'login' | 'register' | 'app';

const NAV: { key: string; label: string; icon: () => React.ReactElement; hasSubmenu?: boolean }[] = [
  { key: 'dashboard',     label: 'Tổng quan',          icon: GridIcon     },
  { key: 'tickets',       label: 'Tra cứu Hồ sơ',      icon: TicketIcon   },
  { key: 'analytics',     label: 'Thống kê & Báo cáo', icon: ChartIcon    },
  { key: 'users',         label: 'Người dùng',         icon: UsersIcon    },
  { key: 'settings',      label: 'Cài đặt Hệ thống',   icon: GearIcon,    hasSubmenu: true },
  { key: 'steps',         label: 'Quy trình xử lý',    icon: ReviewIcon   },
];

import RouteSync from './components/RouteSync';

function MainApp() {
  const dispatch = useAppDispatch();
  const reduxState = useAppSelector((s) => s.app);

  const [authPage, setAuthPage] = useState<AuthPage>('login');
  const [verifyEmailTarget, setVerifyEmailTarget] = useState('');
  const [collapsed, setCollapsed] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [previousAdminPage, setPreviousAdminPage] = useState<Page>('dashboard');
  const [selectedTicketObj, setSelectedTicketObj] = useState<Ticket | null>(null);
  const { message: messageApi, modal } = AntdApp.useApp();

  const userEmail = reduxState.userEmail;
  const userRole = reduxState.userRole;
  const userId = reduxState.userId;
  const page = reduxState.currentPage;
  const selectedId = reduxState.selectedTicketId;
  const settingsTab = reduxState.settingsTab;

  // Tự động phục hồi phiên đăng nhập nếu đã có token hợp lệ
  useEffect(() => {
    const currentPath = window.location.pathname;
    const token = getAccessToken();

    // 1. Không có token: đảm bảo ở trạng thái login
    if (!token) {
      if (reduxState.userEmail) {
        dispatch(resetUser());
      }
      setAuthPage('login');
      return;
    }

    // 2. Có token: giải mã và kiểm tra hạn sử dụng
    try {
      const decoded = decodeJwt(token);
      if (!decoded) {
        logout();
        dispatch(resetUser());
        setAuthPage('login');
        return;
      }

      const now = Date.now() / 1000;
      if (decoded.exp && decoded.exp < now) {
        logout();
        dispatch(resetUser());
        setAuthPage('login');
        return;
      }

      const email = decoded.sub || decoded.email || '';
      const roleCandidate =
        decoded.role ||
        (Array.isArray(decoded.roles) ? decoded.roles[0] : decoded.roles) ||
        decoded.roleName ||
        (Array.isArray(decoded.authorities) ? decoded.authorities[0] : decoded.authorities) ||
        decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'] ||
        decoded.scope ||
        '';
      const rawRole = String(roleCandidate).toUpperCase();
      const role = rawRole.includes('MANAGER') ? 'MANAGER' : rawRole.includes('STAFF') ? 'STAFF' : 'ADMIN';
      const uid = decoded.userId || decoded.sub || 'U006';

      dispatch(setUserInfo({ email, role, userId: uid }));

      // Nếu người dùng đang truy cập trực tiếp URL /login thì hiển thị trang login
      if (currentPath === '/login') {
        setAuthPage('login');
      } else {
        setAuthPage('app');
      }

      getProfile(token)
        .then((p) => {
          if (p?.roleName) {
            const profRole = p.roleName.toUpperCase();
            const resolvedRole = profRole.includes('MANAGER')
              ? 'MANAGER'
              : profRole.includes('STAFF')
              ? 'STAFF'
              : 'ADMIN';
            dispatch(
              setUserInfo({
                email: p.email || email,
                role: resolvedRole,
                userId: p.userId || uid,
              })
            );
          }
        })
        .catch(() => {});
    } catch {
      logout();
      dispatch(resetUser());
      setAuthPage('login');
    }
  }, [dispatch]);

  function showToast(msg: string) {
    messageApi.open({
      type: 'info',
      content: msg,
      className: 'cityfix-message',
    });
  }

  function handleLogin(email: string, role: 'STAFF' | 'MANAGER' | 'ADMIN', uid: string) {
    dispatch(setUserInfo({ email, role, userId: uid }));
    setAuthPage('app');
    messageApi.success('Đăng nhập thành công');
  }

  function handleLogout() {
    modal.confirm({
      title: 'Xác nhận đăng xuất',
      content: 'Bạn có chắc chắn muốn đăng xuất khỏi hệ thống?',
      okText: 'Đăng xuất',
      cancelText: 'Hủy',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          await logout();
        } catch (e) {
          console.warn('Lỗi khi đăng xuất:', e);
        }
        dispatch(resetUser());
        setAuthPage('login');
        messageApi.info('Đã đăng xuất');
      }
    });
  }

  function handleRegisterSuccess() {
    setAuthPage('login');
    messageApi.success('Đăng ký và xác thực tài khoản thành công! Bạn có thể đăng nhập ngay.');
  }

  function navigate(p: Page, id?: string, ticketObj?: Ticket) {
    if (p === 'ticket-detail') {
      setPreviousAdminPage(page === 'ticket-detail' ? previousAdminPage : page);
      if (ticketObj) {
        setSelectedTicketObj(ticketObj);
      } else if (id) {
        setSelectedTicketObj(null);
      }
    }
    dispatch(setCurrentPage({ page: p, id }));
  }

  if (authPage === 'login') {
    return (
      <>
        <RouteSync authPage={authPage} setAuthPage={setAuthPage} />
        <Login
          onLogin={handleLogin}
          onGoRegister={() => {
            setVerifyEmailTarget('');
            setAuthPage('register');
          }}
        />
      </>
    );
  }

  if (authPage === 'register') {
    return (
      <>
        <RouteSync authPage={authPage} setAuthPage={setAuthPage} />
        <Register
          initialEmail={verifyEmailTarget}
          initialStep={verifyEmailTarget ? 3 : 1}
          onGoLogin={() => setAuthPage('login')}
          onRegisterSuccess={handleRegisterSuccess}
        />
      </>
    );
  }

  if (authPage === 'app' && userRole === 'MANAGER') {
    return (
      <>
        <RouteSync authPage={authPage} setAuthPage={setAuthPage} />
        <ManagerApp userId={userId} onLogout={handleLogout} />
      </>
    );
  }

  if (authPage === 'app' && userRole === 'STAFF') {
    return (
      <>
        <RouteSync authPage={authPage} setAuthPage={setAuthPage} />
        <StaffApp userId={userId} onLogout={handleLogout} />
      </>
    );
  }

  // Nếu authPage không phải là 'app', luôn an toàn hiển thị trang Login
  if (authPage !== 'app') {
    return (
      <>
        <RouteSync authPage={authPage} setAuthPage={setAuthPage} />
        <Login
          onLogin={handleLogin}
          onGoRegister={() => {
            setVerifyEmailTarget('');
            setAuthPage('register');
          }}
        />
      </>
    );
  }

  const ticket =
    (selectedTicketObj && (selectedTicketObj.ticketId === selectedId || !selectedId)
      ? selectedTicketObj
      : null);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      <RouteSync authPage={authPage} setAuthPage={setAuthPage} />
      {/* Sidebar */}
      <aside className={`${collapsed ? 'w-16' : 'w-60'} h-screen bg-white border-r border-gray-200 flex flex-col flex-shrink-0 transition-all duration-200`}>
        {/* Logo */}
        <div className="relative px-4 py-3 border-b border-gray-100">
          <div className="absolute top-0 left-0 right-0 h-[3px] hazard-stripe-thin" />
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
            <img
              src={cityfixLogo}
              alt="CityFix"
              className={collapsed ? 'h-9 w-9 object-contain' : 'h-12 w-24 object-contain object-left'}
            />
            {!collapsed && (
              <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-600 border border-orange-200 text-[10px] font-bold uppercase tracking-wider">
                Admin
              </span>
            )}
          </div>
          <button
            onClick={() => setCollapsed(c => !c)}
            className="absolute right-2 top-1/2 -translate-y-1/2 mt-1 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
          >
            {collapsed ? <ChevRIcon /> : <ChevLIcon />}
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2.5 py-3 space-y-1 overflow-y-auto scrollbar-hide">
          {NAV.map(item => {
            const active = page === item.key || (item.key === 'tickets' && page === 'ticket-detail');
            const Icon = item.icon;
            const isSettings = item.key === 'settings';

            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (isSettings) {
                      setSettingsOpen(!settingsOpen);
                      navigate('settings');
                    } else {
                      navigate(item.key as Page);
                    }
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                    active
                      ? 'bg-orange-50 border border-orange-200 text-orange-600 font-bold'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent font-medium'
                  }`}
                >
                  <span className={`flex-shrink-0 ${active ? 'text-orange-600' : 'text-gray-400'}`}>
                    <Icon />
                  </span>
                  {!collapsed && (
                    <>
                      <span className="text-[13px] flex-1">{item.label}</span>
                      {item.hasSubmenu && (
                        <span className="text-gray-400 text-xs">
                          {settingsOpen ? '▲' : '▼'}
                        </span>
                      )}
                    </>
                  )}
                </button>

                {/* Submenu for Settings */}
                {isSettings && settingsOpen && !collapsed && (
                  <div className="ml-7 mt-1 space-y-1 border-l-2 border-gray-100 pl-2">
                    {[
                      { sub: 'categories' as SettingsTab,    label: 'Danh mục sự cố' },
                      { sub: 'subcategories' as SettingsTab, label: 'Danh mục con' },
                      { sub: 'departments' as SettingsTab,   label: 'Cơ quan' },
                      { sub: 'routing' as SettingsTab,       label: 'Quy tắc định tuyến' },
                    ].map(s => {
                      const isSubActive = page === 'settings' && settingsTab === s.sub;
                      return (
                        <button key={s.sub}
                          onClick={() => {
                            dispatch(setSettingsTab(s.sub));
                            navigate('settings');
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all cursor-pointer ${
                            isSubActive
                              ? 'bg-orange-50 text-orange-600 font-bold'
                              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-800 font-medium'
                          }`}>
                          {s.label}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* User Footer */}
        <div className="px-3 py-3 border-t border-gray-100 bg-gray-50/50">
          <div className={`flex items-center gap-2.5 ${collapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 rounded-xl bg-orange-600 flex items-center justify-center flex-shrink-0 text-white font-bold text-xs">
              {userEmail ? userEmail.charAt(0).toUpperCase() : 'A'}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-gray-900 truncate">{userEmail || 'admin@cityfix.vn'}</p>
                <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Quản trị viên</p>
              </div>
            )}
            {!collapsed && (
              <button
                onClick={handleLogout}
                title="Đăng xuất"
                className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors flex-shrink-0 cursor-pointer"
              >
                <LogoutIcon />
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <h1 className="font-display text-base font-extrabold text-gray-900 tracking-tight truncate">
              {page === 'dashboard' ? 'Tổng quan Hệ thống' :
               page === 'tickets' || page === 'ticket-detail' ? 'Tra cứu Hồ sơ Sự cố' :
               page === 'analytics' ? 'Thống kê & Báo cáo' :
               page === 'users' ? 'Quản lý Người dùng' :
               page === 'steps' ? 'Quản lý Quy trình Xử lý' :
               'Cài đặt Hệ thống'}
            </h1>
          </div>
          <span className="px-2.5 py-1 rounded-lg bg-orange-50 text-orange-700 border border-orange-200 text-xs font-semibold hidden sm:inline-block">
            Quản trị viên Hệ thống
          </span>
          <div className="w-px h-4 bg-gray-200 hidden sm:block" />
          <p className="font-mono-cf text-xs text-gray-500">
            {new Date().toLocaleDateString('vi-VN')}
          </p>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin workspace-bg">
          {page === 'dashboard' && <Dashboard onOpenTicket={(id, tObj) => navigate('ticket-detail', id, tObj)} onViewAll={() => navigate('tickets')} />}
          {page === 'tickets' && <TicketList onOpenTicket={(id, tObj) => navigate('ticket-detail', id, tObj)} />}
          {page === 'ticket-detail' && <TicketDetail ticket={ticket} ticketId={selectedId || selectedTicketObj?.ticketId} onBack={() => navigate(previousAdminPage || 'dashboard')} />}
          {page === 'analytics' && <Analytics />}
          {page === 'users' && <UserManagement />}
          {page === 'steps' && <AdminSteps />}
          {page === 'settings' && (
            <Settings
              initialTab={settingsTab}
              onTabChange={(t) => dispatch(setSettingsTab(t))}
            />
          )}
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
