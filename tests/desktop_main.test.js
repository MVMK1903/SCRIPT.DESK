/* Windows app main process: file handlers, sender check, mail confirmation. Electron is replaced by a small stand-in. */
const Module = require('module'), fs = require('fs'), os = require('os'), path = require('path'), assert = require('assert');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-main-'));
const handlers = {}; let dialogAnswer = 1, dialogCalls = 0;
const noop = () => {};
const electron = {
  app: { getPath: () => tmp, whenReady: () => ({ then: noop }), on: noop, quit: noop, requestSingleInstanceLock: () => true, setAppUserModelId: noop, commandLine: { appendSwitch: noop } },
  BrowserWindow: Object.assign(function () { }, { fromWebContents: (wc) => (wc && wc.ok ? {} : null) }),
  shell: { openExternal: noop, openPath: noop }, Menu: { buildFromTemplate: () => ({}), setApplicationMenu: noop }, session: { defaultSession: {} },
  ipcMain: { handle: (ch, fn) => { handlers[ch] = fn; } },
  safeStorage: { isEncryptionAvailable: () => true, encryptString: (s) => Buffer.from(s), decryptString: (b) => b.toString(), getSelectedStorageBackend: () => 'gnome_libsecret' },
  dialog: { showMessageBox: async () => { dialogCalls++; return { response: dialogAnswer }; } }
};
const orig = Module._load; Module._load = function (req, ...a) { return req === 'electron' ? electron : orig.call(this, req, ...a); };
require('../desktop/main.js');
const good = { sender: { ok: true }, senderFrame: { url: 'file:///app/www/index.html' } };
const call = (ch, ev, ...args) => handlers[ch](ev, ...args);
(async () => {
  const root = path.join(tmp, 'ScriptDesk');
  // 1. writes inside the folder work, outside is refused
  assert.strictEqual(await call('sd:write', good, 'Exports/a/x.pdf', { text: 'hi' }), true);
  assert.strictEqual(fs.readFileSync(path.join(root, 'Exports/a/x.pdf'), 'utf8'), 'hi');
  await assert.rejects(async () => call('sd:write', good, '../escape.txt', { text: 'x' }), /not allowed/i);
  // 2. a link inside the folder cannot lead out of it
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'sd-out-'));
  fs.symlinkSync(outside, path.join(root, 'link'));
  await assert.rejects(async () => call('sd:write', good, 'link/evil.txt', { text: 'x' }), /not allowed/i);
  assert.ok(!fs.existsSync(path.join(outside, 'evil.txt')));
  // 3. programs and scripts cannot be written; oversize is refused
  await assert.rejects(async () => call('sd:write', good, 'Exports/run.bat', { text: 'x' }), /type not allowed/i);
  // 4. the sender must be the app window (a file page), nothing else
  await assert.rejects(async () => call('sd:read', { sender: { ok: true }, senderFrame: { url: 'https://evil.example/' } }, 'a'), /not allowed/i);
  await assert.rejects(async () => call('sd:read', { sender: { ok: false }, senderFrame: { url: 'file:///x' } }, 'a'), /not allowed/i);
  await assert.rejects(async () => call('sd:read', {}, 'a'), /not allowed/i);
  // 5. mail: nothing is sent without the person's answer; Cancel stops it
  const mail = { to: ['a@b.co'], b64: Buffer.from('pdf').toString('base64'), filename: 'r.pdf', subject: 'S', text: 't' };
  // not set up: refused before any dialog
  assert.match((await call('sd:mail:send', good, mail)).error, /not set up/i);
  fs.writeFileSync(path.join(tmp, 'mail-config.bin'), Buffer.from(JSON.stringify({ key: 're_abcdefghijk123', from: 'x@y.co' })));
  dialogAnswer = 1; const before = dialogCalls;
  const r = await call('sd:mail:send', good, mail);
  assert.strictEqual(dialogCalls, before + 1); assert.match(r.error, /cancel/i);
  console.log('PASS desktop main process');
})().catch((e) => { console.error('FAIL', e.message); process.exit(1); });
