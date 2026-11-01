import { describe, expect, it } from 'vitest'
import { DEFAULT_SETTINGS } from '../data/types'
import { FLUID_KEY, initialSettings, THEME_KEY } from '../hooks/settingsContext'

const store = (v: Record<string, string>) => (k: string) => v[k] ?? null

describe('configurações iniciais (antes do IndexedDB responder)', () => {
  it('usa tema e fluido guardados no navegador', () => {
    const s = initialSettings(store({ [THEME_KEY]: 'dark', [FLUID_KEY]: 'agua' }))
    expect(s.theme).toBe('dark')
    expect(s.activeFluidId).toBe('agua')
  })

  it('ignora valores inválidos e falha de leitura', () => {
    expect(initialSettings(store({ [THEME_KEY]: 'roxo', [FLUID_KEY]: 'plasma' }))).toEqual(DEFAULT_SETTINGS)
    expect(
      initialSettings(() => {
        throw new Error('bloqueado')
      }),
    ).toEqual(DEFAULT_SETTINGS)
  })
})
