import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { DialogProvider } from './components/ui/ConfirmDialog'
import { AuthProvider } from './contexts/AuthContext'
import { RestTimerProvider } from './contexts/RestTimerContext'
import App from './App.tsx'
import { IS_WEB } from './target'
import './index.css'

async function start() {
  // Native app only: register the on-device database host before anything renders.
  // (Dead-code eliminated in the website build, so none of this ships there.)
  const native = IS_WEB ? null : await import('./native/boot')
  native?.prepareNative()

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <DialogProvider>
        <AuthProvider>
          <RestTimerProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RestTimerProvider>
        </AuthProvider>
      </DialogProvider>
    </StrictMode>,
  )

  native?.startNativeServices()
}

void start()
