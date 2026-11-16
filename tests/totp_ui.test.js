'use strict';
// Browser test: the authenticator-app screens talk to the REAL server code (functions/totp.js) through tests/totp_srv.js.
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const crypto = require('crypto');
const path = require('path');
const assert = require('assert');
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const unb32 = (s) => { let b = ''; for (const c of s) b += B32.indexOf(c).toString(2).padStart(5, '0'); const o = []; for (let i = 0; i + 8 <= b.length; i += 8) o.push(parseInt(b.slice(i, i + 8), 2)); return Buffer.from(o); };
const codeAt = (secret, ms) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(ms / 30000))); const d = crypto.createHmac('sha1', unb32(secret)).update(c).digest(); const o = d[19] & 15; return String((((d[o] & 127) << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) % 1e6).padStart(6, '0'); };

(async () => {
  const srv = spawn('node', [path.join(__dirname, 'totp_srv.js')], { stdio: ['pipe', 'pipe', 'inherit'] });
  const waiting = new Map(); let id = 0, buf = '';
  srv.stdout.on('data', (d) => { buf += d; let i; while ((i = buf.indexOf('\n')) >= 0) { const m = JSON.parse(buf.slice(0, i)); buf = buf.slice(i + 1); waiting.get(m.id)(m); waiting.delete(m.id); } });
  const rpc = (name, data) => new Promise((res) => { const k = ++id; waiting.set(k, res); srv.stdin.write(JSON.stringify({ id: k, name, data }) + '\n'); });
  let serverNow = Date.now(); // the server's clock follows ours
  const b = await chromium.launch(); const pg = await (await b.newContext({ viewport: { width: 900, height: 900 } })).newPage();
  const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.exposeFunction('__srv', (name, data) => rpc(name, data));
  await pg.addInitScript(() => {
    window.__FB_FAKE = { waitUser: async () => null, reload: async () => ({}), signOut: async () => {}, phoneReauth: async () => {},
      call: async (n, d) => { const r = await window.__srv(n, d); if (r.err) { const e = new Error(r.msg); e.code = 'functions/' + r.err; throw e; } return r.v; } };
  });
  await pg.goto('file://' + process.env.F); await pg.waitForTimeout(900); await pg.evaluate(() => document.querySelectorAll('#galock').forEach((e) => e.remove()));
  const digits = async (sel, code) => { const inputs = await pg.$$(sel + ' input'); for (let i = 0; i < 6; i++) await inputs[i].fill(code[i]); };
  const r = {};
  // 1. set up from Account & security
  await pg.evaluate(() => { GA.user = { sub: 'u1', email: 'film@maker.com', name: 'Film Maker', verified: true, providers: ['password'] }; fbAccount(); });
  await pg.waitForSelector('#taOn'); await pg.click('#taOn'); await pg.waitForSelector('#taK');
  const secret = (await pg.textContent('#taK')).replace(/\s/g, ''); assert.match(secret, /^[A-Z2-7]{32}$/);
  await rpc('__tick', { ms: serverNow - Date.now() }); // align (server starts at real now already)
  await digits('#taB', '000000'); await pg.waitForFunction(() => /not right/.test(document.querySelector('#taM').textContent)); r.wrongSetup = true;
  await digits('#taB', codeAt(secret, Date.now())); await pg.waitForSelector('#taL');
  const backups = (await pg.textContent('#taL')).trim().split('\n'); assert.equal(backups.length, 8); r.backups = backups.length;
  await pg.click('#taDone'); await pg.waitForFunction(() => /8 backup codes left/.test(document.querySelector('#taBox').textContent)); r.on = true;
  await pg.screenshot({ path: process.env.S + '/ta_acct.png' });
  await pg.click('[data-close]');
  // 2. sign-in with the app code
  await rpc('__tick', { ms: 30000 }); // the server moves to the next 30 s step
  const now2 = Date.now() + 30000;
  await pg.evaluate(() => { window.__r = loginOtp(FBX, { email: 'film@maker.com', phone: '' }); });
  await pg.waitForFunction(() => document.querySelector('#loEm') && !document.querySelector('#loEm').hidden);
  r.text = await pg.textContent('#loTo');
  await pg.screenshot({ path: process.env.S + '/ta_login.png' });
  await digits('#loC', '000000'); await pg.waitForFunction(() => /not right/.test(document.querySelector('#loM').textContent)); r.wrongLogin = true;
  await digits('#loC', codeAt(secret, now2)); await pg.waitForFunction(() => !document.querySelector('#galock'));
  r.ok1 = await pg.evaluate(() => window.__r); assert.strictEqual(r.ok1, true);
  r.claim = await rpc('__claims'); assert.strictEqual(r.claim.v.otpAuth, 7000);
  // 3. a backup code
  await pg.evaluate(() => { window.__r = loginOtp(FBX, { email: 'film@maker.com', phone: '' }); });
  await pg.waitForFunction(() => document.querySelector('#loBkb') && !document.querySelector('#loBkb').hidden);
  await pg.click('#loBkb'); await pg.fill('#loBk', backups[0]); await pg.press('#loBk', 'Enter');
  await pg.waitForFunction(() => !document.querySelector('#galock')); r.ok2 = await pg.evaluate(() => window.__r); assert.strictEqual(r.ok2, true);
  // 4. the same backup code is refused
  await pg.evaluate(() => { window.__r = loginOtp(FBX, { email: 'film@maker.com', phone: '' }); });
  await pg.waitForSelector('#loBkb:not([hidden])'); await pg.click('#loBkb'); await pg.fill('#loBk', backups[0]); await pg.press('#loBk', 'Enter');
  await pg.waitForFunction(() => /not right/.test(document.querySelector('#loM').textContent)); r.reused = true;
  // 5. "Email me a code instead" sends an email
  await pg.click('#loEm'); await pg.waitForFunction(() => /Code sent to/.test(document.querySelector('#loTo').textContent)); r.mails = (await rpc('__mails')).v; assert.strictEqual(r.mails, 1);
  await pg.click('#loOut'); await pg.waitForFunction(() => !document.querySelector('#galock')); assert.strictEqual(await pg.evaluate(() => window.__r), false);
  assert.deepStrictEqual(errs, []);
  console.log('PASS totp_ui', JSON.stringify(r));
  await b.close(); srv.kill();
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
