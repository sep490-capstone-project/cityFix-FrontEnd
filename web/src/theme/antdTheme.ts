import { ThemeConfig } from 'antd';

export const cityFixTheme: ThemeConfig = {
  token: {
    colorPrimary: '#f97316',
    colorInfo: '#f97316',
    colorSuccess: '#16a34a',
    colorWarning: '#d97706',
    colorError: '#dc2626',

    colorBgBase: '#ffffff',
    colorBgContainer: '#ffffff',
    colorBgElevated: '#ffffff',
    colorBgLayout: '#f5f5f5',

    colorBorder: '#e5e7eb',
    colorBorderSecondary: '#f3f4f6',

    colorText: '#111827',
    colorTextSecondary: '#6b7280',
    colorTextTertiary: '#9ca3af',
    colorTextQuaternary: '#d1d5db',

    borderRadius: 12,

    fontFamily:
      "'Noto Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },

  components: {
    Button: {
      colorPrimary: '#f97316',
      algorithm: true,
      borderRadius: 10,
      controlHeight: 38,
      fontWeight: 600,
    },

    Table: {
      colorBgContainer: '#ffffff',
      headerBg: '#f9fafb',
      headerColor: '#6b7280',
      rowHoverBg: '#fff7ed',
      borderColor: '#e5e7eb',
      borderRadius: 16,
    },

    Select: {
      colorBgContainer: '#ffffff',
      colorBgElevated: '#ffffff',
      colorBorder: '#e5e7eb',
      controlHeight: 38,
      borderRadius: 10,
    },

    Input: {
      colorBgContainer: '#ffffff',
      colorBorder: '#e5e7eb',
      controlHeight: 38,
      borderRadius: 10,
    },

    Card: {
      colorBgContainer: '#ffffff',
      colorBorderSecondary: '#e5e7eb',
      borderRadiusLG: 16,
    },

    Modal: {
      contentBg: '#ffffff',
      headerBg: '#ffffff',
      borderRadiusLG: 16,
    },

    Drawer: {
      colorBgElevated: '#ffffff',
    },

    Tag: {
      borderRadiusSM: 6,
    },

    Steps: {
      colorPrimary: '#f97316',
    },

    Tabs: {
      colorPrimary: '#f97316',
      itemColor: '#6b7280',
      itemHoverColor: '#f97316',
      itemSelectedColor: '#f97316',
    },

    Menu: {
      colorBgContainer: '#ffffff',
      itemColor: '#6b7280',
      itemHoverColor: '#f97316',
      itemSelectedColor: '#f97316',
      itemSelectedBg: '#fff7ed',
    },
  },
};