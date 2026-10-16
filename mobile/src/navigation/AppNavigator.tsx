import React, { useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import LoginScreen, { AuthUser } from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import VerifyEmailScreen from '../screens/VerifyEmailScreen';
import SplashScreen from '../screens/SplashScreen';
import HomeScreen from '../screens/HomeScreen';
import ProfileScreen from '../screens/ProfileScreen';
import TicketDetailScreen from '../screens/TicketDetailScreen';
import MyReportsScreen from '../screens/MyReportsScreen';
import LocationScreen from '../screens/LocationScreen';
import PhotoScreen from '../screens/PhotoScreen';
import AIAnalysisScreen from '../screens/AIAnalysisScreen';
import ReviewDraftScreen from '../screens/ReviewDraftScreen';
import DuplicateScreen from '../screens/DuplicateScreen';
import SuccessScreen from '../screens/SuccessScreen';
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
    setCurrentScreen('login');
  };

  const handleUpdateUser = (updatedUser: AuthUser) => {
    setUser(updatedUser);
  };

  const handleOpenTicket = (ticketId: string, ticketObj?: ReportedTicket) => {
    setPreviousScreen(currentScreen); // Remember where user opened the ticket from
    setSelectedTicketId(ticketId);
    setSelectedTicket(ticketObj || null);
    setCurrentScreen('ticket-detail');
  };

  const resetReport = () => {
    setDraft(INITIAL_DRAFT);
    setDuplicateTickets([]);
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
      />
    );
  }

  if (currentScreen === 'success' || currentScreen === 'success-upvote') {
    return (
      <SuccessScreen
        resetReport={resetReport}
        isUpvote={currentScreen === 'success-upvote'}
      />
    );
  }

  if (currentScreen === 'ticket-detail') {
    return (
      <TicketDetailScreen
        ticketId={selectedTicketId}
        ticketData={selectedTicket}
        goBack={() => setCurrentScreen(previousScreen)} // Returns to my-reports, profile, or home dynamically!
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
