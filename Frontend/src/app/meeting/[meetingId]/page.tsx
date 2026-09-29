'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Users,
  Share2,
  PhoneOff,
  Shield,
  Copy,
  Check,
  X,
  User,
} from 'lucide-react';
import {
  createPeerConnection,
  addTracksToConnection,
  createOffer,
  createAnswer,
  handleRemoteAnswer,
  handleRemoteIceCandidate,
  getLocalUserMedia,
} from '@/lib/webrtc';
import { SignalMessage } from '@/types';

export default function MeetingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const meetingId = params.meetingId as string;
  const sessionId = searchParams.get('session_id') || 'sess_' + Math.random().toString(36).substring(2, 9);
  const displayName = searchParams.get('name') || 'Participant';
  const role = searchParams.get('role') || 'participant';
  const initialAudio = searchParams.get('audio') !== '0';
  const initialVideo = searchParams.get('video') !== '0';

  // Local media state
  const [isAudioOn, setIsAudioOn] = useState(initialAudio);
  const [isVideoOn, setIsVideoOn] = useState(initialVideo);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // Remote peer state
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [remotePeerName, setRemotePeerName] = useState<string | null>(null);
  const [isRemoteVideoOn, setIsRemoteVideoOn] = useState(true);
  const [isRemoteAudioOn, setIsRemoteAudioOn] = useState(true);

  // UI Modals and drawers
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showParticipantsModal, setShowParticipantsModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // References to HTML video elements and WebRTC objects
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null);
  const socketRef = useRef<WebSocket | null>(null);
  const isHost = role === 'host';

  // Meeting timer
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Main setup effect: acquires camera/mic and connects to WebSocket signaling
  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let pc: RTCPeerConnection | null = null;
    let ws: WebSocket | null = null;

    async function initCall() {
      // 1. Acquire local camera and microphone stream
      currentStream = await getLocalUserMedia(initialAudio, initialVideo);
      if (currentStream) {
        setLocalStream(currentStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = currentStream;
        }

        // Apply initial mute settings
        const audioTrack = currentStream.getAudioTracks()[0];
        if (audioTrack) audioTrack.enabled = initialAudio;
        const videoTrack = currentStream.getVideoTracks()[0];
        if (videoTrack) videoTrack.enabled = initialVideo;
      }

      // 2. Initialize WebRTC RTCPeerConnection
      pc = createPeerConnection(
        (event) => {
          // Remote audio or video track received from peer
          console.log('[WebRTC] Received remote track:', event.track.kind);
          if (event.streams && event.streams[0]) {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = event.streams[0];
            }
          }
        },
        (candidate) => {
          // Send discovered local ICE candidate to remote peer via WebSocket
          if (ws && ws.readyState === WebSocket.OPEN) {
            ws.send(
              JSON.stringify({
                type: 'ice-candidate',
                candidate: candidate,
              })
            );
          }
        }
      );
      peerConnectionRef.current = pc;

      // 3. Attach local tracks to RTCPeerConnection
      if (currentStream) {
        addTracksToConnection(pc, currentStream);
      }

      // 4. Connect to FastAPI WebSocket signaling server
      const wsUrl = `${process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'}/ws/meeting/${meetingId}?session_id=${sessionId}&name=${encodeURIComponent(displayName)}`;
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected to signaling channel for meeting:', meetingId);
      };

      ws.onmessage = async (event) => {
        const message: SignalMessage = JSON.parse(event.data);
        console.log('[WebSocket] Received signal:', message.type);

        if (!pc) return;

        switch (message.type) {
          case 'peer-joined':
            // A new peer entered the room. The existing user initiates the WebRTC offer.
            console.log('[WebRTC] Peer joined:', message.display_name);
            setRemotePeerName(message.display_name || 'Participant');
            try {
              const offer = await createOffer(pc);
              ws?.send(JSON.stringify({ type: 'offer', sdp: offer }));
            } catch (err) {
              console.error('[WebRTC] Error creating offer:', err);
            }
            break;

          case 'existing-peer':
            // We just joined and there is already an existing peer in the room.
            console.log('[WebRTC] Existing peer in room:', message.display_name);
            setRemotePeerName(message.display_name || 'Host');
            break;

          case 'offer':
            // Received SDP Offer from host: create SDP Answer
            if (message.sdp) {
              console.log('[WebRTC] Handling remote offer...');
              if (message.sender_name) setRemotePeerName(message.sender_name);
              try {
                const answer = await createAnswer(pc, message.sdp);
                ws?.send(JSON.stringify({ type: 'answer', sdp: answer }));
              } catch (err) {
                console.error('[WebRTC] Error responding to offer:', err);
              }
            }
            break;

          case 'answer':
            // Received SDP Answer from peer: finalize handshake
            if (message.sdp) {
              console.log('[WebRTC] Handling remote answer...');
              try {
                await handleRemoteAnswer(pc, message.sdp);
              } catch (err) {
                console.error('[WebRTC] Error handling answer:', err);
              }
            }
            break;

          case 'ice-candidate':
            // Remote ICE candidate received
            if (message.candidate) {
              await handleRemoteIceCandidate(pc, message.candidate);
            }
            break;

          case 'toggle-video':
            if (typeof message.video === 'boolean') {
              setIsRemoteVideoOn(message.video);
            }
            break;

          case 'toggle-audio':
            if (typeof message.audio === 'boolean') {
              setIsRemoteAudioOn(message.audio);
            }
            break;

          case 'peer-left':
            console.log('[WebRTC] Remote peer left the call.');
            setRemoteStream(null);
            setRemotePeerName(null);
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = null;
            }
            break;
        }
      };

      ws.onerror = (err) => {
        console.error('[WebSocket] Signaling error:', err);
      };

      ws.onclose = () => {
        console.log('[WebSocket] Signaling connection closed.');
      };
    }

    initCall();

    return () => {
      // Cleanup on unmount: stop tracks, close RTCPeerConnection and WebSocket
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
      if (pc) {
        pc.close();
      }
      if (ws) {
        ws.close();
      }
    };
  }, [meetingId, sessionId, displayName, initialAudio, initialVideo]);

  // Toggle local microphone
  const handleToggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        const nextState = !audioTrack.enabled;
        audioTrack.enabled = nextState;
        setIsAudioOn(nextState);

        // Notify peer of mute status
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({ type: 'toggle-audio', audio: nextState })
          );
        }
      }
    } else {
      setIsAudioOn(!isAudioOn);
    }
  };

  // Toggle local camera
  const handleToggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        const nextState = !videoTrack.enabled;
        videoTrack.enabled = nextState;
        setIsVideoOn(nextState);

        // Notify peer of camera status
        if (socketRef.current?.readyState === WebSocket.OPEN) {
          socketRef.current.send(
            JSON.stringify({ type: 'toggle-video', video: nextState })
          );
        }
      }
    } else {
      setIsVideoOn(!isVideoOn);
    }
  };

  // End or leave meeting
  const handleLeaveMeeting = () => {
    if (localStream) {
      localStream.getTracks().forEach((t) => t.stop());
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }
    if (socketRef.current) {
      socketRef.current.close();
    }
    router.push('/');
  };

  // Copy shareable invite link
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/meeting/${meetingId}/lobby`
      : `/meeting/${meetingId}/lobby`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const participantCount = remoteStream || remotePeerName ? 2 : 1;

  return (
    <div className="room-container">
      {/* Top Header Bar */}
      <header className="room-header">
        <div className="room-title-box">
          <Shield size={16} color="var(--zoom-green)" />
          <span>Zoom Meeting</span>
          <span style={{ color: '#64748B' }}>|</span>
          <span style={{ color: '#94A3B8' }}>ID: {meetingId}</span>
          <span style={{ color: '#64748B' }}>|</span>
          <span style={{ color: '#94A3B8' }}>{formatTimer(elapsedSeconds)}</span>
        </div>

        <button
          className="btn-secondary"
          onClick={() => setShowInviteModal(true)}
          style={{
            padding: '6px 12px',
            fontSize: '12px',
            background: '#2A2A38',
            color: 'white',
            borderColor: '#3F3F50',
          }}
        >
          <Share2 size={14} />
          <span>Invite</span>
        </button>
      </header>

      {/* Main Video Stage */}
      <main className="room-stage">
        <div className={`video-grid ${participantCount === 2 ? 'grid-2' : 'grid-1'}`}>
          {/* Local Participant Tile */}
          <div className="video-tile">
            {isVideoOn ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                style={{ transform: 'scaleX(-1)' }}
              />
            ) : (
              <div className="avatar-fallback">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}

            <div className="participant-nametag">
              {!isAudioOn ? (
                <MicOff size={13} color="var(--zoom-red)" />
              ) : (
                <Mic size={13} color="var(--zoom-green)" />
              )}
              <span>
                {displayName} (You{isHost ? ' - Host' : ''})
              </span>
            </div>
          </div>

          {/* Remote Peer Tile (appears when peer joins) */}
          {participantCount === 2 && (
            <div className="video-tile">
              {isRemoteVideoOn && remoteStream ? (
                <video
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                />
              ) : (
                <div className="avatar-fallback" style={{ background: 'linear-gradient(135deg, #10B981, #047857)' }}>
                  {remotePeerName ? remotePeerName.charAt(0).toUpperCase() : 'P'}
                </div>
              )}

              <div className="participant-nametag">
                {!isRemoteAudioOn ? (
                  <MicOff size={13} color="var(--zoom-red)" />
                ) : (
                  <Mic size={13} color="var(--zoom-green)" />
                )}
                <span>{remotePeerName || 'Remote Participant'}</span>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Bottom Zoom Toolbar */}
      <footer className="room-toolbar">
        {/* Left: Audio & Video controls */}
        <div className="toolbar-group">
          <button
            className={`tool-btn ${!isAudioOn ? 'active' : ''}`}
            onClick={handleToggleAudio}
          >
            {isAudioOn ? <Mic size={20} /> : <MicOff size={20} />}
            <span>{isAudioOn ? 'Mute' : 'Unmute'}</span>
          </button>

          <button
            className={`tool-btn ${!isVideoOn ? 'active' : ''}`}
            onClick={handleToggleVideo}
          >
            {isVideoOn ? <Video size={20} /> : <VideoOff size={20} />}
            <span>{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
          </button>
        </div>

        {/* Center: Meeting Controls */}
        <div className="toolbar-group">
          <button
            className="tool-btn"
            onClick={() => setShowParticipantsModal(true)}
          >
            <div style={{ position: 'relative' }}>
              <Users size={20} />
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  right: -8,
                  background: 'var(--zoom-blue)',
                  color: 'white',
                  borderRadius: '10px',
                  padding: '1px 5px',
                  fontSize: '9px',
                  fontWeight: 700,
                }}
              >
                {participantCount}
              </span>
            </div>
            <span>Participants</span>
          </button>

          <button
            className="tool-btn"
            onClick={() => setShowInviteModal(true)}
          >
            <Share2 size={20} />
            <span>Invite Link</span>
          </button>
        </div>

        {/* Right: End / Leave Meeting */}
        <div className="toolbar-group">
          <button className="btn-end" onClick={handleLeaveMeeting}>
            <PhoneOff size={16} />
            <span>Leave</span>
          </button>
        </div>
      </footer>

      {/* Shareable Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '460px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Invite to Meeting</h3>
              <button onClick={() => setShowInviteModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '24px' }}>
              <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                Share this link or Meeting ID with others to join this video call.
              </p>

              <div className="form-group">
                <label className="form-label">Meeting ID</label>
                <div
                  style={{
                    background: '#F1F5F9',
                    padding: '10px 14px',
                    borderRadius: '8px',
                    fontWeight: 700,
                    fontSize: '16px',
                    color: 'var(--zoom-blue)',
                  }}
                >
                  {meetingId}
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Shareable Invite Link</label>
                <input
                  type="text"
                  readOnly
                  value={inviteLink}
                  className="form-input"
                  style={{ fontSize: '13px', background: '#F8FAFC' }}
                />
              </div>

              <button
                className="btn-primary"
                onClick={copyToClipboard}
                style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}
              >
                {copiedLink ? <Check size={18} /> : <Copy size={18} />}
                <span>{copiedLink ? 'Copied to Clipboard!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Participants Drawer / Modal */}
      {showParticipantsModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h3 className="modal-title">Participants ({participantCount})</h3>
              <button onClick={() => setShowParticipantsModal(false)} style={{ color: 'var(--text-muted)' }}>
                <X size={20} />
              </button>
            </div>
            <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* You */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '8px 12px',
                  background: '#F8FAFC',
                  borderRadius: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div
                    style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: 'var(--zoom-blue)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      fontSize: '12px',
                    }}
                  >
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600 }}>
                      {displayName} (Me)
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                      {isHost ? 'Host' : 'Participant'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)' }}>
                  {isAudioOn ? <Mic size={16} color="var(--zoom-green)" /> : <MicOff size={16} color="var(--zoom-red)" />}
                  {isVideoOn ? <Video size={16} /> : <VideoOff size={16} color="var(--zoom-red)" />}
                </div>
              </div>

              {/* Remote Peer */}
              {remotePeerName && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#F8FAFC',
                    borderRadius: '8px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: '#10B981',
                        color: 'white',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: 600,
                        fontSize: '12px',
                      }}
                    >
                      {remotePeerName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600 }}>
                        {remotePeerName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Connected
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', color: 'var(--text-muted)' }}>
                    {isRemoteAudioOn ? <Mic size={16} color="var(--zoom-green)" /> : <MicOff size={16} color="var(--zoom-red)" />}
                    {isRemoteVideoOn ? <Video size={16} /> : <VideoOff size={16} color="var(--zoom-red)" />}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
