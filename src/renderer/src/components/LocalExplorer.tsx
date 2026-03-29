import React, { useState, useEffect } from 'react'
import { Folder, File, ArrowLeft, RefreshCw, HardDrive } from 'lucide-react'
import { useTransferQueue } from '../context/TransferQueueContext'

import { S3Connection } from '../../../shared/types'
import { CloudUpload } from 'lucide-react'

interface LocalExplorerProps {
  activeConnection: S3Connection | null
  s3Location: { bucket: string; prefix: string }
}

interface ContextMenuState {
  x: number
  y: number
  file: any
}

const CONTEXT_MENU_WIDTH = 190
const CONTEXT_MENU_HEIGHT = 48
const CONTEXT_MENU_GUTTER = 4

const getContextMenuPosition = (mouseX: number, mouseY: number) => {
  const x = Math.min(mouseX, window.innerWidth - CONTEXT_MENU_WIDTH - CONTEXT_MENU_GUTTER)
  const y = Math.max(CONTEXT_MENU_GUTTER, Math.min(mouseY - CONTEXT_MENU_HEIGHT, window.innerHeight - CONTEXT_MENU_HEIGHT - CONTEXT_MENU_GUTTER))
  return { x, y }
}

export default function LocalExplorer({ activeConnection, s3Location }: LocalExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string>('')
  const [folders, setFolders] = useState<string[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const { addJob } = useTransferQueue()

  useEffect(() => {
    const handleClick = () => setContextMenu(null)
    window.addEventListener('click', handleClick)
    return () => window.removeEventListener('click', handleClick)
  }, [])

  useEffect(() => {
    // Initial load: get user home directory and list it
    window.api.getLocalHome().then(homePath => {
      loadDirectory(homePath)
    }).catch(err => setError(err.message))
  }, [])

  const loadDirectory = async (dirPath: string) => {
    setLoading(true)
    setError('')
    try {
      const result = await window.api.listLocalDir(dirPath)
      setCurrentPath(result.currentPath)
      setFolders(result.folders)
      setFiles(result.files)
    } catch (err: any) {
      setError(err.message || 'Failed to list directory')
    } finally {
      setLoading(false)
    }
  }

  const navigateUp = () => {
    if (!currentPath) return
    // Simple path manipulation for up directory
    const parts = currentPath.split(/\\|\//).filter(Boolean)
    if (parts.length <= 1) {
       // On mac/linux / is root. On windows C:\
       // We'll just do a very simple approach, if Windows it might be drive root
       if (currentPath.includes(':\\') && parts.length === 1) return // Already at root
       loadDirectory('/')
       return
    }
    
    parts.pop()
    const newPath = currentPath.startsWith('/') 
      ? '/' + parts.join('/') 
      : parts.join('/') + (currentPath.includes('\\') ? '\\' : '/')
      
    loadDirectory(newPath)
  }

  const navigateTo = (folderName: string) => {
    // Basic join. Should ideally use proper path join via IPC if things get complex, 
    // but a string concat is usually fine for a simple explorer.
    const separator = currentPath.includes('\\') ? '\\' : '/'
    const newPath = currentPath.endsWith(separator) 
      ? `${currentPath}${folderName}` 
      : `${currentPath}${separator}${folderName}`
    
    loadDirectory(newPath)
  }

  // Set file path as dataTransfer property to upload from here
  const handleDragStart = (e: React.DragEvent, filePath: string) => {
    e.dataTransfer.setData('text/plain', filePath) // Fallback payload
    // Setting custom type to identify it's an internal drag
    e.dataTransfer.setData('application/x-local-file', filePath)
    e.dataTransfer.effectAllowed = 'copy'
  }

  const handleContextMenu = (e: React.MouseEvent, file: any) => {
    e.preventDefault()
    e.stopPropagation()
    const position = getContextMenuPosition(e.clientX, e.clientY)
    setContextMenu({ ...position, file })
  }

  const handleCopyToS3 = () => {
    if (!contextMenu || !activeConnection || !s3Location.bucket) return
    const { file } = contextMenu
    const key = `${s3Location.prefix}${file.name}`
    addJob({
      type: 'upload',
      sourcePath: file.path,
      destPath: key,
      fileName: file.name,
      connectionId: activeConnection.id,
      bucket: s3Location.bucket
    })
    setContextMenu(null)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    
    // Check if it's from S3
    const s3PayloadString = e.dataTransfer.getData('application/x-s3-file')
    if (s3PayloadString) {
       try {
         const { key, bucket, connectionId } = JSON.parse(s3PayloadString)
         const fileName = key.split('/').pop() || 'download'
         const separator = currentPath.includes('\\') ? '\\' : '/'
         const destPath = currentPath.endsWith(separator) 
           ? `${currentPath}${fileName}` 
           : `${currentPath}${separator}${fileName}`
           
         addJob({
           type: 'download',
           sourcePath: key,
           destPath,
           fileName,
           connectionId,
           bucket
         })
       } catch (err) {
         console.error('Failed to parse S3 drop data')
       }
    }
  }

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', height: '100%', borderRight: '1px solid var(--border-light)' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '48px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-icon" onClick={navigateUp} disabled={loading || currentPath === '/' || currentPath.endsWith(':\\')}>
            <ArrowLeft size={18} />
          </button>
          <button className="btn-icon" onClick={() => loadDirectory(currentPath)} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
          <span style={{ marginLeft: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' }} title={currentPath}>
            <HardDrive size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            {currentPath || 'Loading...'}
          </span>
        </div>
      </div>

      {error && (
        <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '4px', marginBottom: '16px', fontSize: '0.9rem' }}>
          {error}
        </div>
      )}

      {/* Grid view */}
      <div className="glass-panel" style={{ flex: 1, overflowY: 'auto', padding: '12px', borderRadius: 0, border: 'none' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
        ) : folders.length === 0 && files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Empty directory</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {folders.map(folder => {
              return (
                <li key={folder} onClick={() => navigateTo(folder)} style={itemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Folder size={18} color="var(--text-primary)" />
                    <span>{folder}</span>
                  </div>
                </li>
              )
            })}
            {files.map(file => {
              return (
                <li 
                    key={file.name} 
                    style={itemStyle} 
                    className="file-item"
                    draggable
                    onDragStart={(e) => handleDragStart(e, file.path)}
                    onContextMenu={(e) => handleContextMenu(e, file)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <File size={18} color="var(--text-secondary)" />
                    <span style={{ cursor: 'grab' }}>{file.name}</span>
                  </div>
                  <div className="file-actions" style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      {/* Context Menu */}
      {contextMenu && (
        <div 
          style={{ 
            position: 'fixed', 
            top: `${contextMenu.y}px`, 
            left: `${contextMenu.x}px`, 
            background: 'rgba(39, 39, 42, 0.96)', 
            border: '1px solid rgba(255, 255, 255, 0.12)', 
            boxShadow: '0 18px 40px rgba(0, 0, 0, 0.35)', 
            borderRadius: 'var(--radius-md)', 
            padding: '6px',
            zIndex: 200,
            minWidth: '190px',
            overflow: 'hidden',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)'
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <button 
            className="context-menu-item"
            onClick={handleCopyToS3}
            disabled={!activeConnection || !s3Location.bucket}
            style={{ 
              display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', 
              width: '100%', padding: '8px 12px', background: 'transparent', 
              border: 'none', color: 'var(--text-primary)', cursor: (!activeConnection || !s3Location.bucket) ? 'not-allowed' : 'pointer',
              textAlign: 'left', borderRadius: '4px', fontSize: '0.85rem',
              fontWeight: 500,
              opacity: (!activeConnection || !s3Location.bucket) ? 0.55 : 1,
              transition: 'background var(--transition-fast), color var(--transition-fast)',
              whiteSpace: 'nowrap'
            }}
          >
            <CloudUpload size={16} />
            Copy to S3
          </button>
        </div>
      )}

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .file-item .file-actions button { opacity: 0; }
        .file-item:hover .file-actions button { opacity: 1; }
        .context-menu-item:hover:not(:disabled) { background: rgba(255,255,255,0.08); }
        .context-menu-item:disabled { color: var(--text-muted); }
      `}</style>
    </div>
  )
}

const itemStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer',
  transition: 'background var(--transition-fast)'
}
