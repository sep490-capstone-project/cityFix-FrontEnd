import React, { useState } from 'react';
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
  const [currentScreen, setCurrentScreen] = useState<string>('login');
  const [previousScreen, setPreviousScreen] = useState<string>('home');
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [selectedTicket, setSelectedTicket] = useState<ReportedTicket | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [verificationEmail, setVerificationEmail] = useState('');
  const [draft, setDraft] = useState<ReportDraft>(INITIAL_DRAFT);
  const [duplicateTickets, setDuplicateTickets] = useState<any[]>([]);
  const [createdTicket, setCreatedTicket] = useState<any | null>(null);

  const handleLoginSuccess = (authUser: AuthUser, token: string) => {
    setUser(authUser);
    setCurrentScreen('splash');
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.removeItem('accessToken');
    } catch (e) {
      console.warn('Lỗi khi xóa token:', e);
    }
    setUser(null);
    setDraft(INITIAL_DRAFT);
    setDuplicateTickets([]);
    setCreatedTicket(null);
    setCurrentScreen('login');
  };

  const handleUpdateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
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
    setCurrentScreen(screen);
  };

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

    if (currentScreen === 'my-reports' || currentScreen === 'staff-tickets') {
      return (
        <StaffTicketsScreen
          navigate={handleNavigate}
          authUser={user}
          openTicket={handleOpenTicket}
        />
      );
    }

    if (currentScreen === 'profile') {
      return (
        <StaffProfileScreen
          navigate={handleNavigate}
          authUser={user}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
          openTicket={handleOpenTicket}
        />
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

  if (currentScreen === 'my-reports') {
    return (
      <MyReportsScreen
        navigate={handleNavigate}
        authUser={user}
        openTicket={handleOpenTicket}
      />
    );
  }

  if (currentScreen === 'profile') {
    return (
      <ProfileScreen
        navigate={handleNavigate}
        authUser={user}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
        openTicket={handleOpenTicket}
      />
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
