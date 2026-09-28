const fs=require('node:fs');const path=require('node:path');const os=require('node:os');const http=require('node:http');const assert=require('node:assert/strict');const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const source=path.resolve(__dirname,'..');const root=fs.mkdtempSync(path.join(os.tmpdir(),'opensignal-startup-'));const profile=path.join(root,'profile');let ctx;let hits=0;let fixture='upcoming';const cases=[];
const server=http.createServer((req,res)=>{hits++;res.setHeader('content-type','text/html');res.end('<main><h1>Dummy startup event</h1><p>'+(fixture==='open'?'Registration is open. Apply now.':'Registration is coming soon.')+'</p></main>');});
const pause=ms=>new Promise(r=>setTimeout(r,ms));async function until(predicate,label,ms=8000){const end=Date.now()+ms;while(Date.now()<end){if(await predicate())return;await pause(50);}throw new Error(label);}
async function step(name,run){await run();cases.push({name,passed:true});console.log('PASS',name);}
const launch=()=>chromium.launchPersistentContext(profile,{executablePath:process.env.CHROME_EXE||'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,ignoreDefaultArgs:['--disable-extensions'],args:['--enable-unsafe-extension-debugging'],viewport:{width:440,height:1000}});
async function send(page,type,extra={}){return page.evaluate(async({type,extra})=>{const r=await chrome.runtime.sendMessage({target:'worker',type,...extra});if(!r.ok)throw new Error(r.error);return r.data;},{type,extra});}
(async()=>{try{
await new Promise(r=>server.listen(0,'127.0.0.1',r));const url='http://127.0.0.1:'+server.address().port+'/event';
const ext=path.join(root,'extension');fs.cpSync(source,ext,{recursive:true,filter:p=>path.basename(p)!=='.git'});const manifest=JSON.parse(fs.readFileSync(path.join(ext,'manifest.json'),'utf8').replace(/^\uFEFF/,''));manifest.host_permissions=['http://127.0.0.1/*'];fs.writeFileSync(path.join(ext,'manifest.json'),JSON.stringify(manifest));

ctx=await launch();const cdp=await ctx.browser().newBrowserCDPSession();
const {id}=await cdp.send('Extensions.loadUnpacked',{path:ext});
const installPage=await ctx.newPage();await installPage.goto('chrome://extensions');
// A normal Chrome reload converts its transient CDP fixture into a persistent
// unpacked install. All of this happens only in the newly generated profile.
await installPage.evaluate(()=>chrome.developerPrivate.updateProfileConfiguration({inDeveloperMode:true}));
await installPage.evaluate(id=>chrome.developerPrivate.reload(id,{failQuietly:true}),id);
await installPage.close();let page=await ctx.newPage();await page.goto('chrome-extension://'+id+'/popup.html');await page.waitForSelector('#empty:not([hidden])');
await step('Chrome-start checking is off by default',async()=>{assert.equal(await page.locator('#onStartup').isChecked(),false);assert.equal((await send(page,'get')).settings.onStartup,false);});
const watch=await send(page,'save',{watch:{name:'Dummy startup event',url,openPhrases:['registration is open'],upcomingPhrases:['coming soon'],closedPhrases:['registration is closed']}});
await step('Startup toggle saves without changing desktop alerts',async()=>{await page.locator('.settings summary').click();await page.locator('#onStartup').check();await until(async()=>(await send(page,'get')).settings.onStartup,'Toggle not saved');assert.equal((await send(page,'get')).settings.notifications,true);});
await step('Desktop alerts toggle preserves Chrome-start choice',async()=>{await page.locator('#notifications').uncheck();await until(async()=>!(await send(page,'get')).settings.notifications,'Alerts setting not saved');assert.equal((await send(page,'get')).settings.onStartup,true);await page.locator('#notifications').check();await until(async()=>(await send(page,'get')).settings.notifications,'Alerts setting not restored');});
await page.close();await ctx.close();ctx=null;
const before=hits;fixture='open';ctx=await launch();
await step('Real Chrome restart checks without opening the extension popup',async()=>{await until(()=>hits>before,'No startup request after real Chrome restart');assert.equal(ctx.pages().some(p=>p.url().startsWith('chrome-extension://')),false);});
let worker;await until(()=>{worker=ctx.serviceWorkers().find(w=>w.url().endsWith('/background.js'));return !!worker;},'Startup worker did not start');
await until(async()=>!(await worker.evaluate(()=>chrome.storage.local.get('checking'))).checking,'Startup check did not finish');
await step('Startup check saves open status, native alert state and badge',async()=>{const saved=await worker.evaluate(()=>chrome.storage.local.get('watches'));assert.equal(saved.watches[0].status,'open');assert.equal(saved.watches[0].alertedOpen,true);assert.equal(await worker.evaluate(()=>chrome.action.getBadgeText({})),'1');assert.equal(hits-before,1);});
page=await ctx.newPage();await page.goto('chrome-extension://'+id+'/demo.html');
await step('Startup check is one-shot with no ongoing polling',async()=>{const before=hits;await pause(1200);assert.equal(hits,before);});
await step('A new browser window does not run a startup check',async()=>{const before=hits;const tab=await worker.evaluate(()=>chrome.windows.create({url:'about:blank'}));await pause(500);assert.equal(hits,before);await worker.evaluate(id=>chrome.windows.remove(id),tab.id);});
await send(page,'settings',{settings:{onStartup:false}});await page.close();await ctx.close();ctx=null;const offAt=hits;ctx=await launch();await pause(1500);
await step('Disabling Chrome-start checking prevents requests after restart',async()=>assert.equal(hits,offAt));
page=await ctx.newPage();await page.goto('chrome-extension://'+id+'/demo.html');
await step('Saved watches and startup setting persist across restarts',async()=>{const saved=await send(page,'get');assert.equal(saved.settings.onStartup,false);assert.equal(saved.watches[0].id,watch.id);assert.equal(saved.watches[0].alertedOpen,true);});
console.log('STARTUP_RESULTS '+JSON.stringify({passed:cases.length,failed:0,cases,chromeVersion:ctx.browser().version(),testSetup:'Isolated Chrome profile with Developer mode enabled; CDP-loaded test copy reloaded through Chrome to persist; localhost host access.'}));
fs.writeFileSync(path.join(root,'startup-results.json'),JSON.stringify({passed:cases.length,failed:0,cases,chromeVersion:ctx.browser().version()},null,2));console.log('RESULT_FILE '+path.join(root,'startup-results.json'));
}catch(e){console.error(e.stack);console.log('TEST_ROOT '+root);process.exitCode=1;}finally{if(ctx)await ctx.close();server.closeAllConnections();await new Promise(r=>server.close(r));}})();
