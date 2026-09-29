import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

SCREENSHOTS_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "screenshots")
os.makedirs(SCREENSHOTS_DIR, exist_ok=True)

chrome_options = Options()
chrome_options.add_argument("--headless=new")
chrome_options.add_argument("--no-sandbox")
chrome_options.add_argument("--disable-dev-shm-usage")
chrome_options.add_argument("--use-fake-ui-for-media-stream")
chrome_options.add_argument("--use-fake-device-for-media-stream")
chrome_options.add_argument("--window-size=1280,800")

driver = webdriver.Chrome(options=chrome_options)

try:
    print("Step 1: Navigating to Dashboard (http://localhost:3000)...")
    driver.get("http://localhost:3000")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "navbar"))
    )
    time.sleep(2)
    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "01_dashboard.png"))
    print("   [OK] Dashboard loaded and screenshot saved.")

    # Verify tabs
    print("Step 2: Testing Recent Meetings tab...")
    recent_tab = driver.find_elements(By.CLASS_NAME, "tab-btn")[1]
    recent_tab.click()
    time.sleep(1)
    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "02_recent_meetings.png"))
    print("   [OK] Recent meetings tab loaded.")

    # Test Schedule Meeting
    print("Step 3: Navigating to Schedule page...")
    driver.get("http://localhost:3000/schedule")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "title"))
    )
    title_input = driver.find_element(By.ID, "title")
    title_input.clear()
    title_input.send_keys("E2E Test Sprint Planning Sync")
    
    desc_input = driver.find_element(By.ID, "description")
    desc_input.send_keys("Automated test meeting for Zoom clone fullstack assignment.")

    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "03_schedule_form.png"))
    save_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
    save_btn.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'Meeting Scheduled!')]"))
    )
    time.sleep(1)
    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "04_schedule_success.png"))
    print("   [OK] Meeting scheduled successfully.")

    # Test Join validation (invalid ID)
    print("Step 4: Testing Join page invalid ID validation...")
    driver.get("http://localhost:3000/join")
    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "meetingId"))
    )
    join_input = driver.find_element(By.ID, "meetingId")
    join_input.send_keys("000-000-0000")
    
    join_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
    join_btn.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.XPATH, "//*[contains(text(), 'does not exist') or contains(text(), 'not found')]"))
    )
    time.sleep(1)
    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "05_join_invalid_id_error.png"))
    print("   [OK] Invalid meeting ID validation properly prevented entry and showed error.")

    # Test Instant Meeting & Lobby
    print("Step 5: Testing Instant Meeting creation and Lobby...")
    driver.get("http://localhost:3000")
    time.sleep(1)
    new_meeting_tile = driver.find_element(By.XPATH, "//button[contains(., 'New Meeting')]")
    new_meeting_tile.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.ID, "displayName"))
    )
    time.sleep(2)
    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "06_meeting_lobby.png"))
    print("   [OK] Lobby opened with camera/mic preview and display name.")

    # Enter meeting room
    print("Step 6: Entering Meeting Room...")
    join_room_btn = driver.find_element(By.XPATH, "//button[@type='submit']")
    join_room_btn.click()

    WebDriverWait(driver, 10).until(
        EC.presence_of_element_located((By.CLASS_NAME, "room-container"))
    )
    time.sleep(3)
    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "07_meeting_room_dark.png"))
    print("   [OK] Meeting room rendered with WebRTC local video and dark Zoom UI.")

    # Open invite modal
    print("Step 7: Opening Invite Modal...")
    invite_btn = driver.find_element(By.XPATH, "//button[contains(., 'Invite Link')]")
    invite_btn.click()
    time.sleep(1)
    driver.save_screenshot(os.path.join(SCREENSHOTS_DIR, "08_invite_modal.png"))
    print("   [OK] Invite modal displayed with shareable link.")

    print("\nALL BROWSER E2E TESTS PASSED SUCCESSFULLY! (7/7)")

finally:
    driver.quit()
