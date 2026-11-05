import React, { useState, useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen, { AuthUser } from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import SplashScreen from '../screens/SplashScreen';
import NotificationScreen from '../screens/NotificationScreen';

// Resident Screens
import HomeScreen from '../screens/resident/HomeScreen';
import ProfileScreen from '../screens/resident/ProfileScreen';
import TicketDetailScreen from '../screens/resident/TicketDetailScreen';
import MyReportsScreen from '../screens/resident/MyReportsScreen';
import LocationScreen from '../screens/resident/LocationScreen';
import PhotoScreen from '../screens/resident/PhotoScreen';
import AIAnalysisScreen from '../screens/resident/AIAnalysisScreen';
import ReviewDraftScreen from '../screens/resident/ReviewDraftScreen';
import DuplicateScreen from '../screens/resident/DuplicateScreen';
import SuccessScreen from '../screens/resident/SuccessScreen';

// Staff Screens
import StaffHomeScreen from '../screens/staff/StaffHomeScreen';
import StaffTicketsScreen from '../screens/staff/StaffTicketsScreen';
import StaffTicketDetailScreen from '../screens/staff/StaffTicketDetailScreen';
import StaffProfileScreen from '../screens/staff/StaffProfileScreen';

import { ReportDraft } from '../types';
import { ReportedTicket } from '../api';

const INITIAL_DRAFT: ReportDraft = {
  location: null,
  address: '',
  locationMethod: null,
  imageUrls: [],
  aiAnalysis: null,
  userCategoryId: null,
  userDescription: '',
};

export default function AppNavigator() {
  const [initializing, setInitializing] = useState<boolean>(true);
  const [currentScreen, setCurrentScreen] = useState<string>('login');
  const [previousScreen, setPreviousScreen] = useState<string>('home');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<ReportedTicket | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [draft, setDraft] = useState<ReportDraft>(INITIAL_DRAFT);
  const [duplicateTickets, setDuplicateTickets] = useState<any[]>([]);
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);
  const [visitedTabs, setVisitedTabs] = useState<Record<string, boolean>>({ home: true });

  // Tự động khôi phục phiên đăng nhập khi khởi động ứng dụng
  useEffect(() => {
    let isMounted = true;
    async function restoreSession() {
      try {
        const [token, savedUserStr] = await Promise.all([
          AsyncStorage.getItem('accessToken'),
          AsyncStorage.getItem('@cityfix_auth_user'),
        ]);

        if (isMounted && token && savedUserStr) {
          const parsedUser = JSON.parse(savedUserStr);
          setUser(parsedUser);
          setCurrentScreen('home');
        }
      } catch (err) {
        console.warn('Lỗi kiểm tra phiên đăng nhập:', err);
      } finally {
        if (isMounted) {
          setInitializing(false);
        }
      }
    }
    restoreSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleLoginSuccess = async (authUser: AuthUser, token: string) => {
    setUser(authUser);
    try {
      await AsyncStorage.setItem('@cityfix_auth_user', JSON.stringify(authUser));
    } catch (e) {
      console.warn('Lỗi lưu thông tin user:', e);
    }
    setVisitedTabs({ home: true });
    setCurrentScreen('splash');
  };

  const handleLogout = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('@cityfix_auth_user'),
      ]);
    } catch (e) {
      console.warn('Lỗi khi xóa token:', e);
    }
    setUser(null);
    setDraft(INITIAL_DRAFT);
    setDuplicateTickets([]);
    setCreatedTicket(null);
    setVisitedTabs({ home: true });
    setCurrentScreen('login');
  };

  const handleUpdateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
    AsyncStorage.setItem('@cityfix_auth_user', JSON.stringify(updatedUser)).catch(() => {});
  };

  const handleOpenTicket = (ticketId: string, ticketObj?: ReportedTicket) => {
    setPreviousScreen(currentScreen === 'success' || currentScreen === 'success-upvote' ? 'home' : currentScreen);
    setSelectedTicketId(ticketId);
    setSelectedTicket(ticketObj || null);
    setCurrentScreen('ticket-detail');
  };

  const resetReport = () => {
    setDraft(INITIAL_DRAFT);
    setDuplicateTickets([]);
    setCreatedTicket(null);
    setCurrentScreen('home');
  };

  const handleNavigate = (screen: string) => {
    if (['home', 'my-reports', 'profile', 'staff-tickets'].includes(screen)) {
      setVisitedTabs((prev) => ({ ...prev, [screen]: true }));
    }
    setCurrentScreen(screen);
  };

  // Màn hình khởi động nhanh khi kiểm tra phiên đăng nhập
  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#f97316" />
      </View>
    );
  }

  if (currentScreen === 'register') {
    return (
      <RegisterScreen
        navigate={handleNavigate}
        goBack={() => setCurrentScreen('login')}
        onRegistered={(email) => {
          setVerificationEmail(email);
          setCurrentScreen('verify-email');
        }}
      />
    );
  }

  if (currentScreen === 'verify-email') {
    return (
      <VerifyEmailScreen
        email={verificationEmail}
        goBack={() => setCurrentScreen('register')}
        onVerified={() => setCurrentScreen('login')}
      />
    );
  }

  if (currentScreen === 'login' || !user) {
    return (
      <LoginScreen
        navigate={handleNavigate}
        onLogin={handleLoginSuccess}
      />
    );
  }

  if (currentScreen === 'splash') {
    return (
      <SplashScreen
        user={user}
        onFinish={() => setCurrentScreen('home')}
      />
    );
  }

  if (currentScreen === 'notifications') {
    return (
      <NotificationScreen
        navigate={handleNavigate}
        goBack={() => setCurrentScreen('home')}
        openTicket={handleOpenTicket}
      />
    );
  }

  const isStaff = (user.role || '').toUpperCase() === 'STAFF';

  // ==============================================================
  // STAFF FLOW (Tách biệt hoàn toàn khỏi Resident, không có đánh giá)
  // ==============================================================
  if (isStaff) {
    if (currentScreen === 'ticket-detail') {
      return (
        <StaffTicketDetailScreen
          ticketId={selectedTicketId}
          ticketData={selectedTicket}
          authUser={user}
          goBack={() => setCurrentScreen(previousScreen)}
          navigate={handleNavigate}
        />
      );
    }

    const isStaffTab = ['home', 'my-reports', 'staff-tickets', 'profile'].includes(currentScreen);
    if (isStaffTab) {
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1, display: currentScreen === 'home' ? 'flex' : 'none' }}>
            <StaffHomeScreen
              navigate={handleNavigate}
              authUser={user}
              openTicket={handleOpenTicket}
            />
          </View>

          {(visitedTabs['my-reports'] || visitedTabs['staff-tickets'] || currentScreen === 'my-reports' || currentScreen === 'staff-tickets') && (
            <View style={{ flex: 1, display: (currentScreen === 'my-reports' || currentScreen === 'staff-tickets') ? 'flex' : 'none' }}>
              <StaffTicketsScreen
                navigate={handleNavigate}
                authUser={user}
                openTicket={handleOpenTicket}
              />
            </View>
          )}

          {(visitedTabs['profile'] || currentScreen === 'profile') && (
            <View style={{ flex: 1, display: currentScreen === 'profile' ? 'flex' : 'none' }}>
              <StaffProfileScreen
                navigate={handleNavigate}
                authUser={user}
                onLogout={handleLogout}
                onUpdateUser={handleUpdateUser}
                openTicket={handleOpenTicket}
              />
            </View>
          )}
        </View>
      );
    }

    return (
      <StaffHomeScreen
        navigate={handleNavigate}
        authUser={user}
        openTicket={handleOpenTicket}
      />
    );
  }

  // ==============================================================
  // RESIDENT FLOW (Dành riêng cho Người dân)
  // ==============================================================
  if (currentScreen === 'location') {
    return (
      <LocationScreen
        navigate={handleNavigate}
        goBack={() => setCurrentScreen('home')}
        draft={draft}
        setDraft={setDraft}
      />
    );
  }

  if (currentScreen === 'photo') {
    return (
      <PhotoScreen
        navigate={handleNavigate}
        goBack={() => setCurrentScreen('location')}
        draft={draft}
        setDraft={setDraft}
      />
    );
  }

  if (currentScreen === 'ai-analysis') {
    return (
      <AIAnalysisScreen
        navigate={handleNavigate}
        goBack={() => setCurrentScreen('photo')}
        draft={draft}
        setDraft={setDraft}
      />
    );
  }

  if (currentScreen === 'review-draft') {
    return (
      <ReviewDraftScreen
        navigate={handleNavigate}
        goBack={() => setCurrentScreen('ai-analysis')}
        draft={draft}
        setDraft={setDraft}
        authUser={user}
        onDuplicatesFound={(dupes) => {
          setDuplicateTickets(dupes);
          setCurrentScreen('duplicate');
        }}
        onTicketCreated={(ticket) => {
          setCreatedTicket(ticket);
          setCurrentScreen('success');
        }}
      />
    );
  }

  if (currentScreen === 'duplicate') {
    return (
      <DuplicateScreen
        navigate={handleNavigate}
        goBack={() => setCurrentScreen('review-draft')}
        draft={draft}
        duplicateTickets={duplicateTickets}
        resetReport={resetReport}
        onUpvoteSuccess={(ticket) => {
          setCreatedTicket(ticket);
          setCurrentScreen('success-upvote');
        }}
      />
    );
  }

  if (currentScreen === 'success' || currentScreen === 'success-upvote') {
    return (
      <SuccessScreen
        ticket={createdTicket}
        draft={draft}
        resetReport={resetReport}
        isUpvote={currentScreen === 'success-upvote'}
        onViewDetail={(tId, tObj) => {
          setDraft(INITIAL_DRAFT);
          setDuplicateTickets([]);
          setCreatedTicket(null);
          setPreviousScreen('home');
          setSelectedTicketId(tId);
          setSelectedTicket(tObj || null);
          setCurrentScreen('ticket-detail');
        }}
      />
    );
  }

  if (currentScreen === 'ticket-detail') {
    return (
      <TicketDetailScreen
        ticketId={selectedTicketId}
        ticketData={selectedTicket}
        authUser={user}
        goBack={() => setCurrentScreen(previousScreen)}
        navigate={handleNavigate}
        onTicketCancelled={(updated) => {
          setSelectedTicket(updated);
        }}
      />
    );
  }

  // Resident main tabs (Home, MyReports, Profile) giữ trạng thái mượt mà 0ms
  const isResidentTab = ['home', 'my-reports', 'profile'].includes(currentScreen);
  if (isResidentTab) {
    return (
      <View style={{ flex: 1 }}>
        <View style={{ flex: 1, display: currentScreen === 'home' ? 'flex' : 'none' }}>
          <HomeScreen
            navigate={handleNavigate}
            authUser={user}
            openTicket={handleOpenTicket}
          />
        </View>

        {(visitedTabs['my-reports'] || currentScreen === 'my-reports') && (
          <View style={{ flex: 1, display: currentScreen === 'my-reports' ? 'flex' : 'none' }}>
            <MyReportsScreen
              navigate={handleNavigate}
              authUser={user}
              openTicket={handleOpenTicket}
            />
          </View>
        )}

        {(visitedTabs['profile'] || currentScreen === 'profile') && (
          <View style={{ flex: 1, display: currentScreen === 'profile' ? 'flex' : 'none' }}>
            <ProfileScreen
              navigate={handleNavigate}
              authUser={user}
              onLogout={handleLogout}
              onUpdateUser={handleUpdateUser}
              openTicket={handleOpenTicket}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <HomeScreen
      navigate={handleNavigate}
      authUser={user}
      openTicket={handleOpenTicket}
    />
  );
}
