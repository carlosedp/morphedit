const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenAudioDialog: (callback) => ipcRenderer.on('open-audio-dialog', callback),
  onAppendAudioDialog: (callback) => ipcRenderer.on('append-audio-dialog', callback),

  // File handling APIs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // Utility functions
  isElectron: true,
  platform: process.platform
});
