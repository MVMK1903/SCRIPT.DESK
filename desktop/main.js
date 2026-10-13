// ScriptDesk desktop shell (Windows and Mac). Loads the bundled offline app.
const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');

function createWindow() {
  const win = new BrowserWindow({
    width: 1440, height: 900, minWidth: 900, minHeight: 600,
    backgroundColor: '#0c0d0f', title: 'ScriptDesk', autoHideMenuBar: true,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false, sandbox: true, spellcheck: true }
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
app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
