import test from "node:test";
import assert from "node:assert/strict";
import {normalize, phrases, safeUrl, validateWatch, originPattern, turkishWindow, classify, nextState} from "../core.js";
import {fetchPage, checkWatch} from "../checker.js";
const watch = {name:"Dummy event", url:"https://example.test/register", openPhrases:["registration is open","apply now"], upcomingPhrases:["coming soon","not yet open"], closedPhrases:["registration is closed","sold out"], requiredPhrases:["2026"]};
const extracted = text => ({text, fullText:"Dummy event 2026\n" + text, actions:[]});
test("Turkish Unicode, punctuation, and whitespace normalize", () => assert.equal(normalize("  2026 – 2027  BAŞVURULARI "), "2026-2027 basvurulari"));
test("Phrases are deduplicated and empty rows removed", () => assert.deepEqual(phrases("open\n\nopen\nclosed"), ["open","closed"]));
for (const url of ["javascript:alert(1)","data:text/html,x","file:///secret","https://user:password@example.test/"]) test("Unsafe address rejected: " + url.split(":")[0], () => assert.throws(() => safeUrl(url)));
test("Normal URL has its fragment removed", () => assert.equal(safeUrl("https://example.test/a#b"), "https://example.test/a"));
test("Host permissions are limited to one origin", () => assert.equal(originPattern("https://example.test/a"), "https://example.test/*"));
test("Missing name rejected", () => assert.throws(() => validateWatch({...watch,name:""})));
test("Empty open phrases rejected", () => assert.throws(() => validateWatch({...watch,openPhrases:[]})));
test("Invalid watch IDs are not trusted", () => assert.equal(validateWatch({...watch,id:"../../invalid"}).id, null));
const scenarios=[
 ["upcoming","Coming soon. Registration is not yet open.","upcoming"],
 ["open","Registration is open. Apply now.","open"],
 ["closed","Registration is closed.","closed"],
 ["sold out overrides open CTA","Apply now. Tickets are sold out.","closed"],
 ["negated registration","Registration is not open.","closed"],
 ["negated applications","Applications aren't open.","closed"],
 ["explicit closed","Applications are closed.","closed"],
 ["unclear agenda","Agenda and speakers.","review"],
 ["challenge","Verify you are human.","review"],
 ["Cloudflare","Just a moment. Checking your browser.","review"],
 ["empty","", "review"]
];
for(const [name,text,status] of scenarios) test("Classification: " + name, () => assert.equal(classify(watch,extracted(text)).status,status));
test("Wrong year is not treated as open", () => assert.equal(classify(watch,{text:"Registration is open 2025", fullText:"2025"}).status,"review"));
test("Missing focus or selector is not treated as closed or open", () => assert.equal(classify(watch,{error:"Focus section missing",text:"",fullText:"2026 registration is open"}).status,"review"));
test("Button requirement excludes instructions", () => assert.equal(classify({...watch,actionText:"Begin Entry"},extracted("Registration is open. Begin Entry.")).status,"review"));
test("Active matching button permits alert", () => assert.equal(classify({...watch,actionText:"Begin Entry"},{...extracted("Registration is open."),actions:["Begin Entry"]}).status,"open"));
const range="20 Eylül 2026 Saat 10.00 20 Ekim 2026 Saat 23.59";
const dateWatch={...watch,dateMode:"turkish",requiredPhrases:[]};
test("Turkish date parsing uses Türkiye UTC+3", () => assert.equal(turkishWindow(range).start, Date.parse("2026-09-20T10:00:00+03:00")));
test("Invalid calendar date rejected", () => assert.equal(turkishWindow("31 Şubat 2026 20 Mart 2026"),null));
test("Reversed date range rejected", () => assert.equal(turkishWindow("20 Ekim 2026 20 Eylül 2026"),null));
test("A single date is not a window", () => assert.equal(turkishWindow("20 Ekim 2026"),null));
for(const [label,now,status] of [
 ["before start","2026-09-20T09:59:59+03:00","upcoming"],
 ["exact start","2026-09-20T10:00:00+03:00","open"],
 ["inside window","2026-09-28T12:00:00+03:00","open"],
 ["last second","2026-10-20T23:59:59+03:00","open"],
 ["after close","2026-10-21T00:00:00+03:00","closed"]
]) test("Date window: "+label, () => assert.equal(classify(dateWatch,{text:range,fullText:range},Date.parse(now)).status,status));
test("Future date overrides open instruction", () => assert.equal(classify(dateWatch,{text:range+" Apply now",fullText:range},Date.parse("2026-09-10")).status,"upcoming"));
test("Invalid date plus open phrase needs review", () => assert.equal(classify(dateWatch,{text:"31 Şubat 2026 20 Mart 2026 Apply now",fullText:""}).status,"review"));
test("First open state sends a notification", () => assert.equal(nextState({}, {status:"open"},1,true).shouldNotify,true));
test("Repeat open state does not send a duplicate", () => assert.equal(nextState({alertedOpen:true},{status:"open"},1,true).shouldNotify,false));
for(const status of ["review","error","permission"]) test("Uncertain state preserves notification deduplication: "+status, () => {
 const transition=nextState({alertedOpen:true},{status},1,true);
 assert.equal(transition.next.alertedOpen,true);assert.equal(transition.shouldNotify,false);
});
for(const status of ["closed","upcoming"]) test("Known not-open status re-arms a future alert: "+status, () => assert.equal(nextState({alertedOpen:true},{status},1,true).next.alertedOpen,false));
test("Notifications off suppress alert", () => assert.equal(nextState({}, {status:"open"},1,false).shouldNotify,false));
test("Permission refusal does not request page", async () => {
 let called=false; const result=await checkWatch(watch,{contains:async()=>false,fetchImpl:()=>{called=true;}});
 assert.equal(result.status,"permission");assert.equal(called,false);
});
test("Fetch uses no cookies and no cache", async () => {
 await fetchPage(watch.url,async(url,options)=>{assert.equal(options.credentials,"omit");assert.equal(options.cache,"no-store");return new Response("<p>ok</p>",{headers:{"content-type":"text/html"}});});
});
for(const code of [403,404,500]) test("HTTP "+code+" is a failed check, never a closed registration", async () => {
 const result=await checkWatch(watch,{contains:async()=>true,fetchImpl:async()=>new Response("error",{status:code})});
 assert.equal(result.status,"error");assert.match(result.reason,new RegExp(String(code)));
});
test("Offline fetch produces an error, not open", async () => {
 const result=await checkWatch(watch,{contains:async()=>true,fetchImpl:async()=>{throw new TypeError("offline");}});
 assert.equal(result.status,"error");assert.match(result.reason,/connection/);
});
test("A hung request times out", async () => {
 const result=await checkWatch(watch,{contains:async()=>true,timeoutMs:8,fetchImpl:(_,options)=>new Promise((_,reject)=>options.signal.addEventListener("abort",()=>reject(new DOMException("aborted","AbortError"))))});
 assert.equal(result.status,"error");assert.match(result.reason,/timed out/);
});
test("Unsupported PDF response rejected", async () => assert.rejects(()=>fetchPage(watch.url,async()=>new Response("pdf",{headers:{"content-type":"application/pdf"}})),/readable/));
test("Oversize content rejected before parsing", async () => assert.rejects(()=>fetchPage(watch.url,async()=>new Response("large",{headers:{"content-length":"3000000"}})),/too large/));
test("Streamed oversize content rejected", async () => assert.rejects(()=>fetchPage(watch.url,async()=>new Response(new Uint8Array(2000001))),/too large/));
test("Cross-site redirect is not classified", async () => {
 const response=new Response("<p>Registration is open</p>"); Object.defineProperty(response,"url",{value:"https://other.test/register"});
 await assert.rejects(()=>fetchPage(watch.url,async()=>response),/another site/);
});
test("Plain text markup is escaped", async () => {
 const {html}=await fetchPage(watch.url,async()=>new Response("<script>text</script>",{headers:{"content-type":"text/plain"}}));
 assert.match(html,/&lt;script>/);
});
test("End-to-end checker hands fetched content to parser", async () => {
 let parsed=false;
 const result=await checkWatch(watch,{contains:async()=>true,fetchImpl:async()=>new Response("Registration is open 2026",{headers:{"content-type":"text/html"}}),parse:async(html)=>{parsed=true;return {text:html,fullText:html};}});
 assert.equal(result.status,"open");assert.equal(parsed,true);
});


