import { useState } from 'react'
import { X, Sun, Moon, Download, Upload, AlertTriangle } from 'lucide-react'
import { S3Connection } from '../../../shared/types'

interface SettingsPanelProps {
  theme: string
  onThemeChange: (theme: string) => void
  onClose: () => void
  onConnectionsImported: (connections: S3Connection[]) => void
}

export default function SettingsPanel({ theme, onThemeChange, onClose, onConnectionsImported }: SettingsPanelProps) {
  const [importError, setImportError] = useState<string | null>(null)
  const [exportSuccess, setExportSuccess] = useState(false)

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
