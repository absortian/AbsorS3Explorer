import React, { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { Plus, HardDrive, Trash2, X, FolderPlus, Folder, ChevronDown, ChevronRight, Pencil } from 'lucide-react'
import { S3Connection } from '../../../shared/types'

export default function ConnectionsSidebar({ isOpen, onSelectConnection }: { isOpen: boolean, onSelectConnection: (conn: S3Connection) => void }) {
  const { t } = useTranslation()
  const [connections, setConnections] = useState<S3Connection[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingConnection, setEditingConnection] = useState<S3Connection | null>(null)
  const [showFolderModal, setShowFolderModal] = useState(false)
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set())
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)

  // Load existing connections
  useEffect(() => {
    window.api.getConnections().then(setConnections)
  }, [])

  if (!isOpen) return null

  const handleSaveConnection = async (newConn: Omit<S3Connection, 'id'>) => {
    if (editingConnection) {
      // Update existing connection
      const updated = connections.map(c =>
        c.id === editingConnection.id ? { ...newConn, id: editingConnection.id } : c
      )
      setConnections(updated)
      await window.api.saveConnections(updated)
      setEditingConnection(null)
      setShowModal(false)
    } else {
      const conn: S3Connection = {
        ...newConn,
        id: crypto.randomUUID()
      }
      const updated = [...connections, conn]
      setConnections(updated)
      await window.api.saveConnections(updated)
      setShowModal(false)
    }
  }

  const handleEditConnection = (conn: S3Connection, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingConnection(conn)
    setShowModal(true)
  }

  const handleSaveFolder = async (name: string) => {
    const folder: S3Connection = {
      id: crypto.randomUUID(),
      name,
      endpoint: '',
      accessKeyId: '',
      secretAccessKey: '',
      isFolder: true,
      parentId: null
    }
    const updated = [...connections, folder]
    setConnections(updated)
    await window.api.saveConnections(updated)
    setShowFolderModal(false)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const toDelete = new Set([id])
    const findChildren = (parentId: string) => {
      connections.forEach(c => {
        if (c.parentId === parentId && !toDelete.has(c.id)) {
          toDelete.add(c.id)
          if (c.isFolder) findChildren(c.id)
        }
      })
    }
    findChildren(id)
    
    const updated = connections.filter(c => !toDelete.has(c.id))
    setConnections(updated)
    await window.api.saveConnections(updated)
  }

  const toggleFolder = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const next = new Set(expandedFolders)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setExpandedFolders(next)
  }

  const handleMoveItem = async (itemId: string, targetParentId: string | null) => {
    if (itemId === targetParentId) return
    
    if (targetParentId) {
      let currentId: string | null = targetParentId
      while (currentId) {
        if (currentId === itemId) return
        const parent = connections.find(c => c.id === currentId)
        currentId = parent?.parentId || null
      }
    }

    const updated = connections.map(c => {
      if (c.id === itemId) return { ...c, parentId: targetParentId }
      return c
    })
    setConnections(updated)
    await window.api.saveConnections(updated)
  }

  const folders = connections.filter(c => c.isFolder)
  const rootItems = connections.filter(c => !c.parentId)

  const renderConnection = (conn: S3Connection, indent = 0) => {
    const isDragOver = dragOverId === conn.id
    return (
      <li key={conn.id} 
          draggable
          onDragStart={(e) => {
            e.stopPropagation()
            setDraggedId(conn.id)
            e.dataTransfer.effectAllowed = 'move'
          }}
          onDragEnd={() => {
            setDraggedId(null)
            setDragOverId(null)
          }}
          onDragOver={(e) => {
            e.preventDefault()
            e.stopPropagation()
            if (draggedId && draggedId !== conn.id) setDragOverId(conn.id)
          }}
          onDragLeave={(e) => {
            e.stopPropagation()
            if (dragOverId === conn.id) setDragOverId(null)
          }}
          onDrop={async (e) => {
            e.preventDefault()
            e.stopPropagation()
            setDragOverId(null)
            if (!draggedId || draggedId === conn.id) return
            await handleMoveItem(draggedId, conn.parentId || null)
          }}
          style={{ 
            padding: '8px 12px', 
            paddingLeft: `${12 + indent * 16}px`,
            borderRadius: 'var(--radius-sm)', 
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            transition: 'all var(--transition-fast)',
            boxShadow: isDragOver ? 'inset 0 0 0 1px var(--accent-primary)' : 'none'
          }}
          className="connection-item"
          onClick={() => onSelectConnection(conn)}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HardDrive size={16} color="var(--accent-primary)" />
          <span style={{ fontSize: '0.9rem' }}>{conn.name}</span>
        </div>
        <div className="actions-group" style={{ display: 'flex', gap: '4px', opacity: 0.7 }}>
          <button className="btn-icon" onClick={(e) => handleEditConnection(conn, e)} style={{ padding: '4px' }}>
            <Pencil size={14} />
          </button>
          <button className="btn-icon" onClick={(e) => handleDelete(conn.id, e)} style={{ padding: '4px' }}>
            <Trash2 size={14} />
          </button>
        </div>
      </li>
    )
  }

  const renderFolder = (folder: S3Connection, indent = 0) => {
    const isExpanded = expandedFolders.has(folder.id)
    const children = connections.filter(c => c.parentId === folder.id)
    const isDragOver = dragOverId === folder.id
    
    return (
      <React.Fragment key={folder.id}>
        <li draggable
            onDragStart={(e) => {
              e.stopPropagation()
              setDraggedId(folder.id)
              e.dataTransfer.effectAllowed = 'move'
            }}
            onDragEnd={() => {
              setDraggedId(null)
              setDragOverId(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.stopPropagation()
              if (draggedId && draggedId !== folder.id) setDragOverId(folder.id)
            }}
            onDragLeave={(e) => {
              e.stopPropagation()
              if (dragOverId === folder.id) setDragOverId(null)
            }}
            onDrop={async (e) => {
              e.preventDefault()
              e.stopPropagation()
              setDragOverId(null)
              if (!draggedId || draggedId === folder.id) return
              await handleMoveItem(draggedId, folder.id)
            }}
            style={{ 
              padding: '8px 12px', 
              paddingLeft: `${12 + indent * 16}px`,
              borderRadius: 'var(--radius-sm)', 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              transition: 'all var(--transition-fast)',
              boxShadow: isDragOver ? 'inset 0 0 0 1px var(--accent-primary)' : 'none'
            }}
            className="connection-item"
            onClick={(e) => toggleFolder(folder.id, e)}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-hover)')}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isExpanded ? <ChevronDown size={14} color="var(--text-secondary)" /> : <ChevronRight size={14} color="var(--text-secondary)" />}
            <Folder size={16} color="var(--text-secondary)" />
            <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>{folder.name}</span>
          </div>
          <div className="actions-group" style={{ display: 'flex', gap: '4px', opacity: 0.7 }}>
            <button className="btn-icon" onClick={(e) => handleDelete(folder.id, e)} style={{ padding: '4px' }}>
              <Trash2 size={14} />
            </button>
          </div>
        </li>
        {isExpanded && children.map(c => 
          c.isFolder ? renderFolder(c, indent + 1) : renderConnection(c, indent + 1)
        )}
      </React.Fragment>
    )
  }

  return (
    <>
      <aside className="sidebar">
        <div className="sidebar-header" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
          <span className="sidebar-title">{t('sidebar.title')}</span>
          <div style={{ WebkitAppRegion: 'no-drag', display: 'flex', gap: '4px' } as React.CSSProperties}>
            <button className="btn-icon" title={t('sidebar.addFolder')} onClick={() => setShowFolderModal(true)}>
              <FolderPlus size={18} />
            </button>
            <button className="btn-icon" title={t('sidebar.addConnection')} onClick={() => setShowModal(true)}>
              <Plus size={18} />
            </button>
          </div>
        </div>
        
        <div className="sidebar-content" 
             style={{ 
               padding: '12px', overflowY: 'auto', flex: 1,
               boxShadow: dragOverId === 'root' ? 'inset 0 0 0 1px var(--accent-primary)' : 'none',
               backgroundColor: dragOverId === 'root' ? 'rgba(255,255,255,0.02)' : 'transparent',
               transition: 'all 0.2s'
             }}
             onDragOver={(e) => {
               e.preventDefault()
               if (draggedId) setDragOverId('root')
             }}
             onDragLeave={() => {
               if (dragOverId === 'root') setDragOverId(null)
             }}
             onDrop={async (e) => {
               e.preventDefault()
               setDragOverId(null)
               if (!draggedId) return
               await handleMoveItem(draggedId, null)
             }}
        >
          {connections.length === 0 ? (
            <div className="empty-state" style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <HardDrive size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
              <p style={{ fontSize: '0.9rem' }}>{t('sidebar.noConnections')}</p>
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>{t('sidebar.noConnectionsHint')}</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, gap: '4px', display: 'flex', flexDirection: 'column' }}>
              {rootItems.map(item => 
                item.isFolder ? renderFolder(item, 0) : renderConnection(item, 0)
              )}
            </ul>
          )}
        </div>
      </aside>

      {showModal && (
        <ConnectionModal 
          folders={folders}
          editingConnection={editingConnection}
          onClose={() => { setShowModal(false); setEditingConnection(null) }} 
          onSave={handleSaveConnection} 
        />
      )}
      {showFolderModal && (
        <FolderModal 
          onClose={() => setShowFolderModal(false)} 
          onSave={handleSaveFolder} 
        />
      )}
    </>
  )
}

function ConnectionModal({ folders, editingConnection, onClose, onSave }: { folders: S3Connection[], editingConnection: S3Connection | null, onClose: () => void, onSave: (conn: any) => Promise<void> }) {
  const { t } = useTranslation()
  const [name, setName] = useState(editingConnection?.name || '')
  const [endpoint, setEndpoint] = useState(editingConnection?.endpoint || '')
  const [accessKeyId, setAccessKeyId] = useState(editingConnection?.accessKeyId || '')
  const [secretAccessKey, setSecretAccessKey] = useState(editingConnection?.secretAccessKey || '')
  const [bucket, setBucket] = useState(editingConnection?.bucket || '')
  const [region, setRegion] = useState(editingConnection?.region || 'us-east-1')
  const [parentId, setParentId] = useState<string>(editingConnection?.parentId || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({ name, endpoint, accessKeyId, secretAccessKey, bucket, region, parentId: parentId || null })
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', width: '400px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{editingConnection ? t('sidebar.editConnection') : t('sidebar.newConnection')}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.connectionName')}</label>
            <input required type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('sidebar.connectionNamePlaceholder')} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.folder')}</label>
            <select value={parentId} onChange={e => setParentId(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              <option value="" style={{ background: '#222', color: 'white' }}>{t('sidebar.folderNone')}</option>
              {folders.map(f => <option key={f.id} value={f.id} style={{ background: '#222', color: 'white' }}>{f.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.endpointUrl')}</label>
            <input required type="url" value={endpoint} onChange={e => setEndpoint(e.target.value)} placeholder="https://..." style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
             <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.region')}</label>
            <input type="text" value={region} onChange={e => setRegion(e.target.value)} placeholder="us-east-1" style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.accessKeyId')}</label>
            <input required type="text" value={accessKeyId} onChange={e => setAccessKeyId(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.secretAccessKey')}</label>
            <input required type="password" value={secretAccessKey} onChange={e => setSecretAccessKey(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.defaultBucket')}</label>
            <input type="text" value={bucket} onChange={e => setBucket(e.target.value)} style={inputStyle} />
          </div>
          
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--border-light)' }}>{t('sidebar.cancel')}</button>
            <button type="submit" style={{ ...btnStyle, background: 'var(--accent-primary)', color: 'white' }}>{editingConnection ? t('sidebar.update') : t('sidebar.saveConnection')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

function FolderModal({ onClose, onSave }: { onClose: () => void, onSave: (name: string) => Promise<void> }) {
  const { t } = useTranslation()
  const [name, setName] = useState('')
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) onSave(name.trim())
  }
  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100
    }}>
      <div className="glass-panel animate-fade-in" style={{ padding: '24px', width: '300px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '20px' }}>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 600 }}>{t('sidebar.newFolder')}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t('sidebar.folderName')}</label>
            <input required autoFocus type="text" value={name} onChange={e => setName(e.target.value)} placeholder={t('sidebar.folderNamePlaceholder')} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px' }}>
            <button type="button" onClick={onClose} style={{ ...btnStyle, background: 'transparent', border: '1px solid var(--border-light)' }}>{t('sidebar.cancel')}</button>
            <button type="submit" style={{ ...btnStyle, background: 'var(--accent-primary)', color: 'white' }}>{t('sidebar.save')}</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-light)',
  padding: '8px 12px', borderRadius: '4px', color: 'white', outline: 'none'
}
const btnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer', fontWeight: 500,
  transition: 'all var(--transition-fast)'
}
