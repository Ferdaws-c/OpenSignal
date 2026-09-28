# Developer guide

OpenSignal uses plain JavaScript, HTML, and CSS with Chrome Manifest V3. There is no build step and no runtime dependency.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension metadata and optional site permissions |
| `popup.*` | Watch manager UI |
| `background.js` | Serialized storage updates, checks, notifications, badge |
| `checker.js` | Fetch limits and request error handling |
| `core.js` | Validation, matching, Turkish dates, alert transitions |
| `extract.js`, `offscreen.*` | Inert HTML extraction in an offscreen document |
| `presets.js` | VGM and DV starter rules |
| `scenarios.js`, `demo.*` | Offline sample lab |
| `tests/` | Unit/request and isolated Chrome test runners |

## Run locally

Clone or download this repository. Load its root folder through `chrome://extensions` → **Developer mode** → **Load unpacked**. The root contains `manifest.json`.

## Rule/request tests

With Node.js 22 or later:

```sh
node --test tests/run-unit.mjs
```

## Chrome checks

Install Playwright in a separate development folder. The runner loads the extension through Chrome's DevTools `Extensions.loadUnpacked` command, which requires a recent Chrome version.

On Windows PowerShell, using your actual Playwright module path:

```powershell
$env:PLAYWRIGHT_MODULE = 'C:\dev\browser-tools\node_modules\playwright'
$env:CHROME_EXE = 'C:\Program Files\Google\Chrome\Application\chrome.exe'
node tests/run-browser.cjs
```

The runner creates a temporary extension copy and an isolated temporary browser profile. Only the test copy receives loopback website access for the dummy HTTP server; the shipping manifest keeps optional permissions.

The report JSON is written inside the temporary `opensignal-test-*` folder. See [TEST-REPORT.md](../TEST-REPORT.md) for the last recorded results and notification-banner limitations.

## Chrome-start tests

With the same PLAYWRIGHT_MODULE and CHROME_EXE settings, run:

```powershell
node tests/run-startup.cjs
```

This runner creates an isolated Chrome profile and a localhost-only test copy. It loads the fixture through CDP, then uses Chrome's normal developer-mode Reload flow so the fixture persists across actual browser process restarts. It verifies the saved default and choices, reload/update preservation, a real 30-second startup delay without the popup, an explicitly stopped worker woken by the alarm, status/alert state/badge, one-shot consumption, extra windows, cancellation, opt-out, and immediate manual checks. The test intentionally waits for the actual 30-second deadline. It does not edit your normal browser profile or Chrome security settings.

## Design constraints

- Check on popup open or explicit **Check now**, plus an optional one-shot runtime.onStartup check delayed 30 seconds using chrome.alarms; no polling.
- Keep data local and request optional access per saved site.
- Keep the onStartup choice in local storage, and its pending deadline in session storage. Clear stale/cancelled alarms. No bare setTimeout in the worker.
- Require Chrome 120+ for 30-second alarm support.
- Omit cookies, enforce fetch time/size limits, reject cross-site redirects.
- Keep fetched scripts inert and ignore hidden/navigation/footer text.
- Prefer review/error states over an unsupported opening claim.
- Preserve duplicate-alert memory across uncertain or failed checks.
- Never fill or submit registration forms.

## Screenshot notes

Repository screenshots show actual extension screens in an isolated Chrome profile. The watch cards use local dummy registration pages; the sample lab uses its built-in fixtures. They do not describe live scholarship or lottery availability.
