# OpenSignal — Registration Watch

A small personal Chrome extension for scholarship applications, event registration, ticket releases, and other upcoming opportunities.

## Install in Chrome

1. Extract OpenSignal.zip into a folder you plan to keep.
2. Open chrome://extensions in Chrome.
3. Turn on **Developer mode** at the top right.
4. Click **Load unpacked** and select the **OpenSignal** folder containing manifest.json.
5. Open Chrome's Extensions menu (the puzzle icon) and pin OpenSignal.
6. Click its green circle icon. Choose **VGM scholarship**, **DV Lottery**, or **Add a watch**.
7. Save the watch and approve access to that website when Chrome asks.

Do not remove the extracted folder after installation. This is a local unpacked extension, not a Chrome Web Store listing. It works with Manifest V3 on Chrome 116+.

## When it checks

Every time you open the extension popup, it checks your enabled watches. **Check now** runs another check. Enable **Settings & test alert → Check when Chrome starts** for one automatic check on profile startup. This option is off by default; it runs without opening the popup. It uses Chrome's runtime.onStartup event, which fires when this browser profile first starts, not when additional windows open. There is no timer or scheduled polling. If Chrome remains running in the background, a new window is not a new profile startup.

No AI model, API key, tokens, account, or subscription is required to use this extension. Checking still requires internet access and uses normal network data.

## What you see

- **Open:** A configured open phrase matched, or the configured Turkish application date window is currently open. You get one desktop notification and a green toolbar badge. Click the alert or **Open website** to visit the registration page.
- **Upcoming:** The page matches your not-open-yet phrases, or its date window is in the future.
- **Closed:** The page matches your closed phrases, explicitly says registration is not open, or its date window has ended.
- **Needs review:** Wording is unclear, the chosen section disappeared, the round/year is wrong, a site needs JavaScript/login/verification, or the active registration link cannot be found.
- **Check failed:** A timeout, offline connection, blocked response, HTTP error, oversized page, unsupported file, or cross-site redirect prevented a check.
- **Enable access:** Website access has not been approved or was revoked.

"Open" is a phrase/date match, not proof that you are eligible or that the registration server will accept a submission. Always confirm on the official website. The extension does not fill or submit forms.

Desktop notifications can be turned off. The toolbar badge still shows open watches. **Settings & test alert → Send a dummy notification** tests Chrome's notification API. Windows notification settings and Do Not Disturb may hide banners.

Notifications do not repeat while the same opening remains active. A definite Upcoming/Closed state re-arms the next opening. Failed or uncertain checks do not falsely re-arm it.

## Make a reliable watch

Use the actual registration or current announcement page, rather than a homepage or search result.

**Open phrases:** One per line. Any matching phrase can indicate open registration.
**Not open yet / Closed phrases:** One per line. These take priority over open wording.

Expand **Focus on the right section** when a page contains multiple programs or archived announcements:

- **Section contains:** Copy a unique program/event name. Table rows are preferred, which keeps VGM's school dates separate from its foreign-student scholarship row.
- **Current round must contain:** Add the year or registration cycle. Every line must appear on the page. Update this each new cycle.
- **Registration button/link text:** Require an active link or button, for example "Begin Entry" on the DV portal. A disabled button or instructions alone will not count.
- **Section CSS selector:** Advanced: constrain parsing to the current section, such as #current-registration.
- **Published date range:** Turkish mode reads two full Turkish dates in that section (for example "06 Ekim 2026 Saat 10.00" and "20 Ekim 2026 Saat 23.59"), using Türkiye time (UTC+3). Without times, the first date starts at midnight and the last date ends at 23:59:59. Incomplete, ambiguous, invalid, and reversed ranges need review.

Avoid broad phrases such as "open" or "available"; they can occur in unrelated content. Use a section selector to avoid old rounds. Pausing a watch prevents requests for that page.

## Included starters

**VGM foreign-student scholarship:** Official page https://www.vgm.gov.tr/sayfalar/burs-basvurulari
- Focuses on Yabancı Uyruklu Öğrenci Bursu.
- Requires the 2026-2027 cycle.
- Recognizes pending Turkish wording and full Turkish application date ranges.
- Edit the cycle for later years.

**DV Lottery registration:** Official entry portal https://dvprogram.state.gov/
- Requires an active "Begin Entry" link/button plus open wording.
- "Entrant Status Check" is not treated as entry registration.
- Add the target DV cycle once its official wording is known.
- A blocked/JavaScript/verification response is shown as Needs review or Check failed.
- This starter does not assume current DV dates, fees, eligibility, or that a registration round is open.

You can create and edit up to 50 watches for any normal HTTP/HTTPS page. Custom wording can be in any language; Turkish accents and dash variations are normalized.

## Privacy and permissions

The extension stores watch names, page URLs, matching phrases, preferences, recent results, and timestamps in chrome.storage.local on this browser profile.

It contains no personal ID number, CV, credentials, or application data. It sends no analytics and has no remote scripts, external fonts, AI requests, or backend.

Required permissions:
- **storage:** Save watches and recent results.
- **notifications:** Show an opening alert.
- **offscreen:** Parse fetched HTML in an inert local document; the parser closes after the check.

Website access is optional and requested per saved site. Requests omit cookies and use fresh responses. The extension never injects code into your browsing tabs. Revoking website access stops checks for that site.

Only HTML/text pages are supported. Pages rendered entirely through JavaScript, PDF announcements, login-only pages, CAPTCHAs, and changing layouts may need manual review. A negative, failed, or unclear check does not prove registration is unavailable.

## Try dummy scenarios

Click **Try sample scenarios** in the popup. The built-in lab has 16 dummy scenarios covering open/upcoming/closed, sold-out events, archives, VGM mixed-program tables, Turkish date windows, hidden text, verification pages, wrong years, changed layouts, and active/disabled DV entry controls.

The lab performs no network requests and leaves your real watches unchanged. A separate dummy-notification button tests the browser's desktop notification API.

See [TEST-REPORT.md](../TEST-REPORT.md) for automated validation and limits.

Startup event reference: https://developer.chrome.com/docs/extensions/reference/api/runtime#event-onStartup

## Official Chrome references

- Local extension loading: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world#load-unpacked
- Optional website permissions: https://developer.chrome.com/docs/extensions/reference/api/permissions
- Notifications: https://developer.chrome.com/docs/extensions/reference/api/notifications
- Offscreen DOM parsing: https://developer.chrome.com/docs/extensions/reference/api/offscreen

