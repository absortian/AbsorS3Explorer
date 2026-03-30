import { useState, useEffect } from 'react'
import { Menu, Settings } from 'lucide-react'
import './assets/main.css'
import ConnectionsSidebar from './components/ConnectionsSidebar'
import S3Explorer from './components/S3Explorer'
import LocalExplorer from './components/LocalExplorer'
import TransferQueueBar from './components/TransferQueueBar'
import SettingsPanel from './components/SettingsPanel'
import { S3Connection } from '../../shared/types'
import logo from './assets/icon.png'

function App(): React.JSX.Element {
  const [activeConnection, setActiveConnection] = useState<S3Connection | null>(null)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [s3Location, setS3Location] = useState({ bucket: '', prefix: '' })
  const [localCurrentPath, setLocalCurrentPath] = useState('')
  const [theme, setTheme] = useState('dark')
  const [showSettings, setShowSettings] = useState(false)
  const [connectionsKey, setConnectionsKey] = useState(0)

  useEffect(() => {
    window.api.getTheme().then((saved) => {
      setTheme(saved)
      if (saved !== 'dark') {
        document.documentElement.dataset.theme = saved
      }
    })
  }, [])

  const handleSelectConnection = (conn: S3Connection) => {
    setActiveConnection(conn)
    setSidebarOpen(false) // Auto-hide menu once selected
  }

  return (
    <div className={`app-layout ${!sidebarOpen ? 'sidebar-closed' : ''}`}>
      {/* Sidebar for Connections */}
      <ConnectionsSidebar key={connectionsKey} isOpen={sidebarOpen} onSelectConnection={handleSelectConnection} />

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
             <button className="btn-icon" onClick={() => setSidebarOpen(!sidebarOpen)} title="Toggle Connections">
               <Menu size={20} />
             </button>
             <img src={logo} alt="Absor" style={{ height: '28px', borderRadius: '6px' }} />
             <h2 style={{ fontSize: '1.2rem', fontWeight: 600 }}>Absor S3 Explorer</h2>
             {activeConnection && (
               <>
                 <span style={{ color: 'var(--text-muted)' }}>/</span>
                 <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{activeConnection.name}</span>
               </>
             )}
          </div>
          <button className="btn-icon" onClick={() => setShowSettings(true)} title="Ajustes">
            <Settings size={20} />
          </button>
        </header>

        <section className="content-area animate-fade-in" style={{ padding: activeConnection ? 0 : '24px' }}>
          {!activeConnection ? (
            <div className="glass-panel" style={{ padding: '40px', textAlign: 'center', marginTop: '10vh' }}>
              <img src={logo} alt="Absor" style={{ height: '64px', borderRadius: '12px', marginBottom: '20px' }} />
              <h1 style={{ fontSize: '1.8rem', marginBottom: '12px' }}>Welcome to Absor Explorer</h1>
              <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0 auto', lineHeight: '1.6' }}>
                Connect to any S3-compatible blob storage, organize your connections, and seamlessly drag & drop files between your Mac and the cloud.
              </p>
            </div>
          ) : (
            <div className="split-view" style={{ display: 'flex', height: '100%', width: '100%' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <LocalExplorer activeConnection={activeConnection} s3Location={s3Location} onPathChange={setLocalCurrentPath} />
              </div>
              <div style={{ flex: 1, minWidth: 0, borderLeft: '1px solid var(--border-light)' }}>
                <S3Explorer 
                  key={activeConnection.id} 
                  connection={activeConnection} 
                  localCurrentPath={localCurrentPath}
                  onLocationChange={(bucket, prefix) => setS3Location({ bucket, prefix })}
                />
              </div>
            </div>
          )}
        </section>
      </main>
      
      {/* Bottom Queue Bar */}
      <TransferQueueBar />

      {/* Settings Panel */}
      {showSettings && (
        <SettingsPanel
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setShowSettings(false)}
          onConnectionsImported={() => setConnectionsKey((k) => k + 1)}
        />
      )}
    </div>
  )
}

export default App
