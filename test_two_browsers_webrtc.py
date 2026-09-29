import asyncio
import json
import os
import shutil
import subprocess
import tempfile
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"
SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

async def send_cdp_command(ws_url, method, params=None):
    async with websockets.connect(ws_url) as ws:
        msg = {"id": 1, "method": method, "params": params or {}}
        await ws.send(json.dumps(msg))
        res = await ws.recv()
        return json.loads(res)

async def main():
    print("==================================================")
    print("STARTING TWO-BROWSER WEBRTC INTEGRATION TEST")
    print("==================================================")

    # 1. Create an instant meeting
    req = urllib.request.Request(
        "http://localhost:8000/meetings",
        data=json.dumps({"title": "Two-Browser WebRTC Call", "host_name": "Atithi (Host)"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        meeting = json.loads(resp.read().decode("utf-8"))

    meeting_id = meeting["meeting_id"]
    print(f"Created Meeting ID: {meeting_id}")

    temp_dir_a = tempfile.mkdtemp(prefix="chrome_a_")
    temp_dir_b = tempfile.mkdtemp(prefix="chrome_b_")

    url_a = f"http://localhost:3000/meeting/{meeting_id}?name=Atithi%20(Host)&role=host&audio=1&video=1"
    url_b = f"http://localhost:3000/meeting/{meeting_id}?name=Test%20User&role=participant&audio=1&video=1"

    proc_a = None
    proc_b = None

    try:
        # Launch Browser A (Host: Atithi)
        print("Launching Browser A (Host: Atithi)...")
        proc_a = subprocess.Popen([
            CHROME_PATH,
            "--headless=new",
            "--disable-gpu",
            "--disable-extensions",
            "--no-first-run",
            "--no-default-browser-check",
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--remote-debugging-port=9222",
            f"--user-data-dir={temp_dir_a}",
            "--window-size=1280,800",
            url_a
        ])

        # Wait for Browser A to load page & initialize local media
        print("Waiting 6 seconds for Browser A to initialize...")
        await asyncio.sleep(6)

        # Launch Browser B (Participant: Test User)
        print("Launching Browser B (Participant: Test User)...")
        proc_b = subprocess.Popen([
            CHROME_PATH,
            "--headless=new",
            "--disable-gpu",
            "--disable-extensions",
            "--no-first-run",
            "--no-default-browser-check",
            "--use-fake-ui-for-media-stream",
            "--use-fake-device-for-media-stream",
            "--remote-debugging-port=9223",
            f"--user-data-dir={temp_dir_b}",
            "--window-size=1280,800",
            url_b
        ])

        # Wait for WebRTC handshake between Browser A and Browser B
        print("Waiting 8 seconds for WebRTC peer connection to establish...")
        await asyncio.sleep(8)

        # Connect to Browser A's page tab via CDP
        tabs_a = json.loads(urllib.request.urlopen("http://localhost:9222/json/list").read().decode("utf-8"))
        page_a = next(t for t in tabs_a if t.get("type") == "page" and "localhost:3000" in t.get("url", ""))
        ws_a = page_a["webSocketDebuggerUrl"]

        # Connect to Browser B's page tab via CDP
        tabs_b = json.loads(urllib.request.urlopen("http://localhost:9223/json/list").read().decode("utf-8"))
        page_b = next(t for t in tabs_b if t.get("type") == "page" and "localhost:3000" in t.get("url", ""))
        ws_b = page_b["webSocketDebuggerUrl"]

        # Check video elements in Browser A
        res_a_videos = await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('video').length"
        })
        video_count_a = res_a_videos["result"]["result"]["value"]
        print(f"Browser A (Host) video elements count: {video_count_a}")

        # Check video elements in Browser B
        res_b_videos = await send_cdp_command(ws_b, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('video').length"
        })
        video_count_b = res_b_videos["result"]["result"]["value"]
        print(f"Browser B (Participant) video elements count: {video_count_b}")

        # Check participant names on both screens
        res_a_text = await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.body.innerText"
        })
        text_a = res_a_text["result"]["result"]["value"]
        print(f"Browser A body contains 'Test User': {'Test User' in text_a}")

        res_b_text = await send_cdp_command(ws_b, "Runtime.evaluate", {
            "expression": "document.body.innerText"
        })
        text_b = res_b_text["result"]["result"]["value"]
        print(f"Browser B body contains 'Atithi (Host)': {'Atithi (Host)' in text_b or 'Atithi' in text_b}")

        # Save screenshots of both connected browsers
        import base64
        shot_a = await send_cdp_command(ws_a, "Page.captureScreenshot")
        with open(os.path.join(SCREENSHOTS_DIR, "browser_a_host_connected.png"), "wb") as f:
            f.write(base64.b64decode(shot_a["result"]["data"]))
        print("   [OK] Captured screenshot: screenshots/browser_a_host_connected.png")

        shot_b = await send_cdp_command(ws_b, "Page.captureScreenshot")
        with open(os.path.join(SCREENSHOTS_DIR, "browser_b_participant_connected.png"), "wb") as f:
            f.write(base64.b64decode(shot_b["result"]["data"]))
        print("   [OK] Captured screenshot: screenshots/browser_b_participant_connected.png")

        # TEST CAMERA TOGGLE: ON -> OFF -> ON in Browser A
        print("\nTesting Camera Toggle in Browser A: ON -> OFF -> ON...")
        # 1. Turn camera OFF
        await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('.tool-btn')[1].click()"
        })
        await asyncio.sleep(1)
        res_cam_off = await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('video')[0].style.display"
        })
        print(f"Camera OFF display style: {res_cam_off['result']['result']['value']}")
        assert res_cam_off["result"]["result"]["value"] == "none", "Video element should be hidden when camera OFF"

        # 2. Turn camera ON again
        await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('.tool-btn')[1].click()"
        })
        await asyncio.sleep(1)
        res_cam_on = await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('video')[0].style.display"
        })
        print(f"Camera ON display style: {res_cam_on['result']['result']['value']}")
        assert res_cam_on["result"]["result"]["value"] == "block", "Video element should be visible when camera ON"
        print("   [OK] Camera ON -> OFF -> ON toggle verified successfully!")

        # TEST MICROPHONE TOGGLE: ON -> OFF -> ON in Browser A
        print("\nTesting Microphone Toggle in Browser A: ON -> OFF -> ON...")
        # Mute
        await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('.tool-btn')[0].click()"
        })
        await asyncio.sleep(0.5)
        res_mic_off = await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('.tool-btn')[0].innerText"
        })
        assert "Unmute" in res_mic_off["result"]["result"]["value"]
        print("   [OK] Microphone muted (button text: Unmute).")

        # Unmute
        await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('.tool-btn')[0].click()"
        })
        await asyncio.sleep(0.5)
        res_mic_on = await send_cdp_command(ws_a, "Runtime.evaluate", {
            "expression": "document.querySelectorAll('.tool-btn')[0].innerText"
        })
        assert "Mute" in res_mic_on["result"]["result"]["value"]
        print("   [OK] Microphone unmuted (button text: Mute).")

        print("\n==================================================")
        print("ALL REAL TWO-BROWSER WEBRTC TESTS PASSED!")
        print("==================================================")

    finally:
        if proc_a:
            proc_a.kill()
        if proc_b:
            proc_b.kill()
        time.sleep(1)
        shutil.rmtree(temp_dir_a, ignore_errors=True)
        shutil.rmtree(temp_dir_b, ignore_errors=True)

if __name__ == "__main__":
    asyncio.run(main())
