'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  AlertCircle,
  ArrowLeft,
  Loader2,
  User,
} from 'lucide-react';
import { api } from '@/lib/api';
import { auth } from '@/lib/auth';
import { MeetingValidationResponse } from '@/types';

function LobbyContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const meetingId = params.meetingId as string;
  const isHostParam = searchParams.get('host') === 'true';
  const nameParam = searchParams.get('name');
  const loggedInUser = auth.getCurrentUser();

  // Meeting verification state
  const [isValidating, setIsValidating] = useState(true);
  const [meetingData, setMeetingData] = useState<MeetingValidationResponse | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Determine whether current user is truly the host based on database meeting ownership
  const isActualHost = Boolean(
    loggedInUser && meetingData && (
      (meetingData.host_id && loggedInUser.id === meetingData.host_id) ||
      (meetingData.host_email && loggedInUser.email.toLowerCase() === meetingData.host_email.toLowerCase())
    )
  );

  // Participant identity
  const [displayName, setDisplayName] = useState(
    nameParam || (loggedInUser?.full_name ? loggedInUser.full_name : '')
  );
  const [isJoining, setIsJoining] = useState(false);

  // Media preview state
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [mediaError, setMediaError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Step 1: Validate meeting existence on mount
  useEffect(() => {
    let isMounted = true;

    async function checkMeeting() {
      try {
        setIsValidating(true);
        const data = await api.validateMeeting(meetingId);
        if (isMounted) {
          setMeetingData(data);
          setValidationError(null);
        }
      } catch (err: any) {
        if (isMounted) {
          setValidationError(
            err.message || `Meeting '${meetingId}' does not exist or has expired.`
          );
        }
      } finally {
        if (isMounted) setIsValidating(false);
      }
    }

    checkMeeting();

    return () => {
      isMounted = false;
    };
  }, [meetingId]);

  // Step 2: Initialize local camera & microphone preview
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function setupPreview() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        activeStream = stream;
        setLocalStream(stream);
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err: any) {
        console.warn('Could not access camera/mic preview:', err);
        setMediaError('Camera or microphone access denied. You can still join without video.');
        setIsVideoEnabled(false);
      }
    }

    if (!isValidating && !validationError) {
      setupPreview();
    }

    return () => {
      // Clean up preview stream when leaving lobby
      if (activeStream) {
        activeStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [isValidating, validationError]);

  // Handle toggling video track
  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !isVideoEnabled;
        setIsVideoEnabled(!isVideoEnabled);
      }
    } else {
      setIsVideoEnabled(!isVideoEnabled);
    }
  };

  // Handle toggling audio track
  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !isAudioEnabled;
        setIsAudioEnabled(!isAudioEnabled);
      }
    } else {
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  // Step 3: Handle Join Meeting
  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = displayName.trim() || (isActualHost ? (loggedInUser?.full_name || 'Host') : 'Participant');
    const assignedRole = isActualHost ? 'host' : 'participant';

    try {
      setIsJoining(true);

      // Generate a client session UUID for this participant connection
      const sessionId = 'sess_' + Math.random().toString(36).substring(2, 11);

      // Register participant in SQLite via FastAPI with user_email for attendance tracking
      await api.registerParticipant(meetingId, {
        display_name: finalName,
        role: assignedRole,
        session_id: sessionId,
        user_email: loggedInUser?.email || undefined,
      });

      // Stop lobby tracks so meeting room can capture clean stream
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }

      // Route directly into the WebRTC meeting room with session parameters
      const queryParams = new URLSearchParams({
        session_id: sessionId,
        name: finalName,
        role: assignedRole,
        audio: isAudioEnabled ? '1' : '0',
        video: isVideoEnabled ? '1' : '0',
      });

      router.push(`/meeting/${meetingId}?${queryParams.toString()}`);
    } catch (err: any) {
      console.error('Error joining meeting:', err);
      alert('Could not join meeting: ' + (err.message || 'Server error'));
      setIsJoining(false);
    }
  };

  // Render Loading State
  if (isValidating) {
    return (
      <div className="dashboard-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Loader2 size={40} className="animate-spin" color="var(--zoom-blue)" />
          <h3 style={{ marginTop: '16px' }}>Validating Meeting...</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '4px' }}>
            Checking Meeting ID: {meetingId}
          </p>
        </div>
      </div>
    );
  }

  // Render Invalid / Ended / Unstarted Meeting Error State
  if (validationError || !meetingData) {
    const isUnstarted = validationError?.includes('not started');
    const isEnded = validationError?.includes('ended');
    const errorHeading = isUnstarted
      ? 'Meeting Has Not Started Yet'
      : isEnded
      ? 'Meeting Has Ended'
      : 'Meeting Not Available';

    return (
      <div className="dashboard-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            maxWidth: '500px',
            background: 'white',
            borderRadius: '16px',
            padding: '36px',
            textAlign: 'center',
            boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
            border: '1px solid var(--border-light)',
          }}
        >
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '50%',
              background: isUnstarted ? '#EFF6FF' : '#FEE2E2',
              color: isUnstarted ? 'var(--zoom-blue)' : '#DC2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <AlertCircle size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: isUnstarted ? 'var(--zoom-blue)' : '#991B1B' }}>
            {errorHeading}
          </h2>
          <p style={{ color: 'var(--text-main)', marginTop: '12px', fontSize: '15px', fontWeight: 500, lineHeight: 1.5 }}>
            {validationError}
          </p>

          <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <Link href="/" className="btn-secondary">
              Back to Home
            </Link>
            <Link href="/join" className="btn-primary">
              Join Another Meeting
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container" style={{ background: '#F8FAFC' }}>
      <div style={{ padding: '24px 32px' }}>
        <Link
          href="/"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '14px',
            color: 'var(--text-muted)',
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>Exit to Dashboard</span>
        </Link>
      </div>

      <div className="lobby-card">
        <div style={{ textAlign: 'center', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>{meetingData.title}</h2>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}>
            Meeting ID: <span style={{ color: 'var(--zoom-blue)', fontWeight: 600 }}>{meetingData.meeting_id}</span>
          </p>
        </div>

        {/* Video Preview Box */}
        <div className="preview-box">
          {isVideoEnabled ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ transform: 'scaleX(-1)' }}
            />
          ) : (
            <div className="avatar-fallback">
              {displayName.trim() ? displayName.trim().charAt(0).toUpperCase() : <User size={40} />}
            </div>
          )}

          {/* Quick mic / camera toggle buttons inside preview */}
          <div className="preview-controls">
            <button
              type="button"
              className={`preview-circle-btn ${!isAudioEnabled ? 'muted' : ''}`}
              onClick={toggleAudio}
              title={isAudioEnabled ? 'Mute Microphone' : 'Unmute Microphone'}
            >
              {isAudioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>

            <button
              type="button"
              className={`preview-circle-btn ${!isVideoEnabled ? 'muted' : ''}`}
              onClick={toggleVideo}
              title={isVideoEnabled ? 'Stop Video' : 'Start Video'}
            >
              {isVideoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
          </div>
        </div>

        {mediaError && (
          <p style={{ fontSize: '12px', color: '#D97706', marginBottom: '16px', textAlign: 'center' }}>
            {mediaError}
          </p>
        )}

        {/* Display Name Input Form */}
        <form onSubmit={handleJoinMeeting}>
          <div className="form-group">
            <label className="form-label" htmlFor="displayName">
              Your Display Name *
            </label>
            <input
              id="displayName"
              type="text"
              className="form-input"
              placeholder="e.g. Rahul Sharma"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoFocus
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            disabled={isJoining || !displayName.trim()}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', marginTop: '12px' }}
          >
            {isJoining ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Entering Meeting...</span>
              </>
            ) : (
              <span>Join Meeting</span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function MeetingLobbyPage() {
  return (
    <Suspense
      fallback={
        <div className="dashboard-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Loader2 size={40} className="animate-spin" color="var(--zoom-blue)" />
            <h3 style={{ marginTop: '16px' }}>Loading Lobby...</h3>
          </div>
        </div>
      }
    >
      <LobbyContent />
    </Suspense>
  );
}
