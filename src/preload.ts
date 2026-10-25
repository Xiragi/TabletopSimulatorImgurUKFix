import { ServiceStatus } from './types';
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getDefaultPath: () => ipcRenderer.invoke('app:getDefaultPath'),
  getServiceStatuses: () => ipcRenderer.invoke('net:getServiceStatuses'),
  onServiceStatus: (callback: (status: ServiceStatus) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, status: ServiceStatus) => callback(status);
    ipcRenderer.on('backend:serviceStatus', listener);
    return () => ipcRenderer.removeListener('backend:serviceStatus', listener);
  },
  getProviderInfo: () => ipcRenderer.invoke('app:getProviderInfo'),
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
  openExternal: (url: string) => ipcRenderer.invoke('app:openExternal', url),
  checkForUpdate: () => ipcRenderer.invoke('app:checkForUpdate'),
  checkImgur: () => ipcRenderer.invoke('net:checkImgur'),
  openDirectory: () => ipcRenderer.invoke('dialog:openDirectory'),
  scanDirectory: (path: string) => ipcRenderer.invoke('fs:scanDirectory', path),
  cancelConversions: () => ipcRenderer.invoke('convert:cancel'),
  convertImgur: (dirPath: string, fileId: string, forceRestart: boolean = false, backendId: string = 'auto') => ipcRenderer.invoke('convert:imgur', dirPath, fileId, forceRestart, backendId),
  onConvertProgress: (callback: (fileId: string, completed: number, total: number) => void) => {
    ipcRenderer.on('convert:progress', (event, fileId, completed, total) => callback(fileId, completed, total));
  },
  onBackend: (callback: (fileId: string, provider: { id: string, name: string, temporary: boolean }) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, fileId: string, provider: { id: string, name: string, temporary: boolean }) => callback(fileId, provider);
    ipcRenderer.on('convert:backend', listener);
    return () => ipcRenderer.removeListener('convert:backend', listener);
  },
  onTemporaryFix: (callback: (fileId: string) => void) => {
    const listener = (_event: Electron.IpcRendererEvent, fileId: string) => callback(fileId);
    ipcRenderer.on('convert:temporaryFix', listener);
    return () => ipcRenderer.removeListener('convert:temporaryFix', listener);
  },
  onLog: (callback: (message: string, type: 'info' | 'error' | 'warning') => void) => {
    ipcRenderer.on('backend:log', (event, message, type) => callback(message, type));
  }
});
