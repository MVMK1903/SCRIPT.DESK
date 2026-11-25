// Scene tools in the writer (add, copy, move, delete) and the full script following. Run: NODE_PATH=$(npm root -g) node tests/scene_tools.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const nos = () => P.scenes.map(s => s.no).join(',');
    const locs = () => P.scenes.map(s => s.loc);
    P = sampleProject(); const n0 = P.scenes.length; out.start = nos();
    wrFromProject(); await wait(400); go('write'); await wait(600);
    out.rows = document.querySelectorAll('#wrScenes .wr-scr').length;
    // add a scene below scene 2 from the menu
    document.querySelectorAll('#wrScenes [data-wrsc]')[1].click(); await wait(80);
    out.menu = [...document.querySelectorAll('#wrScMenu [data-op]')].map(x => x.dataset.op).join(',');
    document.querySelector('#wrScMenu [data-op="add"]').click(); await wait(500);
    const d = wrDoc(); const hs = [...d.children].filter(e => e.dataset.t === 'h');
    out.afterAddHeads = hs.length; out.newHeading = hs[2].textContent;
    hs[2].textContent = 'INT. LIGHTHOUSE - NIGHT'; hs[2].dispatchEvent(new Event('input', { bubbles: true }));
    const nextBlk = hs[2].nextElementSibling; nextBlk.textContent = 'Wind howls around the lamp room.'; nextBlk.dispatchEvent(new Event('input', { bubbles: true }));
    // leaving Write brings the full script up to date by itself
    go('script'); await wait(600);
    out.scenesAfterAdd = nos(); out.hasLighthouse = locs().includes('LIGHTHOUSE'); out.count = P.scenes.length;
    out.scriptShows = document.querySelector('.scr').textContent.includes('Wind howls');
    // delete a scene in the writer
    go('write'); await wait(600);
    const victim = P.scenes[3].loc;
    document.querySelectorAll('#wrScenes [data-wrsc]')[3].click(); await wait(60);
    const del = document.querySelector('#wrScMenu [data-op="del"]'); del.click(); await wait(30); document.querySelector('#wrScMenu [data-op="del"]').click(); await wait(500);
    go('script'); await wait(600);
    out.afterDel = P.scenes.length; out.victimGone = !locs().includes(victim);
    out.scriptNoVictim = !document.querySelector('.scr').textContent.includes('\n' + victim + '\n');
    // move a scene up
    go('write'); await wait(600);
    const before = locs();
    document.querySelectorAll('#wrScenes [data-wrsc]')[2].click(); await wait(60); document.querySelector('#wrScMenu [data-op="up"]').click(); await wait(500);
    go('script'); await wait(600); const after = locs(); out.moved = after[1] === before[2] && after[2] === before[1];
    // full script: add a scene below and delete one; the writer follows
    document.querySelector('[data-addbelow]').click(); await wait(300);
    out.editing = !!document.querySelector('.scr textarea');
    const ta = document.querySelector('.scr textarea'); ta.value = 'SCENE NO 1A INT BOAT HOUSE - DAY\n\nNina ties a rope.'; document.querySelector('[data-save]').click(); await wait(500);
    out.boatInScenes = locs().includes('BOAT HOUSE');
    go('write'); await wait(600);
    out.dbg = [page, !!wrDoc(), draftReal(), draft().els.length, P.scenes.length, document.getElementById('content').textContent.slice(0,120)];
    out.writerHasBoat = !!wrDoc() && wrDoc().textContent.includes('Nina ties a rope');
    // undo restores
    out.ok = true; return out;
  });
  console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log('ERRORS', errs);
  const ok = r.rows >= 6 && /add,dup,up,down,del/.test(r.menu) && r.afterAddHeads === r.rows + 1 && r.hasLighthouse && r.scriptShows && r.afterDel === r.count - 1 && r.victimGone && r.moved && r.editing && r.boatInScenes && r.writerHasBoat && !errs.length;
  console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
