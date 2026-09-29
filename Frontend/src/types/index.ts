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
}

export interface InstantMeetingPayload {
  title?: string;
  host_name?: string;
}

export interface ScheduledMeetingPayload {
  title: string;
  description?: string;
  scheduled_at: string;
  duration_minutes: number;
}

export interface ParticipantJoinPayload {
  display_name: string;
  role?: string;
  session_id: string;
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
  | 'toggle-video';

export interface SignalMessage {
  type: SignalMessageType;
  from?: string;
  sender_name?: string;
  session_id?: string;
  display_name?: string;
  sdp?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
  audio?: boolean;
  video?: boolean;
}
