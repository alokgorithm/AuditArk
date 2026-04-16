import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ModalProvider } from './components/modal/useModal'
import ToastProvider from './components/toast/ToastProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ModalProvider>
        <App />
      </ModalProvider>
    </ToastProvider>
  </StrictMode>,
)
