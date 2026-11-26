const {chromium}=require('playwright');const F=process.env.F||process.cwd()+'/www/index.html';let bad=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)bad++};
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1366,height:900}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+F);await pg.waitForTimeout(600);
const r=await pg.evaluate(async()=>{const g=document.getElementById('galock');if(g)g.remove();P=sampleProject();wrFromProject();const w=ms=>new Promise(r=>setTimeout(r,ms));const o={};
 go('home');await w(300);o.nav=[...document.querySelectorAll('#nav button[data-sec]')].map(b=>b.textContent);
 // every page is reachable from some tab (or Translate)
 o.orphans=PAGES.filter(p=>!(p.hide&&p.hide())&&!sectionOf(p.id)).map(p=>p.id);
 o.tabs={};for(const m of SECTIONS){go(m.tabs[0][0]);await w(250);o.tabs[m.id]=[...document.querySelectorAll('#stabs .mtabs button')].map(b=>b.textContent).length;}
 // clicking each tab opens that page
 go('plan'.length&&'shots');await w(300);const t=document.querySelector('#stabs [data-mtab=stripboard]');t.click();await w(400);o.afterTab=page;
 // remembered tab
 go('home');await w(300);document.querySelector('#nav button[data-sec=plan]').click();await w(400);o.remembered=page;
 document.querySelector('#nav button[data-sec=slo]').click();await w(400);o.sloFirst=page;
 go('sloArt');await w(300);go('home');await w(200);document.querySelector('#nav button[data-sec=slo]').click();await w(400);o.sloRem=page;
 go('budget');await w(300);o.budgetStrip=!document.querySelector('#stabs .mtabs');
 go('script');await w(500);o.cur=document.querySelector('#nav button[aria-current=page]').textContent;
 const tb=document.querySelector('.fs-tools [data-fsx=translate]');o.translateBtn=!!tb;tb.click();await w(400);o.translatePage=page;o.translateSec=document.querySelector('#nav button[aria-current=page]').textContent;
 // go to
 document.dispatchEvent(new KeyboardEvent('keydown',{key:'k',ctrlKey:true,bubbles:true}));await w(200);const q=document.getElementById('gtQ');o.gotoOpen=!!q;q.value='strip';q.dispatchEvent(new Event('input'));await w(100);o.gotoFirst=(document.querySelector('#gtL [data-gt]')||{}).dataset&&document.querySelector('#gtL [data-gt]').dataset.gt;
 q.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true}));await w(400);o.gotoPage=page;return o});
console.log(JSON.stringify(r));
ok(r.nav.length===10,'10 menu items: '+r.nav.length);ok(r.orphans.length===0||(r.orphans.length===1&&r.orphans[0]==='translate'),'no page lost: '+r.orphans);
ok(r.tabs.write===4||r.tabs.write===3,'write tabs '+r.tabs.write);ok(r.tabs.plan===6&&r.tabs.slo===5&&r.tabs.cast===5,'tab counts plan/slo/cast');ok(r.budgetStrip,'single-tab section has no strip');
ok(r.afterTab==='stripboard','tab click opens page');ok(r.remembered==='stripboard','menu returns to last tab');ok(r.sloFirst==='slo','new section opens first tab');ok(r.sloRem==='sloArt','remembers by section');
ok(r.translateBtn&&r.translatePage==='translate'&&/Write/.test(r.translateSec),'Translate button in Full script, menu stays on Write');
ok(r.gotoOpen&&r.gotoFirst==='stripboard'&&r.gotoPage==='stripboard','Go to (Ctrl+K) finds stripboard');ok(errs.length===0,'no errors '+errs);await b.close();process.exit(bad?1:0)})();
