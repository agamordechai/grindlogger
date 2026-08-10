import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader'
import { DialogProvider } from './components/ui/ConfirmDialog'
import { AuthProvider } from './contexts/AuthContext'
import { RestTimerProvider } from './contexts/RestTimerContext'
import App from './App.tsx'
import { initOTA } from './ota'
import { runSync } from './sync/engine'
import './index.css'

// On the web (development), the on-device SQLite store is provided by the
// jeep-sqlite web component. Register it and mount the element before render;
// on native iOS this block is skipped and the native SQLite plugin is used.
if (Capacitor.getPlatform() === 'web') {
  defineJeepSqlite(window)
  if (!document.querySelector('jeep-sqlite')) {
    document.body.appendChild(document.createElement('jeep-sqlite'))
  }
}

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

// Check for an OTA web-bundle update over WiFi (native only; no-op on web).
void initOTA()

// Sync with the configured server, if any (silent no-op when sync isn't set
// up — offline stays the default). Runs on launch and whenever connectivity
// returns; also exposed for a manual "Sync Now" button in Settings.
void runSync()
window.addEventListener('online', () => void runSync())
