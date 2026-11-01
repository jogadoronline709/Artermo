import { useCallback, useEffect, useState, type ReactNode } from 'react'
import type { AppSettings } from '../data/types'
import { repo } from './useData'
import { applyTheme, initialSettings, rememberFluid, SettingsContext } from './settingsContext'

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => initialSettings((k) => localStorage.getItem(k)))

  useEffect(() => {
    void repo.getSettings().then((s) => {
      setSettings(s)
      applyTheme(s.theme)
      rememberFluid(s.activeFluidId)
    })
  }, [])

  const update = useCallback((patch: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch }
      void repo.saveSettings(next)
      if (patch.theme) applyTheme(patch.theme)
      if (patch.activeFluidId) rememberFluid(patch.activeFluidId)
      return next
    })
  }, [])

  return <SettingsContext.Provider value={{ settings, update }}>{children}</SettingsContext.Provider>
}
