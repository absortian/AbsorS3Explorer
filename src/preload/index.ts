import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { S3Connection } from '../shared/types'

// Custom APIs for renderer
const api = {
  getConnections: () => ipcRenderer.invoke('get-connections'),
  saveConnections: (connections: S3Connection[]) => ipcRenderer.invoke('save-connections', connections),
  listBuckets: (conn: S3Connection) => ipcRenderer.invoke('s3-list-buckets', conn),
  listObjects: (conn: S3Connection, bucket: string, prefix: string) => ipcRenderer.invoke('s3-list-objects', conn, bucket, prefix),
  uploadFile: (conn: S3Connection, bucket: string, localPath: string, key: string, jobId?: string) => ipcRenderer.invoke('s3-upload-file', conn, bucket, localPath, key, jobId),
  downloadFile: (conn: S3Connection, bucket: string, key: string, localDestPath: string, jobId?: string) => ipcRenderer.invoke('s3-download-file', conn, bucket, key, localDestPath, jobId),
  createFolder: (conn: S3Connection, bucket: string, key: string) => ipcRenderer.invoke('s3-create-folder', conn, bucket, key),
  deleteObject: (conn: S3Connection, bucket: string, key: string) => ipcRenderer.invoke('s3-delete-object', conn, bucket, key),
  deleteFolder: (conn: S3Connection, bucket: string, prefix: string) => ipcRenderer.invoke('s3-delete-folder', conn, bucket, prefix),
  showSaveDialog: (defaultPath: string) => ipcRenderer.invoke('show-save-dialog', defaultPath),
  getLocalHome: () => ipcRenderer.invoke('local-get-home'),
  listLocalDir: (dirPath: string) => ipcRenderer.invoke('local-list-dir', dirPath),
  createLocalDir: (dirPath: string, name: string) => ipcRenderer.invoke('local-create-dir', dirPath, name),
  deleteLocalItem: (itemPath: string) => ipcRenderer.invoke('local-delete', itemPath),
  getTheme: () => ipcRenderer.invoke('get-theme'),
  saveTheme: (theme: string) => ipcRenderer.invoke('save-theme', theme),
  getLanguage: () => ipcRenderer.invoke('get-language'),
  saveLanguage: (language: string) => ipcRenderer.invoke('save-language', language),
  exportConnections: () => ipcRenderer.invoke('export-connections'),
  importConnections: () => ipcRenderer.invoke('import-connections'),
  getAppVersion: () => ipcRenderer.invoke('get-app-version'),
  checkForUpdates: () => ipcRenderer.invoke('check-for-updates'),
  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),
  onUpdateStatus: (callback: (_event: unknown, data: unknown) => void) => {
    ipcRenderer.on('update-status', callback)
    return () => ipcRenderer.removeListener('update-status', callback)
  },
  onTransferProgress: (callback: (_event: unknown, data: { jobId: string; loaded: number; total: number }) => void) => {
    ipcRenderer.on('transfer-progress', callback)
    return () => ipcRenderer.removeListener('transfer-progress', callback)
  }
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
