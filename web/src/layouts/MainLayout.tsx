import React from 'react';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ backgroundColor: '#1a73e8', color: '#fff', padding: '1rem 2rem' }}>
        <h2 style={{ margin: 0 }}>CityFix Management Dashboard</h2>
      </header>
      <main style={{ flex: 1, padding: '2rem' }}>{children}</main>
      <footer style={{ textAlign: 'center', padding: '1rem', borderTop: '1px solid #eee', color: '#666' }}>
        &copy; {new Date().getFullYear()} CityFix. All rights reserved.
      </footer>
    </div>
  );
}
