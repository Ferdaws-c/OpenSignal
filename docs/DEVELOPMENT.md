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

This runner creates an isolated Chrome profile and a localhost-only test copy. It loads the fixture through CDP, then uses Chrome's normal developer-mode Reload flow so the fixture persists across actual browser process restarts. It verifies the default, both settings toggles, a real startup fetch without the popup, status/alert state/badge, no polling, extra windows, opt-out, and saved state. It does not edit your normal browser profile or Chrome security settings.

## Design constraints

- Check on popup open or explicit **Check now**, plus an optional one-shot runtime.onStartup check; no polling.
- Keep data local and request optional access per saved site.
- Omit cookies, enforce fetch time/size limits, reject cross-site redirects.
- Keep fetched scripts inert and ignore hidden/navigation/footer text.
- Prefer review/error states over an unsupported opening claim.
- Preserve duplicate-alert memory across uncertain or failed checks.
- Never fill or submit registration forms.

## Screenshot notes

Repository screenshots show actual extension screens in an isolated Chrome profile. The watch cards use local dummy registration pages; the sample lab uses its built-in fixtures. They do not describe live scholarship or lottery availability.
