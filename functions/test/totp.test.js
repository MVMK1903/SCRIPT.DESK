'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const h = require('./helpers');
const t = require('../totp');

// independent RFC 6238 implementation for the test side (SHA-1, 30 s, 6 digits)
const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const unb32 = (s) => { let bits = ''; for (const c of s) bits += B32.indexOf(c).toString(2).padStart(5, '0'); const o = []; for (let i = 0; i + 8 <= bits.length; i += 8) o.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(o); };
const codeAt = (secret, ms) => { const c = Buffer.alloc(8); c.writeBigUInt64BE(BigInt(Math.floor(ms / 30000))); const d = crypto.createHmac('sha1', unb32(secret)).update(c).digest(); const o = d[19] & 15; return String((((d[o] & 127) << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) % 1e6).padStart(6, '0'); };

const auth = (extra = {}, uid = 'u1') => ({ uid, token: { email: 'a@b.com', email_verified: true, auth_time: 1000, firebase: { sign_in_provider: 'password' }, ...extra } });
const call = (fn, data, a) => fn({ data: data || {}, auth: a === null ? undefined : (a || auth()), rawRequest: { ip: '1.2.3.4' } });
const fails = async (p) => { try { await p; } catch (e) { return e; } assert.fail('expected a failure'); };
async function turnOn() { const s = await call(t.totpSetup); const r = await call(t.totpConfirm, { code: codeAt(s.secret, Date.now()) }); return { secret: s.secret, codes: r.codes }; }
const nextStep = () => { h.state.now += 30000; };

test.beforeEach(() => h.reset());

test('RFC 6238 test vector: the server accepts the standard code for time 59', async () => {
  h.state.now = 59000;
  h.store.set('totp/u1', { secret: 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', salt: 's', backups: [], lastStep: 0, fails: [] });
  assert.equal(codeAt('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ', 59000), '287082');
  assert.deepEqual(await call(t.totpVerify, { code: '287082' }), { ok: true, backups: 0 });
});

test('needs a signed-in account, and a verified email to set up', async () => {
  assert.equal((await fails(call(t.totpSetup, {}, null))).code, 'unauthenticated');
  assert.equal((await fails(call(t.totpVerify, { code: '123456' }, null))).code, 'unauthenticated');
  assert.equal((await fails(call(t.totpSetup, {}, auth({ email_verified: false })))).code, 'failed-precondition');
});

test('setup gives a secret and an otpauth link; it is not on until a right code is entered', async () => {
  const s = await call(t.totpSetup);
  assert.match(s.secret, /^[A-Z2-7]{32}$/);
  assert.match(s.uri, /^otpauth:\/\/totp\/ScriptDesk%3Aa%40b\.com\?secret=/);
  assert.deepEqual(await call(t.totpStatus), { on: false, backups: 0 });
  assert.equal((await fails(call(t.totpConfirm, { code: '000000' === codeAt(s.secret, Date.now()) ? '111111' : '000000' }))).code, 'permission-denied');
  assert.deepEqual(await call(t.totpStatus), { on: false, backups: 0 });
});

test('a right code turns it on and gives 8 backup codes once; they are stored hashed', async () => {
  const { codes } = await turnOn();
  assert.equal(codes.length, 8); assert.match(codes[0], /^[a-z2-7]{5}-[a-z2-7]{5}$/);
  assert.deepEqual(await call(t.totpStatus), { on: true, backups: 8 });
  const saved = JSON.stringify(h.store.get('totp/u1'));
  for (const c of codes) assert.ok(!saved.includes(c.replace('-', '')));
  assert.equal((await fails(call(t.totpSetup))).code, 'already-exists');
});

test('sign-in: a right code marks this sign-in; the same code cannot be used twice', async () => {
  const { secret } = await turnOn(); nextStep();
  const code = codeAt(secret, Date.now());
  assert.deepEqual(await call(t.totpVerify, { code }, auth({ auth_time: 5000 })), { ok: true, backups: 8 });
  assert.equal(h.claims.get('u1').otpAuth, 5000);
  assert.equal((await fails(call(t.totpVerify, { code }))).code, 'permission-denied'); // replay
});

test('five wrong codes pause the check, even for the right code, until 15 minutes pass', async () => {
  const { secret } = await turnOn(); nextStep();
  const good = codeAt(secret, Date.now());
  for (let i = 0; i < 5; i++) assert.equal((await fails(call(t.totpVerify, { code: good === '000000' ? '111111' : '000000' }))).code, 'permission-denied');
  assert.equal((await fails(call(t.totpVerify, { code: good }))).code, 'resource-exhausted');
  h.state.now += 16 * 60000;
  assert.equal((await call(t.totpVerify, { code: codeAt(secret, Date.now()) })).ok, true);
});

test('a backup code works once and is used up', async () => {
  const { codes } = await turnOn();
  assert.deepEqual(await call(t.totpVerify, { code: codes[0] }), { ok: true, backups: 7 });
  assert.equal((await fails(call(t.totpVerify, { code: codes[0] }))).code, 'permission-denied');
  assert.equal((await call(t.totpVerify, { code: codes[1].toUpperCase().replace('-', ' ') })).backups, 6);
});

test('turning it off needs a right code', async () => {
  const { secret } = await turnOn(); nextStep();
  assert.equal((await fails(call(t.totpDisable, { code: '000000' }))).code, 'permission-denied');
  assert.deepEqual(await call(t.totpDisable, { code: codeAt(secret, Date.now()) }), { ok: true });
  assert.deepEqual(await call(t.totpStatus), { on: false, backups: 0 });
  assert.equal((await fails(call(t.totpVerify, { code: '123456' }))).code, 'failed-precondition');
});

test('new backup codes need a right code and replace the old ones', async () => {
  const { secret, codes } = await turnOn(); nextStep();
  assert.equal((await fails(call(t.totpNewBackups, { code: '000000' }))).code, 'permission-denied');
  const r = await call(t.totpNewBackups, { code: codeAt(secret, Date.now()) });
  assert.equal(r.codes.length, 8);
  assert.equal((await fails(call(t.totpVerify, { code: codes[0] }))).code, 'permission-denied');
  assert.equal((await call(t.totpVerify, { code: r.codes[0] })).ok, true);
});

test('one account cannot use another account\'s authenticator', async () => {
  const { secret } = await turnOn(); nextStep();
  assert.equal((await fails(call(t.totpVerify, { code: codeAt(secret, Date.now()) }, auth({}, 'u2')))).code, 'failed-precondition');
});

test('the secret and codes are never written to a log', async () => {
  const { secret, codes } = await turnOn(); await call(t.totpVerify, { code: codes[0] });
  const all = h.logs.join('\n') + JSON.stringify([...h.store.entries()].filter(([k]) => k.startsWith('users/')));
  assert.ok(!all.includes(secret)); for (const c of codes) assert.ok(!all.includes(c));
});
