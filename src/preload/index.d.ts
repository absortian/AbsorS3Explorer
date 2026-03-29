import { ElectronAPI } from '@electron-toolkit/preload'
import { S3Connection } from '../shared/types'

declare global {
  interface Window {
    electron: ElectronAPI
    api: {
      getConnections: () => Promise<S3Connection[]>
      saveConnections: (connections: S3Connection[]) => Promise<void>
      listBuckets: (conn: S3Connection) => Promise<string[]>
      listObjects: (conn: S3Connection, bucket: string, prefix: string) => Promise<{ folders: string[], files: Array<{key: string, size: number, lastModified: string}> }>
      uploadFile: (conn: S3Connection, bucket: string, localPath: string, key: string) => Promise<void>
      downloadFile: (conn: S3Connection, bucket: string, key: string, localDestPath: string) => Promise<void>
      createFolder: (conn: S3Connection, bucket: string, key: string) => Promise<void>
      deleteObject: (conn: S3Connection, bucket: string, key: string) => Promise<void>
      showSaveDialog: (defaultPath: string) => Promise<string | null>
      getLocalHome: () => Promise<string>
      listLocalDir: (dirPath: string) => Promise<{ currentPath: string, folders: string[], files: Array<{name: string, path: string, size: number, lastModified: string}> }>
    }
  }
}
