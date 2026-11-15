const {chromium}=require('playwright'),assert=require('assert');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+process.env.F);await pg.waitForTimeout(800);
const T=`THE LAST FERRY\n\n1  EXT. CANAL - DAY\n\nNeighbours remind one another not to leave packing until the last minute.\n\nCreated using Celtx\n\nThe CHURCH FATHER walks towards the water.\n\nCONTINUED:\n\n(MORE)\n\nWritten in Final Draft 12\n\n2  INT. CHURCH - NIGHT\n\nPage 4 of 90\n\nMade with Fade In\nwww.celtx.com\nFADE IN:\nHe wrote it in Pages and was happy.\nCreated with WriterDuet\n`;
const r=await pg.evaluate(t=>{const d=detectScenes(t);return {n:d.scenes.length,rm:d.removed,txt:d.scenes.map(s=>s.text).join('\n')}},T);
console.log(JSON.stringify(r));
assert.strictEqual(r.n,2);assert.strictEqual(r.rm,8);
assert(!/celtx|final draft|fade in\b(?!:)|writerduet|CONTINUED|\(MORE\)|Page 4/i.test(r.txt.replace(/FADE IN:/g,'')));
assert(/FADE IN:/.test(r.txt)&&/in Pages and was happy/.test(r.txt)&&/CHURCH FATHER walks/.test(r.txt));
assert.deepStrictEqual(errs,[]);console.log('PASS app marks removed, story text kept');await b.close()})().catch(e=>{console.error('FAIL',e.message);process.exit(1)})
