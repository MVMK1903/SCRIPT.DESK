// Write screen on desktop: paper centred, menu closed, toolbar fixed above the paper, assistant on the right. Run: NODE_PATH=$(npm root -g) node tests/write_layout.test.js
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const res = {}; let allErrs = [];
  for (const [w, h] of [[1366, 768], [1920, 1000]]) {
    const pg = await b.newPage({ viewport: { width: w, height: h } }); pg.on('pageerror', e => allErrs.push(e.message));
    await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
    const r = await pg.evaluate(async () => {
      const wait = ms => new Promise(r => setTimeout(r, ms)); const o = {};
      const els = [{ t: 'h', x: 'INT. HOUSE - DAY' }]; for (let i = 0; i < 60; i++) els.push({ t: 'a', x: 'Nina walks across the room and looks out of the window number ' + i + '.' });
      P = sampleProject(); P.draft = Object.assign(P.draft || {}, { els, tplAsked: true, fmt: 'film' }); go('write'); await wait(700);
      const R = s => { const e = document.querySelector(s); if (!e || !e.offsetParent && getComputedStyle(e).position !== 'fixed') return null; const r = e.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom, w: r.width } };
      const paper = R('#wrPaper'); o.paperCentre = Math.round((paper.l + paper.r) / 2); o.vw = innerWidth;
      o.sideHidden = !R('.side'); o.scenesHidden = !R('.wr-side'); o.ai = !!R('#wrAI'); o.aiRight = R('#wrAI') && R('#wrAI').l > paper.r;
      o.barAbovePaper = R('.wr-bar').b <= paper.t + 2; o.barW = Math.round(R('.wr-bar').w); o.paperW = Math.round(paper.w);
      const sc = document.querySelector('.content'); sc.scrollTop = 900; await wait(200);
      const bar = R('.wr-bar'); o.barStuck = bar && bar.t - document.querySelector('.content').getBoundingClientRect().top < 4; o.barBg = getComputedStyle(document.querySelector('.wr-bar')).backgroundColor;
      document.getElementById('wrMenuBtn').click(); await wait(100); o.menuOpens = !!R('.side');
      document.getElementById('wrDoc').dispatchEvent(new MouseEvent('click', { bubbles: true })); document.body.click(); await wait(100); o.menuCloses = !R('.side');
      document.getElementById('wrScBtn').click(); await wait(100); o.scenesOpen = !!R('.wr-side');
      return o;
    });
    await pg.screenshot({ path: process.env.SHOT ? process.env.SHOT + w + '.png' : '/dev/null' }).catch(() => {});
    res[w] = r; await pg.close();
  }
  console.log(JSON.stringify(res), allErrs);
  const ok = !allErrs.length && Object.values(res).every(r => Math.abs(r.paperCentre - r.vw / 2) <= 3 && r.sideHidden && r.scenesHidden && r.ai && r.aiRight && r.barAbovePaper && r.barStuck && r.menuOpens && r.menuCloses && r.scenesOpen && !/rgba\(.*,\s*0\)|rgba\(.*0\.\d+\)/.test(r.barBg));
  console.log(ok ? 'PASS write layout' : 'FAIL write layout'); await b.close(); process.exit(ok ? 0 : 1);
})();
