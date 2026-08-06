import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { defineCustomElements as defineJeepSqlite } from 'jeep-sqlite/loader'
import { ThemeProvider } from './contexts/ThemeContext'
import { DialogProvider } from './components/ui/ConfirmDialog'
import { AuthProvider } from './contexts/AuthContext'
import { RestTimerProvider } from './contexts/RestTimerContext'
import App from './App.tsx'
import { initOTA } from './ota'
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
    <ThemeProvider>
      <DialogProvider>
        <AuthProvider>
          <RestTimerProvider>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </RestTimerProvider>
        </AuthProvider>
      </DialogProvider>
    </ThemeProvider>
  </StrictMode>,
)

// Check for an OTA web-bundle update over WiFi (native only; no-op on web).
void initOTA()
