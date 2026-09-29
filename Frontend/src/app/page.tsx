'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/dashboard/Navbar';
import ActionCards from '@/components/dashboard/ActionCards';
import MeetingList from '@/components/dashboard/MeetingList';

export default function DashboardPage() {
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDate, setCurrentDate] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
        })
      );
      setCurrentDate(
        now.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        })
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="main-content">
        {/* Zoom Blue Hero Banner with Live Clock */}
        <section className="hero-banner">
          <div>
            <h1 style={{ fontSize: '26px', fontWeight: 700, marginBottom: '6px' }}>
              Welcome back, Atithi
            </h1>
            <p style={{ opacity: 0.9, fontSize: '15px' }}>
              Connect seamlessly with high-definition video and audio.
            </p>
          </div>

          <div className="hero-clock">
            <div className="hero-time">{currentTime || '12:00 PM'}</div>
            <div className="hero-date">{currentDate || 'Loading date...'}</div>
          </div>
        </section>

        {/* 4 Action Cards: New Meeting, Join, Schedule, Share Screen */}
        <ActionCards />

        {/* Upcoming and Recent Meetings Section */}
        <MeetingList />
      </main>
    </div>
  );
}
