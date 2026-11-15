const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.env.F);await pg.waitForTimeout(800);
const r=await pg.evaluate(()=>({a:cleanDesc('In this scene, raahul and Ritu enter the showroom and get caught by her father.'),b:cleanDesc('We see KETIKA cry. She leaves. He follows her. They talk for long. End.'),c:cleanDesc('x '.repeat(400)).length,d:cleanDesc(null),p:breakdownPrompt([{id:'s1',no:'1',heading:'1 INT. HOUSE - DAY',text:'A man sits.',loc:'HOUSE',ie:'INT',time:'DAY',artists:[],cues:[]}]).includes('ONE-LINE ORDER')}));
console.log(JSON.stringify(r));
assert.strictEqual(r.a,'Raahul and Ritu enter the showroom and get caught by her father.');
assert.strictEqual(r.b,'KETIKA cry. She leaves.');assert(r.c<=401);assert.strictEqual(r.d,'');assert(r.p);assert.deepStrictEqual(errs,[]);
console.log('PASS cleanDesc + prompt');await b.close()})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
