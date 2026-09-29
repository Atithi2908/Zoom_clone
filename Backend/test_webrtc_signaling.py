import asyncio
import json
import urllib.request
import websockets

BACKEND_HTTP = "http://localhost:8000"
BACKEND_WS = "ws://localhost:8000"

async def test_full_webrtc_signaling_flow():
    print("--- STARTING WEBRTC MULTI-PARTICIPANT SIGNALING TEST ---")

    # Step 1: Create an instant meeting
    req = urllib.request.Request(
        f"{BACKEND_HTTP}/meetings",
        data=json.dumps({"title": "WebRTC E2E Test Meeting", "host_name": "Atithi (Host)"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        meeting = json.loads(resp.read().decode("utf-8"))
    
    meeting_id = meeting["meeting_id"]
    print(f"Step 1: Created instant meeting: {meeting_id}")
    assert meeting["status"] == "active"
    assert "invite_link" in meeting

    # Step 2: Validate meeting exists
    val_url = f"{BACKEND_HTTP}/meetings/{meeting_id}/validate"
    with urllib.request.urlopen(val_url) as resp:
        val_res = json.loads(resp.read().decode("utf-8"))
        assert val_res["exists"] is True
        print(f"Step 2: Validated meeting ID exists: {val_res['title']}")

    # Step 3: Connect Browser A (Host: Atithi) to WebSocket
    ws_host_url = f"{BACKEND_WS}/ws/meeting/{meeting_id}?session_id=sess_host_01&name=Atithi%20(Host)"
    ws_host = await websockets.connect(ws_host_url)
    print("Step 3: Browser A (Host: Atithi) connected to WebSocket signaling channel.")

    # Step 4: Connect Browser B (Participant: Test User) to WebSocket
    ws_guest_url = f"{BACKEND_WS}/ws/meeting/{meeting_id}?session_id=sess_guest_02&name=Test%20User"
    ws_guest = await websockets.connect(ws_guest_url)
    print("Step 4: Browser B (Participant: Test User) connected to WebSocket signaling channel.")

    # Host should receive 'peer-joined' event
    host_msg = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
    print(f"Step 5: Host received event: {host_msg['type']} from {host_msg.get('display_name')}")
    assert host_msg["type"] == "peer-joined"
    assert host_msg["display_name"] == "Test User"

    # Guest should receive 'existing-peer' event
    guest_msg = json.loads(await asyncio.wait_for(ws_guest.recv(), timeout=3.0))
    print(f"Step 6: Guest received event: {guest_msg['type']} from {guest_msg.get('display_name')}")
    assert guest_msg["type"] == "existing-peer"
    assert guest_msg["display_name"] == "Atithi (Host)"

    # Step 7: Host creates and sends SDP Offer
    mock_offer = {"type": "offer", "sdp": {"type": "offer", "sdp": "v=0\r\no=host ... mock_sdp"}}
    await ws_host.send(json.dumps(mock_offer))
    print("Step 7: Host sent SDP Offer to Guest.")

    # Guest receives SDP Offer
    received_offer = json.loads(await asyncio.wait_for(ws_guest.recv(), timeout=3.0))
    assert received_offer["type"] == "offer"
    assert "sdp" in received_offer
    print("Step 8: Guest successfully received SDP Offer from Host.")

    # Step 9: Guest creates and sends SDP Answer
    mock_answer = {"type": "answer", "sdp": {"type": "answer", "sdp": "v=0\r\no=guest ... mock_sdp_answer"}}
    await ws_guest.send(json.dumps(mock_answer))
    print("Step 9: Guest sent SDP Answer to Host.")

    # Host receives SDP Answer
    received_answer = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
    assert received_answer["type"] == "answer"
    assert "sdp" in received_answer
    print("Step 10: Host successfully received SDP Answer from Guest.")

    # Step 11: Host sends ICE candidate
    mock_candidate = {"type": "ice-candidate", "candidate": {"candidate": "candidate:1 1 UDP ...", "sdpMid": "0"}}
    await ws_host.send(json.dumps(mock_candidate))
    guest_cand = json.loads(await asyncio.wait_for(ws_guest.recv(), timeout=3.0))
    assert guest_cand["type"] == "ice-candidate"
    print("Step 11: Guest successfully received ICE candidate from Host.")

    # Step 12: Test Camera Toggle ON -> OFF
    toggle_off = {"type": "toggle-video", "video": False}
    await ws_guest.send(json.dumps(toggle_off))
    host_toggle_off = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
    assert host_toggle_off["type"] == "toggle-video"
    assert host_toggle_off["video"] is False
    print("Step 12: Host received Guest Camera Toggle OFF event.")

    # Step 13: Test Camera Toggle OFF -> ON
    toggle_on = {"type": "toggle-video", "video": True}
    await ws_guest.send(json.dumps(toggle_on))
    host_toggle_on = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
    assert host_toggle_on["type"] == "toggle-video"
    assert host_toggle_on["video"] is True
    print("Step 13: Host received Guest Camera Toggle ON event.")

    # Step 14: Test Microphone Toggle ON -> OFF -> ON
    mic_off = {"type": "toggle-audio", "audio": False}
    await ws_guest.send(json.dumps(mic_off))
    host_mic_off = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
    assert host_mic_off["type"] == "toggle-audio"
    assert host_mic_off["audio"] is False

    mic_on = {"type": "toggle-audio", "audio": True}
    await ws_guest.send(json.dumps(mic_on))
    host_mic_on = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
    assert host_mic_on["type"] == "toggle-audio"
    assert host_mic_on["audio"] is True
    print("Step 14: Microphone Toggle ON -> OFF -> ON verified over signaling channel.")

    # Step 15: Guest leaves room
    await ws_guest.close()
    leave_msg = json.loads(await asyncio.wait_for(ws_host.recv(), timeout=3.0))
    assert leave_msg["type"] == "peer-left"
    print("Step 15: Host received 'peer-left' event after Guest disconnected.")

    # Close host connection
    await ws_host.close()

    # Step 16: Mark meeting completed and verify it appears in Recent Meetings
    patch_req = urllib.request.Request(
        f"{BACKEND_HTTP}/meetings/{meeting_id}/status?new_status=completed",
        method="PATCH"
    )
    with urllib.request.urlopen(patch_req) as resp:
        assert resp.getcode() == 200

    recent_url = f"{BACKEND_HTTP}/meetings/recent"
    with urllib.request.urlopen(recent_url) as resp:
        recent_list = json.loads(resp.read().decode("utf-8"))
        assert any(m["meeting_id"] == meeting_id for m in recent_list)
        print(f"Step 16: Meeting successfully appears in Recent Meetings list ({len(recent_list)} recent meeting found).")

    print("\n--- ALL WEBRTC SIGNALING TESTS PASSED SUCCESSFULLY! (16/16) ---")

if __name__ == "__main__":
    asyncio.run(test_full_webrtc_signaling_flow())
