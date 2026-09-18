"""Every page a person can reach from the sidebar, in a real browser.

Each test asks what a presenter would ask: does the page open, does it show real data, does the
one thing you click on it work. AI pages have no key here, so the assertion is that they load
and that a failure is visible rather than a silent spinner.
"""
import re

import pytest
from playwright.sync_api import expect

WEB = "http://127.0.0.1:3000"
SIDEBAR = ["Home", "Analytics", "Forecast", "Deep Dive", "Planner", "New Prediction", "Runs",
           "Chat", "Insights", "Report", "OCR", "Documents", "Agent", "Settings"]


# ─── login ──────────────────────────────────────────────────────────────

def test_logged_out_lands_on_login_and_comes_back_after(anon_page):
    anon_page.goto(f"{WEB}/forecast")
    anon_page.wait_for_url(re.compile(r"/login\?next=%2Fforecast"))
    anon_page.fill("#password", "not-it")
    anon_page.click("button[type=submit]")
    expect(anon_page.get_by_text("Wrong password")).to_be_visible()
    assert "/login" in anon_page.url

    anon_page.fill("#password", "e2e-password")
    anon_page.click("button[type=submit]")
    anon_page.wait_for_url(f"{WEB}/forecast")
    anon_page.reload()
    assert anon_page.url.endswith("/forecast"), "the session must survive a reload"


def test_a_forged_cookie_is_bounced_by_the_first_api_call(anon_page):
    far = 4102444800  # 2100-01-01, so the middleware lets it through and only the backend can refuse it
    anon_page.context.add_cookies([{"name": "demand_token", "value": f"{far}.forged", "url": WEB}])
    anon_page.goto(f"{WEB}/runs")
    anon_page.wait_for_url(re.compile(r"/login"))


# ─── the shell ──────────────────────────────────────────────────────────

AI_ITEMS = {"Chat", "Insights", "Report", "OCR", "Documents", "Agent"}


def sidebar_link(page, item):
    """A link in the sidebar. Settings sits below the <nav>, so search the whole aside; the AI
    group is folded away unless you are already on an AI page, so open it when needed."""
    aside = page.get_by_role("complementary").first
    if item in AI_ITEMS and not aside.get_by_role("link", name=item, exact=True).is_visible():
        aside.get_by_role("button", name="AI Features").click()
    return aside.get_by_role("link", name=item, exact=True)


def test_home_shows_the_whole_sidebar(page):
    page.goto(f"{WEB}/")
    for item in SIDEBAR:
        expect(sidebar_link(page, item)).to_be_visible()


@pytest.mark.parametrize("item,path,heading", [
    ("Analytics", "/analytics-dashboard", "Analytics Dashboard"),
    ("Forecast", "/forecast", "Forecast"),
    ("Deep Dive", "/accuracy-deep-dive", "Plan Accuracy Deep Dive"),
    ("Planner", "/scenario-planner", "What-if Scenario"),
    ("New Prediction", "/new-prediction", "New Prediction"),
    ("Runs", "/runs", "Runs Center"),
    ("Chat", "/ai-chat", "Sales AI Assistant"),
    ("Insights", "/ai-insights", "AI Insights"),
    ("Report", "/ai-report", "AI Report Generator"),
    ("OCR", "/ai-ocr", "Purchase Order Reader"),
    ("Documents", "/ai-rag", "Document Q&A"),
    ("Agent", "/ai-agent", "Sales AI Agent"),
    ("Settings", "/settings", "Settings"),
])
def test_every_sidebar_link_opens_its_page(page, item, path, heading):
    page.goto(f"{WEB}/")
    sidebar_link(page, item).click()
    page.wait_for_url(f"{WEB}{path}")
    expect(page.get_by_text(heading, exact=False).first).to_be_visible()


# ─── data pages ─────────────────────────────────────────────────────────

def test_analytics_shows_a_real_total(page):
    page.goto(f"{WEB}/analytics-dashboard")
    # the card labels render before the numbers do, so wait for a number only the data can produce
    expect(page.get_by_text("24", exact=True).first).to_be_visible()
    body = re.sub(r"\s+", " ", page.locator("main").inner_text())
    assert "Total Sku 24" in body, body[:300]
    total = re.search(r"Total Actual ([\d.,]+[MK]?)", body).group(1)
    assert total not in ("0", "0.0"), body[:300]


def test_deep_dive_kpis_and_donut_tell_the_same_story(page):
    page.goto(f"{WEB}/accuracy-deep-dive")
    expect(page.get_by_text("WAPE (Weighted MAPE)")).to_be_visible()
    text = re.sub(r"\s+", " ", page.locator("main").inner_text())
    bias = float(re.search(r"Bias ([+-][\d.]+)%", text).group(1))
    label = re.search(r"Bias [+-][\d.]+% (Under Plan|Over Plan)", text).group(1)
    assert (bias < 0) == (label == "Under Plan"), "negative Bias is the Plan below Actual"
    under = float(re.search(r"Under Plan ([\d.]+)%", text[text.index("Deviation"):]).group(1))
    over = float(re.search(r"Over Plan ([\d.]+)%", text[text.index("Deviation"):]).group(1))
    assert under > 0 and over > 0, "both donut slices must be populated"
    assert (under > over) == (label == "Under Plan")


def test_forecast_shows_the_latest_run_with_bands(page, run_id):
    page.goto(f"{WEB}/forecast")
    expect(page.get_by_text(run_id).first).to_be_visible()
    text = re.sub(r"\s+", " ", page.locator("main").inner_text())
    assert "P10-P90" in text and "WAPE" in text and "LightGBM" in text


def test_runs_lists_the_run_and_opens_its_report(page, run_id):
    page.goto(f"{WEB}/runs")
    row = page.get_by_role("row").filter(has_text=run_id)
    expect(row).to_be_visible()
    assert "Success" in row.inner_text()
    row.get_by_role("link", name="Open Report").click()
    page.wait_for_url(f"{WEB}/runs/{run_id}")
    text = re.sub(r"\s+", " ", page.locator("main").inner_text())
    assert "Total Forecast" in text and "WAPE" in text and "Validation" in text


def test_compare_two_runs(page, api, run_id):
    other = api("POST", "/runs", {"horizon": 3, "notes": "e2e second"})["run_id"]
    page.goto(f"{WEB}/runs/compare?a={run_id}&b={other}")
    expect(page.get_by_text("Difference", exact=False).first).to_be_visible()
    text = re.sub(r"\s+", " ", page.locator("main").inner_text())
    assert run_id in text and other in text and "Waiting for Runs" not in text


def test_new_prediction_creates_a_run_from_the_dataset(page, api):
    before = {r["run_id"] for r in api("GET", "/runs")}
    page.goto(f"{WEB}/new-prediction")
    page.get_by_role("button", name="Run on the built-in sales dataset").click()
    page.get_by_role("button", name="Run Forecast Model").click()
    page.wait_for_function("() => document.querySelector('main').innerText.includes('RUN-')", timeout=60000)
    after = {r["run_id"] for r in api("GET", "/runs")}
    assert len(after - before) == 1, "the click must create exactly one Run"


def test_planner_predicts_and_explains(page):
    page.goto(f"{WEB}/scenario-planner")
    expect(page.get_by_role("combobox").first).to_contain_text("Chips")
    page.get_by_role("switch").click()
    page.get_by_role("button", name="Run Scenario").click()
    # two explain-mode predictions; under a full suite run on a busy machine this outlasts
    # expect()'s own 5 s default, which page.set_default_timeout does not change
    expect(page.get_by_text("ESTIMATED IMPACT")).to_be_visible(timeout=30000)
    # the label lands before the numbers do; wait for a value, not the heading, before reading
    expect(page.get_by_text(re.compile(r"^Baseline$")).first).to_be_visible(timeout=30000)
    page.wait_for_function("() => /Baseline\\s+[\\d,]+\\s+Scenario\\s+[\\d,]+/.test(document.querySelector('main').innerText)")
    text = re.sub(r"\s+", " ", page.locator("main").inner_text())
    assert "Driving the Change" in text
    assert re.search(r"Baseline [\d,]+ Scenario [\d,]+", text), text[:400]
    assert "Prediction" in text, "the waterfall must end at the prediction"


# ─── AI pages, without a key ────────────────────────────────────────────

def test_ai_chat_fails_visibly_without_a_key(page):
    page.goto(f"{WEB}/ai-chat")
    box = page.get_by_role("textbox").first
    box.fill("What was total actual last month?")
    box.press("Enter")
    expect(page.get_by_role("alert").first).to_be_visible(timeout=45000)


def test_ai_tier_picker_shows_the_tier_the_api_says_is_current(page, api):
    model = api("GET", "/ai/model")
    current = next(t["label"] for t in model["available"] if t["id"] == model["current"])
    page.goto(f"{WEB}/ai-chat")
    expect(page.get_by_text(current, exact=True).first).to_be_visible()


def test_settings_opens_and_log_out_ends_the_session(page):
    page.goto(f"{WEB}/settings")
    expect(page.get_by_text("Manage your account and preferences")).to_be_visible()
    page.get_by_role("button", name="Log out").click()
    page.wait_for_url(re.compile(r"/login"))
    # the cookie is gone, so a protected page now redirects instead of rendering
    page.goto(f"{WEB}/runs")
    page.wait_for_url(re.compile(r"/login\?next=%2Fruns"))


def test_top_bar_keeps_its_controls_clear_of_the_subtitle(page):
    """Deep Dive has the widest toolbar; its subtitle must truncate rather than run under it."""
    page.goto(f"{WEB}/accuracy-deep-dive")
    subtitle = page.get_by_title("WAPE, Bias and error distribution of the Plan", exact=False).first
    expect(subtitle).to_be_visible()
    sub = subtitle.bounding_box()
    control = page.get_by_text("All Products").first.bounding_box()
    assert sub and control
    assert sub["x"] + sub["width"] <= control["x"], "subtitle overlaps the first toolbar control"


def test_analysis_tab_and_deep_dive_bottom_read_the_dataset(page):
    """The six charts that used to draw browser-generated numbers (#16) now render from the API."""
    page.goto(f"{WEB}/analytics-dashboard")
    page.get_by_role("tab", name="Analysis").click()
    expect(page.get_by_text("Promo vs Non-Promo median")).to_be_visible()
    text = re.sub(r"\s+", " ", page.locator("main").inner_text())
    assert re.search(r"Promo vs Non-Promo median [+-][\d.]+%", text), text[:400]
    assert text.count("1.00") >= 3, "correlation diagonal comes only from data"
    assert "No rows match" not in text and "Loading…" not in text

    page.goto(f"{WEB}/accuracy-deep-dive")
    expect(page.get_by_text("WAPE (Error Magnitude)")).to_be_visible()
    text = re.sub(r"\s+", " ", page.locator("main").inner_text())
    assert "No rows match" not in text and "Loading…" not in text
    assert "Promotion" in text and "Ideal" in text, "scatter legend and the error-distribution reference line"
