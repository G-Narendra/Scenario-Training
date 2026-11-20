"""
Verify Responsive UI across Desktop (1440x900) and Mobile (375x812).
Verifies Apple-Tier Home Page, Frosted Sign-In Modal, Student & Facilitator Journeys,
and captures high-resolution screenshots.
"""

import os
import time
from playwright.sync_api import sync_playwright

def run_responsive_verification():
    os.makedirs("recordings", exist_ok=True)
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        
        # =====================================================================
        # 1. DESKTOP VERIFICATION (1440 x 900)
        # =====================================================================
        print("--- [1/2] Verifying Desktop Layout (1440x900) ---")
        context_desktop = browser.new_context(
            viewport={"width": 1440, "height": 900},
            device_scale_factor=2
        )
        page = context_desktop.new_page()
        page.goto("http://127.0.0.1:8000/app/")
        page.wait_for_selector("text=Master High-Stakes", timeout=10000)
        time.sleep(1)

        # Check Desktop Hero & Elements
        assert page.is_visible("text=Master High-Stakes")
        assert page.is_visible("text=Cohort Sign In")
        assert page.is_visible("text=25")
        assert page.is_visible("text=10")
        assert page.is_visible("text=The 3-Step Deliberate Practice Method")
        assert page.is_visible("text=The 3H Leadership Framework")
        assert page.is_visible("text=Explore Leadership Scenarios")
        assert page.is_visible("text=Lead Facilitator: Uzair")
        assert page.is_visible("text=Have any questions? We're happy to help.")

        # Check Horizontal Overflow on Desktop
        scroll_width = page.evaluate("document.documentElement.scrollWidth")
        client_width = page.evaluate("document.documentElement.clientWidth")
        print(f"Desktop ScrollWidth: {scroll_width}, ClientWidth: {client_width}")
        assert scroll_width <= client_width + 1, "Desktop horizontal overflow detected!"

        # Screenshot Desktop Home Page
        page.screenshot(path="recordings/verified_desktop_home_page.png")
        print("Captured: recordings/verified_desktop_home_page.png")

        # Open Sign In Modal
        page.click("#home-signin-cta-btn")
        page.wait_for_selector("#modal-passcode-input", timeout=5000)
        time.sleep(0.5)
        page.screenshot(path="recordings/verified_desktop_signin_modal.png")
        print("Captured: recordings/verified_desktop_signin_modal.png")

        # Sign In as Delegate
        page.click("text=Delegate: Sarah Jenkins")
        time.sleep(0.3)
        page.click("#modal-signin-submit-btn")
        page.wait_for_selector("text=Curriculum & Practice", timeout=10000)
        time.sleep(1)
        page.screenshot(path="recordings/verified_desktop_student_library.png")
        print("Captured: recordings/verified_desktop_student_library.png")

        # Open Briefing Modal
        first_card_btn = page.locator("button:has-text('Start Practice'), button:has-text('View Briefing')").first
        if first_card_btn.is_visible():
            first_card_btn.click()
            page.wait_for_selector("text=Core Focus Area", timeout=5000)
            time.sleep(0.5)
            page.screenshot(path="recordings/verified_desktop_briefing.png")
            print("Captured: recordings/verified_desktop_briefing.png")
            page.keyboard.press("Escape")
            time.sleep(0.5)

        # Sign Out
        page.click("#logout-btn")
        page.wait_for_selector("text=Master High-Stakes", timeout=10000)
        time.sleep(0.5)

        # Sign In as Uzair (Facilitator)
        page.click("#home-signin-cta-btn")
        page.wait_for_selector("text=Facilitator: Uzair", timeout=5000)
        page.click("text=Facilitator: Uzair")
        time.sleep(0.3)
        page.click("#modal-signin-submit-btn")
        page.wait_for_selector("text=Facilitator Console", timeout=10000)
        time.sleep(1)
        page.screenshot(path="recordings/verified_desktop_uzair_console.png")
        print("Captured: recordings/verified_desktop_uzair_console.png")

        context_desktop.close()

        # =====================================================================
        # 2. MOBILE VERIFICATION (375 x 812 - iPhone)
        # =====================================================================
        print("\n--- [2/2] Verifying Mobile Layout (375x812) ---")
        context_mobile = browser.new_context(
            viewport={"width": 375, "height": 812},
            is_mobile=True,
            has_touch=True,
            device_scale_factor=2
        )
        page_m = context_mobile.new_page()
        page_m.goto("http://127.0.0.1:8000/app/")
        page_m.wait_for_selector("text=Master High-Stakes", timeout=10000)
        time.sleep(1)

        # Check Horizontal Overflow on Mobile
        scroll_width_m = page_m.evaluate("document.documentElement.scrollWidth")
        client_width_m = page_m.evaluate("document.documentElement.clientWidth")
        print(f"Mobile ScrollWidth: {scroll_width_m}, ClientWidth: {client_width_m}")
        assert scroll_width_m <= client_width_m + 1, "Mobile horizontal overflow detected!"

        # Screenshot Mobile Home Page
        page_m.screenshot(path="recordings/verified_mobile_home_page.png")
        print("Captured: recordings/verified_mobile_home_page.png")

        # Open Mobile Hamburger Menu
        menu_btn = page_m.locator("button[aria-label='Toggle mobile menu']")
        menu_btn.click()
        page_m.wait_for_selector("text=WhatsApp Concierge", timeout=5000)
        time.sleep(0.5)
        page_m.screenshot(path="recordings/verified_mobile_menu_open.png")
        print("Captured: recordings/verified_mobile_menu_open.png")

        # Click Cohort Sign In inside mobile menu
        page_m.locator("button:has-text('Cohort Sign In')").last.click()
        page_m.wait_for_selector("#modal-passcode-input", timeout=5000)
        time.sleep(0.5)
        page_m.screenshot(path="recordings/verified_mobile_signin_modal.png")
        print("Captured: recordings/verified_mobile_signin_modal.png")

        # Check Modal Overflow on Mobile
        modal_scroll_w = page_m.evaluate("document.documentElement.scrollWidth")
        assert modal_scroll_w <= client_width_m + 1, "Mobile modal overflow detected!"

        # Complete Mobile Sign In
        page_m.click("text=Delegate: Sarah Jenkins")
        time.sleep(0.3)
        page_m.click("#modal-signin-submit-btn")
        page_m.wait_for_selector("text=Curriculum & Practice", timeout=10000)
        time.sleep(1)
        page_m.screenshot(path="recordings/verified_mobile_student_library.png")
        print("Captured: recordings/verified_mobile_student_library.png")

        context_mobile.close()
        browser.close()
        print("\nAll responsive desktop & mobile verifications passed with 0 errors!")

if __name__ == "__main__":
    run_responsive_verification()
