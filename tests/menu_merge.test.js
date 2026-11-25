const {chromium}=require('playwright');const F=process.env.F||process.cwd()+'/www/index.html';let bad=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)bad++};
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1366,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+F);await pg.waitForTimeout(600);
const r=await pg.evaluate(async()=>{const g=document.getElementById('galock');if(g)g.remove();P=sampleProject();wrFromProject();const w=ms=>new Promise(r=>setTimeout(r,ms));const o={};
 go('home');await w(300);const nav=[...document.querySelectorAll('#nav button[data-page]')].map(b=>b.dataset.page);o.nav=nav;o.count=nav.length;
 const tabs={};for(const id of ['locations','locScenes','sloLoc','artists','artScenes','sloArt','casting','characters','profiles']){go(id);await w(350);tabs[id]={tabs:[...document.querySelectorAll('#content .mtabs button')].map(b=>b.textContent).join('|'),on:(document.querySelector('#content .mtabs .on')||{}).dataset&&document.querySelector('#content .mtabs .on').dataset.mtab,head:(document.querySelector('#content h1')||{}).textContent,cur:(document.querySelector('#nav button[aria-current=page]')||{}).textContent}}
 o.tabs=tabs;go('locations');await w(300);document.querySelector('[data-mtab=sloLoc]').click();await w(400);o.afterClick=page;
 go('scenic');await w(300);o.noTabs=!document.querySelector('#content .mtabs');return o});
console.log(JSON.stringify(r.nav),r.count);console.log(JSON.stringify(r.tabs,null,0));
for(const id of ['locations','artists','characters'])ok(r.nav.includes(id),'menu has '+id);
for(const id of ['locScenes','sloLoc','artScenes','sloArt','casting','profiles'])ok(!r.nav.includes(id),'menu no longer lists '+id);
ok(r.tabs.locations.tabs==='Count|Scenes|Single line order'&&r.tabs.sloLoc.on==='sloLoc','locations tabs');
ok(r.tabs.artists.tabs==='Count|Scenes|Single line order|Casting'&&r.tabs.casting.on==='casting','artists tabs');
ok(r.tabs.profiles.tabs==='Stats|Profiles'&&/Characters/.test(r.tabs.profiles.cur),'characters tabs, menu stays on Characters');
ok(/Locations/.test(r.tabs.sloLoc.cur)&&/Artists/.test(r.tabs.sloArt.cur),'menu highlights the merged item');
ok(r.afterClick==='sloLoc','tab click navigates');ok(r.noTabs,'other pages have no tabs');ok(errs.length===0,'no errors '+errs);await b.close();process.exit(bad?1:0)})();
