import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { setCurrentPage } from '../store/appSlice';
import { getAccessToken } from '../services';

export default function RouteSync({
  authPage,
  setAuthPage,
}: {
  authPage: string;
  setAuthPage: (p: any) => void;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const page = useAppSelector((s) => s.app.currentPage);
  const selectedId = useAppSelector((s) => s.app.selectedTicketId);

  // 1. Sync State -> URL
  useEffect(() => {
    let targetPath = '/';
    if (authPage === 'login') {
      targetPath = '/login';
    } else if (authPage === 'register') {
      targetPath = '/register';
    } else if (authPage === 'app') {
      targetPath = `/${page}`;
      if (page === 'ticket-detail' && selectedId) {
        targetPath = `/ticket-detail/${selectedId}`;
      }
    }

    if (location.pathname !== targetPath) {
      navigate(targetPath, {
        replace: location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register',
      });
    }
  }, [authPage, page, selectedId, location.pathname, navigate]);

  // 2. Sync URL -> State (chỉ kích hoạt khi location.pathname thay đổi, KHÔNG lắng nghe authPage)
  useEffect(() => {
    const path = location.pathname;
    const token = getAccessToken();

    if (path === '/login') {
      // Chỉ ép về login nếu thực sự chưa có token. Nếu đã có token thì giữ nguyên để chuyển về app
      if (!token) {
        setAuthPage('login');
      }
      return;
    }

    if (path === '/register') {
      if (!token) {
        setAuthPage('register');
      }
      return;
    }

    // Các đường dẫn nội bộ ứng dụng (dashboard, tickets, ...)
    const parts = path.split('/').filter(Boolean);
    const routePage = parts[0] || 'dashboard';
    const routeId = parts[1];

    const validPages = ['dashboard', 'tickets', 'ticket-detail', 'analytics', 'users', 'settings', 'steps'];
    if (validPages.includes(routePage)) {
      if (token) {
        setAuthPage('app');
      } else {
        setAuthPage('login');
        return;
      }

      if (routePage !== page || (routePage === 'ticket-detail' && routeId && routeId !== selectedId)) {
        dispatch(setCurrentPage({ page: routePage as any, id: routeId }));
      }
    }
  }, [location.pathname, dispatch]);

  return null;
}
