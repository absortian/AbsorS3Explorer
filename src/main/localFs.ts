import * as fs from 'fs/promises'
import * as os from 'os'
import * as path from 'path'
import { existsSync } from 'fs'

export async function getLocalHome() {
  return os.homedir()
}

export async function listLocalDir(dirPath: string) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true })
    const folders: string[] = []
    const files: any[] = []

    for (const entry of entries) {
      // Basic filter to ignore some hidden files to keep UI clean
      if (entry.name === '.DS_Store') continue
      
      const fullPath = path.join(dirPath, entry.name)
      try {
        if (entry.isDirectory()) {
          folders.push(entry.name)
        } else if (entry.isFile()) {
           // Use stat for actual size and mtime
           const stats = await fs.stat(fullPath)
           files.push({
             name: entry.name,
             path: fullPath,
             size: stats.size,
             lastModified: stats.mtime
           })
        }
      } catch (e) {
        // Ignore files we can't stat (permissions etc)
      }
    }

    folders.sort()
    files.sort((a, b) => a.name.localeCompare(b.name))

    return {
      currentPath: dirPath,
      folders,
      files
    }
  } catch (error: any) {
    throw new Error(`Failed to read directory: ${error.message}`)
  }
}

export async function createLocalDir(dirPath: string, name: string) {
  const fullPath = path.join(dirPath, name)
  if (existsSync(fullPath)) {
    throw new Error('A folder with that name already exists')
  }
  await fs.mkdir(fullPath)
  return fullPath
}

export async function deleteLocalItem(itemPath: string) {
  const stats = await fs.stat(itemPath)
  if (stats.isDirectory()) {
    await fs.rm(itemPath, { recursive: true })
  } else {
    await fs.unlink(itemPath)
  }
}
