import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// The PWA can live in memory for days on a phone. Reload once when an updated
// service worker takes control, and check for updates whenever the app comes
// back to the foreground — so new versions actually reach installed apps.
if ('serviceWorker' in navigator) {
  let hadController = navigator.serviceWorker.controller !== null
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) {
      hadController = true
      return
    }
    window.location.reload()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      navigator.serviceWorker.getRegistration().then((r) => r?.update())
    }
  })
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
