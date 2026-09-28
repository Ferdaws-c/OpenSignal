const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const http = require("node:http");
const assert = require("node:assert/strict");
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || "playwright");
const source = path.resolve(__dirname, "..");
const root = fs.mkdtempSync(path.join(os.tmpdir(), "opensignal-startup-"));
const profile = path.join(root, "profile");
const alarmName = "opensignal-startup";
let context, page, id, fixture = "upcoming";
const requests = [], cases = [];
const server = http.createServer((req, res) => {
  requests.push(Date.now());
  res.setHeader("content-type", "text/html");
  res.end("<main><h1>Dummy startup event</h1><p>" +
    (fixture === "open" ? "Registration is open. Apply now." : "Registration is coming soon.") + "</p></main>");
});
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function until(predicate, label, ms = 8000) {
  const end = Date.now() + ms;
  while (Date.now() < end) {
    if (await predicate()) return;
    await pause(50);
  }
  throw new Error(label);
}
async function step(name, run) {
  await run();
  cases.push({name, passed:true});
  console.log("PASS", name);
}
const launch = () => chromium.launchPersistentContext(profile, {
  executablePath:process.env.CHROME_EXE || "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless:true, ignoreDefaultArgs:["--disable-extensions"],
  args:["--enable-unsafe-extension-debugging"], viewport:{width:440, height:1000}
});
async function send(type, extra = {}) {
  return page.evaluate(async ({type, extra}) => {
    const reply = await chrome.runtime.sendMessage({target:"worker", type, ...extra});
    if (!reply.ok) throw new Error(reply.error);
    return reply.data;
  }, {type, extra});
}
async function worker() {
  let found;
  await until(async () => {
    for (const candidate of [...context.serviceWorkers()].reverse()) {
      if (!candidate.url().endsWith("/background.js")) continue;
      try {
        if (await candidate.evaluate(() => chrome.runtime.id) === id) {
          found = candidate;
          return true;
        }
      } catch {}
    }
    return false;
  }, "Background worker did not start");
  return found;
}
async function pending() {
  const current = await worker();
  let alarm;
  await until(async () => {
    alarm = await current.evaluate(name => chrome.alarms.get(name), alarmName);
    return !!alarm;
  }, "Pending startup alarm not found");
  return alarm;
}
async function demo() {
  page = await context.newPage();
  await page.goto("chrome-extension://" + id + "/demo.html");
}
async function restart() {
  if (page && !page.isClosed()) await page.close();
  await context.close();
  context = null;
  context = await launch();
}
(async () => {
  try {
    await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
    const url = "http://127.0.0.1:" + server.address().port + "/event";
    const extension = path.join(root, "extension");
    fs.cpSync(source, extension, {recursive:true, filter:p => path.basename(p) !== ".git"});
    const manifest = JSON.parse(fs.readFileSync(path.join(extension, "manifest.json"), "utf8").replace(/^\uFEFF/, ""));
    manifest.host_permissions = ["http://127.0.0.1/*"];
    fs.writeFileSync(path.join(extension, "manifest.json"), JSON.stringify(manifest));
    context = await launch();
    const cdp = await context.browser().newBrowserCDPSession();
    id = (await cdp.send("Extensions.loadUnpacked", {path:extension})).id;
    // Chrome's normal Reload converts the transient CDP fixture into a persistent
    // unpacked install. Everything is confined to this new disposable profile.
    const installer = await context.newPage();
    await installer.goto("chrome://extensions");
    await installer.evaluate(() => chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode:true}));
    await installer.evaluate(id => chrome.developerPrivate.reload(id, {failQuietly:true}), id);
    await installer.close();
    page = await context.newPage();
    await page.goto("chrome-extension://" + id + "/popup.html");
    await page.waitForSelector("#empty:not([hidden])");
    await step("Chrome-start checking defaults to off with no scheduled alarm", async () => {
      assert.equal(await page.locator("#onStartup").isChecked(), false);
      assert.equal((await send("get")).settings.onStartup, false);
      assert.equal(await page.evaluate(name => chrome.alarms.get(name), alarmName), undefined);
    });
    const savedWatch = await send("save", {watch:{
      name:"Dummy startup event", url, openPhrases:["registration is open"],
      upcomingPhrases:["coming soon"], closedPhrases:["registration is closed"]
    }});
    await step("Enabling startup checking saves the choice and preserves alerts", async () => {
      await page.locator(".settings summary").click();
      await page.locator("#onStartup").check();
      await until(async () => (await send("get")).settings.onStartup, "Toggle not saved");
      assert.equal((await send("get")).settings.notifications, true);
    });
    await step("Desktop-alert changes preserve the saved startup choice", async () => {
      await page.locator("#notifications").uncheck();
      await until(async () => !(await send("get")).settings.notifications, "Alert setting not saved");
      assert.equal((await send("get")).settings.onStartup, true);
      await page.locator("#notifications").check();
      await until(async () => (await send("get")).settings.notifications, "Alert setting not restored");
    });
    await page.close();
    const reloader = await context.newPage();
    await reloader.goto("chrome://extensions");
    await reloader.evaluate(id => chrome.developerPrivate.reload(id, {failQuietly:true}), id);
    await reloader.close();
    await demo();
    await step("Reloading/updating keeps the enabled choice and saved watch", async () => {
      const state = await send("get");
      assert.equal(state.settings.onStartup, true);
      assert.equal(state.watches[0].id, savedWatch.id);
    });
    fixture = "open";
    const before = requests.length, restartedAt = Date.now();
    await restart();
    let scheduled = await pending();
    await step("Real Chrome restart restores the enabled startup choice", async () => {
      assert.equal((await (await worker()).evaluate(() => chrome.storage.local.get("settings"))).settings.onStartup, true);
    });
    await step("Startup schedules one alarm at least 30 seconds later without fetching", async () => {
      const current = await worker();
      const marker = await current.evaluate(() => chrome.storage.session.get("startupCheckAt"));
      assert.equal(scheduled.scheduledTime, marker.startupCheckAt);
      assert.ok(scheduled.scheduledTime - restartedAt >= 30000);
      assert.equal(scheduled.periodInMinutes, undefined);
      assert.equal(requests.length, before);
      assert.equal(context.pages().some(p => p.url().startsWith("chrome-extension://")), false);
    });
    await step("Pending startup check survives stopping the service worker", async () => {
      const browserCdp = await context.browser().newBrowserCDPSession();
      const target = (await browserCdp.send("Target.getTargets")).targetInfos.find(
        t => t.type === "service_worker" && t.url === "chrome-extension://" + id + "/background.js");
      assert.ok(target);
      assert.equal((await browserCdp.send("Target.closeTarget", {targetId:target.targetId})).success, true);
      // Playwright can retain a stale Worker object; verify Chrome's actual state.
      const inspector = await context.newPage();
      await inspector.goto("chrome://serviceworker-internals");
      await inspector.waitForFunction(id => {
        const text = document.body.innerText;
        return text.includes("chrome-extension://" + id + "/") && /Running Status:\s*STOPPED/.test(text);
      }, id);
      await inspector.close();
      assert.equal(requests.length, before);
    });
    console.log("Waiting for the real 30-second startup deadline...");
    await step("Chrome wakes the worker and checks after the real 30-second delay", async () => {
      await until(() => requests.length > before, "Delayed startup request missing", 40000);
      assert.ok(requests[before] >= scheduled.scheduledTime, "Request happened before deadline");
      assert.equal(context.pages().some(p => p.url().startsWith("chrome-extension://")), false);
    });
    const current = await worker();
    await until(async () => !(await current.evaluate(() => chrome.storage.local.get("checking"))).checking, "Check did not finish");
    await step("Delayed startup check saves Open, native alert state, and badge", async () => {
      const state = await current.evaluate(() => chrome.storage.local.get("watches"));
      assert.equal(state.watches[0].status, "open");
      assert.equal(state.watches[0].alertedOpen, true);
      assert.equal(await current.evaluate(() => chrome.action.getBadgeText({})), "1");
      assert.equal(requests.length - before, 1);
    });
    await demo();
    await step("Completed startup alarm is consumed and does not poll", async () => {
      assert.equal(await page.evaluate(name => chrome.alarms.get(name), alarmName), undefined);
      assert.equal((await page.evaluate(() => chrome.storage.session.get("startupCheckAt"))).startupCheckAt, undefined);
      await pause(1000);
      assert.equal(requests.length - before, 1);
    });
    await step("Opening an extra window does not schedule or run another check", async () => {
      const hits = requests.length;
      const window = await page.evaluate(() => chrome.windows.create({url:"about:blank"}));
      await pause(500);
      assert.equal(requests.length, hits);
      assert.equal(await page.evaluate(name => chrome.alarms.get(name), alarmName), undefined);
      await page.evaluate(id => chrome.windows.remove(id), window.id);
    });
    const cancelAt = requests.length;
    await restart();
    await pending();
    await demo();
    await step("Switching startup checking off cancels the pending alarm", async () => {
      await send("settings", {settings:{onStartup:false}});
      assert.equal(await page.evaluate(name => chrome.alarms.get(name), alarmName), undefined);
      assert.equal((await page.evaluate(() => chrome.storage.session.get("startupCheckAt"))).startupCheckAt, undefined);
      await pause(800);
      assert.equal(requests.length, cancelAt);
    });
    await restart();
    await demo();
    await step("The disabled choice survives restart and schedules no requests", async () => {
      await pause(800);
      assert.equal((await send("get")).settings.onStartup, false);
      assert.equal(await page.evaluate(name => chrome.alarms.get(name), alarmName), undefined);
      assert.equal(requests.length, cancelAt);
    });
    await send("settings", {settings:{onStartup:true}});
    await restart();
    scheduled = await pending();
    await step("Opening the popup checks immediately and cancels the pending startup check", async () => {
      page = await context.newPage();
      await page.goto("chrome-extension://" + id + "/popup.html");
      await page.waitForSelector(".status.open");
      await page.waitForFunction(() => !document.querySelector("#checkAll").disabled);
      assert.equal(requests.length, cancelAt + 1);
      assert.ok(requests.at(-1) < scheduled.scheduledTime);
      assert.equal(await page.evaluate(name => chrome.alarms.get(name), alarmName), undefined);
    });
    await step("Watches, enabled choice, and duplicate-alert memory remain saved", async () => {
      const state = await send("get");
      assert.equal(state.settings.onStartup, true);
      assert.equal(state.watches[0].id, savedWatch.id);
      assert.equal(state.watches[0].alertedOpen, true);
      assert.equal(state.watches.length, 1);
    });
    const report = {passed:cases.length, failed:0, cases, chromeVersion:context.browser().version(),
      configuredDelayMs:30000, observedStartupRequestDelayMs:requests[before] - restartedAt,
      workerSleep:"Worker explicitly stopped during delay; real Chrome alarm woke it.",
      testSetup:"Disposable profile; normal Chrome Reload persists CDP fixture; only test copy grants localhost access."};
    fs.writeFileSync(path.join(root, "startup-results.json"), JSON.stringify(report, null, 2));
    console.log("STARTUP_RESULTS " + JSON.stringify(report));
    console.log("RESULT_FILE " + path.join(root, "startup-results.json"));
  } catch (error) {
    console.error(error.stack);
    console.log("TEST_ROOT " + root);
    process.exitCode = 1;
  } finally {
    if (context) await context.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
})();

