// Script book: pages match the editor, turning works both ways, closes cleanly. Run: NODE_PATH=$(npm root -g) node tests/book.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 900 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const o = {}; const wait = ms => new Promise(r => setTimeout(r, ms));
    const els = []; for (let s = 1; s <= 14; s++) { els.push({ t: 'h', x: 'INT. HOUSE ' + s + ' - DAY' }); for (let i = 0; i < 5; i++) { els.push({ t: 'a', x: 'The door opens slowly and light falls across the floor of the room.' }); els.push({ t: 'c', x: 'RAVI' }); els.push({ t: 'd', x: 'A line of dialogue for the test.' }); } }
    P = sampleProject(); P.draft = Object.assign(P.draft || {}, { els, tplAsked: true }); go('write'); await wait(600);
    const editorPages = document.querySelectorAll('#wrDoc .el.pb').length + 1;
    const before = JSON.stringify(P.draft.els);
    bookOpen(); await wait(100);
    o.pagesMatch = BK.pages.length - 1 === editorPages;
    o.cover = document.getElementById('bkCount').textContent === 'Cover';
    await bkTurn(1); o.first = document.getElementById('bkCount').textContent;
    // the book page keeps the editor's own formatting classes and widths
    const bel = document.querySelector('#bkL .wr-doc .el-d'), eel = document.querySelector('#wrDoc .el-d');
    o.sameFormat = bel.className.replace(/\s+/g, ' ').trim() === eel.className.replace(/ ?(pb|cur|wr-empty)/g, '').replace(/\s+/g, ' ').trim()
      && Math.abs(parseFloat(getComputedStyle(bel).width) / BK.u - parseFloat(getComputedStyle(eel).width) / (document.getElementById('wrPaper').clientWidth / 8.5)) < 0.02;
    await bkTurn(-1); o.back = document.getElementById('bkCount').textContent === 'Cover';
    while (BK.at < bkMax()) await bkTurn(1); o.end = document.getElementById('bkCount').textContent;
    bookClose(); await wait(400); o.closed = !document.getElementById('bk');
    o.untouched = JSON.stringify(P.draft.els) === before;
    // from Full script, an imported script with no draft still opens as a book
    P.draft = { els: [], tp: {}, at: 0, syncedAt: 0 }; go('script'); await wait(300); bookOpen(); await wait(100);
    o.fromScenes = !!document.getElementById('bk') && BK.pages.length > 1;
    // the reader can switch to scrolling: cover plus every page stacked
    bkMode('scroll'); await wait(100); o.scroll = document.querySelectorAll('#bkScroll .bk-sheet').length === BK.pages.length && document.getElementById('bk').classList.contains('scrolling');
    bkMode('pages'); await wait(100); o.backToPages = !document.getElementById('bk').classList.contains('scrolling') && !!document.querySelector('#bkR .bk-cover'); bookClose(); await wait(400);
    // Full script shows the bound cover; the cover takes writer, director and production
    o.hero = !!document.querySelector('.fs-book .fs-cover');
    bookCoverEdit(); document.getElementById('bcT').value = 'My Film'; document.getElementById('bcW').value = 'W. Riter'; document.getElementById('bcD').value = 'D. Rector'; document.getElementById('bcP').value = 'Prod Co';
    document.getElementById('bcSave').click(); await wait(400);
    const hero = document.querySelector('.fs-book').textContent;
    o.coverSaved = P.title === 'My Film' && P.draft.tp.director === 'D. Rector' && P.production === 'Prod Co' && /Written by W\. Riter/.test(hero) && /Directed by D\. Rector/.test(hero);
    return o;
  });
  console.log(JSON.stringify(r), errs);
  const ok = r.pagesMatch && r.cover && /^Pages 1–2 of/.test(r.first) && r.sameFormat && r.back && /of \d+$/.test(r.end) && r.closed && r.untouched && r.fromScenes && r.scroll && r.backToPages && r.hero && r.coverSaved && !errs.length;
  console.log(ok ? 'PASS book' : 'FAIL book'); await b.close(); process.exit(ok ? 0 : 1);
})();
