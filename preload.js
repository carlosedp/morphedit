const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onOpenAudioDialog: (callback) =>
    ipcRenderer.on('open-audio-dialog', callback),
  onAppendAudioDialog: (callback) =>
    ipcRenderer.on('append-audio-dialog', callback),

  // File handling APIs
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

  // Auto-updater APIs
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  onUpdateAvailable: (callback) => ipcRenderer.on('update-available', callback),
  onUpdateDownloaded: (callback) =>
    ipcRenderer.on('update-downloaded', callback),
  onDownloadProgress: (callback) =>
    ipcRenderer.on('download-progress', callback),
  installUpdate: () => ipcRenderer.invoke('install-update'),

  // Utility functions
  isElectron: true,
  platform: process.platform,
});
