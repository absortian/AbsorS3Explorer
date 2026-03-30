import { useState, useEffect, useCallback } from 'react'
import { X, Sun, Moon, Download, Upload, AlertTriangle, RefreshCw, ExternalLink, RotateCcw } from 'lucide-react'
import { S3Connection } from '../../../shared/types'

interface UpdateStatus {
  status: 'idle' | 'checking' | 'available' | 'up-to-date' | 'downloading' | 'downloaded' | 'error'
  version?: string
  percent?: number
  error?: string
  releasesUrl?: string
}

interface SettingsPanelProps {
  theme: string
  onThemeChange: (theme: string) => void
  onClose: () => void
  onConnectionsImported: (connections: S3Connection[]) => void
}

export default function SettingsPanel({ theme, onThemeChange, onClose, onConnectionsImported }: SettingsPanelProps) {
  const [importError, setImportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)
  const [appVersion, setAppVersion] = useState<string>('')
  const [updateStatus, setUpdateStatus] = useState<UpdateStatus>({ status: 'idle' })

  useEffect(() => {
    window.api.getAppVersion().then(setAppVersion)

    const removeListener = window.api.onUpdateStatus((_event, data) => {
      const d = data as UpdateStatus
      setUpdateStatus((prev) => ({ ...prev, ...d }))
    })

    return removeListener
  }, [])

  const handleCheckUpdates = useCallback(async () => {
    setUpdateStatus({ status: 'checking' })
    try {
      await window.api.checkForUpdates()
    } catch {
      setUpdateStatus({
        status: 'error',
        error: 'No se pudo comprobar actualizaciones.',
        releasesUrl: 'https://github.com/absortian/AbsorS3Explorer/releases'
      })
    }
  }, [])

  const handleDownloadUpdate = useCallback(async () => {
    try {
      await window.api.downloadUpdate()
    } catch {
      setUpdateStatus({
        status: 'error',
        error: 'Error al descargar la actualización.',
        releasesUrl: 'https://github.com/absortian/AbsorS3Explorer/releases'
      })
    }
  }, [])

  const handleInstallUpdate = useCallback(() => {
    window.api.installUpdate()
  }, [])

  const handleThemeChange = (newTheme: string) => {
    onThemeChange(newTheme)
    document.documentElement.dataset.theme = newTheme === 'dark' ? '' : newTheme
    window.api.saveTheme(newTheme)
  }

  const handleExport = async () => {
    setExportSuccess(false)
    const result = await window.api.exportConnections()
    if (result) setExportSuccess(true)
  }

  const handleImport = async () => {
    setImportError(null)
    try {
      const imported = await window.api.importConnections()
      if (imported === null) return // User cancelled
      await window.api.saveConnections(imported)
      onConnectionsImported(imported)
    } catch {
      setImportError('Error al importar: el archivo no tiene un formato válido.')
    }
  }

  return (
    <div className="settings-overlay" onClick={onClose}>
      <div className="settings-panel" onClick={(e) => e.stopPropagation()}>
        <div className="settings-panel-header">
          <h2>Ajustes</h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Updates section */}
        <div className="settings-section">
          <h3>Actualizaciones</h3>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Versión actual</div>
              <div className="settings-row-hint">v{appVersion}</div>
            </div>
          </div>

          {updateStatus.status === 'idle' && (
            <button className="settings-btn" onClick={handleCheckUpdates}>
              <RefreshCw size={16} /> Comprobar actualizaciones
            </button>
          )}

          {updateStatus.status === 'checking' && (
            <button className="settings-btn" disabled>
              <RefreshCw size={16} className="spin" /> Comprobando…
            </button>
          )}

          {updateStatus.status === 'up-to-date' && (
            <>
              <div className="update-message update-success">
                Ya tienes la última versión.
              </div>
              <button className="settings-btn" onClick={handleCheckUpdates}>
                <RefreshCw size={16} /> Comprobar de nuevo
              </button>
            </>
          )}

          {updateStatus.status === 'available' && (
            <>
              <div className="update-message update-info">
                Nueva versión disponible: <strong>v{updateStatus.version}</strong>
              </div>
              <button className="settings-btn" onClick={handleDownloadUpdate}>
                <Download size={16} /> Descargar actualización
              </button>
            </>
          )}

          {updateStatus.status === 'downloading' && (
            <>
              <div className="update-message update-info">
                Descargando… {updateStatus.percent ?? 0}%
              </div>
              <div className="update-progress-track">
                <div
                  className="update-progress-bar"
                  style={{ width: `${updateStatus.percent ?? 0}%` }}
                />
              </div>
            </>
          )}

          {updateStatus.status === 'downloaded' && (
            <>
              <div className="update-message update-success">
                Actualización descargada. Reinicia para aplicar.
              </div>
              <button className="settings-btn" onClick={handleInstallUpdate}>
                <RotateCcw size={16} /> Reiniciar y actualizar
              </button>
            </>
          )}

          {updateStatus.status === 'error' && (
            <>
              <div className="update-message update-error">
                {updateStatus.error}
              </div>
              {updateStatus.releasesUrl && (
                <button
                  className="settings-btn"
                  onClick={() => window.open(updateStatus.releasesUrl, '_blank')}
                >
                  <ExternalLink size={16} /> Descargar desde GitHub
                </button>
              )}
              <button className="settings-btn" onClick={handleCheckUpdates}>
                <RefreshCw size={16} /> Reintentar
              </button>
            </>
          )}
        </div>

        {/* Theme section */}
        <div className="settings-section">
          <h3>Apariencia</h3>
          <div className="settings-row">
            <div>
              <div className="settings-row-label">Tema</div>
              <div className="settings-row-hint">Cambia entre modo claro y oscuro</div>
            </div>
            <div className="theme-toggle">
              <button
                className={theme === 'dark' ? 'active' : ''}
                onClick={() => handleThemeChange('dark')}
              >
                <Moon size={14} /> Oscuro
              </button>
              <button
                className={theme === 'light' ? 'active' : ''}
                onClick={() => handleThemeChange('light')}
              >
                <Sun size={14} /> Claro
              </button>
            </div>
          </div>
        </div>

        {/* Connections import/export section */}
        <div className="settings-section">
          <h3>Conexiones</h3>

          <button className="settings-btn" onClick={handleExport}>
            <Download size={16} /> Exportar conexiones
          </button>
          {exportSuccess && (
            <div style={{ fontSize: '0.78rem', color: '#22c55e', marginTop: '6px', textAlign: 'center' }}>
              Conexiones exportadas correctamente.
            </div>
          )}

          <button className="settings-btn" onClick={handleImport}>
            <Upload size={16} /> Importar conexiones
          </button>
          {importError && (
            <div style={{ fontSize: '0.78rem', color: '#ef4444', marginTop: '6px', textAlign: 'center' }}>
              {importError}
            </div>
          )}

          <div className="settings-warning">
            <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: '1px', color: '#eab308' }} />
            <span>
              El archivo exportado contiene tus claves de acceso (Access Key / Secret Key).
              Guárdalo en un lugar seguro.
              Al importar, las conexiones actuales serán reemplazadas.
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
