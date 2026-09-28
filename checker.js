import {safeUrl, originPattern, classify} from "./core.js";
export async function fetchPage(url, fetchImpl = fetch, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetchImpl(safeUrl(url), {signal:controller.signal, cache:"no-store", credentials:"omit", redirect:"follow", headers:{Accept:"text/html,application/xhtml+xml,text/plain"}});
    if (!response.ok) throw new Error("The website returned HTTP " + response.status + ".");
    if (response.url && new URL(response.url).origin !== new URL(url).origin) {
      throw new Error("The page redirected to another site. Review its address before watching it.");
    }
    const type = response.headers.get("content-type") || "";
    if (type && !/text\/html|application\/xhtml\+xml|text\/plain/i.test(type)) throw new Error("This address is not a readable web page.");
    if (Number(response.headers.get("content-length")) > 2000000) throw new Error("This page is too large. Watch a smaller registration page.");
    const reader = response.body?.getReader();
    if (!reader) throw new Error("The website returned an empty response.");
    let size = 0;
    const chunks = [];
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      size += chunk.value.length;
      if (size > 2000000) { controller.abort(); throw new Error("This page is too large. Watch a smaller registration page."); }
      chunks.push(chunk.value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const charset = /charset\s*=\s*["']?([^;\s"']+)/i.exec(type)?.[1] || "utf-8";
    let decoder;
    try { decoder = new TextDecoder(charset); } catch { decoder = new TextDecoder(); }
    const html = decoder.decode(bytes);
    return {html:/text\/plain/i.test(type) ? "<pre>" + html.replace(/&/g,"&amp;").replace(/</g,"&lt;") + "</pre>" : html};
  } catch (error) {
    if (error.name === "AbortError") throw new Error("The check timed out. Try again when the connection is better.");
    if (error instanceof TypeError) throw new Error("Could not reach the page. Check your connection or open the website.");
    throw error;
  } finally { clearTimeout(timer); }
}
export async function checkWatch(watch, {contains, parse, fetchImpl, now = Date.now(), timeoutMs} = {}) {
  if (!await contains({origins:[originPattern(watch.url)]})) return {status:"permission", reason:"Allow access to this website to check it.", evidence:""};
  try {
    const {html} = await fetchPage(watch.url, fetchImpl, timeoutMs);
    return classify(watch, await parse(html, watch), now);
  } catch (error) { return {status:"error", reason:error.message, evidence:""}; }
}

