import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { setCurrentPage } from '../store/appSlice';

export default function RouteSync({ authPage, setAuthPage }: { authPage: string, setAuthPage: (p: any) => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const page = useAppSelector(s => s.app.currentPage);
  const selectedId = useAppSelector(s => s.app.selectedTicketId);

  // Sync Redux -> URL
  useEffect(() => {
    let path = '/';
    if (authPage === 'login') path = '/login';
    else if (authPage === 'register') path = '/register';
    else if (authPage === 'app') {
      path = `/${page}`;
      if (page === 'ticket-detail' && selectedId) {
        path = `/ticket-detail/${selectedId}`;
      }
    }

    if (location.pathname !== path) {
      // Don't push state if we are just initializing the correct URL
      if (location.pathname === '/' && path !== '/') {
        navigate(path, { replace: true });
      } else {
        navigate(path);
      }
    }
  }, [authPage, page, selectedId]);

  // Sync URL -> Redux (on mount and popstate)
  useEffect(() => {
    const path = location.pathname;
    if (path === '/login') {
      // Chỉ ép về 'login' nếu hiện tại không phải là 'app'
      if (authPage !== 'login' && authPage !== 'app') setAuthPage('login');
      return;
    }
    if (path === '/register') {
      if (authPage !== 'register' && authPage !== 'app') setAuthPage('register');
      return;
    }

    const parts = path.split('/').filter(Boolean);
    const routePage = parts[0] || 'dashboard';
    const routeId = parts[1];

    if (['dashboard', 'tickets', 'ticket-detail', 'manual-review', 'analytics', 'users', 'settings'].includes(routePage)) {
       if (routePage !== page || (routePage === 'ticket-detail' && routeId && routeId !== selectedId)) {
         dispatch(setCurrentPage({ page: routePage as any, id: routeId }));
       }
    }
  }, [location.pathname, authPage]);

  return null;
}
