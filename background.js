import {validateWatch, safeUrl, nextState} from "./core.js";
import {checkWatch} from "./checker.js";
let queue = Promise.resolve();
let runningCheck;
function serial(task) {
  const result = queue.then(task, task);
  queue = result.catch(() => {});
  return result;
}
async function ensureState() {
  const saved = await chrome.storage.local.get(["watches","settings"]);
  if (!Array.isArray(saved.watches)) saved.watches = [];
  saved.settings = {notifications:true, onStartup:false, ...(saved.settings || {})};
  return saved;
}
async function badge(watches) {
  const count = watches.filter(watch => watch.enabled && watch.status === "open").length;
  await chrome.action.setBadgeBackgroundColor({color:"#147d64"});
  await chrome.action.setBadgeText({text:count ? String(count) : ""});
}
async function parser(html, watch) {
  const reply = await chrome.runtime.sendMessage({target:"parser", html, watch});
  if (!reply?.ok) throw new Error(reply?.error || "Could not read the website.");
  return reply.data;
}
async function ensureParser() {
  const contexts = await chrome.runtime.getContexts({contextTypes:["OFFSCREEN_DOCUMENT"], documentUrls:[chrome.runtime.getURL("offscreen.html")]});
  if (!contexts.length) await chrome.offscreen.createDocument({url:"offscreen.html", reasons:["DOM_PARSER"], justification:"Read registration text safely without opening or executing the website."});
}
async function notify(watch) {
  if (await chrome.notifications.getPermissionLevel() !== "granted") return false;
  await chrome.notifications.create("open:" + watch.id, {
    type:"basic", iconUrl:"icons/icon128.png", title:watch.name + " — registration appears open",
    message:watch.reason.slice(0, 220), contextMessage:new URL(watch.url).hostname,
    buttons:[{title:"Open website"}], priority:0
  });
  return true;
}
async function runChecks(ids) {
  const {watches, settings} = await ensureState();
  const selected = watches.filter(watch => watch.enabled && (!ids || ids.includes(watch.id)));
  if (!selected.length) { await badge(watches); return {count:0}; }
  await chrome.storage.local.set({checking:true});
  try {
    await ensureParser();
    let cursor = 0;
    async function worker() {
      while (cursor < selected.length) {
        const watch = selected[cursor++];
        const result = await checkWatch(watch, {contains:request => chrome.permissions.contains(request), parse:parser});
        const {next, shouldNotify} = nextState(watch, result, Date.now(), settings.notifications);
        next.notificationError = "";
        if (shouldNotify) {
          try { next.alertedOpen = await notify(next); next.notificationError = next.alertedOpen ? "" : "Desktop notifications are disabled. The toolbar badge still shows open watches."; }
          catch { next.alertedOpen = false; next.notificationError = "Desktop alert could not be shown. Check Chrome and Windows notification settings."; }
        }
        next.history = [{status:result.status, at:next.checkedAt, evidence:result.evidence}, ...(watch.history || [])].slice(0, 12);
        Object.assign(watch, next);
      }
    }
    await Promise.all(Array.from({length:Math.min(3, selected.length)}, worker));
    await chrome.storage.local.set({watches});
    await badge(watches);
    return {count:selected.length};
  } finally {
    await chrome.storage.local.set({checking:false});
    try { await chrome.offscreen.closeDocument(); } catch {}
  }
}
function startCheck(ids) {
  if (runningCheck) return runningCheck;
  runningCheck = serial(() => runChecks(ids)).finally(() => { runningCheck = null; });
  return runningCheck;
}
async function dispatch(message) {
  if (message.type === "get") return ensureState();
  if (message.type === "check") return startCheck(message.ids);
  if (message.type === "save") return serial(async () => {
    const {watches} = await ensureState();
    if (!message.watch.id && watches.length >= 50) throw new Error("Keep up to 50 watches. Remove one before adding another.");
    const validated = validateWatch(message.watch);
    const index = watches.findIndex(watch => watch.id === validated.id);
    const item = {...validated, id:validated.id || crypto.randomUUID(), status:"unchecked", alertedOpen:false};
    if (index >= 0) watches[index] = item; else watches.push(item);
    await chrome.storage.local.set({watches});
    await badge(watches);
    return item;
  });
  if (message.type === "delete") return serial(async () => {
    const saved = await ensureState();
    const watches = saved.watches.filter(watch => watch.id !== message.id);
    await chrome.storage.local.set({watches}); await chrome.notifications.clear("open:" + message.id); await badge(watches);
    return {deleted:true};
  });
  if (message.type === "toggle") return serial(async () => {
    const {watches} = await ensureState();
    const watch = watches.find(watch => watch.id === message.id);
    if (!watch) throw new Error("Watch not found.");
    watch.enabled = !watch.enabled;
    await chrome.storage.local.set({watches}); await badge(watches);
    return {enabled:watch.enabled};
  });
  if (message.type === "settings") return serial(async () => {
    const saved = await ensureState();
    const settings = {...saved.settings};
    for (const key of ["notifications", "onStartup"]) {
      if (typeof message.settings?.[key] === "boolean") settings[key] = message.settings[key];
    }
    await chrome.storage.local.set({settings});
    return settings;
  });
  if (message.type === "testNotification") {
    if (await chrome.notifications.getPermissionLevel() !== "granted") throw new Error("Desktop notifications are disabled for OpenSignal.");
    await chrome.notifications.create("demo", {type:"basic", iconUrl:"icons/icon128.png", title:"OpenSignal test alert", message:"A registration-open alert will look like this. This is dummy data.", priority:0});
    return {sent:true};
  }
  throw new Error("Unknown request.");
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (sender.id !== chrome.runtime.id || message.target !== "worker") return;
  dispatch(message).then(data => respond({ok:true, data}), error => respond({ok:false, error:error.message}));
  return true;
});
chrome.runtime.onInstalled.addListener(() => serial(async () => {
  const state = await ensureState(); await chrome.storage.local.set({...state, checking:false}); await badge(state.watches);
}));
// Registered at module load so Chrome can wake the worker on profile startup.
chrome.runtime.onStartup.addListener(() => {
  serial(async () => {
    const {watches, settings} = await ensureState();
    // A previous browser shutdown may have interrupted a check.
    await chrome.storage.local.set({checking:false});
    await badge(watches);
    return settings.onStartup === true;
  }).then(enabled => enabled ? startCheck() : undefined).catch(console.error);
});
async function openNotification(id) {
  if (!id.startsWith("open:")) return;
  const {watches} = await ensureState();
  const watch = watches.find(item => item.id === id.slice(5));
  if (watch) await chrome.tabs.create({url:safeUrl(watch.url)});
  await chrome.notifications.clear(id);
}
chrome.notifications.onClicked.addListener(id => openNotification(id).catch(console.error));
chrome.notifications.onButtonClicked.addListener(id => openNotification(id).catch(console.error));

