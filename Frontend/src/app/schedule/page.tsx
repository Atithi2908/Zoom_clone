'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Calendar, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import Navbar from '@/components/dashboard/Navbar';
import { api } from '@/lib/api';

export default function SchedulePage() {
  const router = useRouter();

  // Tomorrow as default date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDate = tomorrow.toISOString().split('T')[0];

  const [title, setTitle] = useState("Atithi's Scheduled Meeting");
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDate);
  const [time, setTime] = useState('14:00');
  const [duration, setDuration] = useState(30);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMeeting, setSuccessMeeting] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Please provide a meeting title.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Combine date and time to ISO string
      const scheduledDateTime = new Date(`${date}T${time}:00`);

      const meeting = await api.scheduleMeeting({
        title: title.trim(),
        description: description.trim(),
        scheduled_at: scheduledDateTime.toISOString(),
        duration_minutes: Number(duration),
      });

      setSuccessMeeting(meeting);
    } catch (err: any) {
      console.error('Failed to schedule meeting:', err);
      setErrorMessage(err.message || 'Failed to schedule meeting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="dashboard-container">
      <Navbar />

      <main className="main-content">
        <div style={{ maxWidth: '600px', margin: '30px auto' }}>
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
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid var(--border-light)',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
            }}
          >
            {successMeeting ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <CheckCircle2
                  size={52}
                  color="var(--zoom-green)"
                  style={{ margin: '0 auto 16px' }}
                />
                <h2 style={{ fontSize: '22px', fontWeight: 700, color: 'var(--text-main)' }}>
                  Meeting Scheduled!
                </h2>
                <p style={{ color: 'var(--text-muted)', marginTop: '6px', fontSize: '14px' }}>
                  Your meeting has been saved and added to Upcoming Meetings.
                </p>

                <div
                  style={{
                    background: '#F8FAFC',
                    border: '1px solid var(--border-light)',
                    borderRadius: '12px',
                    padding: '16px',
                    margin: '24px 0',
                    textAlign: 'left',
                    fontSize: '14px',
                  }}
                >
                  <p><strong>Topic:</strong> {successMeeting.title}</p>
                  <p style={{ marginTop: '6px' }}>
                    <strong>Meeting ID:</strong>{' '}
                    <span style={{ color: 'var(--zoom-blue)', fontWeight: 600 }}>
                      {successMeeting.meeting_id}
                    </span>
                  </p>
                  <p style={{ marginTop: '6px' }}>
                    <strong>Time:</strong>{' '}
                    {new Date(successMeeting.scheduled_at).toLocaleString()}
                  </p>
                  <p style={{ marginTop: '6px', wordBreak: 'break-all' }}>
                    <strong>Invite Link:</strong> {successMeeting.invite_link}
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    className="btn-secondary"
                    onClick={() => {
                      navigator.clipboard.writeText(successMeeting.invite_link);
                      alert('Invite link copied to clipboard!');
                    }}
                  >
                    Copy Invitation
                  </button>
                  <button
                    className="btn-primary"
                    onClick={() => router.push('/')}
                  >
                    Return to Dashboard
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
                  <div
                    style={{
                      background: 'var(--zoom-blue-light)',
                      color: 'var(--zoom-blue)',
                      padding: '10px',
                      borderRadius: '10px',
                    }}
                  >
                    <Calendar size={24} />
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: 'var(--text-main)' }}>
                      Schedule Meeting
                    </h2>
                    <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                      Set up a planned video conference for your team.
                    </p>
                  </div>
                </div>

                {errorMessage && (
                  <div
                    style={{
                      background: '#FEF2F2',
                      border: '1px solid #FCA5A5',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                      color: '#991B1B',
                      fontSize: '14px',
                    }}
                  >
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleSubmit}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="title">
                      Meeting Topic *
                    </label>
                    <input
                      id="title"
                      type="text"
                      className="form-input"
                      placeholder="e.g. Design Review, Weekly Sync"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="description">
                      Description (Optional)
                    </label>
                    <textarea
                      id="description"
                      className="form-input"
                      style={{ height: '70px', resize: 'vertical' }}
                      placeholder="Meeting agenda or context notes"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                    />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div className="form-group">
                      <label className="form-label" htmlFor="date">
                        Date *
                      </label>
                      <input
                        id="date"
                        type="date"
                        className="form-input"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                      />
                    </div>

                    <div className="form-group">
                      <label className="form-label" htmlFor="time">
                        Start Time *
                      </label>
                      <input
                        id="time"
                        type="time"
                        className="form-input"
                        value={time}
                        onChange={(e) => setTime(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label" htmlFor="duration">
                      Duration
                    </label>
                    <select
                      id="duration"
                      className="form-input"
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                    >
                      <option value={15}>15 minutes</option>
                      <option value={30}>30 minutes</option>
                      <option value={45}>45 minutes</option>
                      <option value={60}>1 hour</option>
                      <option value={90}>1.5 hours</option>
                      <option value={120}>2 hours</option>
                    </select>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '12px',
                      marginTop: '28px',
                    }}
                  >
                    <button
                      type="button"
                      className="btn-secondary"
                      onClick={() => router.push('/')}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn-primary"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={16} className="animate-spin" />
                          <span>Scheduling...</span>
                        </>
                      ) : (
                        <span>Save Meeting</span>
                      )}
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
