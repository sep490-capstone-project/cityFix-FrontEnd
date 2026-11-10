import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { BrowserRouter } from 'react-router-dom';
import { store, persistor } from './store';
import App from './App.tsx';
import ErrorBoundary from './components/ErrorBoundary';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Provider store={store}>
        <PersistGate
          loading={
            <div className="min-h-screen bg-[#f8fafc] flex flex-col items-center justify-center gap-3">
              <div className="w-9 h-9 border-3 border-orange-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold text-slate-500">Đang khởi tạo hệ thống...</span>
            </div>
          }
          persistor={persistor}
        >
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </PersistGate>
      </Provider>
    </ErrorBoundary>
  </React.StrictMode>,
);
