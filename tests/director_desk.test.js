const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext({viewport:{width:1400,height:900}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.env.F);await pg.waitForTimeout(900);
const W=ms=>pg.waitForTimeout(ms||250);
await pg.evaluate(()=>{P=sampleProject();window.askText=(a,b,cb)=>cb('Underwater');page='dirdesk';VIEW.dopen=P.scenes[0].id;render(true)});await W(400);
/* scene card field */
await pg.evaluate(()=>{const e=document.querySelector('[data-ddf="purpose"]');e.focus();e.innerText='Sets up the missing boy';e.blur()});await W();
/* note in the Camera layer */
await pg.evaluate(()=>{const f=document.querySelector('form[data-ddadd]');f.querySelector('select').value='cam';f.querySelector('input').value='Slow push in on the chain';f.requestSubmit()});await W(400);
/* tag, new tag */
await pg.evaluate(()=>document.querySelector('[data-dd="tag"][data-t="Rain"]').click());await W();
await pg.evaluate(()=>document.querySelector('[data-dd="newtag"]').click());await W();
const a=await pg.evaluate(()=>{const D=P.dir,s=P.scenes[0];return {purpose:D.cards[s.id].purpose,notes:D.notes.map(n=>n.layer+':'+n.text),tags:D.tags[s.id],shown:document.querySelectorAll('.dd-ed .dd-n').length}});
console.log(JSON.stringify(a));
assert.strictEqual(a.purpose,'Sets up the missing boy');assert.deepStrictEqual(a.notes,['cam:Slow push in on the chain']);assert.deepStrictEqual(a.tags,['Rain','Underwater']);assert.strictEqual(a.shown,1);
/* switch the Camera layer off: the note hides, nothing is lost */
await pg.evaluate(()=>document.querySelector('[data-dd="layer"][data-l="cam"]').click());await W();
assert.strictEqual(await pg.evaluate(()=>document.querySelectorAll('.dd-ed .dd-n').length),0);assert.strictEqual(await pg.evaluate(()=>P.dir.notes.length),1);
await pg.evaluate(()=>document.querySelector('[data-dd="layer"][data-l="cam"]').click());await W();
/* suggestions from the breakdown only add */
await pg.evaluate(()=>{P.scenes[1].sfx=['Rain machine'];P.scenes[1].juniors=['Passengers (20)'];P.scenes[2].fight={d:'x'};VIEW.dtab='tags';render(true)});await W();
await pg.evaluate(()=>document.querySelector('[data-dd="suggest"]').click());await W(400);
const t=await pg.evaluate(()=>({s1:P.dir.tags[P.scenes[1].id],s2:P.dir.tags[P.scenes[2].id],s0:P.dir.tags[P.scenes[0].id],rows:document.querySelectorAll('#content table tbody tr').length,exp:R.dirdesk().exp.sheets[0].rows.find(r=>r[0]==='Rain')}));
console.log(JSON.stringify(t));
assert(t.s1.includes('Rain')&&t.s1.includes('Crowd'));assert(t.s2.includes('Fight / stunt'));assert(t.s0.includes('Underwater'));assert(t.rows>=3);assert.strictEqual(t.exp[1],2);
/* time estimate: your own hours replace the estimate, clearing brings it back */
await pg.evaluate(()=>{VIEW.dtab='time';render(true)});await W();
const est=await pg.evaluate(()=>ddEst(P.scenes[0]).est);
await pg.evaluate(()=>{const e=document.querySelector('[data-ddh]');e.focus();e.innerText='3';e.blur()});await W(400);
assert.strictEqual(await pg.evaluate(()=>ddEst(P.scenes[0]).h),3);
await pg.evaluate(()=>{const e=document.querySelector('[data-ddh]');e.focus();e.innerText='';e.blur()});await W(400);
assert.strictEqual(await pg.evaluate(()=>ddEst(P.scenes[0]).h),est);
const fight=await pg.evaluate(()=>{const s=P.scenes[2],a=ddEst(s).est;const f=s.fight;s.fight=null;const b=ddEst(s).est;s.fight=f;return [a,b]});assert(fight[0]>fight[1],'a fight scene takes longer');
/* notes stay with the scene when its text is revised (same id), and survive a save/load round trip */
const keep=await pg.evaluate(()=>{const s=P.scenes[0];s.text+='\nA new line in the next draft.';const q=upgrade(JSON.parse(JSON.stringify(P)));return {n:q.dir.notes.filter(n=>n.sid===s.id).length,c:q.dir.cards[s.id].purpose}});
assert.strictEqual(keep.n,1);assert.strictEqual(keep.c,'Sets up the missing boy');
/* ---- Day readiness ---- */
await pg.evaluate(()=>{const S=SCH();S.start='2027-01-11';S.days=[newDay({items:P.scenes.slice(0,3).map(s=>({sid:s.id}))}),newDay({items:P.scenes.slice(3,5).map(s=>({sid:s.id}))})];P.scenes[0].props=['Padlock','Radio'];VIEW.ropen=undefined;page='ready';render(true)});await W(400);
const r0=await pg.evaluate(()=>({days:document.querySelectorAll('.rd-day').length,open:document.querySelectorAll('.rd-day.open').length,boxes:document.querySelectorAll('.rd-day.open input[type=checkbox]').length,left:document.querySelector('.rd-day.open em').textContent}));
console.log(JSON.stringify(r0));assert.strictEqual(r0.days,2);assert.strictEqual(r0.open,1);assert(r0.boxes>3);assert(/left/.test(r0.left));
await pg.evaluate(()=>{const c=document.querySelector('.rd-day.open input[data-rd="cast"]');c.click()});await W();
await pg.evaluate(()=>document.querySelector('.rd-day.open [data-dd="rdall"][data-g="prop"]').click());await W();
const r1=await pg.evaluate(()=>{const X=P.ready;return {g:Object.keys(X.g).length,d:Object.values(X.d).reduce((a,o)=>a+Object.keys(o).length,0),exp:R.ready().exp.sheets[0].rows.filter(r=>r[4]==='Yes').length}});
console.log(JSON.stringify(r1));assert(r1.g>=2,'props are ticked for every day');assert.strictEqual(r1.d,1);assert(r1.exp>=3);
await pg.evaluate(()=>{const d=rdDays()[0];RD_GROUPS.forEach(([g,,gl])=>rdNeeds(d).items[g].forEach(it=>{const k=rdKey(g,it);if(gl)RD().g[k]=1;else(RD().d[d.id]=RD().d[d.id]||{})[k]=1}));render(true)});await W();
assert.strictEqual(await pg.evaluate(()=>document.querySelector('.rd-day em').textContent),'Ready');
/* ---- Casting ---- */
await pg.evaluate(()=>{page='casting';render(true)});await W(300);
await pg.evaluate(()=>{const s=document.querySelector('[data-css]');s.value='Locked';s.dispatchEvent(new Event('change',{bubbles:true}))});await W();
await pg.evaluate(()=>{const e=document.querySelector('[data-csf="actor"]');e.focus();e.innerText='Ravi Teja';e.blur();const d=document.querySelector('[data-csd="aud"]');d.value='2027-01-05';d.dispatchEvent(new Event('change',{bubbles:true}))});await W();
const c=await pg.evaluate(()=>{const id=document.querySelector('[data-css]').dataset.css;const x=R.casting().exp;return {st:P.casting[id].status,actor:A(id).actor,aud:P.casting[id].aud,locked:document.querySelector('.dd-sum b').textContent,crowd:x.sheets[1].rows.map(r=>r[0]+':'+r[4]),cnt:[csCount('Villagers (30)'),csCount('12 students'),csCount('Crowd')]}});
console.log(JSON.stringify(c));
assert.strictEqual(c.st,'Locked');assert.strictEqual(c.actor,'Ravi Teja');assert.strictEqual(c.aud,'2027-01-05');assert(/^1 of/.test(c.locked));assert(c.crowd.includes('Day 1:20'));assert.deepStrictEqual(c.cnt,[30,12,0]);
/* pages are in the menu and nothing threw */
assert.strictEqual(await pg.evaluate(()=>['dirdesk','ready','artists'].every(id=>!!document.querySelector('.nav [data-page="'+id+'"]'))),true);
assert.deepStrictEqual(errs,[]);console.log("PASS director's desk, day readiness, casting");await b.close()})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
