'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import SideNav from './SideNav';

export default function AppShell({ children }) {
  const pathname = usePathname() || '';

  // hide sidebar for auth routes (exact /auth or any nested like /auth/login)
  const isAuthRoute = pathname === '/auth' || pathname.startsWith('/auth/');

  if (isAuthRoute) {
    return (
      <div style={{ padding: '24px' }}>
        {children}
      </div>
    );
  }

  return (
    <>
      <SideNav />
      <main style={{ marginLeft: '260px', padding: '24px' }}>
        {children}
      </main>
    </>
  );
}
