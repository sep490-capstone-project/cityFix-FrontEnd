import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SettingsTab } from '../admin/AdminSettings';

interface AppState {
  currentPage: 'dashboard' | 'tickets' | 'ticket-detail' | 'manual-review' | 'analytics' | 'users' | 'settings';
  selectedTicketId: string | null;
  settingsTab: SettingsTab;
  userEmail: string;
  userRole: 'STAFF' | 'MANAGER' | 'ADMIN';
  userId: string;
}

const initialState: AppState = {
  currentPage: 'dashboard',
  selectedTicketId: null,
  settingsTab: 'categories',
  userEmail: '',
  userRole: 'ADMIN',
  userId: 'U006',
};

export const appSlice = createSlice({
  name: 'app',
  initialState,
  reducers: {
    setCurrentPage: (
      state,
      action: PayloadAction<{ page: AppState['currentPage']; id?: string }>
    ) => {
      state.currentPage = action.payload.page;
      if (action.payload.id) {
        state.selectedTicketId = action.payload.id;
      }
    },
    setSettingsTab: (state, action: PayloadAction<SettingsTab>) => {
      state.settingsTab = action.payload;
    },
    setUserInfo: (
      state,
      action: PayloadAction<{ email: string; role: 'STAFF' | 'MANAGER' | 'ADMIN'; userId: string }>
    ) => {
      state.userEmail = action.payload.email;
      state.userRole = action.payload.role;
      state.userId = action.payload.userId;
    },
    resetUser: (state) => {
      state.userEmail = '';
      state.userRole = 'ADMIN';
      state.userId = '';
      state.currentPage = 'dashboard';
    },
  },
});

export const { setCurrentPage, setSettingsTab, setUserInfo, resetUser } = appSlice.actions;
export default appSlice.reducer;
