// Writing assistant: rewrite with direction, expand, describe (add), related words, scene feedback, brainstorm. AI is faked. Run: NODE_PATH=$(npm root -g) node tests/write_assist.test.js
const path = require('path'); const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch(); const pg = await b.newPage({ viewport: { width: 1440, height: 900 } }); const errs = []; pg.on('pageerror', e => errs.push(e.message));
  await pg.goto('file://' + path.resolve(__dirname, '../www/index.html')); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(async () => {
    const wait = ms => new Promise(r => setTimeout(r, ms)); const o = { prompts: [] };
    AI.sample = Object.assign(async () => ({ text: '' }), { json: async (p, opt) => { o.prompts.push(p); const tier = opt && opt.modelTier;
      if (/"words"/.test(p)) return { words: ['stares', 'gazes', 'peers'] }; if (/"items"/.test(p)) return { items: [1, 2, 3, 4, 5].map(i => ({ area: 'Area ' + i, note: 'Note ' + i })) };
      if (/"ideas"/.test(p)) return { ideas: ['idea a', 'idea b', 'idea c', 'idea d', 'idea e', 'idea f'] }; return { options: ['Option one.', 'Option two.', 'Option three.'] } } });
    P = sampleProject(); P.draft = Object.assign(P.draft || {}, { els: [{ t: 'h', x: 'INT. HOUSE - DAY' }, { t: 'a', x: 'Nina looks out of the window. Rain falls on the road below.' }, { t: 'c', x: 'NINA' }, { t: 'd', x: 'He is not coming back tonight, is he? I knew it from the start.' }], tplAsked: true, fmt: 'film' }); go('write'); await wait(700);
    const d = document.getElementById('wrDoc'); const out = () => document.getElementById('wrAIout').textContent; const click = s => document.querySelector(s).click();
    placeCaret(d.children[1]); await wait(150);
    document.getElementById('wrAIdir').value = 'angrier, fewer words'; click('[data-as="custom"]'); await wait(250); o.custom = /angrier, fewer words/.test(o.prompts[o.prompts.length - 1]) && document.querySelectorAll('#wrAIout [data-rwuse]').length === 3;
    click('[data-rw="expand"]'); await wait(250); o.expand = /more filmable detail/.test(o.prompts[o.prompts.length - 1]);
    click('[data-as="add"]'); await wait(250); o.addBtn = document.querySelector('[data-rwuse="0"]').textContent; click('[data-rwuse="1"]'); await wait(150); o.added = d.children[1].textContent.endsWith('Option two.') && d.children[1].textContent.startsWith('Nina looks');
    const el = d.children[1]; setText(el, 'Nina looks out of the window.'); const tn = el.firstChild, st = el.textContent.indexOf('looks'); const rg = document.createRange(); rg.setStart(tn, st); rg.setEnd(tn, st + 5); getSelection().removeAllRanges(); getSelection().addRange(rg); await wait(200);
    click('[data-as="words"]'); await wait(250); o.words = document.querySelectorAll('#wrAIout [data-rwuse]').length; click('[data-rwuse="1"]'); await wait(150); o.replaced = el.textContent;
    placeCaret(d.children[3]); await wait(150); click('[data-as="feedback"]'); await wait(250); o.fb = document.querySelectorAll('#wrAIout .wa-opt').length; o.fbPrompt = /exactly 5/.test(o.prompts[o.prompts.length - 1]) && /Nina/.test(o.prompts[o.prompts.length - 1]);
    click('[data-as="ideas"]'); await wait(250); o.ideas = document.querySelectorAll('#wrAIout .wa-opt').length; o.noWriting = /do not write scenes/.test(o.prompts[o.prompts.length - 1]);
    /* free scene check against the benchmarks */
    const els = [{ t: 'h', x: 'INT. ROOM - DAY' }, { t: 'a', x: 'Two men sit at a table with tea going cold between them.' }]; for (let i = 0; i < 9; i++) els.push({ t: 'c', x: i % 2 ? 'RAVI' : 'ASHOK' }, { t: 'd', x: 'We have talked about this for hours and nothing changes at all.' });
    const d2 = document.getElementById('wrDoc'); d2.innerHTML = els.map(wrBlockHtml).join(''); placeCaret(d2.children[3]); await wait(900);
    o.scene = document.getElementById('wrAIscene').textContent; o.fbNums = (() => { return true })();
    return o;
  });
  console.log(JSON.stringify({ ...r, prompts: r.prompts.length }), errs);
  const ok = !errs.length && r.custom && r.expand && r.addBtn === 'Add after' && r.added && r.words === 3 && r.replaced === 'Nina gazes out of the window.' && r.fb === 5 && r.fbPrompt && r.ideas === 6 && r.noWriting && /speeches in a row/.test(r.scene) && /Mostly talk/.test(r.scene);
  console.log(ok ? 'PASS write assist' : 'FAIL write assist'); await b.close(); process.exit(ok ? 0 : 1);
})();
