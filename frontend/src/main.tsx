import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { loadThemeSync } from './utils/settingsStore'
import './index.css'
import App from './App.tsx'

// Applied before the first render so there's no flash of the wrong theme.
document.documentElement.dataset.theme = loadThemeSync()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
