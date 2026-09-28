import {validateWatch, originPattern, LABELS} from "./core.js";
import {PRESETS} from "./presets.js";
const $ = id => document.getElementById(id);
let currentWatches = [];
const message = async (type, extra = {}) => {
  const reply = await chrome.runtime.sendMessage({target:"worker", type, ...extra});
  if (!reply?.ok) throw new Error(reply?.error || "OpenSignal could not complete the request.");
  return reply.data;
};
function announce(text) { $("notice").textContent = text; $("notice").hidden = !text; }
function handle(error) { announce(error.message || String(error)); }
function openEditor(watch = {}) {
  $("editorTitle").textContent = watch.id ? "Edit watch" : "Add a watch";
  for (const field of ["name","url","focusText","actionText","selector"]) $(field).value = watch[field] || "";
  for (const field of ["openPhrases","upcomingPhrases","closedPhrases","requiredPhrases"]) $(field).value = (watch[field] || []).join("\n");
  $("dateMode").value = watch.dateMode || "none";
  $("watchId").value = watch.id || "";
  $("formError").textContent = "";
  $("editor").querySelector(".advanced").open = Boolean(watch.focusText || watch.actionText || watch.requiredPhrases?.length);
  $("editor").showModal();
}
function readForm() {
  const watch = {id:$("watchId").value || undefined};
  for (const field of ["name","url","focusText","actionText","selector","dateMode","openPhrases","upcomingPhrases","closedPhrases","requiredPhrases"]) watch[field] = $(field).value;
  watch.enabled = currentWatches.find(item => item.id === watch.id)?.enabled !== false;
  return validateWatch(watch);
}
async function check(ids) {
  $("checkAll").disabled = true;
  try { await message("check", {ids}); }
  catch (error) { handle(error); }
  finally { await render(); if ($("notice").textContent === "Watch saved. Checking the registration page…") announce("Watch saved. Latest status is shown below."); }
}
async function render() {
  const saved = await chrome.storage.local.get(["watches","settings","checking"]);
  currentWatches = saved.watches || [];
  const settings = {notifications:true, onStartup:false, ...(saved.settings || {})};
  $("notifications").checked = settings.notifications;
  $("onStartup").checked = settings.onStartup;
  $("count").textContent = String(currentWatches.length);
  $("checkAll").disabled = Boolean(saved.checking);
  $("checkStatus").textContent = saved.checking ? "Checking your pages…" : (settings.onStartup ? "Checks on Chrome start and popup open." : "Checked when you open OpenSignal.");
  $("empty").hidden = currentWatches.length > 0;
  const list = $("watchList"); list.replaceChildren();
  for (const watch of currentWatches) {
    const node = $("watchTemplate").content.firstElementChild.cloneNode(true);
    node.classList.toggle("paused", !watch.enabled);
    node.querySelector("h3").textContent = watch.name;
    node.querySelector(".host").textContent = new URL(watch.url).hostname;
    const status = node.querySelector(".status");
    status.textContent = !watch.enabled ? "Paused" : LABELS[watch.status] || "Not checked";
    status.classList.add(watch.status || "unchecked");
    node.querySelector(".reason").textContent = watch.reason || "Ready for the first check.";
    node.querySelector(".evidence").textContent = watch.evidence || "";
    node.querySelector(".checked").textContent = (watch.checkedAt ? "Last checked " + new Date(watch.checkedAt).toLocaleString() : "No check yet") + (watch.notificationError ? " · " + watch.notificationError : "");
    node.querySelector(".visit").href = watch.url;
    node.querySelector(".edit").onclick = () => openEditor(watch);
    node.querySelector(".remove").onclick = async () => { try { await message("delete", {id:watch.id}); await render(); } catch (error) { handle(error); } };
    node.querySelector(".pause").textContent = watch.enabled ? "Pause" : "Resume";
    node.querySelector(".pause").onclick = async () => { try { const changed = await message("toggle", {id:watch.id}); await render(); if (changed.enabled) await check([watch.id]); } catch (error) { handle(error); } };
    const access = node.querySelector(".access");
    access.hidden = watch.status !== "permission";
    access.onclick = () => {
      chrome.permissions.request({origins:[originPattern(watch.url)]}).then(granted => {
        if (granted) check([watch.id]); else announce("Website access was declined. This watch stays paused until access is granted.");
      }).catch(handle);
    };
    list.append(node);
  }
}
$("watchForm").addEventListener("submit", event => {
  event.preventDefault();
  let watch;
  try { watch = readForm(); } catch (error) { $("formError").textContent = error.message; return; }
  // Request immediately inside the click gesture, before any await.
  const permission = chrome.permissions.request({origins:[originPattern(watch.url)]});
  $("saveWatch").disabled = true;
  permission.then(async granted => {
    if (!granted) throw new Error("Chrome did not grant access. Your existing watches have not changed.");
    const item = await message("save", {watch});
    $("editor").close();
    announce("Watch saved. Checking the registration page…");
    await render(); await check([item.id]);
  }).catch(error => { $("formError").textContent = error.message; }).finally(() => { $("saveWatch").disabled = false; });
});
$("add").onclick = () => openEditor({openPhrases:["registration is open","apply now"], upcomingPhrases:["coming soon","not yet open"], closedPhrases:["registration is closed","sold out"]});
$("cancel").onclick = () => $("editor").close();
$("vgmPreset").onclick = () => openEditor(PRESETS.vgm);
$("dvPreset").onclick = () => openEditor(PRESETS.dv);
$("checkAll").onclick = () => check();
$("demo").onclick = () => chrome.tabs.create({url:chrome.runtime.getURL("demo.html")});
$("notifications").onchange = () => message("settings", {settings:{notifications:$("notifications").checked}}).catch(handle);
$("onStartup").onchange = () => message("settings", {settings:{onStartup:$("onStartup").checked}}).catch(handle);
$("testNotification").onclick = () => message("testNotification").then(() => announce("Dummy notification sent. If no banner appears, check Windows notification settings.")).catch(handle);
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === "local" && (changes.watches || changes.settings || changes.checking)) render().catch(handle);
});
await render();
await check();

