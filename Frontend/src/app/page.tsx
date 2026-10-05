'use client';

import React, { useState, useEffect } from 'react';
import LandingPage from '@/components/landing/LandingPage';
import DashboardView from '@/components/dashboard/DashboardView';
import { auth } from '@/lib/auth';

export default function RootHomePage() {
  const [mounted, setMounted] = useState(false);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    setMounted(true);
    setIsAuth(auth.isAuthenticated());

    const handleAuthChange = () => {
      setIsAuth(auth.isAuthenticated());
    };

    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  // During initial mount before hydration, render neutral container to avoid flash
  if (!mounted) {
    return <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF' }} />;
  }

  return isAuth ? <DashboardView /> : <LandingPage />;
}
