// Scene numbering: add between (2A or 3), delete, change a number; following scenes renumber. Run: NODE_PATH=$(npm root -g) node tests/scene_numbers.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const nos = () => P.scenes.map(s => s.no).join(',');
    const fresh = async n => { P = sampleProject(); P.scenes = []; for (let i = 1; i <= n; i++) P.scenes.push(newScene({ no: String(i), ie: 'INT', time: 'DAY', loc: 'PLACE ' + i, heading: i + ' INT. PLACE ' + i + ' - DAY', text: 'Action ' + i + '.' })); wrFromProject(); await wait(200); go('write'); await wait(500) };
    const menu = async (i, op) => { document.querySelectorAll('#wrScenes [data-wrsc]')[i].click(); await wait(60); document.querySelector('#wrScMenu [data-op="' + op + '"]').click(); await wait(200) };
    const pick = async m => { const bt = document.querySelector('[data-np="' + m + '"]'); out['label_' + m] = bt && bt.textContent; bt.click(); await wait(400) };
    const fill = async () => { const d = wrDoc(); const h = [...d.children].find(e => e.dataset.t === 'h' && /^INT\.\s*$/.test(e.textContent)); h.textContent = 'INT. NEW PLACE - DAY'; h.dispatchEvent(new Event('input', { bubbles: true })); h.nextElementSibling.textContent = 'New action.'; h.nextElementSibling.dispatchEvent(new Event('input', { bubbles: true })) };
    const sync = async () => { go('script'); await wait(500); const v = nos(); go('write'); await wait(500); return v };
    // 1. add between 2 and 3 as 2A: nothing else changes
    await fresh(5); await menu(1, 'add'); await pick('insert'); await fill(); out.addA = await sync(); out.addAlocs = P.scenes.map(s => s.loc.replace('PLACE ', '')).join(',');
    // 2. add between 2 and 3 as 3: following renumber
    await fresh(5); await menu(1, 'add'); await pick('renumber'); await fill(); out.add3 = await sync(); out.add3locs = P.scenes.map(s => s.loc.replace('PLACE ', '')).join(',');
    // 3. delete scene 3 of 5: following change
    await fresh(5); document.querySelectorAll('#wrScenes [data-wrsc]')[2].click(); await wait(60); document.querySelector('#wrScMenu [data-op="del"]').click(); await wait(60); document.querySelector('#wrScMenu [data-op="del"]').click(); await wait(400);
    out.del = await sync();
    // 4. change scene 3 to 2A: scene 4 becomes 3
    await fresh(5); wrSceneNo(4, '2A'); await wait(300); out.change = await sync();
    out.locs = P.scenes.map(s => s.loc).join(',');
    // 5. move scene 4 up above 3, renumber
    await fresh(5); await menu(3, 'up'); await pick('renumber'); out.moveUp = await sync(); out.moveLocs = P.scenes.map(s => s.loc.replace('PLACE ', '')).join(',');
    // 6. full script: delete scene 2 renumbers, add below as renumber
    await fresh(5); go('script'); await wait(400);
    P.scenes.splice(1, 1); chainNos(P.scenes, 0); out.fsDel = nos();
    document.querySelector('[data-addbelow]').click(); await wait(200); await pick('renumber'); out.fsAdd = nos();
    // 7. table edit: change 3 to 2A
    await fresh(5); go('slo'); await wait(500);
    const el = [...document.querySelectorAll('[data-f="no"]')].find(x => x.innerText.trim() === '3'); el.focus(); el.innerText = '2A'; el.blur(); await wait(400); out.table = nos();
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log('ERRORS', errs);
  const ok = r.addA === '1,2,2A,3,4,5' && r.addAlocs === '1,2,NEW PLACE,3,4,5' && r.add3 === '1,2,3,4,5,6' && r.add3locs === '1,2,NEW PLACE,3,4,5' && r.del === '1,2,3,4' && r.change === '1,2,2A,3,4' && r.moveUp === '1,2,3,4,5' && r.moveLocs === '1,2,4,3,5' && r.fsDel === '1,2,3,4' && r.fsAdd === '1,2,3,4,5' && r.table === '1,2,2A,3,4' && !errs.length;
  console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
