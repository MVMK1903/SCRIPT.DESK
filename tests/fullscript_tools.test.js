// Full script has the scene list and writing tools like the writer. Run: NODE_PATH=$(npm root -g) node tests/fullscript_tools.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    const nos = () => P.scenes.map(s => s.no).join(',');
    const fresh = async () => { P = sampleProject(); P.scenes = []; for (let i = 1; i <= 5; i++) P.scenes.push(newScene({ no: String(i), ie: 'INT', time: 'DAY', loc: 'PLACE ' + i, heading: i + ' INT. PLACE ' + i + ' - DAY', text: 'Action ' + i + '.' })); wrFromProject(); await wait(200); go('script'); await wait(500) };
    const menu = async (i, op) => { document.querySelectorAll('.fs-side [data-fsm]')[i].click(); await wait(60); document.querySelector('#wrScMenu [data-op="' + op + '"]').click(); await wait(250) };
    await fresh();
    out.tools = [...document.querySelectorAll('.fs-tools [data-fsx]')].map(x => x.dataset.fsx).join(',');
    out.rows = document.querySelectorAll('.fs-side [data-fsgo]').length;
    out.hasAddEnd = !!document.querySelector('.fs-side .wr-scadd');
    // jump
    document.querySelector('[data-fsgo]:not([aria-current="true"])').click(); await wait(300);
    // add below scene 2, as 3
    await menu(1, 'add'); document.querySelector('[data-np="renumber"]').click(); await wait(300); out.afterAdd = nos();
    // cancel the edit textarea by saving a heading
    const ta = document.querySelector('.scr textarea'); ta.blur(); ta.value = 'SCENE NO 3 INT NEW PLACE - DAY\n\nSomething happens.'; document.querySelector('[data-save]').click(); await wait(400);
    // copy scene 1 as 1A
    await menu(0, 'dup'); document.querySelector('[data-np="insert"]').click(); await wait(300); out.afterCopy = nos();
    // move last scene up, renumber
    const n = P.scenes.length; await menu(n - 1 + 0, 'up'); document.querySelector('[data-np="renumber"]').click(); await wait(300); out.afterMove = nos();
    // omit then restore
    await fresh();
    const sc3 = P.scenes[2].loc; await menu(2, 'omit'); out.omitted = !P.scenes.some(s => s.loc === sc3); out.omRow = document.querySelectorAll('.fs-side .fs-om').length;
    document.querySelector('.fs-om [data-fsm]').click(); await wait(60); document.querySelector('#wrScMenu [data-op="restore"]').click(); await wait(400);
    out.restored = P.scenes.some(s => s.loc === sc3); out.afterRestore = nos();
    // change number 3 -> 2A, scene 4 becomes 3
    await fresh(); await menu(2, 'no'); const inp = document.getElementById('npNo'); inp.value = '2A'; document.getElementById('npGo').click(); await wait(400); out.afterNo = nos();
    // delete scene 2: following renumber
    await fresh(); document.querySelectorAll('.fs-side [data-fsm]')[1].click(); await wait(60); document.querySelector('#wrScMenu [data-op="del"]').click(); await wait(30); document.querySelector('#wrScMenu [data-op="del"]').click(); await wait(400); out.afterDel = nos();
    // the writer shows the same scenes
    go('write'); await wait(600); out.writerScenes = [...wrDoc().children].filter(e => e.dataset.t === 'h').length;
    go('script'); await wait(500);
    // note
    document.querySelector('[data-fsx="note"]').click(); await wait(100); document.getElementById('pnT').value = 'check continuity'; document.querySelector('#pnC [data-c="2"]').click(); document.getElementById('pnGo').click(); await wait(300);
    out.note = (P.scenes[0].pins || [])[0] && P.scenes[0].pins[0].t; out.noteShown = document.querySelector('.scr .pin').textContent.includes('check continuity');
    // pin follows the scene when the scene moves
    document.querySelector('[data-fstab="notes"]').click(); await wait(200); out.notesTab = document.querySelector('.fs-side .fs-np') && document.querySelector('.fs-side .fs-np').textContent.includes('check continuity');
    document.querySelector('[data-fstab="scenes"]').click(); await wait(200); document.querySelectorAll('.fs-side [data-fsm]')[0].click(); await wait(60); document.querySelector('#wrScMenu [data-op="down"]').click(); await wait(100); document.querySelector('[data-np="renumber"]').click(); await wait(300);
    out.pinMoved = P.scenes[1].pins && P.scenes[1].pins.length === 1;
    // edit and delete a pin
    document.querySelector('.scr [data-pinedit]').click(); await wait(100); document.getElementById('pnT').value = 'edited idea'; document.getElementById('pnGo').click(); await wait(300);
    out.edited = P.scenes[1].pins[0].t;
    document.querySelector('.scr [data-pindel]').click(); await wait(200); out.deleted = !(P.scenes[1].pins || []).length;
    // general idea
    document.querySelector('[data-fsx="note"]').click(); await wait(100); document.getElementById('pnS').value = ''; document.getElementById('pnT').value = 'general'; document.getElementById('pnGo').click(); await wait(300); out.idea = (P.ideas || []).length;
    // sticky strip stays at the top while scrolling
    P = sampleProject(); wrFromProject(); go('script'); await wait(500); const c = document.getElementById('content'); c.scrollTop = 900; await wait(200);
    const tr = document.querySelector('.fs-tools').getBoundingClientRect(), cr = c.getBoundingClientRect(); out.fsSticky = Math.abs(tr.top - cr.top) < 4; out.fsDbg = [tr.top, cr.top, c.scrollTop, c.scrollHeight]; c.scrollTop = 0;
    // highlight tool opens the colour panel
    document.querySelector('[data-fsx="hl"]').click(); await wait(100); out.hlOpen = !document.getElementById('hlPanel').hidden;
    // alternates jumps to the writer
    document.querySelector('[data-fsx="alt"]').click(); await wait(500); out.altPage = page;
    await wait(500); const c2 = document.getElementById('content'); c2.scrollTop = 1500; await wait(300);
    const wt = document.querySelector('.wr-main .wx-tools').getBoundingClientRect(), wb = document.querySelector('.wr-bar').getBoundingClientRect(), c2r = c2.getBoundingClientRect();
    out.wrSticky = Math.abs(wt.top - c2r.top) < 4 && wb.top >= wt.bottom - 2 && wb.top < wt.bottom + 20;
    return out;
  });
  console.log(JSON.stringify(r, null, 1)); if (errs.length) console.log('ERRORS', errs);
  const ok = r.tools === 'note,alt,dual,rev,omit,read,voice,hl,book,find,stats,sprint' && r.rows === 5 && r.hasAddEnd && r.afterAdd === '1,2,3,4,5,6' && r.afterCopy === '1,1A,2,3,4,5,6' && r.omitted && r.omRow === 1 && r.restored && r.afterNo === '1,2,2A,3,4' && r.afterDel === '1,2,3,4' && r.writerScenes === 4 && r.note === 'check continuity' && r.noteShown && r.notesTab && r.pinMoved && r.edited === 'edited idea' && r.deleted && r.idea === 1 && r.fsSticky && r.wrSticky && r.hlOpen && r.altPage === 'write' && !errs.length;
  console.log(ok ? 'PASS' : 'FAIL'); await b.close(); process.exit(ok ? 0 : 1);
})();
