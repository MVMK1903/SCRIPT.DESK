// ScriptDesk desktop shell (Windows and Mac). Loads the bundled offline app.
const { app, BrowserWindow, shell, Menu, session, ipcMain, safeStorage } = require('electron');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

// Saving to the hard disk: everything goes under Documents/ScriptDesk
const ROOT = () => path.join(app.getPath('documents'), 'ScriptDesk');
ipcMain.handle('sd:root', () => ROOT());
ipcMain.handle('sd:open', () => shell.openPath(ROOT()));
ipcMain.handle('sd:write', (e, rel, payload) => {
  const root = ROOT();
  const target = path.resolve(root, String(rel).replace(/^[\\/]+/, ''));
  if (target !== root && !target.startsWith(root + path.sep)) throw new Error('Path not allowed');
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, payload && payload.b64 ? Buffer.from(payload.b64, 'base64') : String((payload && payload.text) || ''));
  return true;
});

// ---------- Google sign-in for the desktop app ----------
// OAuth 2.0 for installed apps: the sign-in page opens in the normal browser, Google sends the answer back to a
// one-time address on this computer (127.0.0.1, random port), and PKCE + a random state make sure only this app can
// use it. The long-lived refresh token stays in this main process, encrypted with the operating system's own key store
// (Windows DPAPI / macOS Keychain). The page only ever receives short-lived access tokens.
const GCFG = (() => { try { return JSON.parse(fs.readFileSync(path.join(__dirname, 'google.json'), 'utf8')); } catch (e) { return {}; } })();
const G_SCOPES = 'openid email profile https://www.googleapis.com/auth/drive.appdata';
const G_FILE = () => path.join(app.getPath('userData'), 'google-session.bin');
const G = { at: null, exp: 0, rt: null, profile: null, pending: null };
const b64url = (b) => Buffer.from(b).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
function gLoad() {
  try { if (!safeStorage.isEncryptionAvailable()) return; const s = JSON.parse(safeStorage.decryptString(fs.readFileSync(G_FILE()))); G.rt = s.rt || null; G.profile = s.profile || null; } catch (e) { }
}
function gSave() {
  try {
    if (!G.rt) { fs.rmSync(G_FILE(), { force: true }); return; }
    if (!safeStorage.isEncryptionAvailable()) return; // no key store: stay signed in only until the app closes
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
      const ok = u.searchParams.get('state') === state && !!u.searchParams.get('code');
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store', 'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'" });
      res.end(G_PAGE(ok));
      if (done) return;
      finish();
      if (win && !win.isDestroyed()) { if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
      if (!ok) { reject(Object.assign(new Error(u.searchParams.get('error') || 'state_mismatch'), { code: u.searchParams.get('error') || 'state_mismatch' })); return; }
      try {
        const j = await gTokenCall({ code: u.searchParams.get('code'), code_verifier: verifier, grant_type: 'authorization_code', redirect_uri: redirect });
        const scopes = String(j.scope || '').split(' ');
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
      const q = new URLSearchParams({ client_id: GCFG.desktopClientId, redirect_uri: redirect, response_type: 'code', scope: idOnly ? 'openid email profile' : G_SCOPES, code_challenge: challenge, code_challenge_method: 'S256', state, access_type: idOnly ? 'online' : 'offline', prompt: 'select_account' });
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
ipcMain.handle('sd:g:session', gWrap(async () => ({ configured: !!GCFG.desktopClientId, profile: G.rt ? G.profile : null, keyStore: safeStorage.isEncryptionAvailable() })));
ipcMain.handle('sd:g:signin', gWrap((e, hint, mode) => gSignIn(BrowserWindow.fromWebContents(e.sender), typeof hint === 'string' ? hint.slice(0, 200) : '', mode === 'id' ? 'id' : '')));
ipcMain.handle('sd:g:cancel', gWrap(async () => { if (G.pending) G.pending.cancel('cancelled'); return true; }));
ipcMain.handle('sd:g:token', gWrap(() => gAccess()));
ipcMain.handle('sd:g:signout', gWrap(() => gSignOut()));

// Only web and mail links leave the app; file:, smb:, ms-* and other schemes that could start programs are refused.
function openOutside(url) { try { const u = new URL(url); if (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:') shell.openExternal(u.toString()); } catch (e) { } }
function harden() {
  const ses = session.defaultSession;
  // camera, microphone, location, notifications and the rest are never needed: say no without asking
  const allowed = new Set(['clipboard-sanitized-write', 'clipboard-read']);
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
    const h = d.responseHeaders || {};
    for (const k of Object.keys(h)) if (/^access-control-allow-/i.test(k)) delete h[k];
    h['Access-Control-Allow-Origin'] = [r.o || '*'];
    if (r.o) { h['Access-Control-Allow-Credentials'] = ['true']; h['Vary'] = ['Origin']; }
    h['Access-Control-Allow-Headers'] = [r.rh || 'authorization, content-type, x-api-key, x-goog-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, http-referer, x-title'];
    h['Access-Control-Allow-Methods'] = ['GET, POST, PUT, PATCH, DELETE, OPTIONS'];
    cb(d.method === 'OPTIONS' ? { responseHeaders: h, statusLine: 'HTTP/1.1 204 No Content' } : { responseHeaders: h });
  });
}

app.whenReady().then(() => {
  harden();
  gLoad();
  allowAI();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
