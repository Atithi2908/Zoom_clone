'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Calendar,
  Video,
  Plus,
  Copy,
  Check,
  LogOut,
  ExternalLink,
  Loader2,
  ChevronDown,
  ChevronRight,
  MoreHorizontal,
  MessageCircle,
  Users,
  Search,
  Clock,
  X,
  AlertTriangle,
} from 'lucide-react';
import { auth, UserProfile } from '@/lib/auth';
import { api } from '@/lib/api';
import { Meeting } from '@/types';
import ZoomFooter from '@/components/common/ZoomFooter';

export default function DashboardView() {
  const router = useRouter();
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [upcomingMeetings, setUpcomingMeetings] = useState<Meeting[]>([]);
  const [recentMeetings, setRecentMeetings] = useState<Meeting[]>([]);
  const [isCreatingInstant, setIsCreatingInstant] = useState(false);
  const [copiedPmi, setCopiedPmi] = useState(false);
  const [copiedInvitationId, setCopiedInvitationId] = useState<string | null>(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [joinMeetingIdInput, setJoinMeetingIdInput] = useState('');
  const [joinLoading, setJoinLoading] = useState(false);
  const [showHostModal, setShowHostModal] = useState(false);
  const [hostMeetingNameInput, setHostMeetingNameInput] = useState('');

  const personalMeetingId = '828 443 0991';

  const formatMeetingTime = (scheduledAt: string, durationMinutes: number = 40) => {
    try {
      const start = new Date(scheduledAt);
      if (isNaN(start.getTime())) return 'Scheduled';
      const end = new Date(start.getTime() + (durationMinutes || 40) * 60000);
      const fmt = (d: Date) =>
        d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
      return `${fmt(start)} - ${fmt(end)}`;
    } catch {
      return 'Scheduled';
    }
  };

  const formatMeetingDate = (scheduledAt: string) => {
    try {
      const d = new Date(scheduledAt);
      const now = new Date();
      if (d.toDateString() === now.toDateString()) return 'Today';
      const tmrw = new Date(now);
      tmrw.setDate(tmrw.getDate() + 1);
      if (d.toDateString() === tmrw.toDateString()) return 'Tomorrow';
      return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    } catch {
      return 'Today';
    }
  };

  const formatRecentMeetingDate = (isoStr?: string | null) => {
    if (!isoStr) return 'Recently';
    try {
      const d = new Date(isoStr);
      if (isNaN(d.getTime())) return 'Recently';
      return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return 'Recently';
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function initializeDashboard() {
      setLoading(true);
      setAuthError(null);
      try {
        // If user explicitly signed out, do not auto-login
        if (auth.isSignedOut()) {
          if (isMounted) {
            setUser(null);
            setUpcomingMeetings([]);
            setRecentMeetings([]);
            setLoading(false);
          }
          return;
        }

        // Fast path: if user already in localStorage, use immediately for instant paint
        const cached = auth.getCurrentUser();
        if (cached && isMounted) {
          setUser(cached);
        }

        // Ensure default user session is valid (verifies token or fetches default user from backend)
        const currentUser = await auth.ensureDefaultUser();
        if (!isMounted) return;
        setUser(currentUser);

        if (currentUser) {
          // Fetch upcoming and recent meetings for this default/selected user
          const [upcoming, recent] = await Promise.all([
            api.getUpcomingMeetings(currentUser.email).catch((err) => {
              console.error('Error fetching upcoming meetings:', err);
              return [];
            }),
            api.getRecentMeetings(currentUser.email).catch((err) => {
              console.error('Error fetching recent meetings:', err);
              return [];
            }),
          ]);

          if (isMounted) {
            setUpcomingMeetings(upcoming);
            setRecentMeetings(recent);
          }
        }
      } catch (err: any) {
        console.warn('Notice loading default user or meetings:', err);
        if (isMounted) {
          if (!auth.isSignedOut()) {
            const fallback = auth.getCurrentUser() || { id: 1, email: 'atithi@zoom.clone', full_name: 'Atithi' };
            setUser(fallback);
          }
          setAuthError(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    initializeDashboard();

    const handleAuthChange = () => {
      if (auth.isSignedOut()) {
        setUser(null);
        setUpcomingMeetings([]);
        setRecentMeetings([]);
        return;
      }
      const u = auth.getCurrentUser();
      setUser(u);
      if (u?.email) {
        Promise.all([
          api.getUpcomingMeetings(u.email).catch(() => []),
          api.getRecentMeetings(u.email).catch(() => []),
        ]).then(([upcoming, recent]) => {
          if (isMounted) {
            setUpcomingMeetings(upcoming);
            setRecentMeetings(recent);
          }
        });
      } else {
        setUpcomingMeetings([]);
        setRecentMeetings([]);
      }
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => {
      isMounted = false;
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleCopyPmi = () => {
    navigator.clipboard.writeText(personalMeetingId.replace(/\s+/g, '-'));
    setCopiedPmi(true);
    setTimeout(() => setCopiedPmi(false), 2000);
  };

  const handleCopyInvitation = (meetingId: string, title: string) => {
    const link = `${typeof window !== 'undefined' ? window.location.origin : ''}/meeting/${meetingId.replace(/\s+/g, '-')}/lobby`;
    navigator.clipboard.writeText(`Join Zoom Meeting: ${title}\nLink: ${link}\nMeeting ID: ${meetingId}`);
    setCopiedInvitationId(meetingId);
    setTimeout(() => setCopiedInvitationId(null), 2000);
  };

  const handleOpenHostModal = () => {
    const hostName = user?.full_name || 'Atithi';
    setHostMeetingNameInput(`${hostName}'s Meeting`);
    setShowHostModal(true);
  };

  const handleStartInstantMeeting = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const chosenTitle = hostMeetingNameInput.trim();
    if (!chosenTitle) return;

    try {
      setIsCreatingInstant(true);
      const hostName = user?.full_name || 'Atithi';
      const meeting = await api.createInstantMeeting({
        title: chosenTitle,
        host_name: hostName,
        host_email: user?.email || 'atithi@zoom.clone',
        host_id: user?.id,
      });
      setShowHostModal(false);
      router.push(`/meeting/${meeting.meeting_id}/lobby?name=${encodeURIComponent(hostName)}`);
    } catch (err) {
      console.error('Failed to create instant meeting:', err);
      alert('Failed to start meeting. Please try again.');
    } finally {
      setIsCreatingInstant(false);
    }
  };

  const handleJoinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const raw = joinMeetingIdInput.trim();
    if (!raw) return;

    let cleanId = raw;
    const match = raw.match(/meeting\/([a-zA-Z0-9-]+)/);
    if (match && match[1]) {
      cleanId = match[1];
    }

    try {
      setJoinLoading(true);
      await api.validateMeeting(cleanId);
      const name = user?.full_name || 'Participant';
      router.push(`/meeting/${cleanId}/lobby?name=${encodeURIComponent(name)}`);
    } catch (err: any) {
      alert(err.message || 'Meeting not found. Please verify the ID.');
    } finally {
      setJoinLoading(false);
    }
  };

  const handleSignOut = () => {
    auth.signOut();
    setUser(null);
    setShowProfileMenu(false);
    setUpcomingMeetings([]);
    setRecentMeetings([]);
  };

  const curUser = user || (typeof window !== 'undefined' && !auth.isSignedOut() ? auth.getCurrentUser() : null);
  const displayName = curUser?.full_name || 'Guest User';
  const displayEmail = curUser?.email || '';

  const meetingsToShow = [...upcomingMeetings];

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', color: '#1E293B', display: 'flex', flexDirection: 'column', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif' }}>
      {/* ── Top Black Utility Bar ────────────────────────────────────── */}
      <div
        style={{
          height: '34px',
          backgroundColor: '#020617',
          color: '#CBD5E1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '0 32px',
          fontSize: '12px',
          fontWeight: 500,
          gap: '20px',
        }}
        className="zoom-top-black-bar"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', color: '#CBD5E1' }}>
          <Search size={14} color="#94A3B8" />
          <span>Search</span>
        </div>
        <span style={{ cursor: 'pointer', color: '#CBD5E1' }}>Support</span>
        <span style={{ cursor: 'pointer', color: '#CBD5E1' }}>0008000503335</span>
        <span style={{ color: '#475569' }}>|</span>
        <span style={{ cursor: 'pointer', color: '#CBD5E1' }}>Contact Sales</span>
        <span style={{ cursor: 'pointer', color: '#CBD5E1' }}>Request a Demo</span>
      </div>

      {/* ── Main White Navigation Bar ─────────────────────────────────── */}
      <header
        style={{
          height: '64px',
          borderBottom: '1px solid #E2E8F0',
          backgroundColor: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 32px',
          position: 'sticky',
          top: 0,
          zIndex: 50,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
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
          <nav style={{ display: 'flex', alignItems: 'center', gap: '22px', fontSize: '14px', fontWeight: 500, color: '#475569' }} className="zoom-top-links">
            <span style={{ cursor: 'pointer' }}>Products</span>
            <span style={{ cursor: 'pointer' }}>Solutions</span>
            <span style={{ cursor: 'pointer' }}>Resources</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setShowUpgradeModal(true)}>Plans &amp; Pricing</span>
          </nav>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', fontSize: '14px', fontWeight: 500, color: '#334155' }}>
          <Link href="/schedule" style={{ color: '#334155', textDecoration: 'none' }}>
            Schedule
          </Link>

          <span onClick={() => setShowJoinModal(true)} style={{ color: '#334155', cursor: 'pointer' }}>
            Join
          </span>

          <div
            onClick={handleOpenHostModal}
            style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#334155' }}
          >
            {isCreatingInstant ? <Loader2 size={15} className="animate-spin" /> : null}
            <span>Host</span>
            <ChevronDown size={14} color="#64748B" />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', color: '#334155' }}>
            <span>Web App</span>
            <ChevronDown size={14} color="#64748B" />
          </div>

          {/* Profile Area: Sign In / Sign Up when signed out, Avatar menu when logged in */}
          {!curUser ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => router.push('/signin')}
                style={{
                  backgroundColor: 'transparent',
                  color: '#0E71EB',
                  border: '1px solid #BFDBFE',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/signup')}
                style={{
                  backgroundColor: '#0E71EB',
                  color: '#FFFFFF',
                  border: 'none',
                  padding: '6px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  boxShadow: '0 2px 4px rgba(14,113,235,0.2)',
                }}
              >
                Sign Up Free
              </button>
            </div>
          ) : (
            <div style={{ position: 'relative' }}>
              <div
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                style={{
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#18181B',
                  borderRadius: '8px',
                  color: '#FFFFFF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 700,
                  fontSize: '13px',
                  cursor: 'pointer',
                }}
                title={displayName}
              >
                {displayName.charAt(0).toUpperCase()}
              </div>

              {showProfileMenu && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '42px',
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px solid #E2E8F0',
                    boxShadow: '0 12px 32px rgba(0,0,0,0.12)',
                    width: '260px',
                    padding: '12px',
                    zIndex: 100,
                  }}
                >
                  <div style={{ padding: '8px 12px', borderBottom: '1px solid #F1F5F9' }}>
                    <div style={{ fontWeight: 700, fontSize: '14px', color: '#0F172A' }}>{displayName}</div>
                    <div style={{ fontSize: '12px', color: '#64748B', marginTop: '2px' }}>{displayEmail}</div>
                    <div style={{ fontSize: '11px', color: '#0E71EB', fontWeight: 600, marginTop: '4px' }}>Plan: Workplace Basic</div>
                  </div>

                  <div style={{ padding: '6px 0' }}>
                    <Link
                      href="/schedule"
                      onClick={() => setShowProfileMenu(false)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#334155',
                        textDecoration: 'none',
                        borderRadius: '6px',
                      }}
                    >
                      <Calendar size={15} color="#0E71EB" />
                      <span>Schedule Meeting</span>
                    </Link>

                    <div
                      onClick={() => { setShowProfileMenu(false); setShowJoinModal(true); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#334155',
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                    >
                      <Plus size={15} color="#0E71EB" />
                      <span>Join Meeting</span>
                    </div>

                    <div
                      onClick={() => { setShowProfileMenu(false); router.push('/signup'); }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#0E71EB',
                        cursor: 'pointer',
                        borderRadius: '6px',
                      }}
                    >
                      <Users size={15} color="#0E71EB" />
                      <span>Sign Up New User</span>
                    </div>

                    <div
                      onClick={handleSignOut}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        fontSize: '13px',
                        color: '#EF4444',
                        cursor: 'pointer',
                        borderRadius: '6px',
                        borderTop: '1px solid #F1F5F9',
                        marginTop: '6px',
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* ── Main Layout: Sidebar + Center Content + Right Column ──────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 'calc(100vh - 98px)' }}>
        {/* ── Left Sidebar (Zoom workplace style) ────────────────────── */}
        <aside
          style={{
            width: '240px',
            flexShrink: 0,
            borderRight: '1px solid #F1F5F9',
            backgroundColor: '#FFFFFF',
            padding: '20px 16px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
          className="zoom-sidebar"
        >
          <div>
            {/* Active 'Home' item */}
            <div
              style={{
                backgroundColor: '#EBF4FF',
                color: '#0E71EB',
                fontWeight: 600,
                fontSize: '14px',
                borderRadius: '8px',
                padding: '10px 16px',
                marginBottom: '20px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
              }}
            >
              <span>Home</span>
            </div>

            {/* My Products Section */}
            <div style={{ fontSize: '12px', fontWeight: 600, color: '#64748B', padding: '0 8px 10px' }}>
              My Products
            </div>

            <nav style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '13px', color: '#334155' }}>
              <div
                onClick={() => router.push('/dashboard')}
                style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontWeight: 500 }}
              >
                <span>Meetings</span>
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                <span>Recordings</span>
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer' }}>
                <span>Summaries</span>
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>Hub</span>
                  <span style={{ backgroundColor: '#EBF4FF', color: '#0E71EB', fontSize: '10px', fontWeight: 700, padding: '1px 5px', borderRadius: '4px' }}>New</span>
                </div>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Whiteboards</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Notes</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Clips</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Canvas</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Paper</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Sheets</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Slides</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Tasks</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '7px 12px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span>Scheduler</span>
                <ExternalLink size={12} color="#94A3B8" />
              </div>
              <div style={{ padding: '8px 12px', color: '#64748B', fontSize: '12px', cursor: 'pointer' }}>
                <span>Discover More Products</span>
              </div>
            </nav>
          </div>

          {/* Bottom Accordion Items */}
          <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px', display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: '#475569' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px' }}>
              <ChevronRight size={14} />
              <span>My Account</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px' }}>
              <ChevronRight size={14} />
              <span>Admin</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', cursor: 'pointer', padding: '4px 8px' }}>
              <ChevronRight size={14} />
              <span>Support</span>
            </div>
          </div>
        </aside>

        {/* ── Main Content Area: 2 Columns (Center + Right) ───────────── */}
        <main
          style={{
            flex: 1,
            backgroundColor: '#F8FAFC',
            padding: '32px 36px',
            display: 'grid',
            gridTemplateColumns: 'minmax(0, 1.4fr) minmax(320px, 0.9fr)',
            gap: '24px',
            alignItems: 'start',
          }}
          className="dashboard-main-grid"
        >
          {/* ── Center Column ─────────────────────────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Card 1: User Profile Card (or Signed-Out Welcome Prompt) */}
            {!curUser ? (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '24px 28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  flexWrap: 'wrap',
                  gap: '16px',
                }}
                className="zoom-profile-card"
              >
                <div>
                  <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Welcome to Zoom Workplace
                  </h2>
                  <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>
                    You are currently signed out. Sign up free to host meetings and create your personal room.
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <button
                    onClick={() => router.push('/signin')}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#0E71EB',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '8px 18px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Sign In
                  </button>
                  <button
                    onClick={() => router.push('/signup')}
                    style={{
                      backgroundColor: '#0E71EB',
                      color: '#FFFFFF',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '8px 20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      boxShadow: '0 2px 4px rgba(14,113,235,0.2)',
                    }}
                  >
                    Sign Up as New User
                  </button>
                </div>
              </div>
            ) : (
              <div
                style={{
                  backgroundColor: '#FFFFFF',
                  borderRadius: '12px',
                  border: '1px solid #E2E8F0',
                  padding: '24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                }}
                className="zoom-profile-card"
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
                  <div
                    style={{
                      width: '60px',
                      height: '60px',
                      backgroundColor: '#18181B',
                      borderRadius: '14px',
                      color: '#FFFFFF',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '22px',
                      fontWeight: 700,
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                      {displayName}
                    </h2>
                    <div style={{ fontSize: '13px', color: '#64748B', marginTop: '4px' }}>
                      Plan: <span style={{ color: '#0F172A', fontWeight: 600 }}>Workplace Basic</span>
                    </div>
                  </div>
                </div>

                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }} className="zoom-profile-card-actions">
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: '#0E71EB',
                      border: '1px solid #BFDBFE',
                      borderRadius: '6px',
                      padding: '7px 16px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Manage Plan
                  </button>
                  <span
                    onClick={() => setShowUpgradeModal(true)}
                    style={{ fontSize: '12px', color: '#0E71EB', cursor: 'pointer', fontWeight: 500 }}
                  >
                    View Plan Details
                  </span>
                </div>
              </div>
            )}

            {/* Card 2: Workplace Pro Promo Banner */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '28px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '24px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                overflow: 'hidden',
              }}
              className="workplace-promo-card"
            >
              <div style={{ maxWidth: '380px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#0E71EB', fontSize: '13px', fontWeight: 700, marginBottom: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#0E71EB' }} />
                  <span>Workplace Pro</span>
                </div>
                <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#0F172A', margin: '4px 0 10px', letterSpacing: '-0.3px' }}>
                  Upgrade and save!
                </h3>
                <p style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5, margin: 0 }}>
                  Unlock savings up to 16% when you select an annual Zoom Workplace Pro plan.
                </p>
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  style={{
                    backgroundColor: '#0E71EB',
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '24px',
                    padding: '10px 22px',
                    fontSize: '13px',
                    fontWeight: 600,
                    marginTop: '20px',
                    cursor: 'pointer',
                    boxShadow: '0 2px 8px rgba(14, 113, 235, 0.25)',
                  }}
                >
                  Upgrade today
                </button>
              </div>

              {/* Graphic: 3 video call participants preview */}
              <div
                style={{
                  width: '210px',
                  height: '145px',
                  backgroundColor: '#07153A',
                  borderRadius: '14px',
                  padding: '8px',
                  display: 'grid',
                  gridTemplateRows: '1fr 1fr',
                  gap: '6px',
                  flexShrink: 0,
                  boxShadow: '0 8px 20px rgba(7, 21, 58, 0.15)',
                }}
              >
                {/* Top Person */}
                <div
                  style={{
                    backgroundColor: '#1E293B',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#F59E0B', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '14px' }}>
                    &#128522;
                  </div>
                  <span style={{ position: 'absolute', bottom: '4px', left: '6px', fontSize: '9px', color: 'white', background: 'rgba(0,0,0,0.6)', padding: '1px 4px', borderRadius: '3px' }}>
                    Sydney Rao
                  </span>
                </div>

                {/* Bottom 2 Persons */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                  <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#10B981', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                      &#129489;
                    </div>
                  </div>
                  <div style={{ backgroundColor: '#1E293B', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    <div style={{ width: '26px', height: '26px', borderRadius: '50%', backgroundColor: '#8B5CF6', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>
                      &#128105;
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Recent Activity Card */}
            <div>
              <div style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', marginBottom: '12px' }}>
                Recent activity
              </div>

              {recentMeetings.length > 0 ? (
                /* Dynamic Recent Meetings / Activity */
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {recentMeetings.map((rm) => {
                    const isMeetingHost = Boolean(
                      (rm.host_id && curUser?.id === rm.host_id) ||
                      (rm.host_email && curUser?.email?.toLowerCase() === rm.host_email?.toLowerCase())
                    );
                    const formattedDate = formatRecentMeetingDate(rm.created_at || rm.scheduled_at);
                    const cleanId = rm.meeting_id.replace(/\s+/g, '-');

                    return (
                      <div
                        key={rm.meeting_id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '12px',
                          border: '1px solid #E2E8F0',
                          padding: '16px 18px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                          <div
                            style={{
                              width: '60px',
                              height: '52px',
                              backgroundColor: '#EFF6FF',
                              border: '1px solid #DBEAFE',
                              borderRadius: '8px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              flexShrink: 0,
                            }}
                          >
                            <Video size={24} color="#0E71EB" />
                          </div>

                          <div>
                            <div
                              onClick={() => router.push(`/meeting/${cleanId}/lobby?name=${encodeURIComponent(displayName)}`)}
                              style={{
                                fontSize: '15px',
                                fontWeight: 600,
                                color: '#0E71EB',
                                cursor: 'pointer',
                              }}
                            >
                              {rm.title}
                            </div>
                            <div style={{ fontSize: '12px', color: '#64748B', marginTop: '3px', marginBottom: '6px' }}>
                              Meeting ID: {rm.meeting_id} &bull; {formattedDate}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <span
                                style={{
                                  backgroundColor: isMeetingHost ? '#EFF6FF' : '#F1F5F9',
                                  color: isMeetingHost ? '#1D4ED8' : '#475569',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '1px 8px',
                                  borderRadius: '10px',
                                }}
                              >
                                {isMeetingHost ? 'Host' : 'Attended'}
                              </span>
                              <span
                                style={{
                                  backgroundColor: rm.status === 'completed' ? '#FEF2F2' : '#ECFDF5',
                                  color: rm.status === 'completed' ? '#DC2626' : '#059669',
                                  fontSize: '11px',
                                  fontWeight: 600,
                                  padding: '1px 8px',
                                  borderRadius: '10px',
                                }}
                              >
                                {rm.status === 'completed' ? 'Ended' : 'Meeting'}
                              </span>
                            </div>
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <button
                            onClick={() => router.push(`/meeting/${cleanId}/lobby?name=${encodeURIComponent(displayName)}`)}
                            style={{
                              backgroundColor: '#0E71EB',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 14px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Rejoin
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Empty State */
                <div
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderRadius: '12px',
                    border: '1px dashed #CBD5E1',
                    padding: '36px 20px',
                    textAlign: 'center',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                  }}
                >
                  <Clock size={32} color="#94A3B8" style={{ margin: '0 auto 10px', display: 'block' }} />
                  <div style={{ fontSize: '15px', fontWeight: 600, color: '#475569' }}>
                    No recent activity
                  </div>
                  <p style={{ fontSize: '13px', color: '#94A3B8', margin: '4px 0 0' }}>
                    Your recently viewed meetings, whiteboards, and notes will show up here.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right Column: Quick Actions + Meetings ─────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Right Card 1: Action Buttons + Personal Meeting ID */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
                textAlign: 'center',
              }}
            >
              {/* 3 Buttons Row */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '28px', marginBottom: '24px' }}>
                {/* Schedule */}
                <Link
                  href="/schedule"
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textDecoration: 'none' }}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      backgroundColor: '#0E71EB',
                      borderRadius: '16px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(14, 113, 235, 0.25)',
                      position: 'relative',
                    }}
                  >
                    <Calendar size={24} />
                    <span style={{ position: 'absolute', fontSize: '9px', fontWeight: 800, marginTop: '2px' }}>19</span>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Schedule</span>
                </Link>

                {/* Join */}
                <div
                  onClick={() => setShowJoinModal(true)}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      backgroundColor: '#0E71EB',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(14, 113, 235, 0.25)',
                    }}
                  >
                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', border: '2.5px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Plus size={16} strokeWidth={3} />
                    </div>
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Join</span>
                </div>

                {/* Host */}
                <div
                  onClick={handleOpenHostModal}
                  style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', cursor: 'pointer' }}
                >
                  <div
                    style={{
                      width: '54px',
                      height: '54px',
                      backgroundColor: '#FF7426',
                      borderRadius: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'white',
                      boxShadow: '0 4px 12px rgba(255, 116, 38, 0.25)',
                    }}
                  >
                    {isCreatingInstant ? <Loader2 size={24} className="animate-spin" /> : <Video size={24} />}
                  </div>
                  <span style={{ fontSize: '12px', fontWeight: 500, color: '#334155' }}>Host</span>
                </div>
              </div>

              {/* Personal Meeting ID Section */}
              <div style={{ borderTop: '1px solid #F1F5F9', paddingTop: '16px' }}>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Personal Meeting ID
                </div>
                <div
                  onClick={handleCopyPmi}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: 600,
                    color: '#1E293B',
                    cursor: 'pointer',
                    padding: '4px 8px',
                    borderRadius: '6px',
                  }}
                  title="Click to copy Personal Meeting ID"
                >
                  <span style={{ letterSpacing: '0.5px' }}>{personalMeetingId}</span>
                  {copiedPmi ? <Check size={14} color="#10B981" /> : <Copy size={14} color="#64748B" />}
                </div>
                {copiedPmi && (
                  <div style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, marginTop: '2px' }}>
                    Copied to clipboard!
                  </div>
                )}
              </div>
            </div>

            {/* Right Card 2: Meetings Card */}
            <div
              style={{
                backgroundColor: '#FFFFFF',
                borderRadius: '12px',
                border: '1px solid #E2E8F0',
                padding: '24px 20px',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#0F172A', margin: 0 }}>
                  Meetings
                </h3>
                <Link
                  href="/schedule"
                  style={{ fontSize: '13px', fontWeight: 600, color: '#0E71EB', textDecoration: 'none' }}
                >
                  Visit Meetings
                </Link>
              </div>

              <div
                style={{
                  display: 'inline-block',
                  backgroundColor: '#F1F5F9',
                  borderRadius: '6px',
                  padding: '4px 14px',
                  fontSize: '13px',
                  fontWeight: 600,
                  color: '#334155',
                  marginBottom: '14px',
                }}
              >
                {meetingsToShow.length > 0 && meetingsToShow[0].scheduled_at
                  ? formatMeetingDate(meetingsToShow[0].scheduled_at)
                  : 'Today'}
              </div>

              {meetingsToShow.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {meetingsToShow.map((m) => {
                    const isCopied = copiedInvitationId === m.meeting_id;
                    const dateLabel = formatMeetingDate(m.scheduled_at);
                    const timeRange = formatMeetingTime(m.scheduled_at, m.duration_minutes);
                    return (
                      <div
                        key={m.meeting_id}
                        style={{
                          backgroundColor: '#FFFFFF',
                          borderRadius: '10px',
                          border: '1px solid #E2E8F0',
                          padding: '16px',
                        }}
                      >
                        <div style={{ fontSize: '15px', fontWeight: 700, color: '#0E71EB' }}>
                          {m.title}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', margin: '4px 0 2px', fontWeight: 500 }}>
                          {dateLabel !== 'Today' ? `${dateLabel} • ` : ''}{timeRange}
                        </div>
                        <div style={{ fontSize: '12px', color: '#64748B', marginBottom: '14px' }}>
                          Meeting ID: {m.meeting_id}
                        </div>

                        {/* Action Buttons: [Start] on Left, [Copy Invitation] next to it */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          <button
                            onClick={() => router.push(`/meeting/${m.meeting_id.replace(/\s+/g, '-')}/lobby?name=${encodeURIComponent(displayName)}`)}
                            style={{
                              backgroundColor: '#0E71EB',
                              color: 'white',
                              border: 'none',
                              borderRadius: '6px',
                              padding: '6px 16px',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            Start
                          </button>

                          <button
                            onClick={() => handleCopyInvitation(m.meeting_id, m.title)}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '6px',
                              color: '#0E71EB',
                              backgroundColor: 'transparent',
                              border: 'none',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              padding: 0,
                            }}
                          >
                            {isCopied ? <Check size={14} color="#10B981" /> : <Copy size={14} />}
                            <span>{isCopied ? 'Copied Invitation!' : 'Copy Invitation'}</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* New user: Empty State for scheduled meetings */
                <div
                  style={{
                    backgroundColor: '#F8FAFC',
                    borderRadius: '10px',
                    border: '1px dashed #CBD5E1',
                    padding: '24px 16px',
                    textAlign: 'center',
                  }}
                >
                  <Calendar size={28} color="#94A3B8" style={{ margin: '0 auto 8px', display: 'block' }} />
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>
                    No meetings scheduled for today
                  </div>
                  <p style={{ fontSize: '12px', color: '#94A3B8', margin: '4px 0 14px' }}>
                    Schedule a meeting to connect with your team.
                  </p>
                  <Link
                    href="/schedule"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      backgroundColor: '#0E71EB',
                      color: '#FFFFFF',
                      padding: '6px 14px',
                      borderRadius: '6px',
                      fontSize: '12px',
                      fontWeight: 600,
                      textDecoration: 'none',
                    }}
                  >
                    <Plus size={14} />
                    <span>Schedule Meeting</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* ── Zoom Footer (from user screenshot) ────────────────────────── */}
      <ZoomFooter />

      {/* ── Floating Blue Chat Widget (bottom-right) ──────────────────── */}
      <div
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '52px',
          height: '52px',
          borderRadius: '50%',
          backgroundColor: '#0E71EB',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 6px 18px rgba(14, 113, 235, 0.4)',
          cursor: 'pointer',
          zIndex: 40,
        }}
        onClick={() => alert('Zoom Virtual Assistant: How can we assist you today?')}
        title="Help & Support"
      >
        <MessageCircle size={26} />
      </div>

      {/* ── Join Meeting Modal ────────────────────────────────────────── */}
      {showJoinModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '420px', padding: '28px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Join Meeting</h3>
              <button onClick={() => setShowJoinModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleJoinSubmit}>
              <div className="form-group">
                <label className="form-label">Meeting ID or Link</label>
                <input
                  type="text"
                  placeholder="e.g. 845-4875-7459 or link"
                  value={joinMeetingIdInput}
                  onChange={(e) => setJoinMeetingIdInput(e.target.value)}
                  className="form-input"
                  autoFocus
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
                <button type="submit" disabled={joinLoading || !joinMeetingIdInput.trim()} className="btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                  {joinLoading ? <Loader2 size={16} className="animate-spin" /> : <span>Join</span>}
                </button>
                <button type="button" onClick={() => setShowJoinModal(false)} className="btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
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

            <form onSubmit={handleStartInstantMeeting}>
              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="hostMeetingNameInput" style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#334155', marginBottom: '6px' }}>
                  Meeting Name *
                </label>
                <input
                  id="hostMeetingNameInput"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Juspay Interview Preparation, Team Discussion"
                  value={hostMeetingNameInput}
                  onChange={(e) => setHostMeetingNameInput(e.target.value)}
                  autoFocus
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="submit"
                  disabled={isCreatingInstant || !hostMeetingNameInput.trim()}
                  className="btn-primary"
                  style={{ flex: 1, justifyContent: 'center', background: '#FF7426' }}
                >
                  {isCreatingInstant ? <Loader2 size={16} className="animate-spin" /> : <span>Start Meeting</span>}
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

      {/* ── Plans Modal ──────────────────────────────────────────────── */}
      {showUpgradeModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '640px', padding: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 800, margin: 0 }}>Zoom Workplace Plans</h3>
              <button onClick={() => setShowUpgradeModal(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#64748B' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '24px' }}>
              <div style={{ border: '1px solid #E2E8F0', borderRadius: '12px', padding: '20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>Workplace Basic</div>
                <div style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0', color: '#0F172A' }}>Free</div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  &bull; Unlimited 1:1 and group meetings<br />
                  &bull; HD WebRTC Audio &amp; Video<br />
                  &bull; Real-time in-room chat<br />
                  &bull; SQLite persistence
                </div>
                <button
                  disabled
                  style={{ width: '100%', marginTop: '16px', padding: '8px', borderRadius: '6px', border: '1px solid #CBD5E1', background: '#F8FAFC', color: '#64748B', fontWeight: 600, fontSize: '13px' }}
                >
                  Current Plan
                </button>
              </div>

              <div style={{ border: '2px solid #0E71EB', borderRadius: '12px', padding: '20px', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '16px', fontWeight: 700 }}>Workplace Pro</span>
                  <span style={{ backgroundColor: '#0E71EB', color: 'white', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>Popular</span>
                </div>
                <div style={{ fontSize: '22px', fontWeight: 800, margin: '8px 0', color: '#0E71EB' }}>$13.32 <span style={{ fontSize: '13px', fontWeight: 400, color: '#64748B' }}>/ mo</span></div>
                <div style={{ fontSize: '13px', color: '#64748B', lineHeight: 1.5 }}>
                  &bull; Cloud recordings &amp; AI summaries<br />
                  &bull; 30 hours meeting duration<br />
                  &bull; Dedicated personal meeting rooms<br />
                  &bull; Admin feature governance
                </div>
                <button
                  onClick={() => { alert('You already have all WebRTC and meeting features enabled in this Zoom Clone!'); setShowUpgradeModal(false); }}
                  style={{ width: '100%', marginTop: '16px', padding: '8px', borderRadius: '6px', border: 'none', background: '#0E71EB', color: 'white', fontWeight: 600, fontSize: '13px', cursor: 'pointer' }}
                >
                  Upgrade Today
                </button>
              </div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={() => setShowUpgradeModal(false)} className="btn-secondary" style={{ padding: '8px 24px' }}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
