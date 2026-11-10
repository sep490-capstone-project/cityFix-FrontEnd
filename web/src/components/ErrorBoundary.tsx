import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Lỗi ứng dụng CityFix (Uncaught Error):', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleReset = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Lỗi xóa storage:', e);
    }
    window.location.href = '/login';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center p-4">
          <div className="bg-white border border-red-200 rounded-2xl shadow-xl max-w-md w-full p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto text-xl font-bold">
              !
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Đã xảy ra sự cố hiển thị</h2>
              <p className="text-xs text-slate-500 mt-1">
                {this.state.error?.message || 'Có lỗi phát sinh trong quá trình kết xuất giao diện.'}
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
              >
                Tải lại trang
              </button>
              <button
                type="button"
                onClick={this.handleReset}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
              >
                Xóa cache & Đăng nhập lại
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
