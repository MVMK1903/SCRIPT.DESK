const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.env.F);await pg.waitForTimeout(900);
const R={};
/* ---- renumber ---- */
const mk=()=>pg.evaluate(()=>{P=sampleProject();P.scenes=[];for(let i=1;i<=12;i++)P.scenes.push(newScene({no:String(i),ie:'INT',time:'DAY',loc:'PLACE '+i,heading:i+' INT. PLACE '+i+' - DAY',text:'x'}));P.xt={};VIEW.tins=true;page='slo';render(true)});
await mk();await pg.waitForTimeout(300);
const setNo=(from,to)=>pg.evaluate(([f,n])=>{const e=[...document.querySelectorAll('[data-f="no"]')].find(x=>x.innerText.trim()===f);e.focus();e.innerText=n;e.blur()},[from,to]);
await setNo('8','9');await pg.waitForTimeout(400);
R.nos=await pg.evaluate(()=>P.scenes.map(s=>s.no).join(','));console.log(JSON.stringify(R));
assert.strictEqual(R.nos,'1,2,3,4,5,6,7,9,10,11,12,13');
await setNo('13','8');await pg.waitForTimeout(400);
assert.strictEqual(await pg.evaluate(()=>P.scenes.map(s=>s.no).join(',')),'1,2,3,4,5,6,7,9,10,11,12,8');
/* ---- inserted row stays with its scene through renumbering and edits ---- */
await mk();await pg.waitForTimeout(300);
await pg.evaluate(()=>{const tr=[...document.querySelectorAll('tr[data-tk]')].find(r=>r.cells[0].innerText.replace('+','').trim()==='10');tr.querySelector('[data-tt="insrow"]').click()});await pg.waitForTimeout(300);
await setNo('8','9');await pg.waitForTimeout(400);
await pg.evaluate(()=>{const s=P.scenes.find(x=>x.loc==='PLACE 10');s.desc='changed description';render(true)});await pg.waitForTimeout(300);
const keep=await pg.evaluate(()=>{const rows=[...ttTables()[0].tBodies[0].rows];const i=rows.findIndex(r=>r.classList.contains('tt-custom'));return {prev:rows[i-1].cells[0].innerText.replace(/[+×]/g,'').trim().slice(0,3),loc:rows[i-1].innerText.includes('PLACE 10')}});
console.log(JSON.stringify(keep));assert.strictEqual(keep.prev,'11');assert(keep.loc,'row still sits after the scene that was 10');
/* old saved keys (row text) move to the scene id */
await mk();await pg.waitForTimeout(300);
const mig=await pg.evaluate(()=>{const tr=[...document.querySelectorAll('tr[data-tk]')][2];const q=(tr.dataset.q||'').trim().slice(0,90)+'#1';const sid=tr.querySelector('[data-s]').dataset.s;
 P.xt={slo:{cols:[],rows:{},hideR:{['0|'+q]:1},hideC:{},v:{}}};render(true);return {sid,hide:Object.keys(P.xt.slo.hideR)}});
console.log(JSON.stringify(mig));assert.deepStrictEqual(mig.hide,['0|s:'+mig.sid]);
/* ---- insert rows and columns in the middle ---- */
await pg.evaluate(()=>{P=sampleProject();P.scenes=[];for(let i=1;i<=12;i++)P.scenes.push(newScene({no:String(i),ie:'INT',time:'DAY',loc:'PLACE '+i,heading:i+' INT. PLACE '+i+' - DAY',text:'x'}));P.xt={};VIEW.tins=true;page='slo';render(true)});
await pg.waitForTimeout(400);
const info=await pg.evaluate(()=>{const t=ttTables()[0];return {n:ttTables().length,heads:[...t.tHead.rows[t.tHead.rows.length-1].cells].map(h=>h.dataset.th),ins:document.querySelectorAll('.ttins').length}});
R.info=info;console.log(JSON.stringify(info));assert(info.ins>10,'plus buttons shown');
await pg.evaluate(()=>{const tr=[...document.querySelectorAll('tr[data-tk]')].find(r=>r.cells[0].innerText.replace('+','').trim()==='10');tr.querySelector('[data-tt="insrow"]').click()});
await pg.waitForTimeout(300);
await pg.evaluate(()=>{window.askText=(a,b,cb)=>cb('Vendor');const th=[...ttTables()[0].tHead.rows[0].cells].find(h=>h.dataset.th===document.querySelector('th[data-th]:nth-child(2)').dataset.th);th.querySelector('[data-tt="inscol"]').click()});
await pg.waitForTimeout(300);
const res=await pg.evaluate(()=>{const t=ttTables()[0];const hs=[...t.tHead.rows[t.tHead.rows.length-1].cells].map(h=>h.dataset.th||h.textContent.replace(/[+×]/g,'').trim());
 const rows=[...t.tBodies[0].rows].map(r=>({c:r.classList.contains('tt-custom'),n:r.cells[0].innerText.replace(/[+×]/g,'').trim().slice(0,3),w:r.cells.length}));
 const ci=hs.indexOf('Vendor');const ri=rows.findIndex(r=>r.c);return {hs,ci,ri,prev:rows[ri-1]&&rows[ri-1].n,next:rows[ri+1]&&rows[ri+1].n,w:[...new Set(rows.map(r=>r.w))],after:P.xt.slo.rows[0][0].after,col:P.xt.slo.cols[0].after}});
console.log(JSON.stringify(res));
assert.strictEqual(res.prev,'10');assert.strictEqual(res.next,'11');assert.strictEqual(res.ci,2);assert.strictEqual(res.col,'h:'+res.hs[1]);assert.strictEqual(res.w.length,1);
/* export keeps the same order */
const ex=await pg.evaluate(()=>{const t=ttTables()[0];const heads=[...t.tHead.rows[t.tHead.rows.length-1].cells].filter(h=>!h.classList.contains('tt-cx')).map(h=>h.dataset.th);
 const dom=ttKeys(t);const exp={sheets:[{cols:heads.map(h=>({h,w:10})),rows:dom.map(([tr])=>[...tr.cells].filter(c=>!c.classList.contains('tt-cx')).map(c=>c.innerText.replace(/[+×]/g,'').trim()))}]};
 const o=ttExport(exp).sheets[0];return {cols:o.cols.map(c=>c.h),first:o.rows.map(r=>r[0]).join(','),vend:o.cols.findIndex(c=>c.h==='Vendor')}});
console.log(JSON.stringify(ex));
assert.deepStrictEqual(ex.cols,['Sc No','Location','Vendor','Effect / Time','Scene description','Artist & crowd']);assert.strictEqual(ex.vend,2);assert.strictEqual(ex.first,'1,2,3,4,5,6,7,8,9,10,,11,12');
assert.deepStrictEqual(errs,[]);console.log('PASS insert rows/columns and chained renumbering');await b.close()})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
