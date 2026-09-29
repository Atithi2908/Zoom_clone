'use client';

import React, { useState, useEffect } from 'react';
import LandingPage from '@/components/landing/LandingPage';
import DashboardView from '@/components/dashboard/DashboardView';
import { auth } from '@/lib/auth';

export default function RootHomePage() {
  const [isAuth, setIsAuth] = useState<boolean | null>(null);

  useEffect(() => {
    setIsAuth(auth.isAuthenticated());

    const handleAuthChange = () => {
      setIsAuth(auth.isAuthenticated());
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // During SSR or initial mount
  if (isAuth === null) {
    return <LandingPage />;
  }

  return isAuth ? <DashboardView /> : <LandingPage />;
}
