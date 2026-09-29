import asyncio
import json
import os
import subprocess
import tempfile
import time
import urllib.request
import websockets

CHROME_PATH = r"C:\Program Files\Google\Chrome\Application\chrome.exe"

async def eval_js(ws, expr):
    await ws.send(json.dumps({"id": 1, "method": "Runtime.evaluate", "params": {"expression": expr}}))
    res = json.loads(await ws.recv())
    return res["result"]["result"].get("value")

async def test_camera():
    # Create meeting
    req = urllib.request.Request(
        "http://localhost:8000/meetings",
        data=json.dumps({"title": "Camera Toggle Test", "host_name": "Atithi"}).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req) as resp:
        meeting = json.loads(resp.read().decode("utf-8"))
    
    mid = meeting["meeting_id"]
    temp_dir = tempfile.mkdtemp()
    url = f"http://localhost:3000/meeting/{mid}?name=Atithi&role=host&audio=1&video=1"

    proc = subprocess.Popen([
        CHROME_PATH,
        "--headless=new",
        "--disable-gpu",
        "--disable-extensions",
        "--use-fake-ui-for-media-stream",
        "--use-fake-device-for-media-stream",
        "--remote-debugging-port=9225",
        f"--user-data-dir={temp_dir}",
        "--window-size=1280,800",
        url
    ])

    try:
        await asyncio.sleep(5)
        tabs = json.loads(urllib.request.urlopen("http://localhost:9225/json/list").read().decode("utf-8"))
        page = next(t for t in tabs if t.get("type") == "page" and "localhost:3000" in t.get("url", ""))

        async with websockets.connect(page["webSocketDebuggerUrl"]) as ws:
            # Check initial state
            btn_0 = await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].innerText")
            vid_0 = await eval_js(ws, "document.querySelector('video').style.display")
            print(f"INITIAL -> Button: '{btn_0}', Video display: '{vid_0}'")

            # Click 1: Turn OFF
            await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].click()")
            await asyncio.sleep(1)
            btn_1 = await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].innerText")
            vid_1 = await eval_js(ws, "document.querySelector('video').style.display")
            print(f"AFTER CLICK 1 (OFF) -> Button: '{btn_1}', Video display: '{vid_1}'")

            # Click 2: Turn ON again
            await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].click()")
            await asyncio.sleep(1)
            btn_2 = await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].innerText")
            vid_2 = await eval_js(ws, "document.querySelector('video').style.display")
            print(f"AFTER CLICK 2 (ON)  -> Button: '{btn_2}', Video display: '{vid_2}'")

            # Click 3: Turn OFF again
            await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].click()")
            await asyncio.sleep(1)
            btn_3 = await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].innerText")
            vid_3 = await eval_js(ws, "document.querySelector('video').style.display")
            print(f"AFTER CLICK 3 (OFF) -> Button: '{btn_3}', Video display: '{vid_3}'")

            # Click 4: Turn ON again
            await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].click()")
            await asyncio.sleep(1)
            btn_4 = await eval_js(ws, "document.querySelectorAll('.tool-btn')[1].innerText")
            vid_4 = await eval_js(ws, "document.querySelector('video').style.display")
            print(f"AFTER CLICK 4 (ON)  -> Button: '{btn_4}', Video display: '{vid_4}'")

            assert "Stop Video" in btn_0 and vid_0 == "block"
            assert "Start Video" in btn_1 and vid_1 == "none"
            assert "Stop Video" in btn_2 and vid_2 == "block"
            assert "Start Video" in btn_3 and vid_3 == "none"
            assert "Stop Video" in btn_4 and vid_4 == "block"
            print("\n>>> ALL CAMERA TOGGLE CYCLES PASSED (ON -> OFF -> ON -> OFF -> ON) <<<")

    finally:
        proc.kill()

if __name__ == "__main__":
    asyncio.run(test_camera())
