const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch();
 const vis=async(f,keys)=>{const pg=await (await b.newContext({viewport:{width:1300,height:900}})).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));await pg.goto('file://'+f);await pg.waitForTimeout(900);
  await pg.evaluate(()=>{P=sampleProject();openSettings()});await pg.waitForTimeout(300);
  const q=()=>pg.evaluate(()=>['#sProv','#sPool','#sSave','#sThorough'].map(s=>{const e=document.querySelector(s);return !!e&&e.offsetParent!==null}).join());
  const a=await q();let c=null;
  if(keys){await pg.keyboard.press('Control+Shift+K');await pg.evaluate(()=>{closeModal&&closeModal();openSettings()});await pg.waitForTimeout(300);c=await q()}
  const run=await pg.evaluate(()=>{noAI('x');return document.querySelector('.toast,#toast')?.textContent||''});
  return {a,c,errs,run}};
 const pub=await vis(process.env.P,true),own=await vis(process.env.O,false);
 console.log(JSON.stringify({pub,own}));
 assert.strictEqual(pub.a,'false,false,false,false');assert.strictEqual(pub.c,'true,true,true,true');assert.strictEqual(own.a,'true,true,true,true');assert.deepStrictEqual(pub.errs.concat(own.errs),[]);
 console.log('PASS public build hides AI keys');await b.close()})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
