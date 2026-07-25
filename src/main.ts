import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import os from 'os';

import { checkImgurConnectivity, uploadProviders } from './services/apiService';
import { convertGame, currentCancelToken, incrementCancelToken } from './services/converterService';
import { scanDirectoryForGames } from './services/scannerService';

function createWindow() {
  const mainWindow = new BrowserWindow({
    width: 1600,
    height: 900,
    icon: path.join(__dirname, '../icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js')
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'renderer/index.html')).catch((err) => {
    console.error('Failed to load renderer/index.html', err);
  });
}

app.whenReady().then(() => {
  ipcMain.handle('app:getDefaultPath', () => {
    const home = os.homedir();
    if (process.platform === 'darwin') {
      return path.join(home, 'Library', 'Tabletop Simulator', 'Mods', 'Workshop');
    } else if (process.platform === 'win32') {
      try {
        const docsPath = app.getPath('documents');
        const finalPath = path.join(docsPath, 'My Games', 'Tabletop Simulator', 'Mods', 'Workshop');
        console.log(`[Debug] Using Windows Documents: ${finalPath}`);
        return finalPath;
      } catch (e) {
        const fallbackPath = path.join(home, 'Documents', 'My Games', 'Tabletop Simulator', 'Mods', 'Workshop');
        console.log(`[Debug] Using Hardcoded Documents: ${fallbackPath}`);
        return fallbackPath;
      }
    } else if (process.platform === 'linux') {
      return path.parse(home).root;
    } else {
      return path.parse(home).root;
    }
  });

  ipcMain.handle('app:getProviderInfo', () => {
    const active = uploadProviders['catbox-url-upload'];
    return {
      id: active.id,
      name: active.name,
      requiresLocalDownload: active.requiresLocalDownload
    };
  });

  ipcMain.handle('net:checkImgur', async () => {
    return await checkImgurConnectivity();
  });

  ipcMain.handle('app:getVersion', () => {
    return app.getVersion();
  });
  
  ipcMain.handle('app:openExternal', (event, url) => {
    shell.openExternal(url);
  });

  ipcMain.handle('app:checkForUpdate', async () => {
    try {
      const res = await fetch('https://api.github.com/repos/Xiragi/TabletopSimulatorImgurFix/releases/latest', {
        headers: { 'User-Agent': 'TableTopSimulatorImgurConverter' }
      });
      if (!res.ok) return null;
      const data = await res.json();
      const latestTag = data.tag_name || '';
      const latestVersion = latestTag.startsWith('v') ? latestTag.substring(1) : latestTag;
      
      const currentVersion = app.getVersion();
      const hasUpdate = latestVersion !== currentVersion && latestVersion !== '';
      
      return { hasUpdate, latestVersion, releaseUrl: data.html_url };
    } catch (e) {
      console.error('Failed to check for updates', e);
      return null;
    }
  });

  let conversionMutex = Promise.resolve();

  ipcMain.handle('convert:cancel', () => {
    incrementCancelToken();
  });

  ipcMain.handle('convert:imgur', async (event, dirPath, fileId, forceRestart = false) => {
    let releaseMutex: () => void;
    const nextMutex = new Promise<void>(r => releaseMutex = r);
    const oldMutex = conversionMutex;
    conversionMutex = oldMutex.then(() => nextMutex);
    
    await oldMutex;

    const token = currentCancelToken;

    try {
      if (token !== currentCancelToken) {
        return { success: false, error: 'Cancelled by user' };
      }
      return await convertGame(dirPath, fileId, event.sender, token, forceRestart);
    } catch (err: any) {
      console.error(err);
      event.sender.send('backend:log', `[${fileId}] Fatal Error: ${err.message}`, 'error');
      return { success: false, error: err.message };
    } finally {
      releaseMutex!();
    }
  });

  ipcMain.handle('dialog:openDirectory', async () => {
    const { canceled, filePaths } = await dialog.showOpenDialog({ properties: ['openDirectory'] });
    return canceled ? null : filePaths[0];
  });

  ipcMain.handle('fs:scanDirectory', async (event, dirPath) => {
    return scanDirectoryForGames(dirPath, event.sender);
  });

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
