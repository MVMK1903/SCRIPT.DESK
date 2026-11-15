// Write page: one sheet of paper per page, in every format, without touching the saved script. Run: NODE_PATH=$(npm root -g) node tests/write_sheets.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const out = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
    const els = []; for (let s = 1; s <= 14; s++) { els.push({ t: 'h', x: 'INT. HOUSE ' + s + ' - DAY' }); for (let i = 0; i < 5; i++) { els.push({ t: 'a', x: 'The door opens slowly and light falls across the floor of the room.' }); els.push({ t: 'c', x: 'RAVI' }); els.push({ t: 'd', x: 'A line of dialogue for the test.' }); } }
    for (const fmt of Object.keys(FMTS)) {
      P = sampleProject(); P.draft = Object.assign(P.draft || {}, { els: JSON.parse(JSON.stringify(els)), tplAsked: true, fmt }); go('write'); await wait(500);
      const d = document.getElementById('wrDoc'), paper = document.getElementById('wrPaper');
      const sh = [...document.querySelectorAll('.wr-sheet')].map(x => [parseFloat(x.style.top), parseFloat(x.style.height)]);
      const pbs = [...d.querySelectorAll('.el.pb')];
      // every page-break element starts inside its own sheet, and no text falls in a gap between sheets
      const inside = [...d.children].every(e => sh.some(([t, h]) => e.offsetTop >= t - 1 && e.offsetTop + e.offsetHeight <= t + h + 1));
      const u = paper.clientWidth / 8.5;
      out[fmt] = { sheets: sh.length, pages: pbs.length + 1, inside, full: sh.every(([t, h]) => h >= u * 11 - 1), cls: d.firstElementChild.className, w: getComputedStyle(d.children[3]).width };
    }
    // typing keeps working and nothing visual leaks into the saved script
    const d = document.getElementById('wrDoc'); placeCaret(d.lastElementChild); document.execCommand('insertText', false, ' More.'); await wait(700); wrSave && wrSave();
    out.savedClean = P.draft.els.every(e => Object.keys(e).every(k => k !== 'style')) && /More\.$/.test(P.draft.els[P.draft.els.length - 1].x);
    return out;
  });
  console.log(JSON.stringify(r), errs);
  const fm = Object.keys(r).filter(k => k !== 'savedClean');
  const ok = fm.length >= 4 && fm.every(k => r[k].sheets === r[k].pages && r[k].sheets > 1 && r[k].inside && r[k].full) && r.savedClean && !errs.length;
  console.log(ok ? 'PASS write sheets' : 'FAIL write sheets'); await b.close(); process.exit(ok ? 0 : 1);
})();
