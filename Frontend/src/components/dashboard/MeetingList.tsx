'use client';

import React, { useState, useEffect } from 'react';
import { Calendar, History, Loader2, Sparkles } from 'lucide-react';
import { Meeting } from '@/types';
import { api } from '@/lib/api';
import MeetingCard from './MeetingCard';

export default function MeetingList() {
  const [activeTab, setActiveTab] = useState<'upcoming' | 'recent'>('upcoming');
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMeetings = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const [upcoming, recent] = await Promise.all([
        api.getUpcomingMeetings(),
        api.getRecentMeetings(),
      ]);
      setUpcomingMeetings(upcoming);
      setRecentMeetings(recent);
    } catch (err: any) {
      console.error('Failed to load meetings:', err);
      setError('Could not load meetings from the server. Ensure the backend is running.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const currentMeetings = activeTab === 'upcoming' ? upcomingMeetings : recentMeetings;

  return (
    <div className="meetings-section">
      <div className="tabs-header">
        <button
          className={`tab-btn ${activeTab === 'upcoming' ? 'active' : ''}`}
          onClick={() => setActiveTab('upcoming')}
        >
          <Calendar size={18} />
          <span>Upcoming Meetings</span>
          <span className="tab-badge">{upcomingMeetings.length}</span>
        </button>

        <button
          className={`tab-btn ${activeTab === 'recent' ? 'active' : ''}`}
          onClick={() => setActiveTab('recent')}
        >
          <History size={18} />
          <span>Recent Meetings</span>
          <span className="tab-badge">{recentMeetings.length}</span>
        </button>
      </div>

      <div className="meeting-list">
        {isLoading ? (
          <div className="empty-state">
            <Loader2 size={32} className="animate-spin empty-icon" />
            <p>Loading scheduled meetings...</p>
          </div>
        ) : error ? (
          <div className="empty-state" style={{ color: '#DC2626' }}>
            <p>{error}</p>
            <button
              onClick={fetchMeetings}
              className="btn-secondary"
              style={{ marginTop: '12px' }}
            >
              Retry
            </button>
          </div>
        ) : currentMeetings.length === 0 ? (
          <div className="empty-state">
            <Sparkles size={36} className="empty-icon" />
            <h3>No {activeTab} meetings found</h3>
            <p style={{ marginTop: '6px', fontSize: '14px' }}>
              {activeTab === 'upcoming'
                ? 'Schedule a meeting or start an instant meeting to see it here.'
                : 'Meetings you participate in will appear in your recent history.'}
            </p>
          </div>
        ) : (
          currentMeetings.map((m) => (
            <MeetingCard
              key={m.meeting_id}
              meeting={m}
              isRecent={activeTab === 'recent'}
            />
          ))
        )}
      </div>
    </div>
  );
}
