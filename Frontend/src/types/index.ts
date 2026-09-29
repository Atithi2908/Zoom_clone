export interface Participant {
  id: number;
  meeting_id: string;
  display_name: string;
  role: 'host' | 'participant';
  session_id: string;
  joined_at: string;
}

export interface Meeting {
  id: number;
  meeting_id: string;
  title: string;
  description: string | null;
  scheduled_at: string;
  duration_minutes: number;
  invite_link: string;
  status: 'scheduled' | 'active' | 'completed';
  host_id?: number;
  host_email?: string;
  created_at: string;
  participants?: Participant[];
}

export interface MeetingValidationResponse {
  exists: boolean;
  meeting_id: string;
  title: string;
  status: string;
  scheduled_at: string;
  duration_minutes: number;
  host_id?: number;
  host_email?: string;
}

export interface InstantMeetingPayload {
  title?: string;
  host_name?: string;
  host_email?: string;
  host_id?: number;
}

export interface ScheduledMeetingPayload {
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
  host_email?: string;
  host_id?: number;
}

export interface ParticipantJoinPayload {
  display_name: string;
  role?: string;
  session_id: string;
  user_email?: string;
}

// WebRTC Signaling Types
export type SignalMessageType =
  | 'peer-joined'
  | 'existing-peer'
  | 'offer'
  | 'answer'
  | 'ice-candidate'
  | 'peer-left'
  | 'toggle-audio'
  | 'toggle-video'
  | 'participant-state'
  | 'host_control'
  | 'meeting_ended'
  | 'end_meeting'
  | 'chat'
  | 'reaction'
  | 'error';

export interface SignalMessage {
  type: SignalMessageType;
  from?: string;
  sender_session_id?: string;
  sender_name?: string;
  session_id?: string;
  display_name?: string;
  role?: 'host' | 'participant';
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  audio?: boolean;
  video?: boolean;
  is_audio_on?: boolean;
  is_video_on?: boolean;
  action?: 'mute' | 'camera_off' | 'remove';
  target_session_id?: string;
  text?: string;
  emoji?: string;
  timestamp?: string;
  message?: string;
}

export interface RemoteParticipant {
  sessionId: string;
  displayName: string;
  role: 'host' | 'participant';
  isAudioOn: boolean;
  isVideoOn: boolean;
}
