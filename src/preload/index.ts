import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { S3Connection } from '../shared/types'

// Custom APIs for renderer
const api = {
  getConnections: () => ipcRenderer.invoke('get-connections'),
  saveConnections: (connections: S3Connection[]) => ipcRenderer.invoke('save-connections', connections),
  listBuckets: (conn: S3Connection) => ipcRenderer.invoke('s3-list-buckets', conn),
  listObjects: (conn: S3Connection, bucket: string, prefix: string) => ipcRenderer.invoke('s3-list-objects', conn, bucket, prefix),
  uploadFile: (conn: S3Connection, bucket: string, localPath: string, key: string) => ipcRenderer.invoke('s3-upload-file', conn, bucket, localPath, key),
  downloadFile: (conn: S3Connection, bucket: string, key: string, localDestPath: string) => ipcRenderer.invoke('s3-download-file', conn, bucket, key, localDestPath),
  createFolder: (conn: S3Connection, bucket: string, key: string) => ipcRenderer.invoke('s3-create-folder', conn, bucket, key),
  deleteObject: (conn: S3Connection, bucket: string, key: string) => ipcRenderer.invoke('s3-delete-object', conn, bucket, key),
  showSaveDialog: (defaultPath: string) => ipcRenderer.invoke('show-save-dialog', defaultPath),
  getLocalHome: () => ipcRenderer.invoke('local-get-home'),
  listLocalDir: (dirPath: string) => ipcRenderer.invoke('local-list-dir', dirPath)
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
