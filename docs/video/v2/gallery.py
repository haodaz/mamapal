"""Devpost gallery: 3:2 screenshots of the real app, from the same demo household as the video.

    cd ~/Documents/hioffer && uv run python ~/Documents/mamaagent/docs/video/v2/gallery.py http://localhost:3020 maya-mjyk3n ~/Desktop/mamapal_gallery/v2

Signs in as that household's row (cookie), opens the pages and the cards in the side panel, and saves JPEGs at 2x.
The last image puts two phone screens side by side on a 3:2 canvas.
"""
import json
import sys
import time
import urllib.parse
from pathlib import Path

from playwright.sync_api import sync_playwright

base, row, out = sys.argv[1].rstrip("/"), sys.argv[2], Path(sys.argv[3]).expanduser()
out.mkdir(parents=True, exist_ok=True)
host = urllib.parse.urlparse(base).hostname
session = urllib.parse.quote(json.dumps({"name": "Maya", "demo": "maya", "at": int(time.time() * 1000)}))
cookies = [{"name": "mp_row", "value": row, "domain": host, "path": "/"}, {"name": "mp_session", "value": session, "domain": host, "path": "/"}]
INIT = "try { localStorage.setItem('rec','1'); localStorage.setItem('lang','en'); localStorage.removeItem('mp_sidebar'); } catch (e) {}"


def shot(page, name: str) -> None:
    time.sleep(1.2)
    page.screenshot(path=str(out / f"{name}.jpg"), type="jpeg", quality=88)
    print("saved", name, flush=True)


def scroll_pane(page, y: int) -> None:
    page.evaluate(f"document.querySelector('aside div.overflow-y-auto')?.scrollTo(0, {y})")


with sync_playwright() as p:
    b = p.chromium.launch()
    desk = b.new_context(viewport={"width": 1440, "height": 960}, device_scale_factor=2)
    desk.add_init_script(INIT)
    pg = desk.new_page()

    # before sign-in pages, without the cookie
    pg.goto(f"{base}/intro", wait_until="networkidle"); shot(pg, "01-landing")
    pg.locator("#agent").scroll_into_view_if_needed(); pg.mouse.wheel(0, -40); shot(pg, "02-what-pal-does")
    pg.goto(f"{base}/login", wait_until="networkidle"); shot(pg, "03-demo-households")

    desk.add_cookies(cookies)
    pg.goto(f"{base}/", wait_until="networkidle")
    state = pg.evaluate("fetch('/api/state').then(r => r.json())")["state"]
    conv = state["conversations"][0]["id"]
    pg.goto(f"{base}/?c={conv}", wait_until="networkidle")
    pg.get_by_text("items · pay").first.wait_for() if pg.get_by_text("items · pay").count() else None
    pg.locator("button:has-text('open →')").first.click(); shot(pg, "04-pal-cuts-verdict-paid")
    pg.locator("aside button[aria-label='close']").first.click()
    pg.locator("button:has-text('open →')").nth(1).click(); scroll_pane(pg, 0); shot(pg, "05-month-run-steps")
    scroll_pane(pg, 1300); shot(pg, "06-month-run-cart-checked")
    pg.locator("aside button[aria-label='close']").first.click()

    pg.goto(f"{base}/resources", wait_until="networkidle")
    pg.get_by_text("rule found on the page").first.locator("xpath=ancestor::button[1]").click()
    pg.get_by_text("What the official page says").first.scroll_into_view_if_needed(); pg.mouse.wheel(0, 120)
    shot(pg, "07-pal-claims-sources")
    pg.goto(f"{base}/budget", wait_until="networkidle"); shot(pg, "08-budget-payouts")
    pg.goto(f"{base}/me", wait_until="networkidle"); pg.locator("#ledger").scroll_into_view_if_needed(); pg.mouse.wheel(0, -420); time.sleep(0.4); pg.mouse.wheel(0, 700); shot(pg, "09-ledger-paypal-ids")

    # phones: the conversation, and the month run opened full screen
    phone = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=3, is_mobile=True, has_touch=True)
    phone.add_init_script(INIT); phone.add_cookies(cookies)
    ph = phone.new_page()
    ph.goto(f"{base}/?c={conv}", wait_until="networkidle"); time.sleep(1.5)
    ph.evaluate("window.scrollTo(0, 0)"); time.sleep(0.5)
    ph.screenshot(path=str(out / "_phone-a.png"))
    ph.locator("button:has-text('open →')").nth(1).click(); time.sleep(1.2)
    ph.screenshot(path=str(out / "_phone-b.png"))

    # compose the two phones on a 3:2 canvas
    canvas = b.new_page(viewport={"width": 1440, "height": 960}, device_scale_factor=2)
    import base64
    a, c = (f"data:image/png;base64,{base64.b64encode((out / n).read_bytes()).decode()}" for n in ("_phone-a.png", "_phone-b.png"))
    canvas.set_content(f"""<html><body style="margin:0;width:1440px;height:960px;background:linear-gradient(135deg,#e6f4ff,#f5f6fa 55%,#fff1f0);
      display:flex;align-items:center;justify-content:center;gap:80px;font-family:Inter,-apple-system,sans-serif">
      <img src="{a}" style="height:860px;border-radius:44px;box-shadow:0 30px 60px rgba(40,50,110,.22);border:10px solid #1d2233">
      <img src="{c}" style="height:860px;border-radius:44px;box-shadow:0 30px 60px rgba(40,50,110,.22);border:10px solid #1d2233">
      </body></html>""")
    time.sleep(1)
    canvas.screenshot(path=str(out / "10-phone.jpg"), type="jpeg", quality=88)
    print("saved 10-phone", flush=True)
    b.close()
for f in out.glob("_phone-*.png"):
    f.unlink()
