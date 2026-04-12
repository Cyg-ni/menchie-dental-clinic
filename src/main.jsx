import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { applyStoredAccessibilityPreferences } from './utils/accessibilityPreferences'

const applyAdaptiveUiScale = () => {
  const baseWidth = 1366
  const baseHeight = 768
  const maxScale = 1.25

  const widthScale = window.innerWidth / baseWidth
  const heightScale = window.innerHeight / baseHeight
  const rawScale = Math.min(widthScale, heightScale)
  const adaptiveScale = Math.max(1, Math.min(rawScale, maxScale))

  document.documentElement.style.setProperty('--ui-scale', adaptiveScale.toFixed(2))
}

applyAdaptiveUiScale()
applyStoredAccessibilityPreferences()
window.addEventListener('resize', applyAdaptiveUiScale)
window.addEventListener('orientationchange', applyAdaptiveUiScale)
window.addEventListener('storage', (event) => {
  if (event.key === 'mdc-settings') {
    applyStoredAccessibilityPreferences()
  }
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
