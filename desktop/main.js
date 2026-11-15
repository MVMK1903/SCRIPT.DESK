// ScriptDesk desktop shell (Windows and Mac). Loads the bundled offline app.
const { app, BrowserWindow, shell, Menu, session, ipcMain, safeStorage, dialog } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// Only the app's own window (a file:// page) may call the bridge. Anything else, such as a subframe, is refused.
const trusted = (e) => !!(e && e.senderFrame && /^file:/i.test(e.senderFrame.url || '') && BrowserWindow.fromWebContents(e.sender));
const _handle = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (ch, fn) => _handle(ch, (e, ...a) => { if (!trusted(e)) throw new Error('Not allowed'); return fn(e, ...a); });
// A secure key store. On Linux without a real keyring Electron falls back to a fixed built-in key; that is not secure, so refuse it.
function keyStoreOk() {
  try {
    if (!safeStorage.isEncryptionAvailable()) return false;
    if (process.platform === 'linux' && typeof safeStorage.getSelectedStorageBackend === 'function') { const b = safeStorage.getSelectedStorageBackend(); if (b === 'basic_text' || b === 'unknown') return false; }
    return true;
  } catch (e) { return false; }
}

// Saving to the hard disk: everything goes under Documents/ScriptDesk
const ROOT = () => path.join(app.getPath('documents'), 'ScriptDesk');
ipcMain.handle('sd:root', () => ROOT());
ipcMain.handle('sd:open', () => shell.openPath(ROOT()));
// Resolve a path under the ScriptDesk folder. Symbolic links are followed before the check, so a link inside the folder cannot lead out of it.
const BLOCKED_EXT = /\.(exe|bat|cmd|com|scr|msi|msp|ps1|psm1|vbs|vbe|js|jse|jar|lnk|dll|sh|reg|hta|url|cpl|pif|wsf|appx|msix|app|command)$/i;
const MAX_WRITE = 200 * 1024 * 1024;
function realRoot() { const r = ROOT(); fs.mkdirSync(r, { recursive: true }); return fs.realpathSync(r); }
function safePath(rel) {
  const root = realRoot();
  const target = path.resolve(root, String(rel).replace(/^[\\/]+/, ''));
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Path not allowed');
  let probe = target;
  while (!fs.existsSync(probe)) { const up = path.dirname(probe); if (up === probe) break; probe = up; }
  const real = fs.realpathSync(probe);
  if (real !== root && !real.startsWith(root + path.sep)) throw new Error('Path not allowed');
  return target;
}
ipcMain.handle('sd:read', (e, rel) => {
  const target = safePath(rel);
  try { return fs.readFileSync(target).toString('base64'); } catch (err) { return null; }
});
ipcMain.handle('sd:del', (e, rel) => {
  const target = safePath(rel);
  try { fs.unlinkSync(target); } catch (err) { }
  return true;
});
ipcMain.handle('sd:write', (e, rel, payload) => {
  const target = safePath(rel);
  if (BLOCKED_EXT.test(target)) throw new Error('File type not allowed');
  const data = payload && payload.b64 ? Buffer.from(String(payload.b64), 'base64') : Buffer.from(String((payload && payload.text) || ''), 'utf8');
  if (data.length > MAX_WRITE) throw new Error('File too large');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, data);
  return true;
});

// ---------- Google sign-in for the desktop app ----------
// OAuth 2.0 for installed apps: the sign-in page opens in the normal browser, Google sends the answer back to a
// one-time address on this computer (127.0.0.1, random port), and PKCE + a random state make sure only this app can
// use it. The long-lived refresh token stays in this main process, encrypted with the operating system's own key store
// (Windows DPAPI / macOS Keychain). The page only ever receives short-lived access tokens.
const GCFG = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'google.json'), 'utf8')); } catch (e) { return {}; } })();
const GMAIL_SCOPES = 'openid email https://www.googleapis.com/auth/gmail.send';
const M = { at: null, exp: 0, rt: null, email: '' }; // Gmail sending session, kept apart from the Drive/sign-in session
const G_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
const G_FILE = () => path.join(app.getPath('userData'), 'google-session.bin');
const G = { at: null, exp: 0, rt: null, profile: null, pending: null };
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function gLoad() {
  try { if (!keyStoreOk()) return; const s = JSON.parse(safeStorage.decryptString(fs.readFileSync(G_FILE()))); G.rt = s.rt || null; G.profile = s.profile || null; } catch (e) { }
}
function gSave() {
  try {
    if (!G.rt) { fs.rmSync(G_FILE(), { force: true }); return; }
    if (!keyStoreOk()) return; // no key store: stay signed in only until the app closes
    fs.writeFileSync(G_FILE(), safeStorage.encryptString(JSON.stringify({ rt: G.rt, profile: G.profile })), { mode: 0o600 });
  } catch (e) { }
}
function gIdProfile(idt) {
  // The id token comes straight from Google's token endpoint over HTTPS, so its claims can be read without a second check.
  const c = JSON.parse(Buffer.from(String(idt).split('.')[1].replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
  if (c.aud !== GCFG.desktopClientId || !/^(https:\/\/)?accounts\.google\.com$/.test(c.iss) || !c.email || c.email_verified === false) throw new Error('bad_token');
  return { sub: String(c.sub), email: String(c.email), name: String(c.name || c.email), picture: /^https:\/\//.test(c.picture || '') ? c.picture : '' };
}
async function gTokenCall(params) {
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams(Object.assign({ client_id: GCFG.desktopClientId, client_secret: GCFG.desktopClientSecret || '' }, params)) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { const e = new Error(j.error || 'token_' + r.status); e.code = j.error; throw e; }
  return j;
}
const G_PAGE = (ok) => `<!doctype html><meta charset="utf-8"><title>ScriptDesk</title><body style="font:16px system-ui;background:#0b1020;color:#e8ecf6;display:flex;align-items:center;justify-content:center;height:100vh;margin:0"><div style="max-width:420px;text-align:center"><h1 style="font-size:22px">${ok ? 'You are signed in to ScriptDesk' : 'Sign-in did not finish'}</h1><p style="opacity:.8">${ok ? 'You can close this tab and go back to the ScriptDesk app.' : 'Close this tab, go back to ScriptDesk and try again.'}</p></div>`;
function gSignIn(win, hint, mode) {
  const idOnly = mode === 'id'; // Firebase accounts: only an identity token is needed, no Drive access and no stored session
  if (!GCFG.desktopClientId) return Promise.reject(Object.assign(new Error('not_configured'), { code: 'not_configured' }));
  if (G.pending) { G.pending.cancel('superseded'); }
  const verifier = b64url(crypto.randomBytes(48));
  const challenge = b64url(crypto.createHash('sha256').update(verifier).digest());
  const state = b64url(crypto.randomBytes(24));
  return new Promise((resolve, reject) => {
    let done = false, redirect = '';
    const srv = http.createServer(async (req, res) => {
      const u = new URL(req.url, 'http://127.0.0.1');
      if (u.pathname !== '/callback') { res.writeHead(404); res.end(); return; }
      if (u.searchParams.get('state') !== state) { res.writeHead(400, { 'Cache-Control': 'no-store' }); res.end(); return; } // not our answer: ignore it
      const ok = !!u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" });
      res.end(G_PAGE(ok));
      if (done) return;
      finish();
      if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
      if (!ok) { reject(Object.assign(new Error(u.searchParams.get('error') || 'state_mismatch'), { code: u.searchParams.get('error') || 'state_mismatch' })); return; }
      try {
        const j = await gTokenCall({ code: u.searchParams.get('code'), code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect });
        const scopes = String(j.scope || '').split(' ');
        if (mode === 'gmail') {
          if (!scopes.includes('https://www.googleapis.com/auth/gmail.send') || !j.refresh_token) throw Object.assign(new Error('scope_denied'), { code: 'scope_denied' });
          const prof = gIdProfile(j.id_token); M.rt = j.refresh_token; M.email = prof.email; M.at = j.access_token; M.exp = Date.now() + (j.expires_in || 3600) * 1000; mSave();
          resolve({ email: M.email }); return;
        }
        if (idOnly) { const prof = gIdProfile(j.id_token); resolve({ profile: prof, idt: j.id_token }); return; }
        G.profile = gIdProfile(j.id_token); G.at = j.access_token; G.exp = Date.now() + (j.expires_in || 3600) * 1000;
        if (j.refresh_token) G.rt = j.refresh_token;
        gSave();
        resolve({ profile: G.profile, at: G.at, exp: G.exp, drive: scopes.includes('https://www.googleapis.com/auth/drive.appdata') });
      } catch (e) { reject(e); }
    });
    const timer = setTimeout(() => { if (!done) { finish(); reject(Object.assign(new Error('timeout'), { code: 'timeout' })); } }, 5 * 60 * 1000);
    function finish() { done = true; clearTimeout(timer); G.pending = null; srv.close(); }
    G.pending = { cancel: (why) => { if (!done) { finish(); reject(Object.assign(new Error(why), { code: why })); } } };
    srv.on('error', (e) => { if (!done) { finish(); reject(e); } });
    srv.listen(0, '127.0.0.1', () => {
      redirect = `http://127.0.0.1:${srv.address().port}/callback`;
      const q = new URLSearchParams({ client_id: GCFG.desktopClientId, redirect_uri: redirect, response_type: 'code', scope: mode === 'gmail' ? GMAIL_SCOPES : (idOnly ? 'openid email profile' : G_SCOPES), code_challenge: challenge, code_challenge_method: 'S256', state, access_type: (idOnly && mode !== 'gmail') ? 'online' : 'offline', prompt: mode === 'gmail' ? 'consent select_account' : 'select_account' });
      if (hint && /^[^@\s]+@[^@\s]+$/.test(hint)) q.set('login_hint', hint);
      shell.openExternal('https://accounts.google.com/o/oauth2/v2/auth?' + q.toString());
    });
  });
}
async function gAccess() {
  if (G.at && Date.now() < G.exp - 60000) return { at: G.at, exp: G.exp };
  if (!G.rt) throw Object.assign(new Error('signed_out'), { code: 'signed_out' });
  try {
    const j = await gTokenCall({ refresh_token: G.rt, grant_type: 'refresh_token' });
    G.at = j.access_token; G.exp = Date.now() + (j.expires_in || 3600) * 1000;
    if (j.id_token) { try { G.profile = gIdProfile(j.id_token); gSave(); } catch (e) { } }
    return { at: G.at, exp: G.exp };
  } catch (e) {
    if (e.code === 'invalid_grant' || e.code === 'unauthorized_client') { G.rt = null; G.at = null; G.profile = null; gSave(); throw Object.assign(new Error('signed_out'), { code: 'signed_out' }); }
    throw Object.assign(new Error('offline'), { code: 'offline' });
  }
}
async function gSignOut() {
  const t = G.rt || G.at; G.rt = null; G.at = null; G.exp = 0; G.profile = null; gSave();
  if (t) { try { await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: t }) }); } catch (e) { } }
  return true;
}
// errors cross to the page as plain codes only
const gWrap = (fn) => async (...a) => { try { return { ok: true, v: await fn(...a) }; } catch (e) { return { ok: false, code: String(e.code || e.message || 'error').slice(0, 60) }; } };
ipcMain.handle('sd:g:session', gWrap(async () => ({ configured: !!GCFG.desktopClientId, profile: G.rt ? G.profile : null, keyStore: keyStoreOk() })));
ipcMain.handle('sd:g:signin', gWrap((e, hint, mode) => gSignIn(BrowserWindow.fromWebContents(e.sender), typeof hint === 'string' ? hint.slice(0, 200) : '', mode === 'id' ? 'id' : '')));
ipcMain.handle('sd:g:cancel', gWrap(async () => { if (G.pending) G.pending.cancel('cancelled'); return true; }));
ipcMain.handle('sd:g:token', gWrap(() => gAccess()));
ipcMain.handle('sd:g:signout', gWrap(() => gSignOut()));

// Only web and mail links leave the app; file:, smb:, ms-* and other schemes that could start programs are refused.
function openOutside(url) { try { const u = new URL(url); if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') shell.openExternal(u.toString()); } catch (e) { } }
function harden() {
  const ses = session.defaultSession;
  // camera, microphone, location, notifications and the rest are never needed: say no without asking
  const allowed = new Set(['clipboard-sanitized-write']); // reading the clipboard silently is not allowed; paste still works from the keyboard and menu
  ses.setPermissionRequestHandler((wc, perm, cb) => cb(allowed.has(perm)));
  ses.setPermissionCheckHandler((wc, perm) => allowed.has(perm));
  app.on('web-contents-created', (e, wc) => {
    wc.on('will-attach-webview', (ev) => ev.preventDefault()); // no embedded browsers
  });
}
function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0d0e12', title: 'ScriptDesk', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, webSecurity: true, allowRunningInsecureContent: false, webviewTag: false, navigateOnDragDrop: false, spellcheck: true }
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  // Links (e.g. console.anthropic.com) open in the normal browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { openOutside(url); return { action: 'deny' }; });
  // The window only ever shows the bundled app. Any other address opens in the browser (web links) or is ignored.
  win.webContents.on('will-navigate', (e, url) => { if (url !== win.webContents.getURL()) { e.preventDefault(); openOutside(url); } });
  win.webContents.on('will-redirect', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); } });
}

if (process.platform === 'darwin') {
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' }]));
} else {
  Menu.setApplicationMenu(Menu.buildFromTemplate([{ role: 'editMenu' }, { role: 'viewMenu' }]));
}
// AI services: let the bundled app talk to cloud AI APIs and to Ollama / LM Studio on this computer.
// Any online AI service (https) plus AI servers on this computer or the office network (Ollama, LM Studio, vLLM...).
const LOCAL_AI = /^http:\/\/(localhost|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)(:\d+)?\//;
const AI_HOSTS = { test: (u) => /^https:\/\//.test(u) || LOCAL_AI.test(u) };
function allowAI() {
  const ses = session.defaultSession;
  // remember what each request asked for, so the answer can allow exactly that (origin, extra headers such as
  // Firebase's x-goog-api-client, and PATCH/DELETE for Drive and Firestore)
  const REQ = new Map();
  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    const h = d.requestHeaders;
    const get = (k) => h[k] || h[k.toLowerCase()];
    if (AI_HOSTS.test(d.url)) {
      REQ.set(d.id, { o: get('Origin'), rh: get('Access-Control-Request-Headers') });
      if (REQ.size > 500) REQ.delete(REQ.keys().next().value);
    }
    if (LOCAL_AI.test(d.url)) { delete h.Origin; delete h.origin; } // Ollama accepts requests without an Origin
    cb({ requestHeaders: h });
  });
  ses.webRequest.onHeadersReceived((d, cb) => {
    if (!AI_HOSTS.test(d.url)) return cb({});
    const r = REQ.get(d.id) || {}; REQ.delete(d.id);
    // Only the bundled app itself (a file:// page, whose origin is "null") is ever given cross-origin access.
    if (r.o && r.o !== 'null' && !r.o.startsWith('file://')) return cb({});
    const h = d.responseHeaders || {};
    for (const k of Object.keys(h)) if (/^access-control-allow-/i.test(k)) delete h[k];
    h['Access-Control-Allow-Origin'] = [r.o || '*'];
    // Cookies are only ever allowed for Google and Firebase, which the app signs in with. Any other site gets no credentialed access.
    let host = ''; try { host = new URL(d.url).hostname; } catch (e) { }
    if (r.o && /(^|\.)(googleapis\.com|google\.com|gstatic\.com|firebaseio\.com|firebaseapp\.com|cloudfunctions\.net|run\.app)$/.test(host)) { h['Access-Control-Allow-Credentials'] = ['true']; h['Vary'] = ['Origin']; }
    h['Access-Control-Allow-Headers'] = [r.rh || 'authorization, content-type, x-api-key, x-goog-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, http-referer, x-title'];
    h['Access-Control-Allow-Methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS'];
    h['Access-Control-Expose-Headers'] = ['retry-after, x-ratelimit-reset-requests, x-ratelimit-reset-tokens, x-ratelimit-remaining-requests'];
    cb(d.method === 'OPTIONS' ? { responseHeaders: h, statusLine: 'HTTP/1.1 204 No Content' } : { responseHeaders: h });
  });
}

app.whenReady().then(() => {
  harden();
  gLoad(); mLoad();
  allowAI();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });


// Gmail: the page can connect a Gmail account (send-only permission), ask who is connected, disconnect, and send. Tokens never reach the page.
const GM_FILE = () => path.join(app.getPath('userData'), 'gmail-session.bin');
function mLoad() { try { if (!keyStoreOk()) return; const s = JSON.parse(safeStorage.decryptString(fs.readFileSync(GM_FILE()))); M.rt = s.rt || null; M.email = s.email || ''; } catch (e) { } }
function mSave() { try { if (!M.rt) { fs.rmSync(GM_FILE(), { force: true }); return; } if (!keyStoreOk()) return; fs.writeFileSync(GM_FILE(), safeStorage.encryptString(JSON.stringify({ rt: M.rt, email: M.email })), { mode: 0o600 }); } catch (e) { } }
async function mAccess() {
  if (M.at && Date.now() < M.exp - 60000) return M.at;
  if (!M.rt) throw Object.assign(new Error('signed_out'), { code: 'signed_out' });
  try { const j = await gTokenCall({ refresh_token: M.rt, grant_type: 'refresh_token' }); M.at = j.access_token; M.exp = Date.now() + (j.expires_in || 3600) * 1000; return M.at; }
  catch (e) { if (e.code === 'invalid_grant' || e.code === 'unauthorized_client') { M.rt = null; M.at = null; M.email = ''; mSave(); throw Object.assign(new Error('signed_out'), { code: 'signed_out' }); } throw Object.assign(new Error('offline'), { code: 'offline' }); }
}
const wrap76 = (s) => s.replace(/(.{76})/g, '$1\r\n');
const hdr = (s) => /^[\x20-\x7e]*$/.test(s) ? s : '=?UTF-8?B?' + Buffer.from(s, 'utf8').toString('base64') + '?=';
function mimeBuild(from, to, subject, text, filename, b64) {
  const bd = 'sd_' + crypto.randomBytes(12).toString('hex');
  const ct = /\.pdf$/i.test(filename) ? 'application/pdf' : /\.xlsx$/i.test(filename) ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'application/octet-stream';
  return [
    'From: ' + from, 'To: ' + to.join(', '), 'Subject: ' + hdr(subject), 'MIME-Version: 1.0', 'Content-Type: multipart/mixed; boundary="' + bd + '"', '',
    '--' + bd, 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap76(Buffer.from(text, 'utf8').toString('base64')),
    '--' + bd, 'Content-Type: ' + ct + '; name="' + filename + '"', 'Content-Disposition: attachment; filename="' + filename + '"', 'Content-Transfer-Encoding: base64', '', wrap76(b64),
    '--' + bd + '--', ''
  ].join('\r\n');
}
ipcMain.handle('sd:mail:gconnect', async (e) => { try { const r = await gSignIn(BrowserWindow.fromWebContents(e.sender), '', 'gmail'); return { ok: true, email: r.email }; } catch (err) { return { error: String(err.code || err.message || 'error').slice(0, 60) }; } });
ipcMain.handle('sd:mail:gdisconnect', async () => { const t = M.rt; M.rt = null; M.at = null; M.email = ''; mSave(); if (t) { try { await fetch('https://oauth2.googleapis.com/revoke', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ token: t }) }); } catch (e) { } } return true; });
// Sending a report by email through Resend (https://resend.com). The API key stays in this process, encrypted with the system key store;
// the page can only save it, clear it, ask whether one exists, and send a mail. It is never handed back to the page.

// AI provider keys: kept encrypted here; the page's storage holds only the settings, never the keys.
const AI_FILE = () => path.join(app.getPath('userData'), 'ai-keys.bin');
function aiLoad() { try { if (!keyStoreOk()) return null; return JSON.parse(safeStorage.decryptString(fs.readFileSync(AI_FILE()))); } catch (e) { return null; } }
ipcMain.on('sd:ai:get', (e) => { e.returnValue = trusted(e) ? { ok: keyStoreOk(), keys: aiLoad() || {} } : { ok: false, keys: {} }; });
ipcMain.on('sd:ai:set', (e, o) => {
  if (!trusted(e) || !keyStoreOk()) { e.returnValue = false; return; }
  try {
    const clean = { k: {}, p: {} };
    for (const [a, b] of Object.entries((o && o.k) || {})) if (typeof b === 'string' && b.length < 512) clean.k[String(a).slice(0, 40)] = b;
    for (const [a, b] of Object.entries((o && o.p) || {})) if (typeof b === 'string' && b.length < 512) clean.p[String(a).slice(0, 64)] = b;
    fs.writeFileSync(AI_FILE(), safeStorage.encryptString(JSON.stringify(clean)), { mode: 0o600 });
    e.returnValue = true;
  } catch (err) { e.returnValue = false; }
});
const MAIL_FILE = () => path.join(app.getPath('userData'), 'mail-config.bin');
const MAIL_SENDS = [];
const MAIL_RE = /^[^\s@,;<>]+@[^\s@,;<>]+\.[^\s@,;<>]+$/;
function mailLoad() { try { if (!keyStoreOk()) return null; return JSON.parse(safeStorage.decryptString(fs.readFileSync(MAIL_FILE()))); } catch (e) { return null; } }
ipcMain.handle('sd:mail:cfg', () => { const c = mailLoad(); return { has: !!(c && c.key && c.from), from: c ? c.from || '' : '', gmail: M.rt ? M.email : '', gmailReady: !!GCFG.desktopClientId, keyStore: keyStoreOk() }; });
ipcMain.handle('sd:mail:save', (e, key, from) => {
  key = String(key || '').trim(); from = String(from || '').trim().slice(0, 200);
  if (!/^re_[A-Za-z0-9_\-]{10,200}$/.test(key)) return { error: 'That does not look like a Resend API key (it starts with re_).' };
  if (!MAIL_RE.test(from.replace(/^.*<([^>]+)>\s*$/, '$1'))) return { error: 'Enter the From address as name@yourdomain.com.' };
  if (!keyStoreOk()) return { error: 'This computer has no secure key store, so the key cannot be saved safely.' };
  fs.writeFileSync(MAIL_FILE(), safeStorage.encryptString(JSON.stringify({ key, from })), { mode: 0o600 }); return { ok: true };
});
ipcMain.handle('sd:mail:clear', () => { try { fs.unlinkSync(MAIL_FILE()); } catch (e) { } return true; });
ipcMain.handle('sd:mail:send', async (e, m) => {
  m = m || {}; const viaGmail = !!M.rt; const c = mailLoad(); if (!viaGmail && (!c || !c.key)) return { error: 'Email is not set up yet.' }; const to = Array.isArray(m.to) ? m.to.map(x => String(x).trim()).filter(Boolean).slice(0, 10) : [];
  if (!to.length || to.some(x => !MAIL_RE.test(x))) return { error: 'Enter a valid email address.' };
  const b64 = String(m.b64 || ''); if (!b64 || b64.length > 30 * 1024 * 1024) return { error: 'The file is empty or too large to email.' };
  const filename = String(m.filename || 'report').replace(/[^\w.\- ]+/g, '_').slice(0, 120);
  const text = String(m.text || '').slice(0, 5000);
  // Rate limit, then ask the person in a window the page cannot reach or click for it.
  const now = Date.now(); MAIL_SENDS.splice(0, MAIL_SENDS.length, ...MAIL_SENDS.filter((t) => now - t < 60000));
  if (MAIL_SENDS.length >= 5) return { error: 'Too many emails in a minute. Wait a moment and try again.' };
  const win = BrowserWindow.fromWebContents(e.sender);
  const ask = await dialog.showMessageBox(win, { type: 'question', buttons: ['Send', 'Cancel'], defaultId: 1, cancelId: 1, noLink: true, title: 'Send this email?', message: 'Send "' + filename + '" by email?', detail: 'To: ' + to.join(', ') + '\nFrom: ' + (viaGmail ? M.email : (c && c.from) || '') + '\nSubject: ' + String(m.subject || 'Report').slice(0, 200) });
  if (ask.response !== 0) return { error: 'Cancelled. The email was not sent.' };
  MAIL_SENDS.push(Date.now());
  if (viaGmail) {
    try {
      const tok = await mAccess();
      const raw = b64url(mimeBuild(M.email, to, String(m.subject || 'Report').slice(0, 200), text || 'Please find the report attached.', filename, b64));
      const r = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send', { method: 'POST', headers: { Authorization: 'Bearer ' + tok, 'Content-Type': 'application/json' }, body: JSON.stringify({ raw }), signal: AbortSignal.timeout(90000) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) return { error: r.status === 403 || r.status === 401 ? 'Gmail refused it. Disconnect and connect Gmail again.' : 'Gmail: ' + String((j.error && j.error.message) || r.status).slice(0, 200) };
      return { ok: true, id: j.id || '' };
    } catch (err) { return { error: err && err.code === 'signed_out' ? 'Gmail is disconnected. Connect it again.' : 'Could not reach Gmail. Check the internet connection.' }; }
  }
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST', headers: { Authorization: 'Bearer ' + c.key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: c.from, to, subject: String(m.subject || 'Report').slice(0, 200), text: text || 'Please find the report attached.', attachments: [{ filename, content: b64 }] }),
      signal: AbortSignal.timeout(60000)
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) return { error: (j && j.message) ? 'Resend: ' + String(j.message).slice(0, 300) : 'The mail service refused it (' + r.status + ').' };
    return { ok: true, id: j.id || '' };
  } catch (err) { return { error: 'Could not reach the mail service. Check the internet connection.' }; }
});
