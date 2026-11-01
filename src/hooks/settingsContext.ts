import { createContext, useContext } from 'react'
import { findFluid } from '../data/fluids/registry'
import { DEFAULT_SETTINGS, type AppSettings } from '../data/types'

export interface SettingsCtx {
  settings: AppSettings
  update: (patch: Partial<AppSettings>) => void
}

export const SettingsContext = createContext<SettingsCtx>({ settings: DEFAULT_SETTINGS, update: () => {} })

export const THEME_KEY = 'artermo-theme'
/** Fluido ativo guardado também no navegador, para abrir sem mostrar o Ar por um instante. */
export const FLUID_KEY = 'artermo-fluid'

/** Configurações usadas antes do IndexedDB responder: tema e fluido do armazenamento local. */
export function initialSettings(get: (key: string) => string | null): AppSettings {
  const out = { ...DEFAULT_SETTINGS }
  try {
    const t = get(THEME_KEY)
    if (t === 'light' || t === 'dark') out.theme = t
    const f = get(FLUID_KEY)
    if (f && findFluid(f)) out.activeFluidId = f
  } catch {
    /* armazenamento indisponível — usa o padrão */
  }
  return out
}

export function rememberFluid(id: string) {
  try {
    localStorage.setItem(FLUID_KEY, id)
  } catch {
    /* armazenamento indisponível — ignora */
  }
}

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
