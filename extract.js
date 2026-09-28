import {normalize} from "./core.js";
function readable(node) {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.DOCUMENT_NODE && node.nodeType !== Node.DOCUMENT_FRAGMENT_NODE) return "";
  const block = /^(P|DIV|SECTION|ARTICLE|TR|LI|H[1-6]|BR|TABLE|MAIN|UL|OL|TD|TH|BODY)$/.test(node.nodeName);
  return (block ? "\n" : "") + [...node.childNodes].map(readable).join("") + (block ? "\n" : "");
}
function cleanText(node) { return readable(node).replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim(); }
export function extractHtml(html, watch) {
  // Parsing into a template is inert: scripts never execute, and media never loads.
  const template = document.createElement("template");
  template.innerHTML = String(html);
  const root = template.content;
  root.querySelectorAll("script,style,noscript,template,svg,nav,header,footer,[hidden],[aria-hidden='true']").forEach(node => node.remove());
  root.querySelectorAll("[style]").forEach(node => {
    if (/display\s*:\s*none|visibility\s*:\s*hidden/i.test(node.getAttribute("style"))) node.remove();
  });
  const fullText = cleanText(root).slice(0, 120000);
  let regions = [root];
  if (watch.selector) {
    try { regions = [...root.querySelectorAll(watch.selector)]; }
    catch { return {fullText, text:"", error:"The section selector is invalid. Edit this watch."}; }
    if (!regions.length) return {fullText, text:"", error:"The selected section was not found. The website layout may have changed."};
  }
  if (watch.focusText) {
    const focus = normalize(watch.focusText);
    let candidates = [];
    // Prefer a whole table row, then the smallest matching content block.
    for (const kind of ["tr","article","section","p","li","div"]) {
      candidates = regions.flatMap(region => [
        ...(region.matches?.(kind) ? [region] : []), ...region.querySelectorAll(kind)
      ]).filter(node => normalize(cleanText(node)).includes(focus));
      candidates = [...new Set(candidates)];
      if (candidates.length) break;
    }
    if (!candidates.length) return {fullText, text:"", error:"The focus text was not found. Check the wording or website layout."};
    candidates = candidates.filter(node => !candidates.some(other => other !== node && node.contains(other)));
    if (candidates.length !== 1) return {fullText, text:"", error:"The focus text appears in multiple sections. Add a section selector to choose the current one."};
    regions = candidates;
  }
  const actions = regions.flatMap(region => [...region.querySelectorAll("a[href],button,input[type=submit],input[type=button]")])
    .filter(node => !node.matches(":disabled") && node.getAttribute("aria-disabled") !== "true" && node.getAttribute("disabled") === null)
    .filter(node => node.nodeName !== "A" || !/^(?:#|javascript:|mailto:)/i.test(node.getAttribute("href").trim()))
    .map(node => cleanText(node) || node.getAttribute("value") || "");
  return {fullText, text:regions.map(cleanText).join("\n").slice(0, 20000), actions};
}

