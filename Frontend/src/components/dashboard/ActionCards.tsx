'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Video, Plus, Calendar, MonitorUp, Loader2, X } from 'lucide-react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';

export default function ActionCards() {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showHostModal, setShowHostModal] = useState(false);
  const [meetingNameInput, setMeetingNameInput] = useState('');

  const handleOpenHostModal = () => {
    const curUser = auth.getCurrentUser();
    const hostName = curUser?.full_name || 'Atithi';
    setMeetingNameInput(`${hostName}'s Meeting`);
    setShowHostModal(true);
  };

  const handleStartMeetingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenName = meetingNameInput.trim();
    if (!chosenName) return;

    try {
      setIsCreating(true);
      setErrorMsg(null);
      const curUser = auth.getCurrentUser();
      const hostName = curUser?.full_name || 'Atithi';
      const meeting = await api.createInstantMeeting({
        title: chosenName,
        host_name: hostName,
        host_email: curUser?.email || 'atithi@zoom.clone',
        host_id: curUser?.id,
      });
      setShowHostModal(false);
      // Redirect host to meeting lobby
      router.push(`/meeting/${meeting.meeting_id}/lobby?name=${encodeURIComponent(hostName)}`);
    } catch (err: any) {
      console.error('Failed to create instant meeting:', err);
      setErrorMsg(err.message || 'Failed to start meeting. Ensure backend is running.');
    } finally {
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

      {/* ── Host Meeting Setup Modal ─────────────────────────────────────── */}
      {showHostModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#FF7426', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Video size={20} />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Host a Meeting</h3>
                  <p style={{ fontSize: '12px', color: '#64748B', margin: '2px 0 0 0' }}>Give your meeting a meaningful name</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowHostModal(false)}
                style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B', padding: '4px' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleStartMeetingSubmit}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="actionCardMeetingName" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Meeting Name *
                </label>
                <input
                  id="actionCardMeetingName"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Juspay Interview Preparation, Team Discussion"
                  value={meetingNameInput}
                  onChange={(e) => setMeetingNameInput(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isCreating || !meetingNameInput.trim()}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: '#FF7426' }}
                >
                  {isCreating ? <Loader2 size={16} className="animate-spin" /> : <span>Start Meeting</span>}
                </button>
                <button
                  type="button"
                  onClick={() => setShowHostModal(false)}
                  className="btn-secondary"
                  style={{ flex: 1, justifyContent: 'center' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="action-grid">
        {/* New Meeting (Orange) */}
        <button
          className="action-tile"
          onClick={handleOpenHostModal}
          disabled={isCreating}
          style={{ width: '100%' }}
        >
          <div className="action-icon-box orange">
            <Video size={30} />
          </div>
          <span className="action-label">
            New Meeting
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
