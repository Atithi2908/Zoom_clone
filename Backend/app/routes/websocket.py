import json
from typing import Dict, List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["signaling"])

class SignalingManager:
    """
    Manages active WebRTC signaling WebSocket connections by meeting_id.
    Relays WebRTC SDP offers, answers, and ICE candidates between peers in the same room.
    """
    def __init__(self):
        # meeting_id -> list of connected peer dicts: [{"ws": WebSocket, "session_id": str, "display_name": str}]
        self.rooms: Dict[str, List[dict]] = {}

    async def connect(self, websocket: WebSocket, meeting_id: str, session_id: str, display_name: str):
        await websocket.accept()
        if meeting_id not in self.rooms:
            self.rooms[meeting_id] = []

        peer_info = {
            "ws": websocket,
            "session_id": session_id,
            "display_name": display_name
        }
        self.rooms[meeting_id].append(peer_info)

        # Notify other peer in the room that a new peer has joined
        for peer in self.rooms[meeting_id]:
            if peer["session_id"] != session_id:
                await peer["ws"].send_text(json.dumps({
                    "type": "peer-joined",
                    "session_id": session_id,
                    "display_name": display_name
                }))
                # Also tell the newcomer about the existing peer
                await websocket.send_text(json.dumps({
                    "type": "existing-peer",
                    "session_id": peer["session_id"],
                    "display_name": peer["display_name"]
                }))

    async def disconnect(self, meeting_id: str, session_id: str):
        if meeting_id in self.rooms:
            # Remove disconnected peer
            self.rooms[meeting_id] = [p for p in self.rooms[meeting_id] if p["session_id"] != session_id]

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
        """Forward signaling payload (offer, answer, ice-candidate) to other peer(s) in the room."""
        if meeting_id in self.rooms:
            for peer in self.rooms[meeting_id]:
                if peer["session_id"] != sender_session_id:
                    try:
                        await peer["ws"].send_text(json.dumps(message))
                    except Exception:
                        pass

manager = SignalingManager()

@router.websocket("/ws/meeting/{meeting_id}")
async def websocket_signaling_endpoint(
    websocket: WebSocket,
    meeting_id: str,
    session_id: str,
    name: str = "Participant"
):
    """
    WebSocket endpoint for WebRTC signaling:
    Handles join, SDP offer, SDP answer, and ICE candidate exchanges.
    """
    await manager.connect(websocket, meeting_id, session_id, name)
    try:
        while True:
            raw_data = await websocket.receive_text()
            data = json.loads(raw_data)
            msg_type = data.get("type")

            # Attach sender identity to the signaling payload
            data["from"] = session_id
            data["sender_name"] = name

            if msg_type in ["offer", "answer", "ice-candidate", "toggle-audio", "toggle-video"]:
                await manager.broadcast_to_room(meeting_id, session_id, data)

    except WebSocketDisconnect:
        await manager.disconnect(meeting_id, session_id)
    except Exception:
        await manager.disconnect(meeting_id, session_id)
