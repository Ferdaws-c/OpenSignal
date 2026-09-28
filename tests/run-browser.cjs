const assert=require("node:assert/strict");
const fs=require("node:fs");
const http=require("node:http");
const {chromium}=require(process.env.PLAYWRIGHT_MODULE || "playwright");
const path=require("node:path");const os=require("node:os");const source=path.resolve(__dirname,"..");const root=fs.mkdtempSync(path.join(os.tmpdir(),"opensignal-test-"));
const cases=[];let context;let server;let fixture="upcoming";let hits=0;let baseUrl;let page;let id;
async function step(name,run){await run();cases.push({name,passed:true});console.log("PASS",name);}
async function state(){return page.evaluate(()=>chrome.storage.local.get(["watches","settings","checking"]));}
async function send(type,extra={}){return page.evaluate(async({type,extra})=>{const reply=await chrome.runtime.sendMessage({target:"worker",type,...extra});if(!reply.ok)throw new Error(reply.error);return reply.data;},{type,extra});}
async function check(ids){await send("check",ids?{ids}:{});await page.waitForFunction(()=>!document.querySelector("#checkAll").disabled);}
(async()=>{
try{
 server=http.createServer((req,res)=>{
   hits++;res.setHeader("content-type","text/html; charset=utf-8");
   if(req.url==="/403"){res.writeHead(403);res.end("Forbidden");return;}
   if(req.url==="/404"){res.writeHead(404);res.end("Missing");return;}
   if(req.url==="/slow"){setTimeout(()=>res.end("Slow"),15000);return;}
   const texts={upcoming:"Registration is coming soon.",open:"Registration is open. Apply now.",closed:"Registration is closed.",unknown:"Speakers and agenda.",challenge:"Verify you are human. CAPTCHA verification."};
   res.end("<main><section id='current'><h1>Dummy hackathon 2026</h1><p>"+texts[fixture]+"</p></section></main>");
 });
 await new Promise(resolve=>server.listen(0,"127.0.0.1",resolve));
 baseUrl="http://127.0.0.1:"+server.address().port;
 const testExtension=root+"/test-extension";
 fs.cpSync(source,testExtension,{recursive:true});
 const manifest=JSON.parse(fs.readFileSync(testExtension+"/manifest.json","utf8").replace(/^\uFEFF/,""));
 // Only this isolated test copy receives loopback host access. Shipping manifest stays optional-only.
 manifest.host_permissions=["http://127.0.0.1/*"];
 fs.writeFileSync(testExtension+"/manifest.json",JSON.stringify(manifest,null,2));
 context=await chromium.launchPersistentContext(root+"/full-test-profile",{executablePath:process.env.CHROME_EXE || "C:/Program Files/Google/Chrome/Application/chrome.exe",headless:true,ignoreDefaultArgs:["--disable-extensions"],args:["--enable-unsafe-extension-debugging"],viewport:{width:440,height:850}});
 const cdp=await context.browser().newBrowserCDPSession();
 id=(await cdp.send("Extensions.loadUnpacked",{path:testExtension})).id;
 page=await context.newPage();
 const pageErrors=[];page.on("pageerror",error=>pageErrors.push(error.message));
 await page.goto("chrome-extension://"+id+"/popup.html");
 await page.waitForSelector("#empty:not([hidden])");
 await step("Production popup loads with an empty watch list",async()=>{assert.equal(await page.locator("#count").textContent(),"0");});
 await step("All 16 sample scenarios use real browser DOM parsing",async()=>{
   const results=await page.evaluate(async()=>{
     const {SCENARIOS,DEMO_NOW}=await import("./scenarios.js");
     const {extractHtml}=await import("./extract.js");const {classify}=await import("./core.js");
     return SCENARIOS.map(s=>({name:s.title,expected:s.expected,actual:classify(s.watch,extractHtml(s.html,s.watch),DEMO_NOW).status}));
   });
   for(const result of results){assert.equal(result.actual,result.expected,result.name);cases.push({name:"Demo: "+result.name,passed:true});}
 });
 await step("HTML scripts remain inert and hidden content is ignored",async()=>{
   const result=await page.evaluate(async()=>{
     const {extractHtml}=await import("./extract.js");
     const parsed=extractHtml("<script>window.openSignalInjected=true</script><p>Upcoming</p><div style='display:none'>Registration is open</div><img src='http://127.0.0.1:1/remote'>",{});
     return {text:parsed.text,injected:Boolean(window.openSignalInjected)};
   });assert.equal(result.injected,false);assert.equal(result.text,"Upcoming");
 });
 await step("Ambiguous repeated focus text asks for review",async()=>{
   const result=await page.evaluate(async()=>{const {extractHtml}=await import("./extract.js");return extractHtml("<section>Event title — old open</section><section>Event title — coming soon</section>",{focusText:"Event title"});});
   assert.match(result.error,/multiple/);
 });
 await step("Invalid selector returns a review explanation",async()=>{
   const result=await page.evaluate(async()=>{const {extractHtml}=await import("./extract.js");return extractHtml("<p>open</p>",{selector:"["});});
   assert.match(result.error,/invalid/);
 });
 await step("Popup save uses browser permissions, storage, fetch, worker and parser",async()=>{
   await page.locator("#add").click();await page.locator("#name").fill("Dummy hackathon");
   await page.locator("#url").fill(baseUrl+"/event");
   await page.locator("#openPhrases").fill("registration is open\napply now");
   await page.locator("#upcomingPhrases").fill("coming soon");await page.locator("#closedPhrases").fill("registration is closed");
   await page.locator("#saveWatch").click();await page.waitForSelector("#editor:not([open])",{state:"attached"});
   await page.waitForSelector(".status.upcoming");
   assert.equal((await state()).watches[0].status,"upcoming");
   assert.ok(hits>0);
 });
 const worker=context.serviceWorkers().find(w=>w.url().endsWith("/background.js"));
 assert.ok(worker,"Background worker started");
 await worker.evaluate(()=>{
   const native=chrome.notifications.create.bind(chrome.notifications);
   globalThis.notificationCalls=[];
   chrome.notifications.create=async(...args)=>{globalThis.notificationCalls.push(args);return native(...args);};
 });
 await step("Actual native Chrome notification API accepts a dummy alert",async()=>{
   const permission=await page.evaluate(()=>chrome.notifications.getPermissionLevel());
   assert.equal(permission,"granted");
   const reply=await send("testNotification");assert.equal(reply.sent,true);
 });
 await step("Upcoming → open triggers one native notification and toolbar badge",async()=>{
   fixture="open";await check();await page.waitForSelector(".status.open");
   const saved=await state();assert.equal(saved.watches[0].status,"open");assert.equal(saved.watches[0].alertedOpen,true);
   assert.equal(await page.evaluate(()=>chrome.action.getBadgeText({})),"1");
   assert.equal(await worker.evaluate(()=>notificationCalls.filter(c=>c[0].startsWith("open:")).length),1);
 });
 await page.screenshot({path:root+"/open-popup.png",fullPage:true});
 await step("Repeat open check does not repeat notification",async()=>{
   await check();assert.equal(await worker.evaluate(()=>notificationCalls.filter(c=>c[0].startsWith("open:")).length),1);
 });
 await step("Unclear response preserves alert memory and shows review",async()=>{
   fixture="unknown";await check();assert.equal((await state()).watches[0].status,"review");
   fixture="open";await check();assert.equal(await worker.evaluate(()=>notificationCalls.filter(c=>c[0].startsWith("open:")).length),1);
 });
 await step("Closed → reopened sends a new notification",async()=>{
   fixture="closed";await check();assert.equal((await state()).watches[0].alertedOpen,false);
   assert.equal(await page.evaluate(()=>chrome.action.getBadgeText({})),"");
   fixture="open";await check();assert.equal(await worker.evaluate(()=>notificationCalls.filter(c=>c[0].startsWith("open:")).length),2);
 });
 await step("Paused watch causes no network request",async()=>{
   const watchId=(await state()).watches[0].id;await send("toggle",{id:watchId});const before=hits;await check();assert.equal(hits,before);
   await send("toggle",{id:watchId});
 });
 await step("Simultaneous checks coalesce into one fetch",async()=>{
   const before=hits;await Promise.all([send("check"),send("check"),send("check")]);assert.equal(hits-before,1);
 });
 await step("Opening the popup automatically checks saved watches",async()=>{
   const before=hits;fixture="upcoming";await page.reload();await page.waitForSelector(".status.upcoming");assert.equal(hits-before,1);
 });
 await step("Notifications off still updates status and badge",async()=>{
   await page.locator(".settings summary").click();await page.locator("#notifications").uncheck();await page.waitForFunction(async()=>!(await chrome.storage.local.get("settings")).settings.notifications);
   const before=await worker.evaluate(()=>notificationCalls.length);fixture="open";await check();assert.equal((await state()).watches[0].status,"open");
   assert.equal(await worker.evaluate(()=>notificationCalls.length),before);
   await page.locator("#notifications").check();await page.waitForFunction(async()=>(await chrome.storage.local.get("settings")).settings.notifications);
 });
 await step("Unreachable and HTTP-blocked pages never become open",async()=>{
   for(const path of ["/403","/404"]){
     const watch=await send("save",{watch:{name:"Dummy "+path,url:baseUrl+path,openPhrases:["open"],upcomingPhrases:[],closedPhrases:[]}});
     await check([watch.id]);assert.equal((await state()).watches.find(w=>w.id===watch.id).status,"error");
     await send("delete",{id:watch.id});
   }
 });
 await step("Missing website permission displays Enable access without a request",async()=>{
   const watch=await send("save",{watch:{name:"Dummy denied site",url:"https://permission-denied.example/register",openPhrases:["open"]}});
   const before=hits;await check([watch.id]);assert.equal((await state()).watches.find(w=>w.id===watch.id).status,"permission");assert.equal(hits,before);
   await page.waitForSelector(".access:not([hidden])");await send("delete",{id:watch.id});
 });
 await step("Editing a watch persists revised rules",async()=>{
   await page.locator(".edit").click();await page.locator("#name").fill("Updated dummy event");await page.locator("#saveWatch").click();
   await page.waitForSelector("#editor:not([open])",{state:"attached"});await page.waitForFunction(()=>document.querySelector(".watch h3")?.textContent==="Updated dummy event");
   assert.equal((await state()).watches[0].name,"Updated dummy event");
 });
 await step("Untrusted watch name is rendered as text",async()=>{
   const watch=await send("save",{watch:{name:"<img src=x onerror=alert(1)>",url:baseUrl+"/event",openPhrases:["open"]}});
   await page.waitForFunction(()=>document.querySelectorAll(".watch").length===2);
   assert.equal(await page.locator(".watch img").count(),0);assert.ok((await page.locator("#watchList").textContent()).includes("<img"));
   await send("delete",{id:watch.id});
 });
 await step("Evidence and last-check history persist",async()=>{
   const saved=await state();assert.ok(saved.watches[0].checkedAt);assert.ok(saved.watches[0].history.length);assert.ok(saved.watches[0].evidence);
 });
 await step("Offscreen parser closes after each batch",async()=>{
   await check();assert.equal(await page.evaluate(async()=> (await chrome.runtime.getContexts({contextTypes:["OFFSCREEN_DOCUMENT"]})).length),0);
 });
 await step("Demo selector is interactive and shows an open alert preview",async()=>{
   await page.goto("chrome-extension://"+id+"/demo.html");
   await page.locator("#scenario").selectOption("open");assert.equal(await page.locator("#resultStatus").textContent(),"Open");
   assert.match(await page.locator("#resultAlert").textContent(),/notification/);
   await page.screenshot({path:root+"/demo-open.png",fullPage:true});
   await page.locator("#scenario").selectOption("mixed");assert.equal(await page.locator("#resultStatus").textContent(),"Upcoming");
 });
 await step("No unhandled browser script errors",async()=>assert.deepEqual(pageErrors,[]));
 await page.goto("chrome-extension://"+id+"/popup.html");await page.waitForSelector(".watch");
 await step("Deleting a watch removes storage and badge",async()=>{
   await page.locator(".remove").click();await page.waitForSelector("#empty:not([hidden])");assert.equal((await state()).watches.length,0);
   assert.equal(await page.evaluate(()=>chrome.action.getBadgeText({})),"");
 });
 console.log("Chrome browser scenarios passed:",cases.length);
 fs.writeFileSync(root+"/browser-test-results.json",JSON.stringify({passed:cases.length,failed:0,cases,chromeVersion:context.browser().version(),testManifest:"Production source in an isolated test copy; localhost host permission added for headless tests.",nativeNotificationApi:"Tested successfully; visible Windows banners require manual confirmation."},null,2));
}catch(error){console.error(error);cases.push({name:"Failure",passed:false,error:error.message});fs.writeFileSync(root+"/browser-test-results.json",JSON.stringify({cases},null,2));process.exitCode=1;}
finally{if(context)await context.close();if(server){server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}}
})();


