'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar as CalendarIcon,
  Clock,
  AlertTriangle,
  CheckCircle2,
  X,
  ChevronDown,
  Loader2,
  Lock,
  UserCheck,
  Shield,
} from 'lucide-react';
import { api } from '@/lib/api';
import { auth, UserProfile } from '@/lib/auth';
import ZoomFooter from '@/components/common/ZoomFooter';

export default function SchedulePage() {
  const router = useRouter();
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(auth.getCurrentUser());
  const defaultHostName = currentUser?.full_name || 'Atithi';

  // Tomorrow as default date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const defaultDateStr = tomorrow.toISOString().split('T')[0];

  // Form State
  const [topic, setTopic] = useState(`${defaultHostName}'s Zoom Meeting`);

  React.useEffect(() => {
    let isMounted = true;
    auth.ensureDefaultUser().then((u) => {
      if (isMounted) {
        setCurrentUser(u);
      }
    }).catch(() => {});
    return () => { isMounted = false; };
  }, []);
  const [showDescription, setShowDescription] = useState(false);
  const [description, setDescription] = useState('');
  const [date, setDate] = useState(defaultDateStr);
  const [timeHour, setTimeHour] = useState('02');
  const [timeMinute, setTimeMinute] = useState('00');
  const [timePeriod, setTimePeriod] = useState<'AM' | 'PM'>('PM');
  const [durationHours, setDurationHours] = useState('0');
  const [durationMinutes, setDurationMinutes] = useState('45');
  const [timeZone, setTimeZone] = useState('(GMT+5:30) India');
  const [isRecurring, setIsRecurring] = useState(false);
  const [meetingIdType, setMeetingIdType] = useState<'auto' | 'pmi'>('auto');
  const [hasPasscode, setHasPasscode] = useState(true);
  const [passcode, setPasscode] = useState('4SjyLA');
  const [hasWaitingRoom, setHasWaitingRoom] = useState(true);
  const [hostVideo, setHostVideo] = useState<'on' | 'off'>('off');
  const [participantVideo, setParticipantVideo] = useState<'on' | 'off'>('off');

  // UI state
  const [showTopNotice, setShowTopNotice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMeeting, setSuccessMeeting] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const checkIsFuture = (dStr: string, hStr: string, mStr: string, pStr: 'AM' | 'PM') => {
    if (!dStr) return false;
    let h = parseInt(hStr, 10);
    if (pStr === 'PM' && h < 12) h += 12;
    if (pStr === 'AM' && h === 12) h = 0;
    const parts = dStr.split('-').map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) return false;
    const [year, month, day] = parts;
    const selected = new Date(year, month - 1, day, h, parseInt(mStr, 10) || 0, 0);
    return !isNaN(selected.getTime()) && selected.getTime() > Date.now();
  };

  const handleDateChange = (newDate: string) => {
    setDate(newDate);
    if (errorMessage === 'Meeting date and time must be in the future.') {
      if (checkIsFuture(newDate, timeHour, timeMinute, timePeriod)) {
        setErrorMessage(null);
      }
    }
  };

  const handleHourChange = (newHour: string) => {
    setTimeHour(newHour);
    if (errorMessage === 'Meeting date and time must be in the future.') {
      if (checkIsFuture(date, newHour, timeMinute, timePeriod)) {
        setErrorMessage(null);
      }
    }
  };

  const handleMinuteChange = (newMinute: string) => {
    setTimeMinute(newMinute);
    if (errorMessage === 'Meeting date and time must be in the future.') {
      if (checkIsFuture(date, timeHour, newMinute, timePeriod)) {
        setErrorMessage(null);
      }
    }
  };

  const handlePeriodChange = (newPeriod: 'AM' | 'PM') => {
    setTimePeriod(newPeriod);
    if (errorMessage === 'Meeting date and time must be in the future.') {
      if (checkIsFuture(date, timeHour, timeMinute, newPeriod)) {
        setErrorMessage(null);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim()) {
      setErrorMessage('Please provide a meeting topic.');
      return;
    }

    if (!date) {
      setErrorMessage('Please select a meeting date.');
      return;
    }

    // Frontend validation: Ensure scheduled datetime is strictly in the future
    if (!checkIsFuture(date, timeHour, timeMinute, timePeriod)) {
      setErrorMessage('Meeting date and time must be in the future.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      // Convert 12h to 24h format for ISO string
      let hourNum = parseInt(timeHour, 10);
      if (timePeriod === 'PM' && hourNum < 12) hourNum += 12;
      if (timePeriod === 'AM' && hourNum === 12) hourNum = 0;
      const formattedHour = hourNum.toString().padStart(2, '0');

      const scheduledAtIso = `${date}T${formattedHour}:${timeMinute}:00`;
      const totalDuration = parseInt(durationHours, 10) * 60 + parseInt(durationMinutes, 10);

      const meeting = await api.scheduleMeeting({
        title: topic.trim(),
        description: description.trim(),
        scheduled_at: scheduledAtIso,
        duration_minutes: totalDuration > 0 ? totalDuration : 45,
        host_email: currentUser?.email || 'atithi@zoom.clone',
        host_id: currentUser?.id,
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
    <div style={{ minHeight: '100vh', backgroundColor: '#F7F8FA', color: '#1E293B', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Header ─────────────────────────────────────────────── */}
      <header
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '12px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Link
          href="/"
          style={{
            fontSize: '28px',
            fontWeight: 800,
            color: '#0E71EB',
            letterSpacing: '-1.5px',
            textDecoration: 'none',
          }}
        >
          zoom
        </Link>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <Link
            href="/join"
            style={{
              color: '#334155',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 12px',
            }}
          >
            Join
          </Link>
          <Link
            href="/dashboard"
            style={{
              color: '#334155',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '6px 12px',
            }}
          >
            Host
          </Link>
          <Link
            href="/dashboard"
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '50%',
              backgroundColor: '#1E293B',
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: '14px',
              textDecoration: 'none',
            }}
          >
            {defaultHostName.charAt(0).toUpperCase()}
          </Link>
        </div>
      </header>

      {/* ── Green Banner / Info Alert (Image 3 exact) ───────────────── */}
      {showTopNotice && (
        <div
          style={{
            backgroundColor: '#ECFDF5',
            borderBottom: '1px solid #A7F3D0',
            padding: '10px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '13px',
            color: '#065F46',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', maxWidth: '1000px', margin: '0 auto', flex: 1 }}>
            <CheckCircle2 size={16} color="#059669" style={{ flexShrink: 0 }} />
            <span>
              Make the most out of your meetings with Zoom Workplace. Automatically manage and review upcoming sessions.{' '}
              <span style={{ textDecoration: 'underline', fontWeight: 600, cursor: 'pointer' }}>Learn More</span>
            </span>
          </div>
          <button
            onClick={() => setShowTopNotice(false)}
            style={{ background: 'none', border: 'none', color: '#065F46', cursor: 'pointer', padding: '4px' }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Sub Navigation Dropdown (Image 3 exact) ─────────────────── */}
      <div
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '8px 32px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
      >
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#F1F5F9',
            padding: '6px 14px',
            borderRadius: '20px',
            fontSize: '13px',
            fontWeight: 600,
            color: '#0E71EB',
            border: 'none',
            cursor: 'pointer',
          }}
        >
          <span>Meetings</span>
          <ChevronDown size={14} />
        </button>
      </div>

      {/* ── Main Schedule Container ─────────────────────────────────── */}
      <main style={{ maxWidth: '720px', width: '100%', margin: '24px auto', padding: '0 20px', flex: 1 }}>
        <Link
          href="/dashboard"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '13px',
            color: '#0E71EB',
            fontWeight: 600,
            textDecoration: 'none',
            marginBottom: '16px',
          }}
        >
          <ArrowLeft size={14} />
          <span>Back to Meetings</span>
        </Link>

        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '24px' }}>
          Schedule Meeting
        </h1>

        {successMeeting ? (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '36px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.05)',
              textAlign: 'center',
            }}
          >
            <CheckCircle2 size={54} color="#10B981" style={{ margin: '0 auto 16px' }} />
            <h2 style={{ fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>Meeting Scheduled!</h2>
            <p style={{ color: '#64748B', fontSize: '14px', marginBottom: '24px' }}>
              Your meeting has been saved to SQLite and added to your upcoming meetings.
            </p>

            <div
              style={{
                backgroundColor: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: '12px',
                padding: '20px',
                textAlign: 'left',
                fontSize: '14px',
                marginBottom: '28px',
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <strong>Topic:</strong> {successMeeting.title}
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Meeting ID:</strong>{' '}
                <span style={{ color: '#0E71EB', fontWeight: 700 }}>{successMeeting.meeting_id}</span>
              </div>
              <div style={{ marginBottom: '8px' }}>
                <strong>Time:</strong> {new Date(successMeeting.scheduled_at).toLocaleString()}
              </div>
              <div style={{ marginBottom: '8px', wordBreak: 'break-all' }}>
                <strong>Invite Link:</strong> {successMeeting.invite_link}
              </div>
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
                onClick={() => router.push('/dashboard')}
              >
                Return to Meetings
              </button>
            </div>
          </div>
        ) : (
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '16px',
              border: '1px solid #E2E8F0',
              padding: '32px',
              boxShadow: '0 4px 20px rgba(0, 0, 0, 0.04)',
            }}
          >
            {errorMessage && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  backgroundColor: '#FEF2F2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B',
                  padding: '12px 14px',
                  borderRadius: '8px',
                  fontSize: '13px',
                  marginBottom: '20px',
                }}
              >
                <AlertTriangle size={16} />
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
              {/* Topic */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Topic
                </label>
                <input
                  type="text"
                  required
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
                {!showDescription ? (
                  <button
                    type="button"
                    onClick={() => setShowDescription(true)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: '#0E71EB',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      padding: 0,
                      marginTop: '8px',
                    }}
                  >
                    + Add Description
                  </button>
                ) : (
                  <div style={{ marginTop: '10px' }}>
                    <textarea
                      placeholder="Add meeting agenda or notes..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 14px',
                        borderRadius: '8px',
                        border: '1px solid #CBD5E1',
                        fontSize: '13px',
                        outline: 'none',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                )}
              </div>

              {/* When */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  When
                </label>
                <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => handleDateChange(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: errorMessage === 'Meeting date and time must be in the future.' ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />

                  {/* Hour */}
                  <select
                    value={timeHour}
                    onChange={(e) => handleHourChange(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: errorMessage === 'Meeting date and time must be in the future.' ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    {['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'].map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>

                  {/* Minute */}
                  <select
                    value={timeMinute}
                    onChange={(e) => handleMinuteChange(e.target.value)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: errorMessage === 'Meeting date and time must be in the future.' ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    {['00', '15', '30', '45'].map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>

                  {/* AM/PM */}
                  <select
                    value={timePeriod}
                    onChange={(e) => handlePeriodChange(e.target.value as any)}
                    style={{
                      padding: '10px 12px',
                      borderRadius: '8px',
                      border: errorMessage === 'Meeting date and time must be in the future.' ? '1px solid #EF4444' : '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="AM">AM</option>
                    <option value="PM">PM</option>
                  </select>
                </div>

                {errorMessage === 'Meeting date and time must be in the future.' && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#DC2626',
                      fontSize: '12px',
                      fontWeight: 500,
                      marginTop: '8px',
                    }}
                  >
                    <AlertTriangle size={14} />
                    <span>Meeting date and time must be in the future.</span>
                  </div>
                )}
              </div>

              {/* Duration */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Duration
                </label>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <select
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="0">0 hr</option>
                    <option value="1">1 hr</option>
                    <option value="2">2 hr</option>
                  </select>

                  <select
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(e.target.value)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: '8px',
                      border: '1px solid #CBD5E1',
                      fontSize: '14px',
                      outline: 'none',
                      backgroundColor: 'white',
                    }}
                  >
                    <option value="15">15 min</option>
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                  </select>
                </div>
              </div>

              {/* Time Zone */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Time Zone
                </label>
                <select
                  value={timeZone}
                  onChange={(e) => setTimeZone(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    border: '1px solid #CBD5E1',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white',
                    boxSizing: 'border-box',
                  }}
                >
                  <option value="(GMT+5:30) India">(GMT+5:30) India</option>
                  <option value="(GMT-08:00) Pacific Time">(GMT-08:00) Pacific Time (US and Canada)</option>
                  <option value="(GMT-05:00) Eastern Time">(GMT-05:00) Eastern Time (US and Canada)</option>
                  <option value="(GMT+00:00) UTC">(GMT+00:00) Universal Time Coordinated</option>
                  <option value="(GMT+01:00) London">(GMT+01:00) London, Dublin</option>
                </select>
              </div>

              {/* Meeting ID radio buttons (Image 3 exact) */}
              <div>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '8px' }}>
                  Meeting ID
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '14px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="meetingIdType"
                      checked={meetingIdType === 'auto'}
                      onChange={() => setMeetingIdType('auto')}
                      style={{ accentColor: '#0E71EB' }}
                    />
                    <span>Generate Automatically</span>
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="radio"
                      name="meetingIdType"
                      checked={meetingIdType === 'pmi'}
                      onChange={() => setMeetingIdType('pmi')}
                      style={{ accentColor: '#0E71EB' }}
                    />
                    <span>Personal Meeting ID 635 012 0991</span>
                  </label>
                </div>
              </div>

              {/* Security section (Image 3 exact) */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                  Security
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', fontSize: '13px' }}>
                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={hasPasscode}
                        onChange={(e) => setHasPasscode(e.target.checked)}
                        style={{ accentColor: '#0E71EB' }}
                      />
                      <span>Passcode</span>
                    </label>
                    {hasPasscode && (
                      <div style={{ marginTop: '8px', marginLeft: '24px' }}>
                        <input
                          type="text"
                          value={passcode}
                          onChange={(e) => setPasscode(e.target.value)}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '6px',
                            border: '1px solid #CBD5E1',
                            fontSize: '13px',
                            width: '120px',
                          }}
                        />
                        <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px' }}>
                          Only invitees with the invite link or passcode can join the meeting.
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontWeight: 600 }}>
                      <input
                        type="checkbox"
                        checked={hasWaitingRoom}
                        onChange={(e) => setHasWaitingRoom(e.target.checked)}
                        style={{ accentColor: '#0E71EB' }}
                      />
                      <span>Waiting Room</span>
                    </label>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '4px', marginLeft: '24px' }}>
                      Only users admitted by the host can join the meeting.
                    </div>
                  </div>
                </div>
              </div>

              {/* Video section (Image 3 exact) */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '10px' }}>
                  Video
                </label>
                <div style={{ display: 'flex', gap: '40px', fontSize: '13px' }}>
                  <div>
                    <span style={{ fontWeight: 600, marginRight: '12px' }}>Host:</span>
                    <label style={{ marginRight: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="hostVideo"
                        checked={hostVideo === 'on'}
                        onChange={() => setHostVideo('on')}
                        style={{ accentColor: '#0E71EB', marginRight: '4px' }}
                      />
                      on
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="hostVideo"
                        checked={hostVideo === 'off'}
                        onChange={() => setHostVideo('off')}
                        style={{ accentColor: '#0E71EB', marginRight: '4px' }}
                      />
                      off
                    </label>
                  </div>

                  <div>
                    <span style={{ fontWeight: 600, marginRight: '12px' }}>Participant:</span>
                    <label style={{ marginRight: '10px', cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="partVideo"
                        checked={participantVideo === 'on'}
                        onChange={() => setParticipantVideo('on')}
                        style={{ accentColor: '#0E71EB', marginRight: '4px' }}
                      />
                      on
                    </label>
                    <label style={{ cursor: 'pointer' }}>
                      <input
                        type="radio"
                        name="partVideo"
                        checked={participantVideo === 'off'}
                        onChange={() => setParticipantVideo('off')}
                        style={{ accentColor: '#0E71EB', marginRight: '4px' }}
                      />
                      off
                    </label>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #F1F5F9', paddingTop: '20px' }}>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    padding: '10px 28px',
                    fontSize: '14px',
                    fontWeight: 600,
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    'Save'
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => router.push('/dashboard')}
                  className="btn-secondary"
                  style={{
                    padding: '10px 24px',
                    fontSize: '14px',
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* ── Zoom Dark Navy Footer ───────────────────────────────────── */}
      <ZoomFooter />
    </div>
  );
}
