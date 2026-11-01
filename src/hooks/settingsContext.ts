import { createContext, useContext } from 'react'
import { DEFAULT_SETTINGS, type AppSettings } from '../data/types'

export interface SettingsCtx {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}

export const SettingsContext = createContext<SettingsCtx>({ settings: DEFAULT_SETTINGS, update: () => {} })

export const THEME_KEY = 'artermo-theme'

export function applyTheme(theme: AppSettings['theme']) {
  const root = document.documentElement
  if (theme === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', theme)
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    /* armazenamento indisponível — ignora */
  }
}

export function useSettings(): SettingsCtx {
  return useContext(SettingsContext)
}
