// ScriptDesk desktop shell (Windows and Mac). Loads the bundled offline app.
const { app, BrowserWindow, shell, Menu, session, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

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

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0d0e12', title: 'ScriptDesk', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true }
  });
  win.loadFile(path.join(__dirname, 'www', 'index.html'));
  // Links (e.g. console.anthropic.com) open in the normal browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
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
  ses.webRequest.onBeforeSendHeaders((d, cb) => {
    const h = d.requestHeaders;
    if (LOCAL_AI.test(d.url)) { delete h.Origin; delete h.origin; } // Ollama accepts requests without an Origin
    cb({ requestHeaders: h });
  });
  ses.webRequest.onHeadersReceived((d, cb) => {
    if (!AI_HOSTS.test(d.url)) return cb({});
    const h = d.responseHeaders || {};
    for (const k of Object.keys(h)) if (/^access-control-allow-/i.test(k)) delete h[k];
    h['Access-Control-Allow-Origin'] = ['*'];
    h['Access-Control-Allow-Headers'] = ['authorization, content-type, x-api-key, x-goog-api-key, anthropic-version, anthropic-dangerous-direct-browser-access, http-referer, x-title'];
    h['Access-Control-Allow-Methods'] = ['GET, POST, OPTIONS'];
    cb(d.method === 'OPTIONS' ? { responseHeaders: h, statusLine: 'HTTP/1.1 204 No Content' } : { responseHeaders: h });
  });
}

app.whenReady().then(() => {
  allowAI();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
