/* Book reader: sounds play for open / cover / turn / close, the toggle mutes and is remembered, side decoration shows on wide screens only. */
const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch({args:['--autoplay-policy=no-user-gesture-required']});
 const run=async(w,h)=>{const pg=await (await b.newContext({viewport:{width:w,height:h}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
  await pg.goto('file://'+process.env.F);await pg.waitForTimeout(800);
  await pg.evaluate(()=>{P=sampleProject();window.__s=[];const o=window.bkSound;window.bkSound=k=>{window.__s.push(k);return o(k)}});
  await pg.evaluate(()=>bookOpen('pages'));await pg.waitForTimeout(500);
  await pg.evaluate(()=>bkTurn(1));await pg.waitForTimeout(1600);await pg.evaluate(()=>bkTurn(-1));await pg.waitForTimeout(1600);
  const r=await pg.evaluate(()=>({s:window.__s,deco:getComputedStyle(document.querySelector('.bk-deco')).display}));
  await pg.click('#bkSnd');const m=await pg.evaluate(()=>({on:BKS.on(),ls:localStorage.getItem('scriptdesk.bookSound')}));
  assert.deepStrictEqual(errs,[]);return {r,m}};
 const d=await run(1366,650);assert.deepStrictEqual(d.r.s,['open','cover','close']);assert.strictEqual(d.r.deco,'block');assert.deepStrictEqual(d.m,{on:false,ls:'0'});
 const p=await run(390,800);assert.strictEqual(p.r.deco,'none');assert.deepStrictEqual(p.r.s,['open','cover','close']);
 console.log('PASS book sound');await b.close()})().catch(e=>{console.error('FAIL',e.message);process.exit(1)});
