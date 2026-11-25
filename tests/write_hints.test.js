// Writing suggestions in the Write page: found after a pause, shown in a small panel, accepted or ignored. Run: NODE_PATH=$(npm root -g) node tests/write_hints.test.js
const path = require('path');
const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 1000 } });
  const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const out = {};
    P = sampleProject(); P.draft = Object.assign(P.draft || {}, { els: [{ t: 'h', x: 'INT. HOUSE - DAY' }, { t: 'a', x: 'Nina enters.' }, { t: 'a', x: 'x' }], tplAsked: true, fmt: 'film' }); go('write'); await wait(600);
    const d = document.getElementById('wrDoc');
    const block = d.children[1]; block.textContent = 'the  door opens .Light falls. i think teh  end';
    placeCaret(block); document.execCommand('insertText', false, '!'); await wait(1300);
    out.pill = (document.querySelector('#wcPanel') || {}).textContent || '';
    out.marked = d.querySelectorAll('.wc-has').length;
    document.getElementById('wcTog').click(); await wait(100);
    out.panelItems = document.querySelectorAll('#wcPanel .wc-item').length;
    const before = block.textContent; out.dbg=[WC.items.length, WC.items[0]&&WC.items[0].from, document.querySelectorAll('#wcPanel [data-wc="acc"]').length];
    document.querySelector('#wcPanel [data-wc="acc"]').click(); await wait(200);
    out.afterAccept = block.textContent; out.before = before;
    out.ignoredCount = document.querySelectorAll('#wcPanel [data-wc="ign"]').length;
    // turning the feature off hides everything
    document.querySelector('[data-wrx="chk"]').click(); await wait(100);
    out.offPanel = !!document.getElementById('wcPanel'); out.offMarked = d.querySelectorAll('.wc-has').length;
    return out;
  });
  console.log(JSON.stringify(r), errs);
  const ok = !errs.length && /suggestion/.test(r.pill) && r.marked > 0 && r.panelItems >= 3 && r.afterAccept !== r.before && !r.offPanel && r.offMarked === 0;
  console.log(ok ? 'PASS write hints' : 'FAIL write hints'); await b.close(); process.exit(ok ? 0 : 1);
})();
