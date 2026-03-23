import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { DialogProvider } from './components/ui/ConfirmDialog'
import { AuthProvider } from './contexts/AuthContext'
import { RestTimerProvider } from './contexts/RestTimerContext'
import App from './App.tsx'
import './index.css'

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
