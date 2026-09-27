export const APP_CONFIG = {
  TITLE: 'CityFix Web Dashboard',
  API_BASE_URL:
    import.meta.env.VITE_API_BASE_URL ||
    import.meta.env.EXPO_PUBLIC_API_BASE_URL ||
    'https://cityfix-backend-80ar.onrender.com',
};
