import { app, shell, BrowserWindow, ipcMain, dialog } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { getConnections, saveConnections } from './store'
import { listBuckets, listObjects, uploadFile, downloadFile, createFolder, deleteObject } from './s3'
import { S3Connection } from '../shared/types'
import { getLocalHome, listLocalDir } from './localFs'


function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // IPC handlers
  ipcMain.handle('get-connections', async () => {
    return await getConnections()
  })

  ipcMain.handle('save-connections', async (_, connections: S3Connection[]) => {
    await saveConnections(connections)
  })

  // S3 IPC handlers
  ipcMain.handle('s3-list-buckets', async (_, conn: S3Connection) => await listBuckets(conn))
  ipcMain.handle('s3-list-objects', async (_, conn: S3Connection, bucket: string, prefix: string) => await listObjects(conn, bucket, prefix))
  ipcMain.handle('s3-upload-file', async (_, conn: S3Connection, bucket: string, localPath: string, key: string) => await uploadFile(conn, bucket, localPath, key))
  ipcMain.handle('s3-download-file', async (_, conn: S3Connection, bucket: string, key: string, localDestPath: string) => await downloadFile(conn, bucket, key, localDestPath))
  ipcMain.handle('s3-create-folder', async (_, conn: S3Connection, bucket: string, key: string) => await createFolder(conn, bucket, key))
  ipcMain.handle('s3-delete-object', async (_, conn: S3Connection, bucket: string, key: string) => await deleteObject(conn, bucket, key))
  
  // Local FS IPC handlers
  ipcMain.handle('local-get-home', async () => await getLocalHome())
  ipcMain.handle('local-list-dir', async (_, dirPath: string) => await listLocalDir(dirPath))
  ipcMain.handle('show-save-dialog', async (_, defaultPath: string) => {
    const mainWindow = BrowserWindow.getAllWindows()[0]
    const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, { defaultPath })
    if (canceled) return null
    return filePath
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
