# OpenSignal: a beginner's guide

Think of a **watch** as a bookmark with a small checklist. You choose a registration page and the wording that means it is open. When you click OpenSignal, it reads the page and checks that wording.

It does not keep checking all day. Click the icon whenever you want an update, or enable the optional check when Chrome starts.

## Start with a built-in option

1. Click the OpenSignal icon in Chrome.
2. Click **VGM scholarship** or **DV Lottery**.
3. Look over the page address and matching rules.
4. Click **Save & check**.
5. If Chrome asks to read that website, click **Allow**.

Your watch appears on a card. It shows the result, the reason, and when it was checked.

**For VGM:** the starter focuses on the foreign-student scholarship for **2026-2027**. Change the current round when the next academic year comes around.

**For DV:** the starter requires an active **Begin Entry** link or button. **Entrant Status Check** is for results; it is not a new registration window. Add the target DV round once the official page confirms its wording.

A starter does not prove that applications are currently open. Check the official website.

## Add your own event: a simple example

Imagine an event called **Autumn hackathon**. Its official page currently says:

> Registration is coming soon.

You want a reminder when it changes to:

> Registration is open. Apply now.

Here is how to make that watch:

1. Open the real event's registration page in Chrome.
2. Copy its address from the address bar.
3. Click OpenSignal, then **Add a watch**.
4. Enter **Autumn hackathon** as the name.
5. Paste the address into **Registration page**.
6. In **Open phrases**, enter these on separate lines:

```text
registration is open
apply now
```

7. In **Not open yet**, enter:

```text
coming soon
```

8. In **Closed phrases**, enter:

```text
registration is closed
sold out
```

9. Click **Save & check**.
10. Allow website access if Chrome asks.

![An example watch form; the website and event shown are dummy data](images/add-watch.png)

Those are example phrases. Use wording appropriate to your real event. The example address shown in the screenshot is not a live event registration page.

Open phrases work as alternatives: **any one** can match. Put each phrase on its own line. Closed and not-open-yet phrases take priority when they appear in the chosen section.

## Check automatically when Chrome starts

1. Click the OpenSignal icon.
2. Expand **Settings & test alert**.
3. Turn on **Check when Chrome starts**.

The choice saves automatically and stays on across browser restarts and extension updates. From then on, OpenSignal waits 30 seconds after this Chrome profile starts and checks your enabled watches once, even if you never click its icon. Website access must already have been granted when you saved the watches.

![The Chrome-start setting enabled in OpenSignal](images/startup-settings.png)

This option is **off by default**. Turn it off whenever you prefer manual checks; switching it off cancels a pending startup check. If it was already on, the update keeps it on.

A startup means Chrome actually starts this browser profile. Opening another window while Chrome is already running does not trigger another startup check. If Chrome stays running in the background, use Chrome's menu → **Exit**, then reopen Chrome to test it. Incognito startup does not trigger this check.

There is no repeated polling after the startup check. Chrome may run the check later if the computer is busy or asleep. **Check now** and opening the popup still check immediately; they cancel a pending startup check to avoid checking twice. If you are offline at startup, the card can show **Check failed**; open OpenSignal later to try again.

## Check your watches

Click the OpenSignal icon. It automatically checks enabled watches.

You can also click **Check now** while the popup is open. Leaving the popup open does not start repeated checks.

When a watch first appears **Open**, OpenSignal requests a desktop alert and shows a green badge on its icon. Click **Open website** on the card to visit the registration page and confirm the form yourself.

It avoids repeating the same opening alert on every check. After it observes a definite **Upcoming** or **Closed** result, a later opening can produce another alert.

## What the labels mean

- **Open:** Your opening wording matched, or a configured application date window is open. Visit the page to confirm.
- **Upcoming:** The page says not yet, or its date window starts later.
- **Closed:** The page says it ended or sold out, or its date window ended.
- **Needs review:** OpenSignal cannot decide reliably. Read the explanation and website.
- **Check failed:** OpenSignal could not fetch/read the page. Try again and check it manually.
- **Enable access:** The website permission needs approval.
- **Paused:** You disabled this watch.

## When a watch needs review

Read the explanation on its card, then click **Open website**.

If you can see a clear message on the official page, click **Edit** and adjust the phrases to match it. OpenSignal can read text in different languages.

If the page contains several events or old years, expand **Focus on the right section**:

| Setting | Plain-language meaning |
| --- | --- |
| **Section contains** | Look in the part of the page containing this unique event/program name |
| **Current round must contain** | Require the current year/round somewhere on the page; every line must be present |
| **Registration button/link text** | Require an active button/link with this wording, such as “Begin Entry” |
| **Section CSS selector** | An advanced setting for identifying one part of a page; leave it blank unless you know it |
| **Published date range** | Optional Turkish date-window reading; leave it on “Use phrases only” for an ordinary event |

Use the current event name and year together when old announcements are on the same page. “Current round must contain” alone checks the whole page, so it does not isolate an archived section.

Some sites need login, JavaScript, or a verification challenge. OpenSignal may not be able to read those pages even if they look normal when you open them. Check those sites yourself.

## Pause, edit, or delete

- **Pause** stops checks for a watch. **Resume** enables it and runs a check.
- **Edit** changes its page or phrases. Saving checks it again.
- **×** removes the watch.

Change the year/round before the next application cycle.

## Test a notification

1. Expand **Settings & test alert**.
2. Make sure **Desktop alerts when a watch opens** is checked.
3. Click **Send a dummy notification**.

This is only a test; it does not mean a real application opened. Windows can hide the banner if notifications are disabled or Do Not Disturb is on. The green badge remains useful for actual open watches.

## Try the dummy lab

Click **Try sample scenarios**, then choose an example from the list.

![The sample lab using an open dummy event](images/sample-lab.png)

You can try an open event, a sold-out event, old announcements, future Turkish dates, wrong years, verification pages, and DV entry/status-check controls.

The lab uses a fixed sample clock. It makes no requests to real websites and does not change your watches. Use it to learn the labels before relying on a real alert.

## A good everyday routine

Click OpenSignal when you want to check your opportunities. Read any **Needs review** or **Check failed** messages. If a watch turns **Open**, visit the official page and apply there.

Even with Chrome-start checking enabled, there is no scheduled polling. A short opening can be missed between checks. Check time-sensitive opportunities more often yourself.

[Back to README](../README.md) · [Installation help](INSTALL.md) · [Advanced reference](REFERENCE.md)
