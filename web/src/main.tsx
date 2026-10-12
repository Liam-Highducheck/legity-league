import './lib/supabase'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './styles.css'
import { startUpdateChecks } from './lib/updates'
import { applyTheme, getTheme } from './lib/theme'

applyTheme(getTheme())

// iOS Safari ignores user-scalable=no; block pinch gestures explicitly.
for (const evt of ['gesturestart', 'gesturechange', 'gestureend']) {
  document.addEventListener(evt, (e) => e.preventDefault())
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

startUpdateChecks()
