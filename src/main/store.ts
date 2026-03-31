import { app, safeStorage } from 'electron'
import * as fs from 'fs/promises'
import * as path from 'path'
import { S3Connection } from '../shared/types'

const STORE_PATH = path.join(app.getPath('userData'), 'connections.json')
const SETTINGS_PATH = path.join(app.getPath('userData'), 'settings.json')

function encryptField(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value
  return safeStorage.encryptString(value).toString('base64')
}

function decryptField(value: string): string {
  if (!safeStorage.isEncryptionAvailable()) return value
  return safeStorage.decryptString(Buffer.from(value, 'base64'))
}

function encryptConnection(conn: S3Connection): S3Connection {
  if (conn.isFolder) return conn
  return {
    ...conn,
    accessKeyId: encryptField(conn.accessKeyId),
    secretAccessKey: encryptField(conn.secretAccessKey),
    _encrypted: true
  }
}

function decryptConnection(conn: S3Connection): S3Connection {
  if (!conn._encrypted || conn.isFolder) {
    const { _encrypted, ...rest } = conn
    return rest
  }
  const { _encrypted, ...rest } = conn
  return {
    ...rest,
    accessKeyId: decryptField(conn.accessKeyId),
    secretAccessKey: decryptField(conn.secretAccessKey)
  }
}

export async function getConnections(): Promise<S3Connection[]> {
  try {
    const data = await fs.readFile(STORE_PATH, 'utf-8')
    const connections: S3Connection[] = JSON.parse(data)
    return connections.map(decryptConnection)
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
    const encrypted = connections.map(encryptConnection)
    await fs.writeFile(STORE_PATH, JSON.stringify(encrypted, null, 2), 'utf-8')
  } catch (error) {
    console.error('Failed to save connections:', error)
    throw error
  }
}

interface Settings {
  theme: 'dark' | 'light'
  language: 'en' | 'es'
}

function getSystemLanguage(): 'en' | 'es' {
  const locale = app.getLocale() // e.g. "es", "es-419", "en-US"
  return locale.startsWith('es') ? 'es' : 'en'
}

async function readSettings(): Promise<Settings> {
  try {
    const data = await fs.readFile(SETTINGS_PATH, 'utf-8')
    const parsed = JSON.parse(data)
    return { theme: 'dark', language: getSystemLanguage(), ...parsed }
  } catch {
    return { theme: 'dark', language: getSystemLanguage() }
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

export async function getLanguage(): Promise<string> {
  const settings = await readSettings()
  return settings.language
}

export async function saveLanguage(language: string): Promise<void> {
  const settings = await readSettings()
  settings.language = language as 'en' | 'es'
  await writeSettings(settings)
}
