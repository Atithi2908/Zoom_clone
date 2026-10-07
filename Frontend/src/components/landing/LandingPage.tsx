'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Video,
  Users,
  Calendar,
  Share2,
  Shield,
  Mic,
  MicOff,
  CheckCircle,
  ArrowRight,
  MessageSquare,
  Sparkles,
  Play,
} from 'lucide-react';
import ZoomFooter from '@/components/common/ZoomFooter';
import { auth, UserProfile } from '@/lib/auth';

export default function LandingPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'meetings' | 'chat' | 'host' | 'schedule'>('meetings');
  const [showPlansModal, setShowPlansModal] = useState(false);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);

  useEffect(() => {
    const u = !auth.isSignedOut() ? auth.getCurrentUser() : null;
    setCurrentUser(u);
    const handleAuthChange = () => {
      const updated = !auth.isSignedOut() ? auth.getCurrentUser() : null;
      setCurrentUser(updated);
    };
    window.addEventListener('auth-change', handleAuthChange);
    return () => window.removeEventListener('auth-change', handleAuthChange);
  }, []);

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#FFFFFF', color: '#1E293B', display: 'flex', flexDirection: 'column' }}>
      {/* ── Top Notification Banner ─────────────────────────────────── */}
      <div
        style={{
          background: 'linear-gradient(90deg, #1E1B4B 0%, #2E1065 50%, #1E1B4B 100%)',
          color: '#E0E7FF',
          padding: '10px 24px',
          textAlign: 'center',
          fontSize: '13px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
        }}
      >
        <span
          style={{
            background: 'rgba(147, 51, 234, 0.3)',
            color: '#C084FC',
            padding: '2px 8px',
            borderRadius: '12px',
            fontSize: '11px',
            fontWeight: 700,
            textTransform: 'uppercase',
          }}
        >
          Workplace
        </span>
        <span>Power your connection with Zoom Workplace. Reimagined video collaboration.</span>
        <Link
          href="/signup"
          style={{ color: '#60A5FA', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
        >
          Discover now &gt;
        </Link>
      </div>

      {/* ── Navbar ──────────────────────────────────────────────────── */}
      <nav
        style={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E2E8F0',
          padding: '14px 32px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          position: 'sticky',
          top: 0,
          zIndex: 40,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <Link
            href="/"
            style={{
              fontSize: '30px',
              fontWeight: 800,
              color: '#0E71EB',
              letterSpacing: '-1.5px',
              textDecoration: 'none',
            }}
          >
            zoom
          </Link>
          <div style={{ display: 'none', gap: '20px', fontSize: '14px', fontWeight: 500, color: '#475569' }} className="nav-desktop-links">
            <span style={{ cursor: 'pointer' }}>Products</span>
            <span style={{ cursor: 'pointer' }} onClick={() => setShowPlansModal(true)}>Plans &amp; Pricing</span>
            <Link href="/dashboard" style={{ color: '#0E71EB', fontWeight: 600 }}>Web App</Link>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <Link
            href="/join"
            style={{
              color: '#1E293B',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '8px 12px',
            }}
          >
            Join
          </Link>

          <Link
            href="/dashboard"
            style={{
              color: '#1E293B',
              fontSize: '14px',
              fontWeight: 600,
              textDecoration: 'none',
              padding: '8px 12px',
            }}
          >
            Host
          </Link>

          {currentUser ? (
            <Link
              href="/dashboard"
              style={{
                backgroundColor: '#0E71EB',
                color: '#FFFFFF',
                borderRadius: '24px',
                padding: '9px 18px',
                fontSize: '14px',
                fontWeight: 600,
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span>Dashboard ({currentUser.full_name.split(' ')[0]})</span>
              <ArrowRight size={14} />
            </Link>
          ) : (
            <>
              <Link
                href="/signin"
                style={{
                  color: '#0E71EB',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  padding: '8px 14px',
                }}
              >
                Sign In
              </Link>

              <Link
                href="/signup"
                style={{
                  backgroundColor: '#0E71EB',
                  color: '#FFFFFF',
                  borderRadius: '24px',
                  padding: '9px 18px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  transition: 'background-color 0.15s ease',
                }}
              >
                Sign Up Free
              </Link>
            </>
          )}
        </div>
      </nav>

      {/* ── Hero Section (Image 5 exact royal blue gradient) ────────── */}
      <section
        style={{
          background: 'linear-gradient(180deg, #07153A 0%, #0639A0 55%, #024DBF 100%)',
          color: '#FFFFFF',
          padding: '72px 24px 80px',
          textAlign: 'center',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        <div style={{ maxWidth: '920px', margin: '0 auto' }}>
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              backgroundColor: 'rgba(255, 255, 255, 0.12)',
              backdropFilter: 'blur(8px)',
              padding: '6px 16px',
              borderRadius: '20px',
              fontSize: '12px',
              fontWeight: 700,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              marginBottom: '24px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
            }}
          >
            <span>Zoom Workplace</span>
          </div>

          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 56px)',
              fontWeight: 800,
              lineHeight: 1.15,
              marginBottom: '20px',
              letterSpacing: '-1.5px',
            }}
          >
            Find new fresh possible <br /> when work connects.
          </h1>

          <p
            style={{
              fontSize: 'clamp(16px, 2vw, 19px)',
              lineHeight: 1.6,
              opacity: 0.9,
              maxWidth: '680px',
              margin: '0 auto 36px',
              fontWeight: 400,
            }}
          >
            One platform for connection, collaboration, and creating spaces where people and ideas thrive.
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '14px',
              marginBottom: '56px',
            }}
          >
            <Link
              href="/signup"
              style={{
                backgroundColor: '#1E1B4B',
                color: '#FFFFFF',
                borderRadius: '30px',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
              }}
            >
              Get Started Free
            </Link>

            <button
              onClick={() => setShowPlansModal(true)}
              style={{
                backgroundColor: '#FFFFFF',
                color: '#0E71EB',
                borderRadius: '30px',
                padding: '14px 28px',
                fontSize: '15px',
                fontWeight: 700,
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.1)',
              }}
            >
              Plans &amp; Pricing
            </button>

            <Link
              href="/join"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderRadius: '30px',
                padding: '14px 24px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              Join a Meeting
            </Link>
          </div>

          {/* ── Mockup / Window Preview ─────────────────────────────── */}
          <div
            style={{
              maxWidth: '820px',
              margin: '0 auto',
              backgroundColor: '#161622',
              borderRadius: '16px',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              boxShadow: '0 25px 60px -15px rgba(0, 0, 0, 0.6)',
              overflow: 'hidden',
              textAlign: 'left',
            }}
          >
            {/* Window title bar */}
            <div
              style={{
                backgroundColor: '#1E1E2C',
                padding: '12px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderBottom: '1px solid #2B2B3E',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#F59E0B' }} />
                <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                <span style={{ fontSize: '13px', fontWeight: 600, color: '#E2E8F0', marginLeft: '12px' }}>
                  Atithi&apos;s Zoom Meeting (HD WebRTC)
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#10B981' }}>
                <Shield size={14} />
                <span>Encrypted P2P</span>
              </div>
            </div>

            {/* Video preview stage */}
            <div
              style={{
                height: '360px',
                backgroundColor: '#0F0F17',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px',
                padding: '8px',
              }}
            >
              {/* Tile 1: Host */}
              <div
                style={{
                  backgroundColor: '#1A1A26',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid #28283C',
                }}
              >
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #0E71EB, #2563EB)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                >
                  A
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Mic size={12} color="#10B981" />
                  <span>Atithi (Host)</span>
                </div>
              </div>

              {/* Tile 2: Participant */}
              <div
                style={{
                  backgroundColor: '#1A1A26',
                  borderRadius: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                  overflow: 'hidden',
                  border: '1px solid #28283C',
                }}
              >
                <div
                  style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '50%',
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    color: 'white',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                >
                  P
                </div>
                <div
                  style={{
                    position: 'absolute',
                    bottom: '10px',
                    left: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.7)',
                    padding: '4px 8px',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '5px',
                  }}
                >
                  <Mic size={12} color="#10B981" />
                  <span>Participant</span>
                </div>
              </div>
            </div>

            {/* Window toolbar */}
            <div
              style={{
                backgroundColor: '#161622',
                padding: '12px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderTop: '1px solid #28283C',
              }}
            >
              <div style={{ display: 'flex', gap: '14px', color: '#CBD5E1', fontSize: '11px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Mic size={14} color="#10B981" /> Mute
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Video size={14} /> Stop Video
                </span>
              </div>
              <div style={{ display: 'flex', gap: '18px', color: '#CBD5E1', fontSize: '11px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Users size={14} /> Participants (2)
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MessageSquare size={14} /> Chat
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Share2 size={14} /> Share
                </span>
              </div>
              <div>
                <Link
                  href="/dashboard"
                  style={{
                    backgroundColor: '#E02828',
                    color: 'white',
                    fontSize: '11px',
                    fontWeight: 600,
                    padding: '4px 12px',
                    borderRadius: '6px',
                    textDecoration: 'none',
                  }}
                >
                  Launch App
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: What's new: Zoom Workplace is here ──────────────── */}
      <section style={{ padding: '80px 24px', backgroundColor: '#F8FAFC' }}>
        <div style={{ maxWidth: '1100px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '56px' }}>
            <span
              style={{
                color: '#0E71EB',
                fontWeight: 700,
                fontSize: '13px',
                textTransform: 'uppercase',
                letterSpacing: '1px',
              }}
            >
              What&apos;s New
            </span>
            <h2
              style={{
                fontSize: '34px',
                fontWeight: 800,
                color: '#1E293B',
                marginTop: '8px',
                letterSpacing: '-0.5px',
              }}
            >
              One platform that works together
            </h2>
            <p style={{ color: '#64748B', fontSize: '16px', marginTop: '10px', maxWidth: '600px', margin: '10px auto 0' }}>
              Engineered with modern WebRTC, SQLite persistence, and authentic Zoom UX.
            </p>
          </div>

          {/* Interactive Feature Tabs (all strictly functional!) */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '36px',
              flexWrap: 'wrap',
            }}
          >
            {[
              { id: 'meetings', label: 'HD Meetings', icon: <Video size={16} /> },
              { id: 'chat', label: 'In-Room Chat', icon: <MessageSquare size={16} /> },
              { id: 'host', label: 'Host Controls', icon: <Shield size={16} /> },
              { id: 'schedule', label: 'Scheduling & DB', icon: <Calendar size={16} /> },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 20px',
                  borderRadius: '30px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: activeTab === tab.id ? '2px solid #0E71EB' : '1px solid #CBD5E1',
                  backgroundColor: activeTab === tab.id ? '#EBF4FF' : '#FFFFFF',
                  color: activeTab === tab.id ? '#0E71EB' : '#475569',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                }}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div
            style={{
              backgroundColor: '#FFFFFF',
              borderRadius: '20px',
              border: '1px solid #E2E8F0',
              padding: '40px',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.04)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
              gap: '40px',
              alignItems: 'center',
            }}
          >
            <div>
              {activeTab === 'meetings' && (
                <>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>
                    Multi-Peer Mesh WebRTC Video Calling
                  </h3>
                  <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
                    Direct peer-to-peer streaming with independent video tracks, solo edge-to-edge mode, and dynamic grid layouts for 2, 3, 4, and multiple participants.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Dedicated RTCPeerConnection per participant</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Targeted ICE candidate queueing to prevent SDP glare</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Pre-meeting lobby with camera and mic diagnostic check</span>
                    </li>
                  </ul>
                  <div style={{ marginTop: '28px' }}>
                    <Link
                      href="/dashboard"
                      style={{
                        backgroundColor: '#0E71EB',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '11px 22px',
                        fontWeight: 600,
                        fontSize: '14px',
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <span>Start Instant Meeting</span>
                      <ArrowRight size={15} />
                    </Link>
                  </div>
                </>
              )}

              {activeTab === 'chat' && (
                <>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>
                    Real-Time In-Meeting Group Chat
                  </h3>
                  <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
                    Send messages instantly to all participants during active calls via low-latency WebSocket communication.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Docked Zoom-style chat panel</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Timestamped messages with participant sender badges</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Zero reload state preservation</span>
                    </li>
                  </ul>
                  <div style={{ marginTop: '28px' }}>
                    <Link
                      href="/dashboard"
                      style={{
                        backgroundColor: '#0E71EB',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '11px 22px',
                        fontWeight: 600,
                        fontSize: '14px',
                        textDecoration: 'none',
                      }}
                    >
                      Try In-Meeting Chat
                    </Link>
                  </div>
                </>
              )}

              {activeTab === 'host' && (
                <>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>
                    Strict Single-Host Controls
                  </h3>
                  <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
                    Full meeting governance verified at the database level. Host actions cannot be spoofed by unauthorized clients.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Mute All and single-participant remote mute</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Remote camera toggle and participant removal</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>End Meeting for Everyone with database status update</span>
                    </li>
                  </ul>
                  <div style={{ marginTop: '28px' }}>
                    <Link
                      href="/dashboard"
                      style={{
                        backgroundColor: '#0E71EB',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '11px 22px',
                        fontWeight: 600,
                        fontSize: '14px',
                        textDecoration: 'none',
                      }}
                    >
                      Explore Host Features
                    </Link>
                  </div>
                </>
              )}

              {activeTab === 'schedule' && (
                <>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, color: '#1E293B', marginBottom: '16px' }}>
                    SQLite Relational Scheduling
                  </h3>
                  <p style={{ color: '#64748B', lineHeight: 1.6, marginBottom: '20px' }}>
                    Store upcoming conferences with exact wall-clock times, duration limits, and automatic join blocking prior to start time.
                  </p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Formatted 10-digit meeting ID and shareable links</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Upcoming and Recent meetings listing tabs</span>
                    </li>
                    <li style={{ display: 'flex', gap: '10px', alignItems: 'center', fontSize: '14px' }}>
                      <CheckCircle size={18} color="#10B981" />
                      <span>Foreign key cascade referential integrity</span>
                    </li>
                  </ul>
                  <div style={{ marginTop: '28px' }}>
                    <Link
                      href="/schedule"
                      style={{
                        backgroundColor: '#0E71EB',
                        color: '#FFFFFF',
                        borderRadius: '8px',
                        padding: '11px 22px',
                        fontWeight: 600,
                        fontSize: '14px',
                        textDecoration: 'none',
                      }}
                    >
                      Schedule a Meeting
                    </Link>
                  </div>
                </>
              )}
            </div>

            {/* Visual card */}
            <div
              style={{
                backgroundColor: '#F1F5F9',
                borderRadius: '16px',
                padding: '32px',
                border: '1px solid #E2E8F0',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#0E71EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Shield size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: '15px' }}>Zoom Architecture</div>
                  <div style={{ fontSize: '12px', color: '#64748B' }}>FastAPI + Next.js 14 + SQLite</div>
                </div>
              </div>
              <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.6 }}>
                Every meeting runs with authentic Zoom UI/UX, responsive layouts, and simple interview-explainable architecture.
              </p>
              <div style={{ background: '#FFFFFF', padding: '14px', borderRadius: '10px', border: '1px solid #E2E8F0', fontSize: '12px' }}>
                <div style={{ color: '#0E71EB', fontWeight: 700, marginBottom: '4px' }}>Personal Meeting ID</div>
                <div style={{ fontFamily: 'monospace', fontSize: '14px', fontWeight: 600, color: '#1E293B' }}>635-012-0991</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Trusted by Millions ────────────────────────────── */}
      <section style={{ padding: '64px 24px', backgroundColor: '#FFFFFF', textAlign: 'center' }}>
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
          <p style={{ fontSize: '13px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '28px' }}>
            Trusted by organizations and teams worldwide
          </p>

          <div
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '40px',
              opacity: 0.7,
              fontSize: '18px',
              fontWeight: 700,
              color: '#475569',
              marginBottom: '48px',
            }}
          >
            <span>FORMULA 1</span>
            <span>&bull;</span>
            <span>WWF</span>
            <span>&bull;</span>
            <span>COLUMBIA UNIVERSITY</span>
            <span>&bull;</span>
            <span>20TH CENTURY STUDIOS</span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: '24px',
            }}
          >
            <div style={{ padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0E71EB' }}>4.8/5</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>Gartner Peer Insights Rating</div>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0E71EB' }}>100%</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>Open-Source WebRTC Mesh</div>
            </div>
            <div style={{ padding: '24px', backgroundColor: '#F8FAFC', borderRadius: '12px', border: '1px solid #E2E8F0' }}>
              <div style={{ fontSize: '32px', fontWeight: 800, color: '#0E71EB' }}>&lt; 50ms</div>
              <div style={{ fontSize: '13px', color: '#64748B', marginTop: '6px' }}>FastAPI Signaling Latency</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Section: Bottom CTA ─────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: '#0E71EB',
          color: '#FFFFFF',
          padding: '64px 24px',
          textAlign: 'center',
        }}
      >
        <div style={{ maxWidth: '700px', margin: '0 auto' }}>
          <h2 style={{ fontSize: '30px', fontWeight: 800, marginBottom: '16px' }}>
            Ready to experience Zoom Workplace?
          </h2>
          <p style={{ fontSize: '16px', opacity: 0.9, marginBottom: '32px', lineHeight: 1.6 }}>
            Connect with team members, schedule meetings, and collaborate with high-definition video.
          </p>
          <div style={{ display: 'flex', gap: '14px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link
              href="/signup"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#0E71EB',
                borderRadius: '30px',
                padding: '13px 28px',
                fontSize: '15px',
                fontWeight: 700,
                textDecoration: 'none',
              }}
            >
              Sign Up Free
            </Link>
            <Link
              href="/join"
              style={{
                backgroundColor: 'rgba(255, 255, 255, 0.15)',
                color: '#FFFFFF',
                borderRadius: '30px',
                padding: '13px 26px',
                fontSize: '15px',
                fontWeight: 600,
                textDecoration: 'none',
                border: '1px solid rgba(255, 255, 255, 0.3)',
              }}
            >
              Join a Meeting
            </Link>
          </div>
        </div>
      </section>

      {/* ── Plans Modal ─────────────────────────────────────────────── */}
      {showPlansModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '520px', padding: '32px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '20px', fontWeight: 700 }}>Zoom Workplace Basic</h3>
              <button onClick={() => setShowPlansModal(false)} style={{ fontSize: '20px', color: '#64748B', cursor: 'pointer', border: 'none', background: 'none' }}>
                &times;
              </button>
            </div>
            <p style={{ fontSize: '14px', color: '#64748B', marginBottom: '20px' }}>
              Your current active plan is <strong>Zoom Workplace Basic</strong>.
            </p>
            <div style={{ background: '#F8FAFC', borderRadius: '12px', padding: '18px', border: '1px solid #E2E8F0', marginBottom: '24px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CheckCircle size={16} color="#10B981" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>Up to 100 participants per meeting</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CheckCircle size={16} color="#10B981" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>40 minutes max on group meetings</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <CheckCircle size={16} color="#10B981" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>End-to-end encrypted WebRTC audio &amp; video</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} color="#10B981" />
                <span style={{ fontSize: '13px', fontWeight: 600 }}>SQLite database meeting history</span>
              </div>
            </div>
            <button
              className="btn-primary"
              onClick={() => setShowPlansModal(false)}
              style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <ZoomFooter />
    </div>
  );
}
