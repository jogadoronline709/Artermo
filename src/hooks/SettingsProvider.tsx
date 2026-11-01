import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '../data/types'
import { repo } from './useData'
import { applyTheme, SettingsContext, THEME_KEY } from './settingsContext'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => {
    let theme: AppSettings['theme'] = 'system'
    try {
      const t = localStorage.getItem(THEME_KEY)
      if (t === 'light' || t === 'dark') theme = t
    } catch {
      /* ignora */
    }
    return { ...DEFAULT_SETTINGS, theme }
  })

  useEffect(() => {
    void repo.getSettings().then((s) => {
      setSettings(s)
      applyTheme(s.theme)
    })
  }, [])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void repo.saveSettings(next)
      if (patch.theme) applyTheme(patch.theme)
      return next
    })
  }, [])

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}
