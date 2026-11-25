// Screenplay house-style hints (numbers measured on 12 real scripts; text below is invented). Run: NODE_PATH=$(npm root -g) node tests/write_style.test.js
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const w = n => Array.from({ length: n }, (_, i) => 'word' + i).join(' '); const wait = ms => new Promise(r => setTimeout(r, ms)); const o = {};
    o.longAct = wcStyle(w(61), 'a').length; o.okAct = wcStyle(w(40) + '.', 'a').length;
    o.past = wcStyle('Nina walked to the door and looked out. She was tired.', 'a').length; o.pres = wcStyle('Nina walks to the door and looks out.', 'a').length;
    o.weSee = wcStyle('We see Nina at the door.', 'a').length; /* allowed: real scripts use it */
    o.longDlg = wcStyle(w(81), 'd').length; o.okDlg = wcStyle(w(30), 'd').length;
    o.longPar = wcStyle('(says it very slowly and quietly to nobody)', 'p').length; o.okPar = wcStyle('(quietly)', 'p').length;
    o.noTime = wcStyle('INT. KITCHEN', 'h').length; o.time = wcStyle('INT. KITCHEN - NIGHT', 'h').length;
    o.ext = wcRules('MARY (CONTD)', false, 'c').map(x => x.to).join(); o.extOk = wcRules("MARY (CONT'D)", false, 'c').length; o.os = wcRules('RAVI (OS)', false, 'c').map(x => x.to).join();
    o.guide = /present tense/.test(STYLE_GUIDE) && /CONT'D/.test(STYLE_GUIDE);
    /* in the panel: a style note has no Accept button and can be dismissed */
    P = sampleProject(); P.draft = Object.assign(P.draft || {}, { els: [{ t: 'h', x: 'INT. HOUSE - DAY' }, { t: 'a', x: 'x' }], tplAsked: true, fmt: 'film' }); go('write'); await wait(700);
    const d = document.getElementById('wrDoc'); const blk = d.children[1]; blk.textContent = 'Nina walked to the door and looked out. She was tired and she stood there'; placeCaret(blk); document.execCommand('insertText', false, '.'); await wait(1300);
    const it = document.querySelector('#wrAIlist .wc-item'); o.panelNote = !!it && /past tense/.test(it.textContent) && !it.querySelector('[data-wc="acc"]');
    it && it.querySelector('[data-wc="ign"]').click(); await wait(100); o.dismissed = !/past tense/.test(document.getElementById('wrAIlist').textContent);
    return o;
  });
  console.log(JSON.stringify(r), errs);
  const ok = !errs.length && r.longAct === 1 && r.okAct === 0 && r.past === 1 && r.pres === 0 && r.weSee === 0 && r.longDlg === 1 && r.okDlg === 0 && r.longPar === 1 && r.okPar === 0 && r.noTime === 1 && r.time === 0 && r.ext === "(CONT'D)" && r.extOk === 0 && r.os === '(O.S.)' && r.guide && r.panelNote && r.dismissed;
  console.log(ok ? 'PASS write style' : 'FAIL write style'); await b.close(); process.exit(ok ? 0 : 1);
})();
