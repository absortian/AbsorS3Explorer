import React, { createContext, useContext, useState, useEffect } from 'react'

export type TransferJob = {
  id: string
  type: 'upload' | 'download'
  sourcePath: string
  destPath: string
  fileName: string
  status: 'pending' | 'uploading' | 'downloading' | 'done' | 'error'
  error?: string
  connectionId: string
  bucket: string
}

interface TransferQueueContextType {
  jobs: TransferJob[]
  addJob: (job: Omit<TransferJob, 'id' | 'status'>) => void
  removeJob: (id: string) => void
  clearCompleted: () => void
  retryJob: (id: string) => void
  lastJobUpdate: number
}

const TransferQueueContext = createContext<TransferQueueContextType | undefined>(undefined)

export function TransferQueueProvider({ children }: { children: React.ReactNode }) {
  const [jobs, setJobs] = useState<TransferJob[]>([])
  const [lastJobUpdate, setLastJobUpdate] = useState<number>(0)
  
  // Helper to add a job to the queue
  const addJob = (job: Omit<TransferJob, 'id' | 'status'>) => {
    const newJob: TransferJob = {
      ...job,
      id: crypto.randomUUID(),
      status: 'pending'
    }
    setJobs(prev => [...prev, newJob])
  }

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id))
  }
  
  const clearCompleted = () => {
    setJobs(prev => prev.filter(j => j.status !== 'done' && j.status !== 'error'))
  }

  const retryJob = (id: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status: 'pending' as const, error: undefined } : j))
  }

  const updateJobStatus = (id: string, status: TransferJob['status'], error?: string) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status, error } : j))
    if (status === 'done' || status === 'error') {
      setLastJobUpdate(Date.now())
    }
  }

  // Queue Processor
  useEffect(() => {
    const pendingJob = jobs.find(j => j.status === 'pending')
    // Ensure we only run one active job at a time for simplicity and reliable tracking
    const activeJob = jobs.find(j => j.status === 'uploading' || j.status === 'downloading')
    
    if (pendingJob && !activeJob) {
      processJob(pendingJob)
    }
  }, [jobs])

  const processJob = async (job: TransferJob) => {
    const activeStatus = job.type === 'upload' ? 'uploading' : 'downloading'
    updateJobStatus(job.id, activeStatus)
    
    try {
      // Need to find connection object. 
      // Since window.api methods take a full connection object, we have to refetch it 
      // or pass it in the job. It's better to pass it in the job or fetch from store.
      const connections = await window.api.getConnections()
      const conn = connections.find(c => c.id === job.connectionId)
      if (!conn) throw new Error('Connection not found')

      if (job.type === 'upload') {
        await window.api.uploadFile(conn, job.bucket, job.sourcePath, job.destPath)
      } else {
        await window.api.downloadFile(conn, job.bucket, job.sourcePath, job.destPath)
      }
      
      updateJobStatus(job.id, 'done')
    } catch (err: any) {
      updateJobStatus(job.id, 'error', err.message || 'Transfer failed')
    }
  }

  return (
    <TransferQueueContext.Provider value={{ jobs, addJob, removeJob, clearCompleted, retryJob, lastJobUpdate }}>
      {children}
    </TransferQueueContext.Provider>
  )
}

export function useTransferQueue() {
  const ctx = useContext(TransferQueueContext)
  if (!ctx) throw new Error('useTransferQueue must be used within TransferQueueProvider')
  return ctx
}
