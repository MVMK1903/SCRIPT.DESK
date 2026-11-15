// Gives the app a narrow way to save files into Documents/ScriptDesk. Nothing else of the system is exposed.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sdDisk', {
  root: () => ipcRenderer.invoke('sd:root'),
  write: (rel, payload) => ipcRenderer.invoke('sd:write', rel, payload),
  read: (rel) => ipcRenderer.invoke('sd:read', rel),
  del: (rel) => ipcRenderer.invoke('sd:del', rel),
  open: () => ipcRenderer.invoke('sd:open')
});
// Google sign-in: the page can start a sign-in, ask for a short-lived access token, and sign out. The refresh token never reaches the page.
contextBridge.exposeInMainWorld('sdGoogle', {
  session: () => ipcRenderer.invoke('sd:g:session'),
  signIn: (hint, mode) => ipcRenderer.invoke('sd:g:signin', hint, mode),
  cancel: () => ipcRenderer.invoke('sd:g:cancel'),
  token: () => ipcRenderer.invoke('sd:g:token'),
  signOut: () => ipcRenderer.invoke('sd:g:signout')
});

// Email: save the Resend key (it never comes back), ask whether it is set, and send one report.
contextBridge.exposeInMainWorld('sdMail', {
  cfg: () => ipcRenderer.invoke('sd:mail:cfg'),
  save: (key, from) => ipcRenderer.invoke('sd:mail:save', key, from),
  clear: () => ipcRenderer.invoke('sd:mail:clear'),
  gconnect: () => ipcRenderer.invoke('sd:mail:gconnect'),
  gdisconnect: () => ipcRenderer.invoke('sd:mail:gdisconnect'),
  send: (m) => ipcRenderer.invoke('sd:mail:send', m)
});

// AI keys live in the OS-encrypted store, not in page storage.
contextBridge.exposeInMainWorld('sdKeys', {
  get: () => ipcRenderer.sendSync('sd:ai:get'),
  set: (o) => ipcRenderer.sendSync('sd:ai:set', o)
});
