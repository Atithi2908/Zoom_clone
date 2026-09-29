/**
 * WebRTC Configuration & Peer Connection Helpers
 *
 * Provides straightforward, easy-to-explain WebRTC primitives:
 * 1. RTCPeerConnection initialization with Google's public STUN servers.
 * 2. Attaching local media tracks (video & audio).
 * 3. Creating SDP Offers and Answers.
 * 4. Applying remote session descriptions and adding ICE candidates.
 */

// Public Google STUN servers resolve public IP addresses for NAT traversal
export const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

/**
 * Creates an RTCPeerConnection and binds listeners for ICE candidates and remote tracks.
 */
export function createPeerConnection(
  onRemoteTrack: (event: RTCTrackEvent) => void,
  onIceCandidate: (candidate: RTCIceCandidate) => void
): RTCPeerConnection {
  const pc = new RTCPeerConnection(RTC_CONFIG);

  // Fired when the browser finds a network candidate to send to the remote peer
  pc.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate);
    }
  };

  // Fired when an incoming media track (audio or video) arrives from the remote peer
  pc.ontrack = (event) => {
    onRemoteTrack(event);
  };

  return pc;
}

/**
 * Adds local audio and video tracks from a MediaStream to the RTCPeerConnection.
 */
export function addTracksToConnection(pc: RTCPeerConnection, stream: MediaStream) {
  stream.getTracks().forEach((track) => {
    pc.addTrack(track, stream);
  });
}

/**
 * Creates an SDP Offer describing local capabilities and sets it as the local description.
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
 * Handles an incoming SDP Offer:
 * 1. Sets remote description.
 * 2. Generates an SDP Answer.
 * 3. Sets local description with the answer.
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
 * Requests user camera and microphone permissions.
 */
export async function getLocalUserMedia(
  audioEnabled = true,
  videoEnabled = true
): Promise<MediaStream | null> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
    });
  } catch (error) {
    console.warn('[WebRTC] Camera access failed, trying audio only:', error);
    try {
      return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    } catch (audioError) {
      console.warn('[WebRTC] Microphone access also failed:', audioError);
      return null;
    }
  }
}
