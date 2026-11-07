'use strict';
// Stand-ins for Firebase, Firestore, Gmail and Firebase's password check, so the server functions can be tested
// without a network. Loaded before the functions are required.
const Module = require('module');

const store = new Map();           // Firestore: path -> data
const users = new Map();           // Firebase Auth: email -> { uid, password, disabled }
const mails = [];                  // sent emails
const logs = [];                   // every logger call, as text
const delays = [];                 // every wait the functions asked for
const state = { checks: 0, now: Date.now() };

class HttpsError extends Error { constructor(code, message) { super(message); this.code = code; } }
let chain = Promise.resolve();
const docRef = (path) => ({
  path,
  async get() { const d = store.get(path); return { exists: d !== undefined, data: () => (d === undefined ? undefined : structuredClone(d)), ref: docRef(path) }; },
  async set(d) { store.set(path, structuredClone(d)); },
  async update(d) { store.set(path, { ...store.get(path), ...d }); },
  async delete() { store.delete(path); }
});
const firestore = {
  doc: docRef,
  collection(name) {
    const conds = [];
    const q = {
      where(f, op, v) { conds.push([f, op, v]); return q; },
      async get() {
        const docs = [...store.keys()].filter((k) => k.startsWith(name + '/') && k.split('/').length === 2).filter((k) => conds.every(([f, op, v]) => {
          const id = k.split('/')[1]; const val = f === '__id__' ? id : store.get(k)[f];
          return op === '==' ? val === v : op === '>=' ? val >= v : op === '<' ? val < v : false;
        })).map((k) => ({ ref: docRef(k) }));
        return { docs };
      }
    };
    return q;
  },
  runTransaction(fn) { // one at a time, like a real transaction under contention
    const run = chain.then(() => fn({ get: (r) => r.get(), set: (r, d) => { store.set(r.path, structuredClone(d)); } }));
    chain = run.catch(() => {});
    return run;
  },
  async recursiveDelete(ref) { for (const k of [...store.keys()]) if (k === ref.path || k.startsWith(ref.path + '/')) store.delete(k); }
};
const fsFn = () => firestore;
fsFn.FieldPath = { documentId: () => '__id__' };

const authErr = (code) => Object.assign(new Error(code), { code });
const adminStub = {
  initializeApp() {},
  firestore: fsFn,
  auth: () => ({
    async getUserByEmail(e) { if (!users.has(e)) throw authErr('auth/user-not-found'); return { uid: users.get(e).uid, email: e }; },
    async createUser({ email, password, displayName }) { users.set(email, { uid: 'u' + users.size, password, displayName, verified: false }); return {}; },
    async generatePasswordResetLink(e) { if (!users.has(e)) throw authErr('auth/user-not-found'); return `https://reset.example/${e}`; },
    async generateEmailVerificationLink(e) { return `https://verify.example/${e}`; }
  })
};
const text = (a) => { try { return JSON.stringify(a); } catch (e) { return String(a); } };
const stubs = {
  'firebase-admin': adminStub,
  'firebase-functions/v2/https': { HttpsError, onCall: (opts, fn) => fn },
  'firebase-functions/v1': { region: () => ({ auth: { user: () => ({ onCreate: (fn) => fn, onDelete: (fn) => fn }) } }) },
  'firebase-functions/params': { defineSecret: (n) => ({ value: () => 'secret-' + n }) },
  'firebase-functions/logger': { warn: (...a) => logs.push(text(a)), info: (...a) => logs.push(text(a)), error: (...a) => logs.push(text(a)), log: (...a) => logs.push(text(a)) },
  nodemailer: { createTransport: () => ({ sendMail: async (m) => { mails.push(m); } }) }
};
const load = Module._load;
Module._load = function (req, ...rest) { return Object.prototype.hasOwnProperty.call(stubs, req) ? stubs[req] : load.call(this, req, ...rest); };

process.env.WEB_API_KEY = 'test-key';
global.setTimeout = (f, ms) => { delays.push(ms); f(); return 0; };
const realNow = Date.now;
Date.now = () => state.now;
global.fetch = async (url, init) => {
  state.checks++;
  const { email, password } = JSON.parse(init.body);
  const u = users.get(email);
  return u && u.password === password ? { ok: true, status: 200 } : { ok: false, status: 400 };
};

const req = (data, extra) => ({ data, rawRequest: { ip: '1.2.3.4' }, ...(extra || {}) });
const reset = () => { store.clear(); users.clear(); mails.length = 0; logs.length = 0; delays.length = 0; state.checks = 0; state.now = realNow(); };
module.exports = { store, users, mails, logs, delays, state, req, reset, HttpsError };
