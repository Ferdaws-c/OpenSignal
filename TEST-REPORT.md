# OpenSignal test report

Date: 28 September 2026
Browser: Google Chrome 154.0.8037.57, isolated headless test profile
Version: 1.2.0
Result: **58 automated rule/request tests + 40 Chrome workflow checks + 15 delayed Chrome-start checks passed; 0 failures in the final suites.**

## Automated rule and request tests — 58 passed

- Unicode normalization, Turkish accents, dash variations, phrase cleanup.
- Unsafe/non-web addresses and invalid watcher data rejected.
- Open, upcoming, closed, sold-out, unclear, empty, and blocked-page statuses.
- Negative wording does not trigger an open alert.
- Wrong registration years and missing sections need review.
- Active registration controls required when configured.
- Turkish calendar parsing, UTC+3 conversion, invalid/reversed/incomplete dates.
- Date-window start, end, last second, and future/open/closed boundaries.
- First opening alert, duplicate suppression, re-opening after a known closure.
- Failed/uncertain checks preserve alert memory.
- Notifications disabled.
- Missing host permission prevents a fetch.
- Requests omit cookies and bypass cache.
- Offline requests, timeouts, HTTP 403/404/500.
- PDF/non-page responses, oversize bodies, streamed size limits.
- Cross-site redirects are rejected; plain-text HTML is escaped.
- Full fetch → parse → classification flow.

## Chrome validation — 40 checks passed

24 browser workflow checks, including an aggregate sample-scenario check, plus 16 individual sample scenarios.

- Production source loaded in Chrome and its popup displayed.
- All 16 built-in scenarios passed through the actual browser DOM parser.
- Fetched scripts remained inert; hidden open wording was excluded.
- Ambiguous focus text and invalid CSS selectors produced review states.
- Popup Save & check exercised permissions, local storage, real fetch, service worker, offscreen parser, and rendered status.
- Native Chrome notification API accepted the dummy alert.
- Opening transition produced one native notification request and a toolbar badge.
- Repeat/uncertain checks did not duplicate alerts.
- Closed → reopened transition re-armed the alert.
- Paused watches made no network requests.
- Simultaneous checks coalesced into one request.
- Opening/reloading the popup automatically checked saved watches.
- Notifications disabled still updated status and badge.
- HTTP-blocked pages and denied host permissions did not become Open.
- Watch editing, text-safe rendering, recent evidence, and timestamps worked.
- Offscreen parser closed after checks.
- Demo selector changed the displayed result.
- No unhandled page errors occurred.
- Delete removed the watch and updated the badge.

## Delayed Chrome-start validation — 15 checks passed

- Chrome-start checking defaults to off with no scheduled alarm.
- Enabling startup checking saves the choice and preserves alerts.
- Desktop-alert changes preserve the saved startup choice.
- Reloading/updating keeps the enabled choice and saved watch.
- Real Chrome restart restores the enabled startup choice.
- Startup schedules one alarm at least 30 seconds later without fetching.
- Pending startup check survives stopping the service worker.
- Chrome wakes the worker and checks after the real 30-second delay.
- Delayed startup check saves Open, native alert state, and badge.
- Completed startup alarm is consumed and does not poll.
- Opening an extra window does not schedule or run another check.
- Switching startup checking off cancels the pending alarm.
- The disabled choice survives restart and schedules no requests.
- Opening the popup checks immediately and cancels the pending startup check.
- Watches, enabled choice, and duplicate-alert memory remain saved.

The configured delay was 30,000 ms. The observed first dummy request was 30.44 seconds after restarting Chrome. The worker was explicitly stopped during the delay, and Chrome’s alarm woke it to complete the check.

The runner uses a disposable profile and localhost-only test copy. A normal developer-mode Reload persists the CDP fixture before real restarts. No normal browser profile or security setting is changed.

## Test setup and limits

The final shipping manifest has only optional website access. An isolated test copy was given localhost access to avoid a native permission dialog during headless UI automation. No real browser profile or real registration form was modified or submitted.

A local dummy HTTP server supplied changing registration pages and HTTP errors. Website access denied was tested without making a network request. The 16 demos use a fixed dummy clock so date tests are deterministic.

Chrome's actual notification API completed successfully. This does not verify that Windows displayed a visible toast banner; Do Not Disturb and OS/browser notification settings can hide it. Use Settings & test alert in the installed extension to check that.

The extension checks when its popup opens or Check now is clicked. With the optional setting enabled, it schedules one check after a 30-second startup delay using a one-shot Chrome alarm. The choice stays saved and is off by default. Turning it off or starting a manual check cancels the pending startup check. There is no periodic polling, AI API call, or token use.

VGM and DV are configurable starter rules, not a claim that their live registration forms are currently open. JavaScript-only, login, CAPTCHA, and blocked pages may require manual review. Phrase/date matches cannot prove eligibility or that a remote form will accept a submission.

## Re-run the tests

Rule/request tests: with Node.js 22 or later installed, run:
    node --test tests/run-unit.mjs

Browser tests: install Playwright in a separate development folder, set PLAYWRIGHT_MODULE to its module location, and set CHROME_EXE if Chrome is not at the default Windows path. Run:
    node tests/run-browser.cjs
    node tests/run-startup.cjs

The browser runner uses a new temporary Chrome profile and a temporary test copy with localhost-only host access. It does not alter your normal Chrome profile. It requires a recent Chrome version with the Extensions.loadUnpacked DevTools command.


