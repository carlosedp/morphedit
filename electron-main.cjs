const { BrowserWindow, Menu, app, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const fs = require('fs');

// Configure auto-updater
autoUpdater.checkForUpdatesAndNotify();

// Auto-updater event handlers
autoUpdater.on('checking-for-update', () => {
  console.log('Checking for update...');
});

autoUpdater.on('update-available', (info) => {
  console.log('Update available:', info);
});

autoUpdater.on('update-not-available', (info) => {
  console.log('Update not available:', info);
});

autoUpdater.on('error', (err) => {
  console.log('Error in auto-updater:', err);
});

autoUpdater.on('download-progress', (progressObj) => {
  let log_message = 'Download speed: ' + progressObj.bytesPerSecond;
  log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
  log_message =
    log_message +
    ' (' +
    progressObj.transferred +
    '/' +
    progressObj.total +
    ')';
  console.log(log_message);
});

autoUpdater.on('update-downloaded', (info) => {
  console.log('Update downloaded:', info);
  autoUpdater.quitAndInstall();
});

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 1220,
    icon: path.join(__dirname, 'public', 'icon.png'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
      preload: path.join(__dirname, 'preload.js'), // Add preload for IPC
      enableRemoteModule: false,
      allowRunningInsecureContent: false,
    },
  });

  win.loadFile(path.join(__dirname, 'dist', 'index.html'));

  // Enable drag and drop for files at the window level
  win.webContents.on('dom-ready', () => {
    // Allow file drops by preventing default behavior and enabling file drops
    win.webContents.executeJavaScript(`
      console.log('Setting up Electron file drop handlers...');

      // Prevent the default drag behaviors
      ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, preventDefaults, false);
      });

      function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
      }

      // Highlight drop area when item is dragged over it
      ['dragenter', 'dragover'].forEach(eventName => {
        document.addEventListener(eventName, () => {
          console.log('Electron: File drag detected');
        }, false);
      });

      ['dragleave', 'drop'].forEach(eventName => {
        document.addEventListener(eventName, () => {
          console.log('Electron: File drag ended');
        }, false);
      });

      console.log('Electron file drop setup complete');
    `);
  });

  // Enable drag and drop for files
  win.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);

    // Allow navigation to blob URLs and data URLs (for audio processing)
    if (parsedUrl.protocol === 'blob:' || parsedUrl.protocol === 'data:') {
      return;
    }

    // Prevent navigation to external URLs
    event.preventDefault();
  });

  // Handle file drops
  win.webContents.on('before-input-event', (event, input) => {
    // Allow all keyboard inputs
  });

  // Handle new windows opened by target="_blank" links
  win.webContents.setWindowOpenHandler(({ url }) => {
    return {
      action: 'allow',
      overrideBrowserWindowOptions: {
        width: 1000,
        height: 1000,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        },
      },
    };
  });

  // Create application menu with File > Open Audio
  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Audio',
          accelerator: 'CmdOrCtrl+O',
          click: () => {
            win.webContents.send('open-audio-dialog');
          },
        },
        {
          label: 'Append Audio',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            win.webContents.send('append-audio-dialog');
          },
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'About',
      submenu: [
        // Open local manual from manual.html
        {
          label: 'Open Manual',
          click: () => {
            const manualWindow = new BrowserWindow({
              width: 1000,
              height: 1000,
              webPreferences: {
                nodeIntegration: false,
                contextIsolation: true,
              },
            });
            manualWindow.loadFile(
              path.join(__dirname, 'public', 'manual.html')
            );
          },
        },
        {
          label: 'Open project GitHub',
          click: () => {
            require('electron').shell.openExternal(
              'https://github.com/carlosedp/morphedit'
            );
          },
        },
        {
          label: 'Open bug report',
          click: () => {
            require('electron').shell.openExternal(
              'https://github.com/carlosedp/morphedit/issues'
            );
          },
        },
        { type: 'separator' },
        { role: 'toggleDevTools' }, // For development purposes
        // {
        //   label: "About MorphEdit",
        //   click: () => {
        //     console.log("Opening About window...");
        //   },
        // },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);

  // IPC handlers for file operations
  ipcMain.handle('show-open-dialog', async (event, options) => {
    const result = await dialog.showOpenDialog(win, {
      filters: [
        {
          name: 'Audio Files',
          extensions: ['mp3', 'wav', 'flac', 'm4a', 'aac', 'ogg', 'wma'],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
      properties: ['openFile', 'multiSelections'],
      ...options,
    });

    return result;
  });

  ipcMain.handle('read-file', async (event, filePath) => {
    try {
      const data = await fs.promises.readFile(filePath);
      return {
        success: true,
        data: Array.from(data),
        path: filePath,
        name: path.basename(filePath),
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  });

  // Auto-updater IPC handlers
  ipcMain.handle('check-for-updates', async () => {
    try {
      const result = await autoUpdater.checkForUpdates();
      return { success: true, result };
    } catch (error) {
      console.error('Check for updates error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('install-update', () => {
    autoUpdater.quitAndInstall();
  });

  // Forward auto-updater events to renderer
  autoUpdater.on('update-available', (info) => {
    win.webContents.send('update-available', info);
  });

  autoUpdater.on('update-downloaded', (info) => {
    win.webContents.send('update-downloaded', info);
  });

  autoUpdater.on('download-progress', (progressObj) => {
    win.webContents.send('download-progress', progressObj);
  });

  return win;
}

app.whenReady().then(() => {
  const mainWindow = createWindow();

  // Check for updates after app is ready (only in production)
  if (!require('electron').app.isPackaged) {
    console.log('Development mode - skipping auto-updater');
  } else {
    // Check for updates 3 seconds after app start
    setTimeout(() => {
      autoUpdater.checkForUpdatesAndNotify();
    }, 3000);
  }

  // Clean up IPC handlers when app is quitting
  app.on('before-quit', () => {
    ipcMain.removeAllListeners();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
