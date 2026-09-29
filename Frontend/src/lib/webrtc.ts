/**
 * WebRTC Configuration & Peer Connection Helper
 *
 * This file provides straightforward WebRTC peer connection helpers:
 * 1. PeerConnection setup with public STUN servers for NAT traversal.
 * 2. SDP Offer generation (Host -> Peer).
 * 3. SDP Answer generation (Peer -> Host).
 * 4. ICE candidate exchange.
 */

// Public Google STUN servers allow peers to discover their public IP addresses for direct P2P streaming.
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Initializes a new RTCPeerConnection and binds listeners for remote tracks and ICE candidates.
 */
export function createPeerConnection(
  onRemoteTrack: (event: RTCTrackEvent) => void,
  onIceCandidate: (candidate: RTCIceCandidate) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  // Fired when the local browser discovers an ICE candidate to send to the remote peer
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  // Fired when the remote peer's media track (video or audio) arrives
  pc.ontrack = (event) => {
    onRemoteTrack(event);
  };

  return pc;
}

/**
 * Adds all audio and video tracks from a local MediaStream to the RTCPeerConnection.
 */
export function addTracksToConnection(pc: RTCPeerConnection, stream: MediaStream) {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });
}

/**
 * Creates an SDP Offer (Session Description Protocol) describing local media capabilities.
 * Sets the offer as the local description and returns it to be sent over WebSocket.
 */
export async function createOffer(pc: RTCPeerConnection): Promise<RTCSessionDescriptionInit> {
  const offer = await pc.createOffer({
    offerToReceiveAudio: true,
    offerToReceiveVideo: true,
  });
  await pc.setLocalDescription(offer);
  return offer;
}

/**
 * Handles an incoming SDP Offer from a remote peer:
 * 1. Sets the remote description.
 * 2. Creates an SDP Answer acknowledging codecs/capabilities.
 * 3. Sets the answer as the local description.
 */
export async function createAnswer(
  pc: RTCPeerConnection,
  offer: RTCSessionDescriptionInit
): Promise<RTCSessionDescriptionInit> {
  await pc.setRemoteDescription(new RTCSessionDescription(offer));
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);
  return answer;
}

/**
 * Applies the received SDP Answer from the remote peer to finalize the handshake.
 */
export async function handleRemoteAnswer(
  pc: RTCPeerConnection,
  answer: RTCSessionDescriptionInit
): Promise<void> {
  if (pc.signalingState !== 'stable') {
    await pc.setRemoteDescription(new RTCSessionDescription(answer));
  }
}

/**
 * Adds a network candidate received from the remote peer via WebSocket.
 */
export async function handleRemoteIceCandidate(
  pc: RTCPeerConnection,
  candidate: RTCIceCandidateInit
): Promise<void> {
  try {
    await pc.addIceCandidate(new RTCIceCandidate(candidate));
  } catch (err) {
    console.warn('[WebRTC] Error adding received ICE candidate:', err);
  }
}

/**
 * Requests user permission for camera and microphone.
 */
export async function getLocalUserMedia(
  audioEnabled = true,
  videoEnabled = true
): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: audioEnabled,
      video: videoEnabled
        ? { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } }
        : false,
    });
  } catch (error) {
    console.warn('[WebRTC] Could not acquire camera/mic stream:', error);
    // Attempt audio-only if video failed (e.g., no webcam plugged in)
    if (videoEnabled && audioEnabled) {
      try {
        return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      } catch (audioError) {
        console.warn('[WebRTC] Audio-only fallback also failed:', audioError);
      }
    }
    return null;
  }
}
