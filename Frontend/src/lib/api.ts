import {
  Meeting,
  MeetingValidationResponse,
  InstantMeetingPayload,
  ScheduledMeetingPayload,
  ParticipantJoinPayload,
  Participant,
} from '@/types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`;
    try {
      const errorJson = await res.json();
      if (errorJson.detail) errorDetail = errorJson.detail;
    } catch {
      // Use fallback errorDetail
    }
    throw new Error(errorDetail);
  }

  return res.json();
}

export const api = {
  // Create an instant meeting and return details
  async createInstantMeeting(payload: InstantMeetingPayload = {}): Promise<Meeting> {
    return fetchJson<Meeting>(`${API_BASE}/meetings`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Schedule a meeting
  async scheduleMeeting(payload: ScheduledMeetingPayload): Promise<Meeting> {
    return fetchJson<Meeting>(`${API_BASE}/meetings/schedule`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  // Get upcoming meetings list
  async getUpcomingMeetings(hostEmail?: string): Promise<Meeting[]> {
    const url = hostEmail
      ? `${API_BASE}/meetings/upcoming?host_email=${encodeURIComponent(hostEmail)}`
      : `${API_BASE}/meetings/upcoming`;
    return fetchJson<Meeting[]>(url, {
      cache: 'no-store',
    });
  },

  // Get recent meetings list
  async getRecentMeetings(userEmail?: string): Promise<Meeting[]> {
    const url = userEmail
      ? `${API_BASE}/meetings/recent?user_email=${encodeURIComponent(userEmail)}`
      : `${API_BASE}/meetings/recent`;
    return fetchJson<Meeting[]>(url, {
      cache: 'no-store',
    });
  },

  // Validate if meeting ID exists
  async validateMeeting(meetingId: string): Promise<MeetingValidationResponse> {
    return fetchJson<MeetingValidationResponse>(
      `${API_BASE}/meetings/${encodeURIComponent(meetingId)}/validate`,
      { cache: 'no-store' }
    );
  },

  // Get specific meeting details
  async getMeeting(meetingId: string): Promise<Meeting> {
    return fetchJson<Meeting>(
      `${API_BASE}/meetings/${encodeURIComponent(meetingId)}`,
      { cache: 'no-store' }
    );
  },

  // Register participant before joining room
  async registerParticipant(
    meetingId: string,
    payload: ParticipantJoinPayload
  ): Promise<Participant> {
    return fetchJson<Participant>(
      `${API_BASE}/meetings/${encodeURIComponent(meetingId)}/participants`,
      {
        method: 'POST',
        body: JSON.stringify(payload),
      }
    );
  },

  // Update meeting status
  async updateStatus(meetingId: string, status: string): Promise<void> {
    await fetchJson(
      `${API_BASE}/meetings/${encodeURIComponent(meetingId)}/status?new_status=${status}`,
      { method: 'PATCH' }
    );
  },
};
