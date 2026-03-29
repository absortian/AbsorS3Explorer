import './assets/main.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

window.addEventListener('error', (event) => {
  alert('Global Error: ' + event.error?.message + '\n' + event.error?.stack)
})

window.addEventListener('unhandledrejection', (event) => {
  alert('Unhandled Promise Rejection: ' + event.reason)
})

import App from './App'
import { TransferQueueProvider } from './context/TransferQueueContext'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <TransferQueueProvider>
      <App />
    </TransferQueueProvider>
  </StrictMode>
)
