'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const h = require('./helpers');
const { loginOtpSend, loginOtpVerify, loginOtpSms } = require('../loginotp');

const auth = (extra = {}) => ({ uid: 'u1', token: { email: 'a@b.com', email_verified: true, auth_time: Date.now() / 1000, firebase: { sign_in_provider: 'password' }, ...extra } });
const call = (fn, data, a) => fn({ data: data || {}, auth: a === null ? undefined : (a || auth()), rawRequest: { ip: '1.2.3.4' } });
const fails = async (p) => { try { await p; } catch (e) { return e; } assert.fail('expected a failure'); };
const lastCode = () => /is (\d{6})/.exec(h.mails[h.mails.length - 1].text)[1];

test.beforeEach(() => h.reset());

test('needs a signed-in account', async () => {
  assert.equal((await fails(call(loginOtpSend, {}, null))).code, 'unauthenticated');
  assert.equal((await fails(call(loginOtpVerify, { code: '123456' }, null))).code, 'unauthenticated');
});

test('emails a code to the account address only, and the right code passes once', async () => {
  const r = await call(loginOtpSend, { to: 'evil@x.com' });
  assert.equal(h.mails.length, 1); assert.equal(h.mails[0].to, 'a@b.com'); assert.match(r.to, /^a•••@b\.com$/);
  const code = lastCode();
  assert.deepEqual(await call(loginOtpVerify, { code }), { ok: true });
  assert.equal((await fails(call(loginOtpVerify, { code }))).code, 'deadline-exceeded'); // used up
});

test('a wrong code is refused and five wrong tries end the code', async () => {
  await call(loginOtpSend, {}); const code = lastCode();
  for (let i = 0; i < 5; i++) assert.equal((await fails(call(loginOtpVerify, { code: '000000' === code ? '111111' : '000000' }))).code, 'permission-denied');
  assert.equal((await fails(call(loginOtpVerify, { code }))).code, 'resource-exhausted');
});

test('an expired code is refused', async () => {
  await call(loginOtpSend, {}); const code = lastCode();
  h.state.now += 6 * 60000;
  assert.equal((await fails(call(loginOtpVerify, { code }))).code, 'deadline-exceeded');
});

test('only five codes are sent in 15 minutes', async () => {
  for (let i = 0; i < 5; i++) await call(loginOtpSend, {});
  assert.equal((await fails(call(loginOtpSend, {}))).code, 'resource-exhausted');
});

test('one account cannot use the code of another', async () => {
  await call(loginOtpSend, {}); const code = lastCode();
  assert.equal((await fails(call(loginOtpVerify, { code }, { uid: 'u2', token: auth().token }))).code, 'deadline-exceeded');
});

test('SMS passes only after a fresh phone sign-in on the registered number', async () => {
  assert.equal((await fails(call(loginOtpSms, {}))).code, 'permission-denied'); // password sign-in only
});

test('SMS: fresh phone sign-in on the registered number passes, an old or other number does not', async () => {
  h.phones.set('u1', '+919876543210');
  const phone = (extra) => auth({ phone_number: '+919876543210', firebase: { sign_in_provider: 'phone' }, ...extra });
  assert.deepEqual(await call(loginOtpSms, {}, { uid: 'u1', token: phone().token }), { ok: true });
  assert.equal((await fails(call(loginOtpSms, {}, { uid: 'u1', token: phone({ auth_time: Date.now() / 1000 - 900 }).token }))).code, 'permission-denied');
  assert.equal((await fails(call(loginOtpSms, {}, { uid: 'u1', token: phone({ phone_number: '+911111111111' }).token }))).code, 'permission-denied');
});
