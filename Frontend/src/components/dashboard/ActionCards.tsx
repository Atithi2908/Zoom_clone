'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Plus, Calendar, MonitorUp, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function ActionCards() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleNewMeeting = async () => {
    try {
      setIsCreating(true);
      setErrorMsg(null);
      const curUser = auth.getCurrentUser();
      const hostName = curUser?.full_name || 'Atithi (Host)';
      const meeting = await api.createInstantMeeting({
        title: `${hostName}'s Instant Meeting`,
        host_name: hostName,
        host_email: curUser?.email || 'atithi@zoom.clone',
        host_id: curUser?.id,
      });
      // Redirect host to meeting lobby
      router.push(`/meeting/${meeting.meeting_id}/lobby?name=${encodeURIComponent(hostName)}`);
    } catch (err: any) {
      console.error('Failed to create instant meeting:', err);
      setErrorMsg(err.message || 'Failed to start meeting. Ensure backend is running.');
      setIsCreating(false);
    }
  };

  return (
    <div>
      {errorMsg && (
        <div
          style={{
            background: '#FEE2E2',
            color: '#B91C1C',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '14px',
          }}
        >
          {errorMsg}
        </div>
      )}

      <div className="action-grid">
        {/* New Meeting (Orange) */}
        <button
          className="action-tile"
          onClick={handleNewMeeting}
          disabled={isCreating}
          style={{ width: '100%' }}
        >
          <div className="action-icon-box orange">
            {isCreating ? <Loader2 size={30} className="animate-spin" /> : <Video size={30} />}
          </div>
          <span className="action-label">
            {isCreating ? 'Starting...' : 'New Meeting'}
          </span>
        </button>

        {/* Join Meeting (Blue) */}
        <button
          className="action-tile"
          onClick={() => router.push('/join')}
          style={{ width: '100%' }}
        >
          <div className="action-icon-box blue">
            <Plus size={30} />
          </div>
          <span className="action-label">Join</span>
        </button>

        {/* Schedule Meeting (Blue) */}
        <button
          className="action-tile"
          onClick={() => router.push('/schedule')}
          style={{ width: '100%' }}
        >
          <div className="action-icon-box blue">
            <Calendar size={30} />
          </div>
          <span className="action-label">Schedule</span>
        </button>

        {/* Share Screen (Blue) */}
        <button
          className="action-tile"
          onClick={() => router.push('/join')}
          style={{ width: '100%' }}
        >
          <div className="action-icon-box blue">
            <MonitorUp size={30} />
          </div>
          <span className="action-label">Share Screen</span>
        </button>
      </div>
    </div>
  );
}
