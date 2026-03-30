import { app } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { S3Connection } from '../shared/types'

const STORE_PATH = path.join(app.getPath('userData'), 'connections.json')
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')

export async function getConnections(): Promise<S3Connection[]> {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf-8')
    return JSON.parse(data)
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return [] // File doesn't exist yet
    }
    console.error('Failed to read connections:', error)
    return []
  }
}

export async function saveConnections(connections: S3Connection[]): Promise<void> {
  try {
    await fs.writeFile(STORE_PATH, JSON.stringify(connections, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save connections:', error)
    throw error
  }
}

interface Settings {
  theme: 'dark' | 'light'
}

async function readSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8')
    return JSON.parse(data)
  } catch {
    return { theme: 'dark' }
  }
}

async function writeSettings(settings: Settings): Promise<void> {
  await fs.writeFile(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8')
}

export async function getTheme(): Promise<string> {
  const settings = await readSettings()
  return settings.theme
}

export async function saveTheme(theme: string): Promise<void> {
  const settings = await readSettings()
  settings.theme = theme as 'dark' | 'light'
  await writeSettings(settings)
}
