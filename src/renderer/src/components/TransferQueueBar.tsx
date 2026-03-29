import { useTransferQueue } from '../context/TransferQueueContext'
import { CheckCircle, XCircle, Loader2, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

export default function TransferQueueBar() {
  const { jobs, clearCompleted } = useTransferQueue()

  if (jobs.length === 0) return null

  // Calculate quick stats
  const activeCount = jobs.filter(j => j.status === 'uploading' || j.status === 'downloading').length
  const pendingCount = jobs.filter(j => j.status === 'pending').length
  const errorCount = jobs.filter(j => j.status === 'error').length
  const doneCount = jobs.filter(j => j.status === 'done').length

  const showClear = errorCount > 0 || doneCount > 0

  return (
    <div className="queue-bar-container">
      <div className="queue-bar-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Transfers</span>
          {activeCount > 0 && <span className="badge badge-active">{activeCount} Active</span>}
          {pendingCount > 0 && <span className="badge badge-pending">{pendingCount} Pending</span>}
        </div>
        {showClear && (
          <button className="btn-clear" onClick={clearCompleted}>
            Clear Completed
          </button>
        )}
      </div>

      <div className="queue-list">
        {jobs.slice().reverse().slice(0, 5).map(job => (
          <div key={job.id} className="queue-item">
            <div className="queue-item-icon">
               {job.type === 'upload' ? <ArrowUpCircle size={16} /> : <ArrowDownCircle size={16} />}
            </div>
            <div className="queue-item-name" title={job.fileName}>{job.fileName}</div>
            
            <div className="queue-item-status">
              {job.status === 'pending' && <span style={{ color: 'var(--text-muted)' }}>Pending</span>}
              {job.status === 'uploading' && <><Loader2 size={14} className="spin" /> Uploading...</>}
              {job.status === 'downloading' && <><Loader2 size={14} className="spin" /> Downloading...</>}
              {job.status === 'done' && <CheckCircle size={14} color="#10b981" />}
              {job.status === 'error' && <span title={job.error}><XCircle size={14} color="#ef4444" /></span>}
            </div>
          </div>
        ))}
        {jobs.length > 5 && (
           <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', marginTop: '4px' }}>
             +{jobs.length - 5} more items...
           </div>
        )}
      </div>

      <style>{`
        .queue-bar-container {
          position: fixed;
          bottom: 0;
          left: 0;
          right: 0;
          background: var(--bg-surface);
          border-top: 1px solid var(--border-light);
          box-shadow: 0 -4px 12px rgba(0,0,0,0.1);
          z-index: 50;
          padding: 12px 24px;
        }
        .queue-bar-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 8px;
        }
        .btn-clear {
          background: rgba(239, 68, 68, 0.1);
          color: #ef4444;
          border: 1px solid rgba(239, 68, 68, 0.2);
          border-radius: 4px;
          padding: 4px 10px;
          font-size: 0.8rem;
          cursor: pointer;
          transition: all 0.2s;
        }
        .btn-clear:hover {
          background: rgba(239, 68, 68, 0.2);
        }
        .queue-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          max-height: 150px;
          overflow-y: auto;
        }
        .queue-item {
          display: flex;
          align-items: center;
          gap: 12px;
          font-size: 0.85rem;
          padding: 4px 8px;
          background: rgba(255,255,255,0.03);
          border-radius: 4px;
        }
        .queue-item-name {
          flex: 1;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .queue-item-status {
          display: flex;
          align-items: center;
          gap: 4px;
          min-width: 100px;
          justify-content: flex-end;
        }
        .badge {
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.75rem;
        }
        .badge-active { background: rgba(59, 130, 246, 0.2); color: #60a5fa; }
        .badge-pending { background: rgba(156, 163, 175, 0.2); color: #9ca3af; }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
