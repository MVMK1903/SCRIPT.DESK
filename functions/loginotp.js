'use strict';
// Sign-in code: after the password (or Google), the app asks for a one-time code on every sign-in. The code goes to
// the account's own email (Gmail) or comes as an SMS checked by Firebase phone sign-in. Nothing here hands over a key:
// the answer is only "yes, this person holds the mailbox / phone", which the app needs before it opens.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OPTS, GMAIL_USER, GMAIL_APP_PASSWORD } = require('./config');

const CODE_MINUTES = 5;
const MAX_TRIES = 5;
const MAX_SENDS = 5;            // codes per account per 15 minutes
const SMS_FRESH_SECONDS = 300;  // the SMS check must be this recent
const db = () => admin.firestore();
const codeRef = (uid) => db().doc(`loginCodes/${uid}`);
const hash = (salt, code) => crypto.createHash('sha256').update(salt + code).digest();
const mask = (email) => String(email).replace(/^(.)[^@]*(@.*)$/, '$1•••$2');
const signedIn = (req) => { if (!req.auth) throw new HttpsError('unauthenticated', 'Sign in first.'); return req.auth; };
async function log(uid, t, why) {
  await db().doc(`users/${uid}/activity/${Date.now()}_server_${t}`).set({ t, at: Date.now(), dev: 'server', dn: 'ScriptDesk server', ...(why ? { why } : {}) });
}

exports.loginOtpSend = onCall({ ...OPTS, secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const tok = signedIn(req); const uid = tok.uid;
  const email = tok.token.email;
  if (!email) throw new HttpsError('failed-precondition', 'This account has no email address.');
  const ref = codeRef(uid);
  const prev = (await ref.get()).data() || {};
  const now = Date.now();
  const sends = (prev.sends || []).filter((t) => now - t < 15 * 60000);
  if (sends.length >= MAX_SENDS) throw new HttpsError('resource-exhausted', 'Too many codes asked for. Wait 15 minutes.');
  const code = String(crypto.randomInt(0, 1000000)).padStart(6, '0');
  const salt = crypto.randomBytes(16).toString('hex');
  await ref.set({ h: hash(salt, code).toString('hex'), salt, exp: now + CODE_MINUTES * 60000, tries: 0, sends: [...sends, now] });
  const mail = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() } });
  await mail.sendMail({
    from: `ScriptDesk <${GMAIL_USER.value()}>`,
    to: email,
    subject: `ScriptDesk sign-in code: ${code}`,
    text: `Your ScriptDesk sign-in code is ${code}\n\nIt works for ${CODE_MINUTES} minutes and only once.\n\nIf you did not just sign in, someone may know your password: change it in ScriptDesk now.`
  });
  await log(uid, 'loginsend', 'email');
  return { to: mask(email), minutes: CODE_MINUTES };
});

exports.loginOtpVerify = onCall(OPTS, async (req) => {
  const tok = signedIn(req); const uid = tok.uid;
  const code = String((req.data && req.data.code) || '').replace(/\D/g, '');
  const ref = codeRef(uid);
  const verdict = await db().runTransaction(async (tx) => {
    const d = (await tx.get(ref)).data();
    if (!d || Date.now() > d.exp) return 'expired';
    if ((d.tries || 0) >= MAX_TRIES) return 'tries';
    const ok = code.length === 6 && crypto.timingSafeEqual(hash(d.salt, code), Buffer.from(d.h, 'hex'));
    if (ok) tx.delete(ref); else tx.update(ref, { tries: (d.tries || 0) + 1 });
    return ok ? 'ok' : 'wrong';
  });
  if (verdict === 'expired') throw new HttpsError('deadline-exceeded', 'The code has expired. Send a new one.');
  if (verdict === 'tries') throw new HttpsError('resource-exhausted', 'Too many wrong codes. Send a new one.');
  if (verdict === 'wrong') { await log(uid, 'loginfail', 'email'); throw new HttpsError('permission-denied', 'That code is not right.'); }
  await log(uid, 'loginok', 'email');
  return { ok: true };
});

exports.loginOtpSms = onCall(OPTS, async (req) => {
  const tok = signedIn(req); const uid = tok.uid;
  const user = await admin.auth().getUser(uid);
  const fresh = Date.now() / 1000 - Number(tok.token.auth_time || 0) <= SMS_FRESH_SECONDS;
  if (!user.phoneNumber || tok.token.phone_number !== user.phoneNumber || tok.token.firebase.sign_in_provider !== 'phone' || !fresh) {
    await log(uid, 'loginfail', 'sms');
    throw new HttpsError('permission-denied', 'Confirm the SMS code first.');
  }
  await log(uid, 'loginok', 'sms');
  return { ok: true };
});
