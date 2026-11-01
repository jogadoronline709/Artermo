import type { AverageMode } from '../domain/average'
import type { DerivedChoice } from '../domain/query'
import type { TempUnit } from '../domain/types'

export interface Favorite {
  id: string
  value: number
  unit: TempUnit
  label: string
  createdAt: string
}

export interface HistoryEntry {
  id?: number
  value: number
  unit: TempUnit
  at: string
}

export type ThemePref = 'system' | 'light' | 'dark'

export interface AppSettings {
  theme: ThemePref
  /** Algarismos significativos na exibição. */
  sigDigits: number
  /** Extrapolação (avançado). Desativada por padrão. */
  allowExtrapolation: boolean
  averageMode: AverageMode
  derivedChoice: DerivedChoice
  /** Fluido usado em Consultar e Comparar. */
  activeFluidId: string
  /** Referências escolhidas no Comparar, por fluido. Ausente/vazio = as que têm dados. */
  compareSelection: Record<string, string[]>
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  sigDigits: 5,
  allowExtrapolation: false,
  averageMode: 'require_all',
  derivedChoice: 'published',
  activeFluidId: 'ar',
  compareSelection: {},
}
