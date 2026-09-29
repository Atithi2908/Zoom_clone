'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
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
  AlertTriangle,
  MoreVertical,
  MessageSquare,
  Smile,
  Monitor,
  Send,
  Search,
  Bell,
  Settings,
  Calendar,
} from 'lucide-react';
import {
  createPeerConnection,
  addTracksToConnection,
  createOffer,
  createAnswer,
  handleRemoteAnswer,
  getLocalUserMedia,
} from '@/lib/webrtc';
import { api } from '@/lib/api';
import { SignalMessage, RemoteParticipant } from '@/types';

// ─── Avatar colors keyed by name hash ───────────────────────────────────────
const AVATAR_COLORS = [
  'linear-gradient(135deg, #0E71EB, #2563EB)',
  'linear-gradient(135deg, #10B981, #059669)',
  'linear-gradient(135deg, #8B5CF6, #6D28D9)',
  'linear-gradient(135deg, #F59E0B, #D97706)',
  'linear-gradient(135deg, #EC4899, #BE185D)',
  'linear-gradient(135deg, #06B6D4, #0284C7)',
];

function getAvatarColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ─── ParticipantVideoTile ────────────────────────────────────────────────────
/**
 * One video tile. Attaches stream to <video> via ref — no remounting on re-render.
 * Shows avatar fallback when camera is off.
 */
interface ParticipantVideoTileProps {
  participantId: string;
  displayName: string;
  role: 'host' | 'participant';
  isLocal: boolean;
  isAudioOn: boolean;
  isVideoOn: boolean;
  stream: MediaStream | null;
}

function ParticipantVideoTile({
  displayName,
  role,
  isLocal,
  isAudioOn,
  isVideoOn,
  stream,
}: ParticipantVideoTileProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Attach stream to <video> safely — never remount the element
  useEffect(() => {
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream;
      }
      videoRef.current.play().catch(() => {});
    }
  }, [stream, isVideoOn]);

  const avatarBg = getAvatarColor(displayName);

  return (
    <div className="video-tile">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          transform: isLocal ? 'scaleX(-1)' : 'none',
          display: isVideoOn && stream ? 'block' : 'none',
        }}
      />

      {/* Avatar fallback when camera is off or stream not yet ready */}
      {(!isVideoOn || !stream) && (
        <div className="avatar-fallback" style={{ background: avatarBg }}>
          {displayName.charAt(0).toUpperCase()}
        </div>
      )}

      {/* Name + mic status overlay */}
      <div className="participant-nametag">
        {!isAudioOn ? (
          <MicOff size={13} color="#EF4444" />
        ) : (
          <Mic size={13} color="#10B981" />
        )}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
          <span>{displayName}{isLocal ? ' (You)' : ''}</span>
          {role === 'host' && (
            <span
              style={{
                backgroundColor: '#0E71EB',
                color: '#FFFFFF',
                fontSize: '10px',
                fontWeight: 700,
                padding: '1px 6px',
                borderRadius: '10px',
                lineHeight: '14px',
              }}
            >
              Host
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

// ─── Main Meeting Room ───────────────────────────────────────────────────────
function MeetingRoomContent() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();

  const meetingId = params.meetingId as string;
  // session_id is set in the lobby; unique per browser tab
  const sessionId =
    searchParams.get('session_id') || 'sess_' + Math.random().toString(36).substring(2, 9);
  const displayName = searchParams.get('name') || 'Participant';
  const role = (searchParams.get('role') || 'participant') as 'host' | 'participant';
  const initialAudio = searchParams.get('audio') !== '0';
  const initialVideo = searchParams.get('video') !== '0';
  // Real host status: verified server-side via API and WebSocket room-joined
  const [isHost, setIsHost] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function verifyHostStatus() {
      try {
        const meetingInfo = await api.validateMeeting(meetingId);
        const curUser = typeof window !== 'undefined' ? JSON.parse(localStorage.getItem('zoom_clone_user') || 'null') : null;
        if (isMounted && curUser && meetingInfo) {
          const isOwner = Boolean(
            (meetingInfo.host_id && curUser.id === meetingInfo.host_id) ||
            (meetingInfo.host_email && curUser.email?.toLowerCase() === meetingInfo.host_email?.toLowerCase())
          );
          if (isOwner) {
            setIsHost(true);
          }
        }
      } catch (e) {
        console.warn('Host status verification error:', e);
      }
    }
    verifyHostStatus();
    return () => { isMounted = false; };
  }, [meetingId]);

  // ── Local media state ────────────────────────────────────────────────────
  const [isAudioOn, setIsAudioOn] = useState(initialAudio);
  const [isVideoOn, setIsVideoOn] = useState(initialVideo);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);

  // ── Per-participant remote state (Mesh architecture) ─────────────────────
  // participants[sessionId] = { displayName, role, isAudioOn, isVideoOn }
  const [remoteParticipants, setRemoteParticipants] = useState<Record<string, RemoteParticipant>>(
    {}
  );
  // remoteStreams[sessionId] = MediaStream
  const [remoteStreams, setRemoteStreams] = useState<Record<string, MediaStream>>({});

  // ── Meeting lifecycle ────────────────────────────────────────────────────
  const [meetingEndedByHost, setMeetingEndedByHost] = useState(false);
  const [removedByHost, setRemovedByHost] = useState(false);

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeDrawer, setActiveDrawer] = useState<'none' | 'participants' | 'chat'>('none');
  const activeDrawerRef = useRef<'none' | 'participants' | 'chat'>('none');
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showEndModal, setShowEndModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');

  // ── In-Meeting Chat State ────────────────────────────────────────────────
  const [chatMessages, setChatMessages] = useState<
    { id: string; senderName: string; text: string; timestamp: string; isMe: boolean }[]
  >([
    {
      id: 'init-1',
      senderName: 'System',
      text: 'Welcome to the meeting room chat. Messages sent here are visible to everyone.',
      timestamp: 'Just now',
      isMe: false,
    },
  ]);
  const [chatInputText, setChatInputText] = useState('');
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatMessagesEndRef = useRef<HTMLDivElement | null>(null);

  // Keep activeDrawerRef in sync
  useEffect(() => {
    activeDrawerRef.current = activeDrawer;
    if (activeDrawer === 'chat') {
      setUnreadChatCount(0);
      setTimeout(() => {
        chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  }, [activeDrawer]);

  // Auto-scroll chat when messages change
  useEffect(() => {
    if (activeDrawer === 'chat') {
      chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeDrawer]);

  // ── In-Meeting Reactions ─────────────────────────────────────────────────
  const [showReactionsBar, setShowReactionsBar] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<{ id: string; emoji: string; left: number }[]>([]);

  // ── WebRTC refs (not state — avoids stale closure issues in event handlers) ─
  // peerConnections[peerId] = RTCPeerConnection
  const peerConnectionsRef = useRef<Record<string, RTCPeerConnection>>({});
  // iceQueues[peerId] = RTCIceCandidateInit[] — per-peer ICE candidate queue
  const iceQueuesRef = useRef<Record<string, RTCIceCandidateInit[]>>({});
  const socketRef = useRef<WebSocket | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);

  // Refs mirror state for use inside WebSocket event handlers (avoid stale closures)
  const isAudioOnRef = useRef(initialAudio);
  const isVideoOnRef = useRef(initialVideo);
  const remoteStreamsRef = useRef<Record<string, MediaStream>>({});

  // Keep refs in sync with state
  useEffect(() => { isAudioOnRef.current = isAudioOn; }, [isAudioOn]);
  useEffect(() => { isVideoOnRef.current = isVideoOn; }, [isVideoOn]);
  useEffect(() => { localStreamRef.current = localStream; }, [localStream]);

  // ── Timer ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTimer = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  // ── ICE queue flush for a specific peer ──────────────────────────────────
  const drainIceQueue = useCallback(async (peerId: string, pc: RTCPeerConnection) => {
    const queue = iceQueuesRef.current[peerId];
    if (!queue || queue.length === 0) return;
    console.log(`[WebRTC] Draining ${queue.length} queued ICE candidates for ${peerId}`);
    while (queue.length > 0) {
      const candidate = queue.shift();
      if (candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (err) {
          console.warn(`[WebRTC] Error adding queued ICE for ${peerId}:`, err);
        }
      }
    }
  }, []);

  // ── Create RTCPeerConnection for a specific remote peer ──────────────────
  /**
   * Each remote peer in the mesh gets ONE RTCPeerConnection.
   * peerConnections = { sessionA: RTCPeerConnection, sessionB: RTCPeerConnection, ... }
   *
   * This function is idempotent: returns existing PC if already created.
   */
  const createPCFor = useCallback(
    (peerId: string): RTCPeerConnection => {
      // Return existing if already created (prevents duplicate PCs)
      if (peerConnectionsRef.current[peerId]) {
        return peerConnectionsRef.current[peerId];
      }

      console.log(`[WebRTC] Creating new RTCPeerConnection for peer: ${peerId}`);

      const pc = createPeerConnection(
        // onRemoteTrack: associate each incoming track with the correct peer
        (event: RTCTrackEvent) => {
          console.log(`[WebRTC] Remote track received from ${peerId}: ${event.track.kind}`);
          let stream = remoteStreamsRef.current[peerId];
          if (!stream) {
            stream = new MediaStream();
            remoteStreamsRef.current[peerId] = stream;
          }
          stream.addTrack(event.track);
          // Trigger React re-render for this peer's video tile
          setRemoteStreams((prev) => ({ ...prev, [peerId]: stream }));
        },
        // onIceCandidate: send this peer's ICE candidate only to the matching remote peer
        (candidate: RTCIceCandidate) => {
          if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(
              JSON.stringify({
                type: 'ice-candidate',
                target_session_id: peerId, // ← targeted, not broadcast
                sender_session_id: sessionId,
                candidate: candidate,
              })
            );
          }
        }
      );

      // Attach local tracks to this peer connection right away
      if (localStreamRef.current) {
        addTracksToConnection(pc, localStreamRef.current);
      }

      peerConnectionsRef.current[peerId] = pc;
      iceQueuesRef.current[peerId] = []; // initialize empty ICE queue for this peer
      return pc;
    },
    [sessionId]
  );

  // ── Close & cleanup a single peer connection ─────────────────────────────
  const cleanupPeer = useCallback((peerId: string) => {
    console.log(`[WebRTC] Cleaning up peer: ${peerId}`);
    if (peerConnectionsRef.current[peerId]) {
      peerConnectionsRef.current[peerId].close();
      delete peerConnectionsRef.current[peerId];
    }
    delete iceQueuesRef.current[peerId];
    delete remoteStreamsRef.current[peerId];

    setRemoteParticipants((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
    setRemoteStreams((prev) => {
      const updated = { ...prev };
      delete updated[peerId];
      return updated;
    });
  }, []);

  // ─── Broadcast my current state to all peers ─────────────────────────────
  const broadcastMyState = useCallback(
    (audioOn: boolean, videoOn: boolean) => {
      if (socketRef.current?.readyState === WebSocket.OPEN) {
        socketRef.current.send(
          JSON.stringify({
            type: 'participant-state',
            session_id: sessionId,
            is_audio_on: audioOn,
            is_video_on: videoOn,
          })
        );
      }
    },
    [sessionId]
  );

  // ── Initialize media and WebSocket signaling ─────────────────────────────
  useEffect(() => {
    let ws: WebSocket | null = null;
    let stream: MediaStream | null = null;
    let isMounted = true;

    async function initMeshMeeting() {
      // Step 1: Acquire local media (camera + microphone)
      stream = await getLocalUserMedia(initialAudio, initialVideo);
      if (!isMounted) return;

      if (stream) {
        // Apply initial enabled/disabled state to tracks
        const aTrack = stream.getAudioTracks()[0];
        if (aTrack) {
          aTrack.enabled = initialAudio;
          console.log(`[Media] Audio track: enabled=${aTrack.enabled} readyState=${aTrack.readyState} muted=${aTrack.muted}`);
        } else {
          console.warn('[Media] NO audio track in local stream! Audio will not work.');
        }
        const vTrack = stream.getVideoTracks()[0];
        if (vTrack) {
          vTrack.enabled = initialVideo;
          console.log(`[Media] Video track: enabled=${vTrack.enabled} readyState=${vTrack.readyState}`);
        }

        localStreamRef.current = stream;
        setLocalStream(stream);
      }

      // Step 2: Connect to WebSocket signaling server
      const authToken = typeof window !== 'undefined' ? localStorage.getItem('zoom_clone_token') || '' : '';
      const tokenParam = authToken ? `&token=${encodeURIComponent(authToken)}` : '';
      const wsUrl = `${
        process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000'
      }/ws/meeting/${meetingId}?session_id=${sessionId}&name=${encodeURIComponent(displayName)}&role=${role}${tokenParam}`;
      ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        console.log('[WebSocket] Connected. sessionId:', sessionId);
      };

      ws.onmessage = async (event) => {
        if (!isMounted) return;

        const message: SignalMessage = JSON.parse(event.data);
        // The sender is identified by sender_session_id OR the legacy `from` field
        const remotePeerId = message.sender_session_id || message.from;

        switch (message.type) {
          // ─── Room joined event from server with authoritative is_host ───
          case 'room-joined' as any: {
            console.log('[Signaling] Server verified room-joined. is_host:', (message as any).is_host);
            if (typeof (message as any).is_host === 'boolean') {
              setIsHost((message as any).is_host);
            }
            break;
          }

          // ─── A: New peer joined — we (existing peer) initiate the offer ───
          case 'peer-joined': {
            const newPeerId = message.session_id;
            if (!newPeerId || newPeerId === sessionId) return;

            console.log(`[Signaling] Peer joined: ${message.display_name} (${newPeerId})`);

            // Add to participant map immediately so UI shows them
            setRemoteParticipants((prev) => ({
              ...prev,
              [newPeerId]: {
                sessionId: newPeerId,
                displayName: message.display_name || 'Participant',
                role: message.role || 'participant',
                isAudioOn: message.is_audio_on ?? true,
                isVideoOn: message.is_video_on ?? true,
              },
            }));

            // Create our side of the peer connection and send offer
            const pc = createPCFor(newPeerId);
            try {
              const offer = await createOffer(pc);
              ws?.send(
                JSON.stringify({
                  type: 'offer',
                  target_session_id: newPeerId,
                  sender_session_id: sessionId,
                  sender_name: displayName,
                  role: role,
                  sdp: offer,
                })
              );
              console.log(`[WebRTC] Sent offer → ${newPeerId}`);
            } catch (err) {
              console.error(`[WebRTC] Failed creating offer for ${newPeerId}:`, err);
            }
            break;
          }

          // ─── B: Server tells newcomer about EXISTING peers in the room ───
          //        The newcomer does NOT initiate offers — they wait for offers.
          case 'existing-peer': {
            const existId = message.session_id;
            if (!existId || existId === sessionId) return;

            console.log(`[Signaling] Existing peer discovered: ${message.display_name} (${existId})`);
            setRemoteParticipants((prev) => ({
              ...prev,
              [existId]: {
                sessionId: existId,
                displayName: message.display_name || 'Participant',
                role: message.role || 'participant',
                isAudioOn: message.is_audio_on ?? true,
                isVideoOn: message.is_video_on ?? true,
              },
            }));
            // Do NOT create PC here — wait for the offer from that existing peer
            break;
          }

          // ─── C: Received SDP Offer from a specific peer ─────────────────
          case 'offer': {
            if (!remotePeerId || !message.sdp) return;
            console.log(`[WebRTC] Received offer from ${remotePeerId}`);

            const pc = createPCFor(remotePeerId);

            // Ensure participant is in state (in case peer-joined arrived after offer)
            setRemoteParticipants((prev) => {
              if (prev[remotePeerId]) return prev;
              return {
                ...prev,
                [remotePeerId]: {
                  sessionId: remotePeerId,
                  displayName: message.sender_name || 'Participant',
                  role: message.role || 'participant',
                  isAudioOn: true,
                  isVideoOn: true,
                },
              };
            });

            try {
              const answer = await createAnswer(pc, message.sdp);
              ws?.send(
                JSON.stringify({
                  type: 'answer',
                  target_session_id: remotePeerId,
                  sender_session_id: sessionId,
                  sender_name: displayName,
                  role: role,
                  sdp: answer,
                })
              );
              console.log(`[WebRTC] Sent answer → ${remotePeerId}`);
              // After setRemoteDescription, flush any queued ICE candidates
              await drainIceQueue(remotePeerId, pc);
            } catch (err) {
              console.error(`[WebRTC] Error handling offer from ${remotePeerId}:`, err);
            }
            break;
          }

          // ─── D: Received SDP Answer — apply to correct peer's connection ─
          case 'answer': {
            if (!remotePeerId || !message.sdp) return;
            console.log(`[WebRTC] Received answer from ${remotePeerId}`);
            const pc = peerConnectionsRef.current[remotePeerId];
            if (pc) {
              try {
                await handleRemoteAnswer(pc, message.sdp);
                console.log(`[WebRTC] Handshake complete with: ${remotePeerId}`);
                await drainIceQueue(remotePeerId, pc);
              } catch (err) {
                console.error(`[WebRTC] Error applying answer from ${remotePeerId}:`, err);
              }
            } else {
              console.warn(`[WebRTC] Received answer but no PC for ${remotePeerId}`);
            }
            break;
          }

          // ─── E: ICE candidate — queue if remoteDescription not set yet ──
          case 'ice-candidate': {
            if (!remotePeerId || !message.candidate) return;
            const pc = peerConnectionsRef.current[remotePeerId];
            if (pc && pc.remoteDescription?.type) {
              // Remote description already set — add immediately
              try {
                await pc.addIceCandidate(new RTCIceCandidate(message.candidate));
              } catch (err) {
                console.warn(`[WebRTC] ICE error from ${remotePeerId}:`, err);
              }
            } else {
              // Not ready yet — queue it; will be drained after answer/offer handled
              if (!iceQueuesRef.current[remotePeerId]) {
                iceQueuesRef.current[remotePeerId] = [];
              }
              iceQueuesRef.current[remotePeerId].push(message.candidate);
            }
            break;
          }

          // ─── F: Remote participant toggled audio or video ────────────────
          //        Update ONLY that participant's state — never global state
          case 'participant-state': {
            const targetId = message.session_id || remotePeerId;
            if (!targetId) return;

            setRemoteParticipants((prev) => {
              const current = prev[targetId];
              if (!current) return prev;
              return {
                ...prev,
                [targetId]: {
                  ...current,
                  isAudioOn:
                    typeof message.is_audio_on === 'boolean' ? message.is_audio_on : current.isAudioOn,
                  isVideoOn:
                    typeof message.is_video_on === 'boolean' ? message.is_video_on : current.isVideoOn,
                },
              };
            });
            break;
          }

          // ─── G: Host control — this participant is the target ────────────
          case 'host_control': {
            console.log(`[Host Control] Action: ${message.action}`);

            if (message.action === 'mute') {
              // Disable audio tracks
              localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = false; });
              setIsAudioOn(false);
              isAudioOnRef.current = false;
              broadcastMyState(false, isVideoOnRef.current);
            } else if (message.action === 'camera_off') {
              // Disable video tracks
              localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = false; });
              setIsVideoOn(false);
              isVideoOnRef.current = false;
              broadcastMyState(isAudioOnRef.current, false);
            } else if (message.action === 'remove') {
              // Stop all media, close all connections, leave
              localStreamRef.current?.getTracks().forEach((t) => t.stop());
              Object.values(peerConnectionsRef.current).forEach((p) => p.close());
              peerConnectionsRef.current = {};
              ws?.close();
              setRemovedByHost(true);
            }
            break;
          }

          // ─── G2: Chat message received from remote peer ──────────────────
          case 'chat': {
            const incomingText = (message as any).text;
            if (incomingText) {
              setChatMessages((prev) => [
                ...prev,
                {
                  id: 'msg-' + Math.random().toString(36).substring(2, 9),
                  senderName: message.sender_name || 'Participant',
                  text: incomingText,
                  timestamp: (message as any).timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                  isMe: false,
                },
              ]);
              if (activeDrawerRef.current !== 'chat') {
                setUnreadChatCount((count) => count + 1);
              }
            }
            break;
          }

          // ─── G3: Reaction emoji received ─────────────────────────────────
          case 'reaction': {
            const incomingEmoji = (message as any).emoji;
            if (incomingEmoji) {
              const newReaction = {
                id: 'react-' + Math.random().toString(36).substring(2, 9),
                emoji: incomingEmoji,
                left: 35 + Math.random() * 30, // Random placement around center
              };
              setFloatingReactions((prev) => [...prev, newReaction]);
              setTimeout(() => {
                setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
              }, 2500);
            }
            break;
          }

          // ─── H: A participant left voluntarily or was removed ────────────
          //        Clean up ONLY that peer — do NOT affect others
          case 'peer-left': {
            const leavingId = message.session_id;
            if (!leavingId || leavingId === sessionId) return;
            console.log(`[Signaling] Peer left: ${leavingId}`);
            cleanupPeer(leavingId);
            break;
          }

          // ─── I: Meeting ended by host ────────────────────────────────────
          case 'meeting_ended': {
            console.log('[Meeting Ended by Host]');
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            Object.values(peerConnectionsRef.current).forEach((p) => p.close());
            peerConnectionsRef.current = {};
            ws?.close();
            setMeetingEndedByHost(true);
            break;
          }

          // ─── J: Error from server ────────────────────────────────────────
          case 'error': {
            console.error('[Server Error]', message.message);
            setErrorMessage(message.message || 'A server error occurred.');
            break;
          }
        }
      };

      ws.onerror = (err) => console.error('[WebSocket] Error:', err);
      ws.onclose = () => console.log('[WebSocket] Disconnected');
    }

    initMeshMeeting();

    return () => {
      isMounted = false;
      // Cleanup on unmount
      if (stream) stream.getTracks().forEach((t) => t.stop());
      Object.values(peerConnectionsRef.current).forEach((p) => p.close());
      peerConnectionsRef.current = {};
      if (ws) ws.close();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Run only once on mount — meetingId/sessionId/displayName are stable from URL

  // ── Toggle local audio ───────────────────────────────────────────────────
  const handleToggleAudio = () => {
    const nextState = !isAudioOnRef.current;
    isAudioOnRef.current = nextState;
    setIsAudioOn(nextState);

    const audioTrack = localStreamRef.current?.getAudioTracks()[0];
    if (audioTrack) audioTrack.enabled = nextState;

    broadcastMyState(nextState, isVideoOnRef.current);
  };

  // ── Toggle local camera ──────────────────────────────────────────────────
  const handleToggleVideo = () => {
    const nextState = !isVideoOnRef.current;
    isVideoOnRef.current = nextState;
    setIsVideoOn(nextState);

    const videoTrack = localStreamRef.current?.getVideoTracks()[0];
    if (videoTrack) videoTrack.enabled = nextState;

    broadcastMyState(isAudioOnRef.current, nextState);
  };

  // ── Send in-meeting chat message ──────────────────────────────────────────
  const handleSendChatMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim() || socketRef.current?.readyState !== WebSocket.OPEN) return;
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const text = chatInputText.trim();
    socketRef.current.send(
      JSON.stringify({
        type: 'chat',
        text: text,
        timestamp: timeStr,
      })
    );
    setChatMessages((prev) => [
      ...prev,
      {
        id: 'msg-' + Math.random().toString(36).substring(2, 9),
        senderName: displayName,
        text: text,
        timestamp: timeStr,
        isMe: true,
      },
    ]);
    setChatInputText('');
  };

  // ── Send reaction emoji ──────────────────────────────────────────────────
  const handleSendReaction = (emoji: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(
        JSON.stringify({
          type: 'reaction',
          emoji: emoji,
        })
      );
    }
    const newReaction = {
      id: 'react-' + Math.random().toString(36).substring(2, 9),
      emoji: emoji,
      left: 35 + Math.random() * 30,
    };
    setFloatingReactions((prev) => [...prev, newReaction]);
    setTimeout(() => {
      setFloatingReactions((prev) => prev.filter((r) => r.id !== newReaction.id));
    }, 2500);
    setShowReactionsBar(false);
  };

  // ── Host controls: send targeted action to a single participant ──────────
  /**
   * sendHostControl targets ONE participant by session ID.
   * The backend verifies the sender is the host, then forwards ONLY to the target.
   * The target's state is NOT touched here — the target updates themselves and
   * broadcasts their new state via participant-state.
   */
  const sendHostControl = (targetSessionId: string, action: 'mute' | 'camera_off' | 'remove') => {
    if (!isHost || socketRef.current?.readyState !== WebSocket.OPEN) return;
    console.log(`[Host Control] ${action} → ${targetSessionId}`);
    socketRef.current.send(
      JSON.stringify({
        type: 'host_control',
        action,
        target_session_id: targetSessionId,
      })
    );
  };

  // ── End meeting for everyone (host only) ─────────────────────────────────
  const handleEndMeetingForEveryone = async () => {
    // Send end signal via WebSocket — backend marks meeting as completed and broadcasts
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ type: 'end_meeting' }));
    }

    setTimeout(() => {
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      Object.values(peerConnectionsRef.current).forEach((p) => p.close());
      peerConnectionsRef.current = {};
      socketRef.current?.close();
      setMeetingEndedByHost(true);
    }, 150);
  };

  // ── Leave meeting (participant — does NOT end the meeting) ───────────────
  const handleLeaveMeeting = () => {
    // IMPORTANT: Do NOT call api.updateStatus('completed') here.
    // A single participant leaving must NOT end the meeting for others.
    // The WebSocket disconnect event on the backend will broadcast peer-left to everyone.
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    Object.values(peerConnectionsRef.current).forEach((p) => p.close());
    peerConnectionsRef.current = {};
    socketRef.current?.close();
    router.push('/');
  };

  // ── Invite link ──────────────────────────────────────────────────────────
  const inviteLink =
    typeof window !== 'undefined'
      ? `${window.location.origin}/meeting/${meetingId}/lobby`
      : `/meeting/${meetingId}/lobby`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // ── Video grid layout ────────────────────────────────────────────────────
  const remoteList = Object.values(remoteParticipants);
  const totalCount = 1 + remoteList.length;

  let gridClass = 'grid-solo';
  if (totalCount === 2) gridClass = 'grid-2';
  else if (totalCount === 3) gridClass = 'grid-3';
  else if (totalCount === 4) gridClass = 'grid-4';
  else if (totalCount >= 5) gridClass = 'grid-multi';

  // ─── Screens: removed / meeting ended ────────────────────────────────────
  if (removedByHost) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0F0F14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          zIndex: 99999,
        }}
      >
        <div className="exit-card">
          <div className="exit-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <PhoneOff size={30} />
          </div>
          <h2>Removed from Meeting</h2>
          <p>You were removed from this meeting by the host.</p>
          <button onClick={() => router.push('/')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (meetingEndedByHost) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0F0F14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          zIndex: 99999,
        }}
      >
        <div className="exit-card">
          <div className="exit-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444' }}>
            <PhoneOff size={30} />
          </div>
          <h2>Meeting Ended</h2>
          <p>This meeting has been ended by the host.</p>
          <button onClick={() => router.push('/')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: '#0F0F14',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          boxSizing: 'border-box',
          zIndex: 99999,
        }}
      >
        <div className="exit-card">
          <div className="exit-icon" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>
            <AlertTriangle size={30} />
          </div>
          <h2>Cannot Join Meeting</h2>
          <p>{errorMessage}</p>
          <button onClick={() => router.push('/')} className="btn-primary" style={{ width: '100%', justifyContent: 'center' }}>
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // ─── Main Room View ───────────────────────────────────────────────────────
  return (
    <div className="workplace-wrapper">
      {/* ── Top Workplace Bar ───────────────────────────────────────── */}
      <header className="workplace-topbar">
        <div className="workplace-brand">
          <span className="workplace-brand-logo">zoom</span>
          <span className="workplace-brand-tag">Workplace</span>
        </div>
        <div className="workplace-search">
          <Search size={14} />
          <span>Zoom Meeting ID: {meetingId}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '12px', color: '#94A3B8' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ color: '#E2E8F0', fontWeight: 600 }}>{displayName}</span>
            <div style={{ width: '28px', height: '28px', borderRadius: '50%', backgroundColor: '#0E71EB', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px' }}>
              {displayName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>
      </header>

      {/* ── Workplace Body ─────────────────────────────────────────── */}
      <div className="workplace-main">
        {/* Left vertical navigation dock */}
        <aside className="workplace-left-dock">
          <div
            className={`dock-item ${activeDrawer === 'chat' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'chat' ? 'none' : 'chat')}
            title="Meeting Chat"
          >
            <MessageSquare size={18} />
            {unreadChatCount > 0 && (
              <span className="unread-chat-badge">{unreadChatCount}</span>
            )}
            <span>Chat</span>
          </div>
          <div
            className={`dock-item ${activeDrawer === 'participants' ? 'active' : ''}`}
            onClick={() => setActiveDrawer(activeDrawer === 'participants' ? 'none' : 'participants')}
            title="Participants"
          >
            <Users size={18} />
            <span className="participant-count-badge">{totalCount}</span>
            <span>People</span>
          </div>
          <div className="dock-item" onClick={() => setShowInviteModal(true)} title="Invite">
            <Share2 size={18} />
            <span>Invite</span>
          </div>
        </aside>

        {/* ── Meeting Stage Container ─────────────────────────────── */}
        <div className="room-container">
          {/* Top Header Bar inside Meeting */}
          <header className="room-header">
            <div className="room-title-box">
              <Shield size={16} color="#10B981" style={{ flexShrink: 0 }} />
              <span style={{ fontWeight: 600 }}>{displayName}&apos;s Zoom Meeting</span>
              <span className="room-divider">|</span>
              <span className="room-muted">ID: {meetingId}</span>
              <span className="room-divider">|</span>
              <span className="room-muted">{formatTimer(elapsedSeconds)}</span>
            </div>

            <button
              className="btn-secondary"
              onClick={() => setShowInviteModal(true)}
              style={{ padding: '5px 12px', fontSize: '12px', background: '#2A2A38', color: 'white', borderColor: '#3F3F56' }}
            >
              <Share2 size={13} />
              <span>Invite</span>
            </button>
          </header>

          {/* Main Stage + Docked Drawer */}
          <div className="room-body">
            {/* Video Grid Stage */}
            <main className={`room-stage${totalCount === 1 ? ' solo' : ''}`}>
              <div className={`video-grid ${gridClass}`}>
                {/* Local tile (You) */}
                <ParticipantVideoTile
                  participantId="local"
                  displayName={displayName}
                  role={isHost ? 'host' : 'participant'}
                  isLocal={true}
                  isAudioOn={isAudioOn}
                  isVideoOn={isVideoOn}
                  stream={localStream}
                />

                {/* Remote participant tiles */}
                {remoteList.map((participant) => (
                  <ParticipantVideoTile
                    key={participant.sessionId}
                    participantId={participant.sessionId}
                    displayName={participant.displayName}
                    role={participant.role}
                    isLocal={false}
                    isAudioOn={participant.isAudioOn}
                    isVideoOn={participant.isVideoOn}
                    stream={remoteStreams[participant.sessionId] || null}
                  />
                ))}
              </div>

              {/* Floating Reaction Emojis on Stage */}
              {floatingReactions.map((r) => (
                <div key={r.id} className="floating-reaction" style={{ left: `${r.left}%` }}>
                  {r.emoji}
                </div>
              ))}

              {/* Reactions Bar Popup */}
              {showReactionsBar && (
                <div className="reactions-bar">
                  {['👏', '👍', '❤️', '😂', '😮', '🎉'].map((emoji) => (
                    <button
                      key={emoji}
                      className="reaction-btn"
                      onClick={() => handleSendReaction(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              )}
            </main>

            {/* Docked Drawer: Participants */}
            {activeDrawer === 'participants' && (
              <aside className="participants-sidebar">
                <div className="participants-sidebar-header">
                  <span>Participants ({totalCount})</span>
                  <button onClick={() => setActiveDrawer('none')} style={{ color: '#94A3B8', border: 'none', background: 'none', cursor: 'pointer' }}>
                    <X size={18} />
                  </button>
                </div>

                <div className="participants-list">
                  <div className="sidebar-section-label">
                    {isHost ? 'You (Host)' : 'You'}
                  </div>
                  <div className="participant-item">
                    <div className="participant-item-main">
                      <div className="participant-item-info">
                        <div className="participant-avatar-sm" style={{ background: getAvatarColor(displayName) }}>
                          {displayName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div className="pname" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span>{displayName} (me)</span>
                            {isHost && (
                              <span
                                style={{
                                  backgroundColor: '#0E71EB',
                                  color: '#FFFFFF',
                                  fontSize: '11px',
                                  fontWeight: 700,
                                  padding: '2px 8px',
                                  borderRadius: '12px',
                                  letterSpacing: '0.2px',
                                }}
                              >
                                Host
                              </span>
                            )}
                          </div>
                          <div className="prole">{isHost ? 'Host' : 'Participant'}</div>
                        </div>
                      </div>
                      <div className="pmedia-icons">
                        {isAudioOn ? <Mic size={15} color="#10B981" /> : <MicOff size={15} color="#EF4444" />}
                        {isVideoOn ? <Video size={15} color="#CBD5E1" /> : <VideoOff size={15} color="#EF4444" />}
                      </div>
                    </div>
                  </div>

                  {remoteList.length > 0 && (
                    <div className="sidebar-section-label">Participants ({remoteList.length})</div>
                  )}
                  {remoteList.map((p) => (
                    <div key={p.sessionId} className="participant-item">
                      <div className="participant-item-main">
                        <div className="participant-item-info">
                          <div className="participant-avatar-sm" style={{ background: getAvatarColor(p.displayName) }}>
                            {p.displayName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="pname" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <span>{p.displayName}</span>
                              {p.role === 'host' && (
                                <span
                                  style={{
                                    backgroundColor: '#0E71EB',
                                    color: '#FFFFFF',
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '2px 8px',
                                    borderRadius: '12px',
                                    letterSpacing: '0.2px',
                                  }}
                                >
                                  Host
                                </span>
                              )}
                            </div>
                            <div className="prole">{p.role === 'host' ? 'Host' : 'Participant'}</div>
                          </div>
                        </div>
                        <div className="pmedia-icons">
                          {p.isAudioOn ? <Mic size={15} color="#10B981" /> : <MicOff size={15} color="#EF4444" />}
                          {p.isVideoOn ? <Video size={15} color="#CBD5E1" /> : <VideoOff size={15} color="#EF4444" />}
                        </div>
                      </div>

                      {isHost && p.role !== 'host' && (
                        <div className="participant-item-actions">
                          <button
                            className="host-action-btn"
                            onClick={() => sendHostControl(p.sessionId, 'mute')}
                            title={`Mute ${p.displayName}`}
                          >
                            <MicOff size={12} />
                            <span>Mute</span>
                          </button>
                          <button
                            className="host-action-btn"
                            onClick={() => sendHostControl(p.sessionId, 'camera_off')}
                            title={`Turn off ${p.displayName}'s camera`}
                          >
                            <VideoOff size={12} />
                            <span>Cam Off</span>
                          </button>
                          <button
                            className="host-action-btn remove"
                            onClick={() => sendHostControl(p.sessionId, 'remove')}
                            title={`Remove ${p.displayName}`}
                          >
                            <X size={12} />
                            <span>Remove</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div className="sidebar-footer">
                  <button
                    className="sidebar-footer-btn"
                    onClick={() => setShowInviteModal(true)}
                  >
                    Invite
                  </button>
                  {isHost && (
                    <button
                      className="sidebar-footer-btn mute-all"
                      onClick={() => {
                        remoteList
                          .filter((p) => p.role !== 'host')
                          .forEach((p) => sendHostControl(p.sessionId, 'mute'));
                      }}
                    >
                      Mute All
                    </button>
                  )}
                </div>
              </aside>
            )}

            {/* Docked Drawer: In-Room Group Chat */}
            {activeDrawer === 'chat' && (
              <aside className="chat-drawer">
                <div className="chat-drawer-header">
                  <div>
                    <div className="chat-drawer-title">Meeting Chat</div>
                    <div className="chat-drawer-subtitle">
                      Messages sent here are visible to all meeting participants.
                    </div>
                  </div>
                  <button onClick={() => setActiveDrawer('none')} style={{ color: '#94A3B8', border: 'none', background: 'none', cursor: 'pointer', padding: '4px' }}>
                    <X size={18} />
                  </button>
                </div>

                <div className="chat-messages-box">
                  {chatMessages.map((msg) => (
                    <div key={msg.id} className={`chat-msg-item ${msg.isMe ? 'mine' : ''}`}>
                      <div className="chat-msg-meta">
                        <span className="chat-msg-sender">{msg.isMe ? 'You' : msg.senderName}</span>
                        <span className="chat-msg-time">{msg.timestamp}</span>
                      </div>
                      <div className="chat-msg-bubble">{msg.text}</div>
                    </div>
                  ))}
                  <div ref={chatMessagesEndRef} />
                </div>

                <form onSubmit={handleSendChatMessage} className="chat-input-area">
                  <div className="chat-recipient-bar">
                    <span className="chat-recipient-pill">To: Everyone</span>
                    <span style={{ fontSize: '11px', color: '#64748B' }}>Group Chat</span>
                  </div>
                  <div className="chat-input-row">
                    <input
                      type="text"
                      placeholder="Type a message..."
                      value={chatInputText}
                      onChange={(e) => setChatInputText(e.target.value)}
                      className="chat-input-field"
                    />
                    <button type="submit" className="chat-send-btn" title="Send message" disabled={!chatInputText.trim()}>
                      <Send size={15} />
                    </button>
                  </div>
                </form>
              </aside>
            )}
          </div>

          {/* ── Bottom Toolbar ───────────────────────────────────────── */}
          <footer className="room-toolbar">
            {/* Left Zone: Audio + Video */}
            <div className="toolbar-left">
              <button
                className={`tool-btn ${!isAudioOn ? 'active' : ''}`}
                onClick={handleToggleAudio}
                id="btn-toggle-audio"
                title={isAudioOn ? 'Mute microphone' : 'Unmute microphone'}
              >
                {isAudioOn ? <Mic size={19} /> : <MicOff size={19} />}
                <span>{isAudioOn ? 'Mute' : 'Unmute'}</span>
              </button>

              <button
                className={`tool-btn ${!isVideoOn ? 'active' : ''}`}
                onClick={handleToggleVideo}
                id="btn-toggle-video"
                title={isVideoOn ? 'Stop video' : 'Start video'}
              >
                {isVideoOn ? <Video size={19} /> : <VideoOff size={19} />}
                <span>{isVideoOn ? 'Stop Video' : 'Start Video'}</span>
              </button>
            </div>

            {/* Center Zone: Participants, Chat, React, Invite */}
            <div className="toolbar-center">
              <button
                className={`tool-btn ${activeDrawer === 'participants' ? 'active' : ''}`}
                onClick={() => setActiveDrawer(activeDrawer === 'participants' ? 'none' : 'participants')}
                id="btn-toggle-participants"
                title="Participants"
              >
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <Users size={19} />
                  <span className="participant-count-badge">{totalCount}</span>
                </div>
                <span>Participants</span>
              </button>

              <button
                className={`tool-btn ${activeDrawer === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveDrawer(activeDrawer === 'chat' ? 'none' : 'chat')}
                id="btn-toggle-chat"
                title="Group Chat"
              >
                <div style={{ position: 'relative', display: 'inline-flex' }}>
                  <MessageSquare size={19} />
                  {unreadChatCount > 0 && (
                    <span className="unread-chat-badge">{unreadChatCount}</span>
                  )}
                </div>
                <span>Chat</span>
              </button>

              <button
                className={`tool-btn ${showReactionsBar ? 'active' : ''}`}
                onClick={() => setShowReactionsBar(!showReactionsBar)}
                title="Reactions"
              >
                <Smile size={19} />
                <span>React</span>
              </button>

              <button className="tool-btn" onClick={() => setShowInviteModal(true)} title="Invite others">
                <Share2 size={19} />
                <span>Invite</span>
              </button>
            </div>

            {/* Right Zone: End / Leave */}
            <div className="toolbar-right">
              {isHost ? (
                <button className="btn-end" onClick={() => setShowEndModal(true)} id="btn-end-meeting">
                  <PhoneOff size={15} />
                  <span>End</span>
                </button>
              ) : (
                <button className="btn-end" onClick={handleLeaveMeeting} id="btn-leave-meeting">
                  <PhoneOff size={15} />
                  <span>Leave</span>
                </button>
              )}
            </div>
          </footer>
        </div>
      </div>

      {/* ── Invite Modal ─────────────────────────────────────────────────── */}
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
                Share this link or Meeting ID with participants.
              </p>
              <div className="form-group">
                <label className="form-label">Meeting ID</label>
                <div style={{ background: '#F1F5F9', padding: '10px 14px', borderRadius: '8px', fontWeight: 700, fontSize: '16px', color: 'var(--zoom-blue)' }}>
                  {meetingId}
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Invite Link</label>
                <input type="text" readOnly value={inviteLink} className="form-input" style={{ fontSize: '13px' }} />
              </div>
              <button className="btn-primary" onClick={copyToClipboard} style={{ width: '100%', justifyContent: 'center', marginTop: '16px' }}>
                {copiedLink ? <Check size={18} /> : <Copy size={18} />}
                <span>{copiedLink ? 'Copied!' : 'Copy Invite Link'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── End Meeting Modal (Host only) ────────────────────────────────── */}
      {showEndModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
            <div className="exit-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: '#EF4444', margin: '0 auto 20px' }}>
              <AlertTriangle size={28} />
            </div>
            <h3 style={{ fontSize: '18px', fontWeight: 700, marginBottom: '8px' }}>End Meeting?</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginBottom: '24px', lineHeight: 1.5 }}>
              Ending will disconnect all participants.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <button
                onClick={handleEndMeetingForEveryone}
                style={{ background: '#E02828', color: 'white', padding: '11px', borderRadius: '8px', fontWeight: 600, border: 'none', cursor: 'pointer', fontSize: '14px' }}
              >
                End Meeting for All
              </button>
              <button
                onClick={handleLeaveMeeting}
                style={{ padding: '11px', borderRadius: '8px', fontWeight: 600, border: '1px solid var(--border-light)', background: '#F8FAFC', color: 'var(--text-main)', cursor: 'pointer', fontSize: '14px' }}
              >
                Leave Meeting Only
              </button>
              <button
                onClick={() => setShowEndModal(false)}
                style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '6px', fontSize: '13px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page wrapper with Suspense (needed for useSearchParams) ─────────────────
export default function MeetingRoomPage() {
  return (
    <Suspense
      fallback={
        <div className="room-container" style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ color: 'var(--room-text)' }}>Connecting to meeting...</div>
        </div>
      }
    >
      <MeetingRoomContent />
    </Suspense>
  );
}
