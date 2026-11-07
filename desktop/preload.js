// Gives the app a narrow way to save files into Documents/ScriptDesk. Nothing else of the system is exposed.
const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('sdDisk', {
  root: () => ipcRenderer.invoke('sd:root'),
  write: (rel, payload) => ipcRenderer.invoke('sd:write', rel, payload),
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
