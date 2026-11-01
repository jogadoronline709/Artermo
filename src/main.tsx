import '@fontsource-variable/atkinson-hyperlegible-next'
import '@fontsource-variable/atkinson-hyperlegible-mono'
import './styles.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { registerSW } from 'virtual:pwa-register'
import App from './App'
import { FeedbackProvider } from './components/FeedbackProvider'
import { SettingsProvider } from './hooks/SettingsProvider'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <SettingsProvider>
      <FeedbackProvider>
        <App />
      </FeedbackProvider>
    </SettingsProvider>
  </StrictMode>,
)

// Service worker: guarda os arquivos do app para uso offline e atualiza sozinho.
registerSW({
  immediate: true,
  onOfflineReady() {
    window.dispatchEvent(new CustomEvent('artermo:offline-ready'))
  },
})
