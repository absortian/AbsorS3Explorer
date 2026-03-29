import React, { useState, useEffect } from 'react'
import { S3Connection } from '../../../shared/types'
import { Folder, File, ArrowLeft, RefreshCw, Trash2, HardDrive, Download } from 'lucide-react'
import { useTransferQueue } from '../context/TransferQueueContext'

interface S3ExplorerProps {
  connection: S3Connection
  onLocationChange?: (bucket: string, prefix: string) => void
}

  export default function S3Explorer({ connection, onLocationChange }: S3ExplorerProps) {
  const [currentBucket, setCurrentBucket] = useState(connection.bucket || '')
  const [currentPrefix, setCurrentPrefix] = useState('')
  const [buckets, setBuckets] = useState<string[]>([])
  const [folders, setFolders] = useState<string[]>([])
  const [files, setFiles] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { addJob, lastJobUpdate } = useTransferQueue()

  const loadObjects = async (bucket: string, prefix: string) => {
    setLoading(true)
    setError('')
    try {
      if (!bucket) {
        // List buckets instead
        const bucketList = await window.api.listBuckets(connection)
        setBuckets(bucketList)
        setFolders([])
        setFiles([])
      } else {
        const result = await window.api.listObjects(connection, bucket, prefix)
        setFolders(result.folders)
        setFiles(result.files)
      }
      setCurrentBucket(bucket)
      setCurrentPrefix(prefix)
      if (onLocationChange) onLocationChange(bucket, prefix)
    } catch (err: any) {
      setError(err.message || 'Failed to list objects')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadObjects(connection.bucket || '', '')
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connection])

  useEffect(() => {
    if (lastJobUpdate > 0 && currentBucket) {
      loadObjects(currentBucket, currentPrefix)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastJobUpdate])

  const navigateUp = () => {
    if (!currentBucket) return
    if (!currentPrefix && !connection.bucket) {
      // Go back to bucket list
      loadObjects('', '')
      return
    }
    if (!currentPrefix) return
    const parts = currentPrefix.split('/').filter(Boolean)
    parts.pop()
    const newPrefix = parts.length > 0 ? parts.join('/') + '/' : ''
    loadObjects(currentBucket, newPrefix)
  }

  const navigateTo = (folderPath: string) => {
    loadObjects(currentBucket, folderPath)
  }

  const handleDelete = async (key: string) => {
    if (!currentBucket) return
    if (!window.confirm('Are you sure you want to delete this file?')) return
    try {
      setLoading(true)
      await window.api.deleteObject(connection, currentBucket, key)
      loadObjects(currentBucket, currentPrefix)
    } catch (err: any) {
      alert(err.message || 'Failed to delete')
    } finally {
      setLoading(false)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (!currentBucket) return

    // Internal Drag and Drop (from LocalExplorer)
    const localFilePath = e.dataTransfer.getData('application/x-local-file')
    if (localFilePath) {
      const fileName = localFilePath.split(/\\|\//).pop() || 'file'
      const key = `${currentPrefix}${fileName}`
      addJob({
        type: 'upload',
        sourcePath: localFilePath,
        destPath: key,
        fileName,
        connectionId: connection.id,
        bucket: currentBucket
      })
      return
    }

    // External OS Drop
    const files = Array.from(e.dataTransfer.files)
    if (files.length === 0) return

    for (const file of files) {
      // @ts-ignore - Electron specific property 'path'
      const localPath = file.path
      if (!localPath) continue
      const key = `${currentPrefix}${file.name}`
      addJob({
        type: 'upload',
        sourcePath: localPath,
        destPath: key,
        fileName: file.name,
        connectionId: connection.id,
        bucket: currentBucket
      })
    }
  }

  const handleDownload = async (key: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!currentBucket) return
    const fileName = key.split('/').pop() || 'download'
    const savePath = await window.api.showSaveDialog(fileName)
    if (!savePath) return // User canceled

    addJob({
      type: 'download',
      sourcePath: key,
      destPath: savePath,
      fileName,
      connectionId: connection.id,
      bucket: currentBucket
    })
  }

  const handleDragStart = (e: React.DragEvent, key: string, bucket: string) => {
    const payload = JSON.stringify({ key, bucket, connectionId: connection.id })
    e.dataTransfer.setData('application/x-s3-file', payload)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div 
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 16px', height: '48px', background: 'var(--bg-glass)', borderBottom: '1px solid var(--border-light)', flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button className="btn-icon" onClick={navigateUp} disabled={!currentBucket && !currentPrefix || loading}>
            <ArrowLeft size={18} />
          </button>
          <button className="btn-icon" onClick={() => loadObjects(currentBucket, currentPrefix)} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'spin' : ''} />
          </button>
          <span style={{ marginLeft: '12px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <HardDrive size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '4px' }} />
            {currentBucket || 'All Buckets'} {currentBucket && <span style={{ opacity: 0.5 }}>/ {currentPrefix}</span>}
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
        ) : !currentBucket ? (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {buckets.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>No buckets found</div>}
            {buckets.map(bucket => (
              <li key={bucket} onClick={() => loadObjects(bucket, '')} style={itemStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <HardDrive size={18} color="var(--accent-primary)" />
                  <span style={{ fontWeight: 500 }}>{bucket}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : folders.length === 0 && files.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Empty folder</div>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
            {folders.map(folder => {
              const name = folder.split('/').filter(Boolean).pop() + '/'
              return (
                <li key={folder} onClick={() => navigateTo(folder)} style={itemStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Folder size={18} color="var(--accent-primary)" />
                    <span>{name}</span>
                  </div>
                </li>
              )
            })}
            {files.map(file => {
              const name = file.key.split('/').pop()
              return (
                <li 
                  key={file.key} 
                  style={itemStyle} 
                  className="file-item"
                  draggable
                  onDragStart={(e) => handleDragStart(e, file.key, currentBucket)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <File size={18} color="var(--text-secondary)" />
                    <span style={{ cursor: 'grab' }}>{name}</span>
                  </div>
                  <div className="file-actions" style={{ display: 'flex', gap: '8px' }}>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                    <button className="btn-icon" title="Download" onClick={(e) => handleDownload(file.key, e)}>
                      <Download size={14} />
                    </button>
                    <button className="btn-icon" title="Delete" onClick={(e) => { e.stopPropagation(); handleDelete(file.key); }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>

      <style>{`
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
        .file-item .file-actions button { opacity: 0; }
        .file-item:hover .file-actions button { opacity: 1; }
      `}</style>
    </div>
  )
}

const itemStyle: React.CSSProperties = {
  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
  padding: '12px 16px', borderBottom: '1px solid var(--border-light)', cursor: 'pointer',
  transition: 'background var(--transition-fast)'
}
