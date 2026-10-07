'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Loader2, Video, AlertCircle } from 'lucide-react';
import Navbar from '@/components/dashboard/Navbar';
import { api } from '@/lib/api';

export default function JoinMeetingPage() {
  const router = useRouter();
  const [meetingInput, setMeetingInput] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const extractMeetingId = (input: string): string => {
    const trimmed = input.trim();
    // If user pasted a full URL, e.g. http://localhost:3000/meeting/849-291-3841/lobby
    const match = trimmed.match(/meeting\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      return match[1];
    }
    return trimmed;
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const meetingId = extractMeetingId(meetingInput);

    if (!meetingId) {
      setErrorMessage('Please enter a valid Meeting ID or invite link.');
      return;
    }

    try {
      setIsValidating(true);
      setErrorMessage(null);

      // Validate that the meeting actually exists in SQLite
      await api.validateMeeting(meetingId);

      // Successfully validated: redirect to Lobby
      router.push(`/meeting/${meetingId}/lobby`);
    } catch (err: any) {
      console.error('Validation failed:', err);
      setErrorMessage(
        err.message || 'Meeting ID not found. Please check the ID and try again.'
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="main-content">
        <div style={{ width: '100%', maxWidth: '480px', margin: '30px auto' }}>
          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '14px',
              color: 'var(--text-muted)',
              marginBottom: '20px',
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Dashboard</span>
          </Link>

          <div
            className="join-card"
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div
                style={{
                  width: '56px',
                  height: '56px',
                  borderRadius: '14px',
                  background: 'var(--zoom-blue-light)',
                  color: 'var(--zoom-blue)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                }}
              >
                <Video size={28} />
              </div>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                Join a Meeting
              </h2>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginTop: '4px' }}>
                Enter the Meeting ID or paste the invite link to connect.
              </p>
            </div>

            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  background: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  borderRadius: '8px',
                  padding: '12px 14px',
                  marginBottom: '20px',
                  color: '#991B1B',
                  fontSize: '13px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleJoin}>
              <div className="form-group">
                <label className="form-label" htmlFor="meetingId">
                  Meeting ID or Personal Link
                </label>
                <input
                  id="meetingId"
                  type="text"
                  className="form-input"
                  placeholder="e.g. 942-510-7381 or invite URL"
                  value={meetingInput}
                  onChange={(e) => {
                    setMeetingInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  autoFocus
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                disabled={isValidating || !meetingInput.trim()}
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  padding: '12px',
                  marginTop: '8px',
                }}
              >
                {isValidating ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Validating Meeting...</span>
                  </>
                ) : (
                  <span>Join</span>
                )}
              </button>
            </form>

            <div
              style={{
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid var(--border-light)',
                fontSize: '12px',
                color: 'var(--text-muted)',
                textAlign: 'center',
              }}
            >
              By clicking Join, you agree to our Terms of Service and Privacy Statement.
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
