'use strict';
// Sign-in gate, safe sign-up and account triggers.
//
// loginGate  - the app sends the email and password here BEFORE it signs in with Firebase. The server checks them with
//              Firebase, counts wrong tries (5 in a row lock the account for 15 minutes), slows each wrong try a little
//              more, limits each address to 10 tries a minute, and answers with the same words for every failure.
// signupGate - creates an account (or, if the email already has one, emails a "you already have an account" note) and
//              answers the same way both times, so nobody can use the form to find out who is registered.
// onUserCreate / onUserDelete - keep a small non-sensitive profile (plan, preferences) and clean up on deletion.
//
// Nothing here ever logs a password, a code or a reset link.
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const v1 = require('firebase-functions/v1');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OPTS, GMAIL_USER, GMAIL_APP_PASSWORD } = require('./config');
const { loginInput, signupInput } = require('./validate');

const WRONG = 'Incorrect email or password';   // the only words a failed sign-in ever gets
const LOCK_AFTER = 5;                           // wrong tries in a row
const LOCK_MS = 15 * 60000;
const IP_MAX = 10;                              // sign-in tries per address per minute
const IP_WINDOW_MS = 60000;
const SIGNUP_MAX = 5;                           // sign-ups per address per hour
const SIGNUP_WINDOW_MS = 3600000;
const MAX_DELAY_MS = 5000;
const SIGNUP_MIN_MS = 3000;                     // sign-up always takes at least this long, new email or not
const MAIL_GAP_MS = 10 * 60000;                 // at most one sign-up email per address in this time
const keepUntil = (ms) => new Date(Date.now() + ms); // for the Firestore TTL policy on authLimits.expireAt

const db = () => admin.firestore();
const sha = (s) => crypto.createHash('sha256').update(String(s)).digest('hex');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const ipHash = (req) => sha((req.rawRequest && req.rawRequest.ip) || 'unknown').slice(0, 32);
const wrong = () => new HttpsError('unauthenticated', WRONG);
/** wait time after the nth wrong try in a row: 0.5s, 1s, 2s, 4s, then 5s */
const delayFor = (n) => Math.min(MAX_DELAY_MS, 500 * 2 ** Math.max(0, n - 1));

/** counts a try in a time window; false when the limit is passed */
async function hit(key, max, windowMs) {
  const ref = db().doc(`authLimits/${key}`);
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const now = Date.now();
    const fresh = d.start && now - d.start < windowMs;
    const n = fresh ? d.n + 1 : 1;
    tx.set(ref, { start: fresh ? d.start : now, n, expireAt: keepUntil(windowMs * 2) });
    return n <= max;
  });
}

/**
 * Takes one of the account's tries BEFORE the password is checked, so many tries sent at once still only get five.
 * Returns { ok, n }.
 */
async function reserve(ref) {
  return db().runTransaction(async (tx) => {
    const snap = await tx.get(ref);
    const d = snap.exists ? snap.data() : {};
    const now = Date.now();
    if (d.until && d.until > now) return { ok: false, n: LOCK_AFTER };
    const base = now - (d.at || 0) >= LOCK_MS ? 0 : d.n || 0;
    const n = base + 1;
    if (n > LOCK_AFTER) {
      tx.set(ref, { n: LOCK_AFTER, until: now + LOCK_MS, at: now, expireAt: keepUntil(LOCK_MS * 2) });
      return { ok: false, n: LOCK_AFTER };
    }
    tx.set(ref, { n, until: 0, at: now, expireAt: keepUntil(LOCK_MS * 2) });
    return { ok: true, n };
  });
}

async function mail(to, subject, text) {
  const t = nodemailer.createTransport({ service: 'gmail', auth: { user: GMAIL_USER.value(), pass: GMAIL_APP_PASSWORD.value() } });
  await t.sendMail({ from: `ScriptDesk <${GMAIL_USER.value()}>`, to, subject, text });
}

/** asks Firebase whether the password is right. true / false, or throws when Firebase cannot be asked. */
async function passwordIsRight(email, password) {
  const key = process.env.WEB_API_KEY;
  if (!key) {
    logger.error('WEB_API_KEY is not set on the server');
    throw new HttpsError('internal', 'Sign-in is not set up on the server.');
  }
  const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password, returnSecureToken: false })
  });
  if (r.ok) return true;
  if (r.status === 400) return false; // wrong password, no such account, disabled account, or Firebase's own throttle
  logger.error('Firebase password check failed', { status: r.status });
  throw new HttpsError('unavailable', 'Could not check the sign-in.');
}

/** the lockout notice with a reset link; goes only to an address that has an account, and says nothing otherwise */
async function sendLockNotice(email) {
  try {
    const link = await admin.auth().generatePasswordResetLink(email);
    await mail(
      email,
      'ScriptDesk: wrong passwords were entered on your account',
      `Several wrong passwords were just entered for your ScriptDesk account, so sign-in is paused for 15 minutes.\n\n` +
        `If this was you, wait 15 minutes and try again, or reset your password now:\n${link}\n\n` +
        `If this was not you, reset your password with the link above.`
    );
  } catch (e) {
    logger.info('lock notice not sent', { reason: (e && e.code) || 'error' });
  }
}

exports.loginGate = onCall({ ...OPTS, secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const ip = ipHash(req);
  const p = loginInput.safeParse(req.data);
  if (!p.success) {
    logger.warn('loginGate: invalid input', { fields: p.error.issues.map((i) => i.path.join('.')), ip });
    throw wrong();
  }
  const { email, password } = p.data;
  if (!(await hit(`ip_${ip}`, IP_MAX, IP_WINDOW_MS))) {
    logger.warn('loginGate: too many tries from one address', { ip });
    await sleep(delayFor(LOCK_AFTER));
    throw wrong();
  }
  const ref = db().doc(`authLimits/acct_${sha(email)}`);
  const slot = await reserve(ref);
  if (!slot.ok) {
    logger.warn('loginGate: account paused', { acct: sha(email).slice(0, 8), ip });
    await sleep(delayFor(LOCK_AFTER));
    throw wrong();
  }
  if (await passwordIsRight(email, password)) {
    await ref.delete();
    return { ok: true };
  }
  if (slot.n >= LOCK_AFTER) {
    await ref.set({ n: LOCK_AFTER, until: Date.now() + LOCK_MS, at: Date.now(), expireAt: keepUntil(LOCK_MS * 2) });
    logger.warn('loginGate: account paused after wrong passwords', { acct: sha(email).slice(0, 8), ip });
    // the email is sent while the usual wait runs, so an address with an account and one without answer equally slowly
    await Promise.all([sendLockNotice(email), sleep(delayFor(slot.n))]);
    throw wrong();
  }
  await sleep(delayFor(slot.n));
  throw wrong();
});

exports.signupGate = onCall({ ...OPTS, secrets: [GMAIL_USER, GMAIL_APP_PASSWORD] }, async (req) => {
  const ip = ipHash(req);
  const p = signupInput.safeParse(req.data);
  if (!p.success) {
    logger.warn('signupGate: invalid input', { fields: p.error.issues.map((i) => i.path.join('.')), ip });
    throw new HttpsError('invalid-argument', 'Check your details and try again.');
  }
  if (!(await hit(`signup_${ip}`, SIGNUP_MAX, SIGNUP_WINDOW_MS))) {
    logger.warn('signupGate: too many sign-ups from one address', { ip });
    throw new HttpsError('resource-exhausted', 'Try again later.');
  }
  const started = Date.now();
  const { email, password, name } = p.data;
  const mayMail = await hit(`mail_${sha(email)}`, 1, MAIL_GAP_MS); // no mail floods to someone else's address
  let existing = null;
  try {
    existing = await admin.auth().getUserByEmail(email);
  } catch (e) {
    if (!e || e.code !== 'auth/user-not-found') throw new HttpsError('internal', 'Could not create the account. Try again.');
  }
  try {
    if (existing) {
      if (mayMail) {
        const link = await admin.auth().generatePasswordResetLink(email);
        await mail(
        email,
        'ScriptDesk: you already have an account',
        `Someone, maybe you, tried to create a ScriptDesk account with this email, which already has one.\n\n` +
          `Sign in as usual, or reset your password:\n${link}\n\nIf this was not you, you can ignore this email.`
        );
      }
    } else {
      await admin.auth().createUser({ email, password, emailVerified: false, ...(name ? { displayName: name } : {}) });
      const link = await admin.auth().generateEmailVerificationLink(email);
      await mail(email, 'Confirm your ScriptDesk account', `Welcome to ScriptDesk.\n\nConfirm your email to finish setting up:\n${link}\n\nIf this was not you, ignore this email.`);
    }
  } catch (e) {
    logger.error('signupGate failed', { reason: (e && e.code) || 'error' });
    throw new HttpsError('internal', 'Could not create the account. Try again.');
  }
  await sleep(Math.max(0, SIGNUP_MIN_MS - (Date.now() - started))); // same time taken whether the email was new or not
  return { ok: true }; // the same answer whether the email was new or not
});

// A small, non-sensitive profile for each account: user id, plan, preferences. Never a password or a token.
const REGION = 'asia-south1';
exports.onUserCreate = v1.region(REGION).auth.user().onCreate(async (user) => {
  await db().doc(`profiles/${user.uid}`).set({ plan: 'free', prefs: {}, createdAt: Date.now() });
});

exports.onUserDelete = v1.region(REGION).auth.user().onDelete(async (user) => {
  const uid = user.uid;
  const d = db();
  await d.recursiveDelete(d.doc(`users/${uid}`));
  await Promise.all([d.doc(`profiles/${uid}`).delete(), d.doc(`publicKeys/${uid}`).delete()]);
  const keys = await d.collection('otpKeys').where('owner', '==', uid).get();
  await Promise.all(keys.docs.map((k) => k.ref.delete()));
  const FP = admin.firestore.FieldPath;
  const codes = await d.collection('otpCodes').where(FP.documentId(), '>=', `${uid}_`).where(FP.documentId(), '<', `${uid}_`).get();
  await Promise.all(codes.docs.map((c) => c.ref.delete()));
  logger.info('account data removed', { uid });
});
