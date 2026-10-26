// Gives the app a narrow way to save files into Documents/ScriptDesk. Nothing else of the system is exposed.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sdDisk', {
  root: () => ipcRenderer.invoke('sd:root'),
  write: (rel, payload) => ipcRenderer.invoke('sd:write', rel, payload),
  open: () => ipcRenderer.invoke('sd:open')
});
