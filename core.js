export function normalize(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i").toLowerCase().replace(/[–—−]/g, "-").replace(/\s+/g, " ").replace(/\s*-\s*/g, "-").trim();
}
export function phrases(value) {
  const items = Array.isArray(value) ? value : String(value || "").split(/\r?\n/);
  return [...new Set(items.map(item => String(item).trim()).filter(Boolean))].slice(0, 40);
}
export function safeUrl(value) {
  const url = new URL(value);
  if (!["https:", "http:"].includes(url.protocol) || url.username || url.password) {
    throw new Error("Use a normal HTTP or HTTPS page address without a password.");
  }
  url.hash = "";
  return url.href;
}
export function originPattern(value) { return new URL(safeUrl(value)).origin + "/*"; }
export function validateWatch(input) {
  const name = String(input.name || "").trim().slice(0, 100);
  if (!name) throw new Error("Give this watch a name.");
  const openPhrases = phrases(input.openPhrases);
  if (!openPhrases.length) throw new Error("Add at least one phrase that means registration is open.");
  const dateMode = input.dateMode === "turkish" ? "turkish" : "none";
  return {
    id: typeof input.id === "string" && /^[a-zA-Z0-9-]{1,80}$/.test(input.id) ? input.id : null,
    name, url: safeUrl(input.url), openPhrases,
    upcomingPhrases: phrases(input.upcomingPhrases),
    closedPhrases: phrases(input.closedPhrases),
    requiredPhrases: phrases(input.requiredPhrases),
    focusText: String(input.focusText || "").trim().slice(0, 300),
    selector: String(input.selector || "").trim().slice(0, 300),
    actionText: String(input.actionText || "").trim().slice(0, 200),
    dateMode, enabled: input.enabled !== false
  };
}
const MONTHS = ["ocak","subat","mart","nisan","mayis","haziran","temmuz","agustos","eylul","ekim","kasim","aralik"];
export function turkishWindow(text) {
  const n = normalize(text);
  const pattern = /(\d{1,2})\s+(ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik)\s+(\d{4})(?:\s+(?:saat\s*)?(\d{1,2})[.:](\d{2}))?/g;
  const matches = [...n.matchAll(pattern)];
  if (matches.length !== 2) return null;
  const points = matches.map((match, index) => {
    const day = Number(match[1]), month = MONTHS.indexOf(match[2]), year = Number(match[3]);
    const hour = match[4] === undefined ? (index === 0 ? 0 : 23) : Number(match[4]);
    const minute = match[5] === undefined ? (index === 0 ? 0 : 59) : Number(match[5]);
    const second = index === 0 ? 0 : 59;
    const calendar = new Date(Date.UTC(year, month, day, hour, minute, second));
    if (calendar.getUTCMonth() !== month || calendar.getUTCDate() !== day || hour > 23 || minute > 59) return NaN;
    return calendar.getTime() - 3 * 3600000;
  });
  if (!points.every(Number.isFinite) || points[1] < points[0]) return null;
  return {start: points[0], end: points[1]};
}
const hits = (text, list) => phrases(list).filter(phrase => text.includes(normalize(phrase)));
export function classify(watch, extracted, now = Date.now()) {
  const full = normalize(extracted.fullText);
  const text = normalize(extracted.text);
  if (extracted.error) return {status:"review", reason:extracted.error, evidence:""};
  if (!text) return {status:"review", reason:"The page has no readable text. It may need JavaScript or login.", evidence:""};
  if (/verify you are human|checking your browser|just a moment|enable javascript and cookies to continue|access denied|captcha verification/.test(text)) {
    return {status:"review", reason:"The site returned a verification or blocked-access page.", evidence:extracted.text.slice(0, 200)};
  }
  const missing = phrases(watch.requiredPhrases).filter(phrase => !full.includes(normalize(phrase)));
  if (missing.length) return {status:"review", reason:"Current round text not found: " + missing.join(", "), evidence:""};
  const closed = hits(text, watch.closedPhrases);
  const upcoming = hits(text, watch.upcomingPhrases);
  if (closed.length) return {status:"closed", reason:"The page matches your closed phrases.", evidence:closed.join(" · ")};
  if (upcoming.length) return {status:"upcoming", reason:"The page says registration is upcoming or not open yet.", evidence:upcoming.join(" · ")};
  if (/registration (?:is )?(?:not|isn't) open|applications (?:are )?(?:not|aren't) open|registration (?:is )?closed|applications (?:are )?closed|entry period (?:has )?(?:ended|closed)|basvurular sona ermistir|basvuruya kapali/.test(text)) {
    return {status:"closed", reason:"The page explicitly says registration is not open.", evidence:"Not-open wording detected"};
  }
  const window = watch.dateMode === "turkish" ? turkishWindow(text) : null;
  if (window) {
    const status = now < window.start ? "upcoming" : now > window.end ? "closed" : "open";
    return {status, reason:status === "open" ? "The published application window is open (Türkiye time). Confirm the form on the website." :
      status === "upcoming" ? "The published application window starts in the future." : "The published application window has ended.",
      evidence:extracted.text.slice(0, 350), window};
  }
  if (watch.dateMode === "turkish" && /\d{1,2} (?:ocak|subat|mart|nisan|mayis|haziran|temmuz|agustos|eylul|ekim|kasim|aralik) \d{4}/.test(text)) {
    return {status:"review", reason:"The published date range is incomplete or invalid. Review the website.", evidence:extracted.text.slice(0, 300)};
  }
  if (watch.actionText && !(extracted.actions || []).some(action => normalize(action).includes(normalize(watch.actionText)))) {
    return {status:"review", reason:"An active registration button/link was not found. The page may need JavaScript or login.", evidence:extracted.text.slice(0, 250)};
  }
  const open = hits(text, watch.openPhrases);
  if (open.length) return {status:"open", reason:"The page matches your open phrases. Confirm the form on the website.", evidence:open.join(" · ")};
  return {status:"review", reason:"No clear open, upcoming, or closed phrase matched. Review the page or refine this watch.", evidence:extracted.text.slice(0, 300)};
}
export function nextState(previous, result, checkedAt, notificationEnabled) {
  const knownNotOpen = ["closed", "upcoming"].includes(result.status);
  const next = {...previous, ...result, checkedAt};
  if (knownNotOpen) next.alertedOpen = false;
  const shouldNotify = result.status === "open" && !previous.alertedOpen && notificationEnabled;
  return {next, shouldNotify};
}
export const LABELS = {open:"Open", upcoming:"Upcoming", closed:"Closed", review:"Needs review", error:"Check failed", permission:"Enable access", unchecked:"Not checked"};

