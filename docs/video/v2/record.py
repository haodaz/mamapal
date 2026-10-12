"""Record the MamaPal walkthrough with Playwright: clean frames, no browser chrome, no debugging banner.

    cd ~/Documents/hioffer && uv run python ~/Documents/mamaagent/docs/video/v2/record.py http://localhost:3020 ~/Documents/mamaagent/docs/video/v2/out

Runs against a local production build (no dev badge). Everything on screen is the real app: real Claude calls, the
real PayPal sandbox (the popup is recorded as its own video), real link checks. Writes the main video, the PayPal
popup video if one opened, and beats.json with the real time of each moment so the narration can follow what happened.
"""
import json
import re
import shutil
import sys
import time
from pathlib import Path

from playwright.sync_api import sync_playwright, TimeoutError as PWTimeout

base = sys.argv[1].rstrip("/")
out = Path(sys.argv[2]).expanduser()
out.mkdir(parents=True, exist_ok=True)
env = dict(l.split("=", 1) for l in Path("~/Documents/mamaagent/.env.local").expanduser().read_text().splitlines() if "=" in l and not l.startswith("#"))
unq = lambda v: v.strip().strip('"').strip("'")
BUYER, BUYER_PW = unq(env.get("NEXT_PUBLIC_SANDBOX_BUYER_EMAIL", "")), unq(env.get("NEXT_PUBLIC_SANDBOX_BUYER_PASSWORD", ""))
beats: list[dict] = []
t0 = time.time()


def beat(name: str) -> None:
    beats.append({"name": name, "t": round(time.time() - t0, 2)})
    print(f"{beats[-1]['t']:6.1f}s  {name}", flush=True)


def scroll(page, total: int, step: int = 100, pause: float = 0.04, el: str | None = None) -> None:
    for _ in range(0, abs(total), step):
        if el:
            page.evaluate(f"document.querySelector({json.dumps(el)})?.scrollBy(0, {step if total > 0 else -step})")
        else:
            page.mouse.wheel(0, step if total > 0 else -step)
        time.sleep(pause)


PANE = "aside div.overflow-y-auto"

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 1600, "height": 900}, record_video_dir=str(out), record_video_size={"width": 1600, "height": 900}, device_scale_factor=1)
    ctx.add_init_script("try { localStorage.setItem('rec','1'); localStorage.setItem('lang','en'); localStorage.removeItem('mp_sidebar'); } catch (e) {}")
    page = ctx.new_page()
    t0 = time.time()

    # 1. The page before sign-in
    page.goto(f"{base}/intro", wait_until="networkidle")
    beat("intro hero")
    time.sleep(3.5)
    page.locator("#agent").scroll_into_view_if_needed()
    scroll(page, 200)
    beat("intro agent")
    time.sleep(7)
    scroll(page, 900)
    beat("intro pillars")
    time.sleep(3)

    # 2. Demo households → Maya
    page.goto(f"{base}/login", wait_until="networkidle")
    beat("login")
    time.sleep(3)
    page.get_by_role("button", name=re.compile("Maya")).first.click()
    page.wait_for_url(re.compile(r"/(\?.*)?$"), timeout=20000)
    page.wait_for_selector("text=I'm Leo's Pal", timeout=20000)
    beat("home brief")
    time.sleep(6)

    # 3. Ask before you buy → Pal cuts → the card opens in the panel
    box = page.locator("textarea")
    box.click()
    box.type("Leo has a mild rash. Instagram says buy the $45 organic calming oil and the $60 sleep sack.", delay=22)
    beat("ask cut")
    time.sleep(0.8)
    page.keyboard.press("Enter")
    page.get_by_text(re.compile(r"items · pay \$")).first.wait_for(timeout=120000)
    beat("cut reply")
    time.sleep(5)
    page.get_by_text(re.compile(r"items · pay \$")).first.click()
    beat("cut pane")
    time.sleep(4)
    scroll(page, 500, el=PANE)
    time.sleep(3)

    # 4. Pay the approved cart through the PayPal sandbox (the popup is PayPal's own page)
    paid = False
    try:
        frame = page.frame_locator("aside iframe[title*='PayPal']").first
        with page.expect_popup(timeout=20000) as pop:
            frame.locator("[data-funding-source='paypal'], div[role='link']").first.click()
        popup = pop.value
        beat("paypal popup")
        popup.wait_for_load_state("domcontentloaded")
        popup.locator("#email").wait_for(timeout=30000)
        popup.locator("#email").fill(BUYER)
        if popup.locator("#btnNext").is_visible():
            popup.locator("#btnNext").click()
        popup.locator("#password").wait_for(timeout=20000)
        popup.locator("#password").fill(BUYER_PW)
        popup.locator("#btnLogin").click()
        btn = popup.locator("#payment-submit-btn, button:has-text('Complete Purchase'), button:has-text('Pay'), button:has-text('Continue')").first
        btn.wait_for(timeout=40000)
        time.sleep(2.5)
        beat("paypal review")
        btn.click()
        page.get_by_text(re.compile("captured · PayPal capture")).first.wait_for(timeout=60000)
        beat("paid")
        paid = True
        time.sleep(5)
    except PWTimeout as e:
        print("payment step did not finish:", str(e).splitlines()[0], flush=True)
        try:
            for pg in ctx.pages:
                if pg is not page:
                    pg.screenshot(path=str(out / "paypal-stuck.png"))
        except Exception:
            pass
        beat("pay skipped")
        for pg in ctx.pages:
            if pg is not page:
                pg.close()
        time.sleep(2)
    page.locator("aside button[aria-label='close']").first.click()
    time.sleep(1.5)

    # 5. Hand Pal the month: the panel opens, steps light up, the checker reviews, one cart
    started_at = page.evaluate("new Date().toISOString()")
    page.get_by_role("button", name="Plan the rest of the month").first.click()
    beat("run start")
    seen: set[str] = set()
    for _ in range(480):
        r = page.evaluate("fetch('/api/run').then(r => r.json())")["run"]
        if not r or r["created_at"] < started_at:  # the new run is not there yet
            time.sleep(1)
            continue
        for s in r["steps"]:
            k = f"run {s['key']} {s['attempt']} {s['status']}"
            if s["status"] in ("done", "failed") and k not in seen:
                seen.add(k)
                beat(k)
        if r["status"] != "running":
            break
        time.sleep(1)
    beat("run done")
    time.sleep(3)
    scroll(page, 700, el=PANE)
    time.sleep(3)
    scroll(page, 900, el=PANE)
    beat("run cart")
    time.sleep(5)
    page.locator("aside button[aria-label='close']").first.click()
    time.sleep(2)

    # 6. What she can claim, each rule with its official source
    page.goto(f"{base}/resources", wait_until="networkidle")
    beat("claims")
    time.sleep(4)
    scroll(page, 380)
    time.sleep(2)
    page.get_by_text("rule found on the page").first.locator("xpath=ancestor::button[1]").click()
    beat("claims quote")
    time.sleep(6)

    # 7. Earn a little back: a brand survey paid out through PayPal Payouts
    page.goto(f"{base}/budget", wait_until="networkidle")
    beat("budget")
    time.sleep(2)
    card = page.locator("article", has_text="cash out").first
    card.scroll_into_view_if_needed()
    for group in card.locator("div.flex.flex-wrap").all():
        group.locator("button").first.click()
        time.sleep(0.5)
    card.get_by_role("button", name=re.compile("cash out")).click()
    beat("payout ask")
    page.get_by_text(re.compile("paid out · PayPal Payouts")).first.wait_for(timeout=60000)
    beat("payout done")
    time.sleep(4)

    # 8. The ledger: every money event with its PayPal id
    page.goto(f"{base}/me#ledger", wait_until="networkidle")
    time.sleep(1)
    page.locator("#ledger").scroll_into_view_if_needed()
    beat("ledger")
    time.sleep(6)
    beat("end")

    videos = [(pg.video.path() if pg.video else None) for pg in ctx.pages]
    main_video = page.video.path()
    ctx.close()
    b.close()

shutil.move(main_video, out / "app.webm")
others = [v for v in Path(out).glob("*.webm") if v.name != "app.webm"]
if others:
    shutil.move(str(max(others, key=lambda v: v.stat().st_mtime)), out / "paypal.webm")
(out / "beats.json").write_text(json.dumps(beats, indent=1))
print("paid:", paid, "| videos:", sorted(v.name for v in out.glob("*.webm")))
