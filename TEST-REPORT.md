# OpenSignal test report

Date: 28 September 2026
Browser: Google Chrome 154.0.8037.57, isolated headless test profile
Version: 1.1.0
Result: **58 automated rule/request tests + 40 Chrome workflow checks + 9 Chrome-start checks passed; 0 failures in the final suites.**

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

## Chrome-start validation — 9 checks passed

- Chrome-start checking is off by default.
- Enabling it preserves the desktop-alert setting.
- Changing desktop alerts preserves the Chrome-start setting.
- A real Chrome process restart fetches the dummy page without opening the popup.
- The startup check saves Open status, native alert state, and a green toolbar badge.
- The startup check is one-shot with no ongoing polling.
- Opening an additional window does not repeat a startup check.
- Disabling the setting prevents requests after the next restart.
- Saved watches, alert memory, and the setting survive browser restarts.

The startup runner uses a new disposable Chrome profile and a localhost-only test copy. A normal Chrome developer-mode Reload converts the CDP-loaded fixture into a persistent unpacked install before real restarts. No normal user profile or security setting is changed.

## Test setup and limits

The final shipping manifest has only optional website access. An isolated test copy was given localhost access to avoid a native permission dialog during headless UI automation. No real browser profile or real registration form was modified or submitted.

A local dummy HTTP server supplied changing registration pages and HTTP errors. Website access denied was tested without making a network request. The 16 demos use a fixed dummy clock so date tests are deterministic.

Chrome's actual notification API completed successfully. This does not verify that Windows displayed a visible toast banner; Do Not Disturb and OS/browser notification settings can hide it. Use Settings & test alert in the installed extension to check that.

The extension checks when its popup opens or Check now is clicked. With the optional setting enabled, it also checks once when this Chrome profile starts via runtime.onStartup. The option is off by default. There are no alarms, periodic polling, AI API calls, or tokens.

VGM and DV are configurable starter rules, not a claim that their live registration forms are currently open. JavaScript-only, login, CAPTCHA, and blocked pages may require manual review. Phrase/date matches cannot prove eligibility or that a remote form will accept a submission.

## Re-run the tests

Rule/request tests: with Node.js 22 or later installed, run:
    node --test tests/run-unit.mjs

Browser tests: install Playwright in a separate development folder, set PLAYWRIGHT_MODULE to its module location, and set CHROME_EXE if Chrome is not at the default Windows path. Run:
    node tests/run-browser.cjs
    node tests/run-startup.cjs

The browser runner uses a new temporary Chrome profile and a temporary test copy with localhost-only host access. It does not alter your normal Chrome profile. It requires a recent Chrome version with the Extensions.loadUnpacked DevTools command.


