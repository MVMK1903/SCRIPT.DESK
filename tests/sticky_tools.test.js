const {chromium}=require('playwright');const F=process.env.F||process.cwd()+'/www/index.html';let bad=0;const ok=(c,m)=>{console.log((c?'PASS ':'FAIL ')+m);if(!c)bad++};
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:1366,height:800}});const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+F);await pg.waitForTimeout(600);await pg.evaluate(()=>{const g=document.getElementById('galock');if(g)g.remove()});
for(const page of ['script','write']){
 await pg.evaluate(async(page)=>{P=sampleProject();wrFromProject();go(page);await new Promise(r=>setTimeout(r,600));document.getElementById('content').scrollTop=1400;await new Promise(r=>setTimeout(r,300))},page);
 const r=await pg.evaluate(()=>{const t=document.querySelector('.wx-tools');const bt=t.querySelector('button[data-fsx="voice"],button[data-wrx="voice"]');const rc=bt.getBoundingClientRect();const el=document.elementFromPoint(rc.x+rc.width/2,rc.y+rc.height/2);return {bg:getComputedStyle(t).backgroundColor,top:t.getBoundingClientRect().top,hit:el===bt||bt.contains(el),who:el&&(el.className||el.tagName),btn:!!bt}});
 console.log(page,JSON.stringify(r));
 ok(r.btn,page+': Voices button present');ok(!/rgba\(.*,\s*0(\.\d+)?\)/.test(r.bg)&&r.bg!=='transparent',page+': strip solid '+r.bg);ok(r.hit,page+': strip clickable above pages');
 await pg.evaluate(()=>{(document.querySelector('.wx-tools button[data-fsx="voice"],.wx-tools button[data-wrx="voice"]')).click()});await pg.waitForTimeout(200);
 ok(await pg.evaluate(()=>!!document.querySelector('#ov [data-chengine]')),page+': voice panel opens');
 await pg.screenshot({path:'/tmp/st_'+page+'.png'});await pg.evaluate(()=>{const o=document.getElementById('ov');if(o)o.remove()});}
ok(errs.length===0,'no errors '+errs.join('|'));await b.close();process.exit(bad?1:0)})();
