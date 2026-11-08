'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { loginGate, signupGate, onUserCreate, onUserDelete } = require('../auth');
const { otpCreate, otpSend, otpVerify } = require('../index');

const PW = 'Passw0rd-secret-9';
const WRONG = 'Incorrect email or password';
const addUser = (email = 'a@b.com', password = PW) => h.users.set(email, { uid: 'u1', password });
const fails = async (p) => { try { await p; } catch (e) { return e; } assert.fail('expected a failure'); };
const login = (email, password, ip) => loginGate({ data: { email, password }, rawRequest: { ip: ip || '1.2.3.4' } });

test.beforeEach(() => h.reset());

test('right password passes and clears the wrong-try count', async () => {
  addUser();
  await fails(login('a@b.com', 'nope'));
  assert.deepEqual(await login('a@b.com', PW), { ok: true });
  for (let i = 0; i < 4; i++) await fails(login('a@b.com', 'nope'));
  assert.deepEqual(await login('a@b.com', PW), { ok: true }); // would be the 6th try without the reset
});

test('wrong password and unknown email give the same words', async () => {
  addUser();
  const a = await fails(login('a@b.com', 'nope'));
  const b = await fails(login('nobody@b.com', 'nope'));
  assert.equal(a.message, WRONG); assert.equal(b.message, WRONG);
  assert.equal(a.code, b.code);
});

test('delay grows with each wrong try', async () => {
  addUser();
  for (let i = 0; i < 5; i++) await fails(login('a@b.com', 'nope'));
  assert.deepEqual(h.delays, [500, 1000, 2000, 4000, 5000]);
});

test('five wrong tries lock the account for 15 minutes, with the same words and one email', async () => {
  addUser();
  for (let i = 0; i < 5; i++) assert.equal((await fails(login('a@b.com', 'nope'))).message, WRONG);
  assert.equal(h.mails.length, 1);
  assert.equal(h.mails[0].to, 'a@b.com');
  assert.match(h.mails[0].text, /https:\/\/reset\.example\/a@b\.com/);
  const before = h.state.checks;
  const e = await fails(login('a@b.com', PW, '9.9.9.9')); // even the right password is refused, in the same words
  assert.equal(e.message, WRONG);
  assert.equal(h.state.checks, before, 'the password is not even checked while locked');
  h.state.now += 14 * 60000;
  await fails(login('a@b.com', PW, '9.9.9.9'));
  h.state.now += 2 * 60000;
  assert.deepEqual(await login('a@b.com', PW, '9.9.9.9'), { ok: true });
});

test('an unknown email is locked the same way but gets no email', async () => {
  for (let i = 0; i < 6; i++) assert.equal((await fails(login('ghost@b.com', 'nope', '5.5.5.' + i))).message, WRONG);
  assert.equal(h.mails.length, 0);
});

test('many tries sent at once still get only five checks', async () => {
  addUser();
  const out = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => login('a@b.com', 'nope' + i, '7.7.7.' + i)));
  assert.equal(out.every((o) => o.status === 'rejected'), true);
  assert.equal(h.state.checks, 5);
});

test('one address gets 10 tries a minute', async () => {
  addUser();
  for (let i = 0; i < 10; i++) await login('a@b.com', PW);
  const before = h.state.checks;
  const e = await fails(login('a@b.com', PW));
  assert.equal(e.message, WRONG);
  assert.equal(h.state.checks, before);
  h.state.now += 61000;
  assert.deepEqual(await login('a@b.com', PW), { ok: true });
});

test('bad input is refused with the same words and logged without the values', async () => {
  const bad = [{ email: '<script>x</script>@b.com', password: PW }, { email: 'a@b.com', password: 'x'.repeat(129) }, { email: 'a@b.com', password: '' },
    { email: 'a@b.com', password: PW, extra: 1 }, { email: 5, password: PW }, null, 'text'];
  for (const d of bad) assert.equal((await fails(loginGate({ data: d, rawRequest: { ip: '1.1.1.1' } }))).message, WRONG);
  assert.ok(h.logs.some((l) => l.includes('invalid input')));
  assert.equal(h.logs.join('').includes('x'.repeat(129)), false);
});

test('sign-up: new and existing emails get the same answer', async () => {
  addUser('old@b.com');
  const a = await signupGate(h.req({ email: 'New@B.com', password: 'Abcdef12', name: 'Ravi' }));
  const b = await signupGate(h.req({ email: 'old@b.com', password: 'Abcdef12', name: 'Ravi' }));
  assert.deepEqual(a, { ok: true }); assert.deepEqual(a, b);
  assert.ok(h.users.has('new@b.com'));
  assert.match(h.mails[0].subject, /Confirm/);
  assert.match(h.mails[1].subject, /already have an account/);
  assert.equal(h.users.get('old@b.com').password, PW, 'an existing account is never changed');
});

test('sign-up: weak or odd input gives one general message; names are cleaned', async () => {
  for (const d of [{ email: 'a@b.com', password: 'short1' }, { email: 'a@b.com', password: 'allletters' }, { email: 'a@b.com', password: '12345678' }, { email: 'bad', password: 'Abcdef12' }]) {
    const e = await fails(signupGate(h.req(d)));
    assert.equal(e.message, 'Check your details and try again.');
  }
  await signupGate(h.req({ email: 'c@b.com', password: 'Abcdef12', name: '<script>alert(1)</script>Ravi <b>K</b>; DROP' }));
  assert.equal(h.users.get('c@b.com').displayName, 'Ravi K DROP');
  await signupGate(h.req({ email: 'd@b.com', password: 'Abcdef12', name: "Ravi O'Brien-తెలుగు" }));
  assert.equal(h.users.get('d@b.com').displayName, "Ravi O'Brien-తెలుగు");
});

test('sign-up: five an hour from one address', async () => {
  for (let i = 0; i < 5; i++) await signupGate(h.req({ email: `n${i}@b.com`, password: 'Abcdef12' }));
  assert.equal((await fails(signupGate(h.req({ email: 'n9@b.com', password: 'Abcdef12' })))).code, 'resource-exhausted');
});

test('locks need a verified email; bad script ids are refused', async () => {
  const auth = (v) => ({ uid: 'u1', token: { email: 'a@b.com', email_verified: v } });
  assert.equal((await fails(otpCreate({ data: { pid: 'p1' }, auth: auth(false) }))).code, 'failed-precondition');
  assert.equal((await fails(otpSend({ data: { pid: 'p1' }, auth: auth(false) }))).code, 'failed-precondition');
  assert.equal((await fails(otpCreate({ data: { pid: '../x' }, auth: auth(true) }))).code, 'invalid-argument');
  assert.equal((await fails(otpCreate({ data: { pid: 'p1' } }))).code, 'unauthenticated');
  const r = await otpCreate({ data: { pid: 'p1' }, auth: auth(true) });
  assert.equal(typeof r.key, 'string');
  assert.equal((await fails(otpVerify({ data: { pid: 'p1', code: '000000' }, auth: auth(true) }))).code, 'deadline-exceeded');
});

test('account triggers: profile on create, everything removed on delete', async () => {
  await onUserCreate({ uid: 'u1', email: 'a@b.com' });
  const p = h.store.get('profiles/u1');
  assert.equal(p.plan, 'free'); assert.deepEqual(Object.keys(p).sort(), ['createdAt', 'plan', 'prefs']);
  h.store.set('users/u1/projects/p1', { x: 1 }); h.store.set('users/u2/projects/p1', { x: 1 });
  h.store.set('publicKeys/u1', {}); h.store.set('otpKeys/u1_p1', { owner: 'u1' }); h.store.set('otpKeys/u2_p1', { owner: 'u2' });
  h.store.set('otpCodes/u1_p1', {}); h.store.set('otpCodes/u2_p1', {});
  await onUserDelete({ uid: 'u1' });
  assert.deepEqual([...h.store.keys()].sort(), ['otpCodes/u2_p1', 'otpKeys/u2_p1', 'users/u2/projects/p1']);
});

test('no password or reset link is ever logged', async () => {
  addUser();
  for (let i = 0; i < 6; i++) await fails(login('a@b.com', PW + 'x' + i));
  await login('a@b.com', PW).catch(() => {});
  await signupGate(h.req({ email: 'z@b.com', password: 'Zebra1234' }));
  await fails(login('a@b.com', 'x'.repeat(200)));
  const all = h.logs.join('\n');
  for (const s of [PW, 'Zebra1234', 'reset.example', 'verify.example', 'nope']) assert.equal(all.includes(s), false, s);
});

test('OTP: many wrong codes sent at once still only use five tries, then even the right code is refused', async () => {
  const auth = { uid: 'u1', token: { email: 'a@b.com', email_verified: true } };
  await otpCreate({ data: { pid: 'p1' }, auth });
  await otpSend({ data: { pid: 'p1' }, auth });
  const code = (h.mails.at(-1).text.match(/\b(\d{6})\b/) || [])[1];
  assert.ok(code, 'the emailed code can be found');
  const wrongCode = code === '111111' ? '222222' : '111111';
  const out = await Promise.allSettled(Array.from({ length: 12 }, () => otpVerify({ data: { pid: 'p1', code: wrongCode }, auth })));
  const codes = out.map((o) => o.reason.code);
  assert.equal(codes.filter((c) => c === 'permission-denied').length, 5);
  assert.equal(codes.filter((c) => c === 'resource-exhausted').length, 7);
  assert.equal((await fails(otpVerify({ data: { pid: 'p1', code }, auth }))).code, 'resource-exhausted');
});

test('OTP: the right code works once', async () => {
  const auth = { uid: 'u1', token: { email: 'a@b.com', email_verified: true } };
  await otpCreate({ data: { pid: 'p2' }, auth });
  await otpSend({ data: { pid: 'p2' }, auth });
  const code = h.mails.at(-1).text.match(/\b(\d{6})\b/)[1];
  assert.equal(typeof (await otpVerify({ data: { pid: 'p2', code }, auth })).key, 'string');
  assert.equal((await fails(otpVerify({ data: { pid: 'p2', code }, auth }))).code, 'deadline-exceeded');
});

test('sign-up: an address already registered gets at most one email every 10 minutes', async () => {
  addUser('old@b.com');
  for (let i = 0; i < 3; i++) assert.deepEqual(await signupGate(h.req({ email: 'old@b.com', password: 'Abcdef12' }, {})), { ok: true });
  assert.equal(h.mails.filter((m) => m.to === 'old@b.com').length, 1);
});

test('sign-up always waits at least 3 seconds, new email or not', async () => {
  addUser('old@b.com');
  await signupGate(h.req({ email: 'new1@b.com', password: 'Abcdef12' }));
  await signupGate(h.req({ email: 'old@b.com', password: 'Abcdef12' }));
  assert.equal(h.delays.filter((d) => d >= 2900).length, 2);
});

test('lock: the lock email and the wait run together, so the answer takes the same time with or without an account', async () => {
  addUser();
  for (let i = 0; i < 5; i++) await fails(login('a@b.com', 'nope'));
  assert.equal(h.delays.at(-1), 5000);
  h.delays.length = 0;
  for (let i = 0; i < 5; i++) await fails(login('ghost@b.com', 'nope', '8.8.8.' + i));
  assert.equal(h.delays.at(-1), 5000);
});

test('attempt counters carry an expiry date for the Firestore TTL policy', async () => {
  await fails(login('a@b.com', 'nope'));
  const docs = [...h.store.entries()].filter(([k]) => k.startsWith('authLimits/'));
  assert.ok(docs.length >= 2);
  for (const [, v] of docs) assert.ok(v.expireAt instanceof Date && v.expireAt.getTime() > Date.now());
});
