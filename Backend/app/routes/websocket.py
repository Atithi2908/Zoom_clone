import json
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

from ..database import SessionLocal
from ..models import Meeting, Participant, User
from .auth import decode_access_token

router = APIRouter(tags=["signaling"])

def normalize_meeting_id(raw_id: str) -> str:
    """Normalize input like '8492913841' or '849-291-3841' to standard hyphenated form."""
    cleaned = raw_id.strip().replace(" ", "").replace("-", "")
    if len(cleaned) == 10:
        return f"{cleaned[:3]}-{cleaned[3:6]}-{cleaned[6:]}"
    return raw_id.strip()

class SignalingManager:
    """
    Manages active WebRTC signaling WebSocket connections by normalized meeting_id.
    Relays WebRTC SDP offers, answers, ICE candidates, and host controls.
    """
    def __init__(self):
        # meeting_id -> list of connected peer dicts:
        # [{"ws": WebSocket, "session_id": str, "display_name": str, "is_host": bool, "authenticated_email": Optional[str]}]
        self.rooms: Dict[str, List[dict]] = {}
        # meeting_id -> set of removed session_ids to prevent unauthorized reconnection
        self.removed_sessions: Dict[str, set] = {}

    def get_peer(self, meeting_id: str, session_id: str) -> Optional[dict]:
        if meeting_id in self.rooms:
            for peer in self.rooms[meeting_id]:
                if peer["session_id"] == session_id:
                    return peer
        return None

    async def connect(
        self,
        websocket: WebSocket,
        meeting_id: str,
        session_id: str,
        display_name: str,
        is_host: bool = False,
        authenticated_email: Optional[str] = None,
        is_audio_on: bool = True,
        is_video_on: bool = True
    ):
        await websocket.accept()
        if meeting_id not in self.rooms:
            self.rooms[meeting_id] = []

        peer_info = {
            "ws": websocket,
            "session_id": session_id,
            "display_name": display_name,
            "is_host": is_host,
            "authenticated_email": authenticated_email,
            "is_audio_on": is_audio_on,
            "is_video_on": is_video_on
        }
        self.rooms[meeting_id].append(peer_info)
        role_label = "HOST" if is_host else "PARTICIPANT"
        print(f"[WS] Peer '{display_name}' ({session_id}, {role_label}) joined room '{meeting_id}'. Total peers: {len(self.rooms[meeting_id])}")

        # Send room-joined confirmation to newcomer with server-authoritative role and is_host
        try:
            await websocket.send_text(json.dumps({
                "type": "room-joined",
                "session_id": session_id,
                "display_name": display_name,
                "role": "host" if is_host else "participant",
                "is_host": is_host,
                "meeting_id": meeting_id
            }))
        except Exception as e:
            print(f"[WS] Error sending room-joined to {session_id}: {e}")

        # 1. Notify all existing peers in the room about the newcomer
        for peer in self.rooms[meeting_id]:
            if peer["session_id"] != session_id:
                try:
                    await peer["ws"].send_text(json.dumps({
                        "type": "peer-joined",
                        "session_id": session_id,
                        "display_name": display_name,
                        "role": "host" if is_host else "participant",
                        "is_audio_on": is_audio_on,
                        "is_video_on": is_video_on
                    }))
                    # 2. Tell the newcomer about each existing peer in the room
                    await websocket.send_text(json.dumps({
                        "type": "existing-peer",
                        "session_id": peer["session_id"],
                        "display_name": peer["display_name"],
                        "role": "host" if peer.get("is_host") else "participant",
                        "is_audio_on": peer.get("is_audio_on", True),
                        "is_video_on": peer.get("is_video_on", True)
                    }))
                except Exception as e:
                    print(f"[WS] Error exchanging peer presence: {e}")

    async def disconnect(self, meeting_id: str, session_id: str):
        if meeting_id in self.rooms:
            # Remove disconnected peer
            self.rooms[meeting_id] = [p for p in self.rooms[meeting_id] if p["session_id"] != session_id]
            print(f"[WS] Peer '{session_id}' left room '{meeting_id}'. Remaining: {len(self.rooms[meeting_id])}")

            # Broadcast departure to remaining peers
            for peer in self.rooms[meeting_id]:
                try:
                    await peer["ws"].send_text(json.dumps({
                        "type": "peer-left",
                        "session_id": session_id
                    }))
                except Exception:
                    pass

            if not self.rooms[meeting_id]:
                del self.rooms[meeting_id]

    async def broadcast_to_room(self, meeting_id: str, sender_session_id: str, message: dict):
        """Forward payload to all OTHER peers in the room."""
        if meeting_id in self.rooms:
            for peer in self.rooms[meeting_id]:
                if peer["session_id"] != sender_session_id:
                    try:
                        await peer["ws"].send_text(json.dumps(message))
                        print(f"[WS BROADCAST] Sent {message.get('type')} to {peer['session_id']}", flush=True)
                    except Exception as e:
                        print(f"[WS ERROR] Failed sending to {peer['session_id']}: {e}", flush=True)

    async def broadcast_all(self, meeting_id: str, message: dict):
        """Broadcast payload to EVERY peer in the room (e.g. meeting_ended)."""
        if meeting_id in self.rooms:
            for peer in list(self.rooms[meeting_id]):
                try:
                    await peer["ws"].send_text(json.dumps(message))
                except Exception:
                    pass

    async def send_to_peer(self, meeting_id: str, target_session_id: str, message: dict):
        """Send message targeted specifically to a single participant."""
        if meeting_id in self.rooms:
            for peer in self.rooms[meeting_id]:
                if peer["session_id"] == target_session_id:
                    try:
                        await peer["ws"].send_text(json.dumps(message))
                        print(f"[WS] Sent targeted message to peer {target_session_id}: {message.get('type') or message.get('action')}")
                    except Exception as e:
                        print(f"[WS] Failed sending to peer {target_session_id}: {e}")
                    break

manager = SignalingManager()

@router.websocket("/ws/meeting/{meeting_id}")
async def websocket_signaling_endpoint(
    websocket: WebSocket,
    meeting_id: str,
    session_id: str,
    name: str = "Participant",
    role: Optional[str] = None,
    token: Optional[str] = None,
):
    """
    WebSocket endpoint for WebRTC signaling:
    1. Validates meeting existence and schedule status.
    2. Authenticates user from JWT token and verifies meeting ownership server-side.
    3. Never trusts client ?role=host query parameter.
    4. Enforces authorization on host controls and meeting termination.
    """
    norm_id = normalize_meeting_id(meeting_id)

    # Check if this session was previously removed from this meeting
    if session_id in manager.removed_sessions.get(norm_id, set()):
        await websocket.accept()
        await websocket.send_text(json.dumps({
            "type": "error",
            "message": "You were removed from this meeting and cannot rejoin."
        }))
        await websocket.close(code=4003, reason="Removed from meeting")
        return

    # 1. Authenticate user from JWT token (query parameter or headers)
    auth_user_email: Optional[str] = None
    auth_user_id: Optional[int] = None

    raw_token = token or websocket.query_params.get("token") or websocket.headers.get("authorization")
    if raw_token:
        try:
            payload = decode_access_token(raw_token)
            auth_user_id = payload.get("user_id") or payload.get("sub")
            auth_user_email = payload.get("email")
        except Exception as e:
            print(f"[WS AUTH] Token verification failed: {e}")
            auth_user_email = None
            auth_user_id = None

    # 2. Retrieve meeting and determine actual meeting host from database
    with SessionLocal() as db:
        meeting = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
        if not meeting:
            meeting = db.query(Meeting).filter(Meeting.meeting_id == meeting_id.strip()).first()

        if not meeting:
            await websocket.accept()
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"Meeting '{meeting_id}' not found."
            }))
            await websocket.close(code=4004, reason="Meeting not found")
            return

        # Check if meeting has ended
        if meeting.status == "completed":
            await websocket.accept()
            await websocket.send_text(json.dumps({
                "type": "meeting_ended",
                "message": "This meeting has ended."
            }))
            await websocket.close(code=4001, reason="Meeting has ended")
            return

        # Check if scheduled meeting has not reached start time
        now = datetime.now()
        if meeting.status == "scheduled" and meeting.scheduled_at and now < meeting.scheduled_at:
            formatted_time = meeting.scheduled_at.strftime("%B %d, %I:%M %p")
            await websocket.accept()
            await websocket.send_text(json.dumps({
                "type": "error",
                "message": f"This meeting has not started yet. Scheduled for: {formatted_time}"
            }))
            await websocket.close(code=4002, reason="Meeting not started")
            return

        # If meeting status was 'created', activate it upon first real connection
        if meeting.status == "created":
            meeting.status = "active"
            db.commit()

        # 3. Server-side host determination: compare authenticated user with meeting host
        is_host = False
        actual_host_email = meeting.host_email.strip().lower() if meeting.host_email else None
        actual_host_id = meeting.host_id

        if auth_user_id and actual_host_id and str(auth_user_id) == str(actual_host_id):
            is_host = True
        elif auth_user_email and actual_host_email and auth_user_email.strip().lower() == actual_host_email:
            is_host = True
        elif not is_host and auth_user_id and actual_host_email:
            host_user = db.query(User).filter(User.email == actual_host_email).first()
            if host_user and str(host_user.id) == str(auth_user_id):
                is_host = True

        # Fallback to verified database participant host record (only if participant was registered as host)
        participant = db.query(Participant).filter(
            Participant.meeting_id == meeting.meeting_id,
            Participant.session_id == session_id
        ).first()
        if not is_host and participant and participant.role == "host":
            # Only honor DB host if no conflicting authenticated identity
            if not auth_user_email or (actual_host_email and auth_user_email.strip().lower() == actual_host_email):
                is_host = True

        # IMPORTANT: Client query parameter ?role=host is NEVER trusted.
        if not is_host and role and role.strip().lower() == "host":
            print(f"[SECURITY] Untrusted ?role=host from unverified session '{session_id}' was rejected.")

        # Ensure participant record is stored in DB for attendance/recent meetings tracking
        if participant:
            if auth_user_email and not participant.user_email:
                participant.user_email = auth_user_email.strip().lower()
            if is_host:
                participant.role = "host"
            db.commit()
        else:
            participant = Participant(
                meeting_id=meeting.meeting_id,
                session_id=session_id,
                display_name=name,
                role="host" if is_host else "participant",
                user_email=auth_user_email.strip().lower() if auth_user_email else None
            )
            db.add(participant)
            db.commit()

    is_audio_param = websocket.query_params.get("audio") != "0"
    is_video_param = websocket.query_params.get("video") != "0"

    await manager.connect(
        websocket=websocket,
        meeting_id=norm_id,
        session_id=session_id,
        display_name=name,
        is_host=is_host,
        authenticated_email=auth_user_email,
        is_audio_on=is_audio_param,
        is_video_on=is_video_param
    )

    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            msg_type = data.get("type")

            # Attach sender identity
            data["from"] = session_id
            data["sender_session_id"] = session_id
            data["sender_name"] = name

            sender_peer = manager.get_peer(norm_id, session_id)
            sender_is_host = sender_peer.get("is_host", False) if sender_peer else False

            target_session_id = data.get("target_session_id")

            # 1. WebRTC Signaling: Offer, Answer, ICE Candidate (Targeted to specific peer)
            if msg_type in ["offer", "answer", "ice-candidate"]:
                if target_session_id:
                    await manager.send_to_peer(norm_id, target_session_id, data)
                else:
                    await manager.broadcast_to_room(norm_id, session_id, data)

            # 2. Audio/Video state updates
            elif msg_type in ["participant-state", "toggle-audio", "toggle-video"]:
                if sender_peer:
                    if "is_audio_on" in data:
                        sender_peer["is_audio_on"] = data["is_audio_on"]
                    elif "audio" in data:
                        sender_peer["is_audio_on"] = data["audio"]

                    if "is_video_on" in data:
                        sender_peer["is_video_on"] = data["is_video_on"]
                    elif "video" in data:
                        sender_peer["is_video_on"] = data["video"]

                is_audio = sender_peer.get("is_audio_on", True) if sender_peer else (data.get("is_audio_on") if "is_audio_on" in data else data.get("audio", True))
                is_video = sender_peer.get("is_video_on", True) if sender_peer else (data.get("is_video_on") if "is_video_on" in data else data.get("video", True))

                state_update = {
                    "type": msg_type if msg_type in ["toggle-audio", "toggle-video"] else "participant-state",
                    "session_id": session_id,
                    "from": session_id,
                    "sender_session_id": session_id,
                    "is_audio_on": is_audio,
                    "is_video_on": is_video,
                    "audio": is_audio,
                    "video": is_video
                }
                await manager.broadcast_to_room(norm_id, session_id, state_update)

            # 3. Host controls: mute, camera_off, remove, make_host
            # Verified server-side: authenticated sender, sender in room, sender is host, target in room
            elif msg_type == "host_control":
                if not sender_peer or not sender_is_host:
                    print(f"[SECURITY] Non-host session '{session_id}' tried to execute host_control. Denied.")
                    continue

                action = data.get("action")
                if action not in ["mute", "camera_off", "remove", "make_host", "promote_to_host"]:
                    print(f"[SECURITY] Unrecognized host_control action '{action}'. Ignored.")
                    continue

                target_peer = None
                if target_session_id:
                    target_peer = manager.get_peer(norm_id, target_session_id)
                    if not target_peer:
                        print(f"[SECURITY] Target '{target_session_id}' does not belong to meeting '{norm_id}'. Ignored.")
                        continue

                print(f"[HOST CONTROL] Verified host '{name}' executed '{action}' on target '{target_session_id}'")

                # Handle participant removal: immediate cleanup & broadcast
                if action == "remove":
                    manager.removed_sessions.setdefault(norm_id, set()).add(target_session_id)
                    with SessionLocal() as db:
                        p_rec = db.query(Participant).filter(
                            Participant.session_id == target_session_id
                        ).first()
                        if p_rec:
                            db.delete(p_rec)
                            db.commit()

                    if target_peer:
                        try:
                            await target_peer["ws"].send_text(json.dumps({
                                "type": "host_control",
                                "action": "remove",
                                "target_session_id": target_session_id,
                                "message": "You were removed from this meeting by the host."
                            }))
                            await target_peer["ws"].close(code=4003, reason="Removed by host")
                        except Exception as e:
                            print(f"[WS] Error notifying/closing removed peer: {e}")

                        if norm_id in manager.rooms:
                            manager.rooms[norm_id] = [p for p in manager.rooms[norm_id] if p["session_id"] != target_session_id]

                    # Broadcast removal to ALL remaining peers in the room immediately
                    await manager.broadcast_all(norm_id, {
                        "type": "peer-left",
                        "session_id": target_session_id,
                        "reason": "removed"
                    })
                    continue

                # Handle promote participant to host: ONLY changes permissions & roles without disrupting WebRTC or media
                elif action in ["make_host", "promote_to_host"]:
                    if not target_peer:
                        continue
                    target_peer["is_host"] = True
                    if sender_peer:
                        sender_peer["is_host"] = False

                    with SessionLocal() as db:
                        t_part = db.query(Participant).filter(
                            Participant.session_id == target_session_id
                        ).first()
                        if t_part:
                            t_part.role = "host"
                        s_part = db.query(Participant).filter(
                            Participant.session_id == session_id
                        ).first()
                        if s_part:
                            s_part.role = "participant"
                        m = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
                        if m and target_peer.get("authenticated_email"):
                            m.host_email = target_peer["authenticated_email"]
                            target_u = db.query(User).filter(User.email == target_peer["authenticated_email"].strip().lower()).first()
                            if target_u:
                                m.host_id = target_u.id
                        db.commit()

                    # Broadcast role change to ALL peers in room without touching connections
                    await manager.broadcast_all(norm_id, {
                        "type": "role_changed",
                        "action": "role_changed",
                        "session_id": target_session_id,
                        "role": "host",
                        "promoted_session_id": target_session_id,
                        "demoted_session_id": session_id,
                        "previous_host_session_id": session_id,
                        "target_session_id": target_session_id,
                        "new_role": "host",
                        "promoted_name": target_peer.get("display_name", "Participant"),
                        "demoted_name": sender_peer.get("display_name", "Host") if sender_peer else "Host"
                    })
                    continue

                # Mute or camera_off
                if target_peer:
                    if action == "mute":
                        target_peer["is_audio_on"] = False
                    elif action == "camera_off":
                        target_peer["is_video_on"] = False

                control_payload = {
                    "type": "host_control",
                    "action": action,
                    "target_session_id": target_session_id,
                    "from": session_id,
                    "sender_name": name
                }

                if target_session_id:
                    await manager.send_to_peer(norm_id, target_session_id, control_payload)
                else:
                    await manager.broadcast_to_room(norm_id, session_id, control_payload)

            # 4. In-room Chat messages
            elif msg_type == "chat":
                chat_payload = {
                    "type": "chat",
                    "sender_session_id": session_id,
                    "sender_name": name,
                    "text": data.get("text", ""),
                    "timestamp": datetime.now().strftime("%I:%M %p")
                }
                await manager.broadcast_to_room(norm_id, session_id, chat_payload)

            # 5. End meeting for everyone
            # Verified server-side: authenticated sender, sender in room, sender is host
            elif msg_type in ["end_meeting", "meeting_ended"]:
                if not sender_peer or not sender_is_host:
                    print(f"[SECURITY] Non-host session '{session_id}' tried to end meeting. Denied.")
                    continue

                print(f"[HOST ACTION] Verified host '{name}' ended meeting '{norm_id}' for everyone.")

                # Mark meeting completed in SQLite
                with SessionLocal() as db:
                    m = db.query(Meeting).filter(Meeting.meeting_id == norm_id).first()
                    if not m:
                        m = db.query(Meeting).filter(Meeting.meeting_id.like(f"%{norm_id}%")).first()
                    if m:
                        m.status = "completed"
                        db.commit()

                # Broadcast termination to ALL connected participants
                await manager.broadcast_all(norm_id, {
                    "type": "meeting_ended",
                    "message": "This meeting has been ended by the host."
                })

    except WebSocketDisconnect:
        await manager.disconnect(norm_id, session_id)
    except Exception as e:
        print(f"[WS] Connection error for {session_id}: {e}")
        await manager.disconnect(norm_id, session_id)
