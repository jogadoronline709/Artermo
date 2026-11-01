import type { DataRow, PropertyKey, Source } from '../domain/types'
import { propertyDefsFor } from '../domain/units'

/** Marca "o usuário desmarcou todas", diferente de "nunca escolheu" (lista vazia). */
export const NONE_SELECTED = '__nenhuma__'

/**
 * Referências que entram na comparação de um fluido.
 * Sem escolha salva: as que têm dados (ou todas, se nenhuma tiver).
 */
export function selectedCompareIds(saved: string[] | undefined, sources: Source[], rowsBySource: Record<string, DataRow[]>): string[] {
  const fallback = () => {
    const withData = sources.filter((s) => (rowsBySource[s.id]?.length ?? 0) > 0)
    return (withData.length ? withData : sources).map((s) => s.id)
  }
  if (!saved || saved.length === 0) return fallback()
  const kept = saved.filter((id) => sources.some((s) => s.id === id))
  // Nenhuma referência salva existe mais (ex.: renomeada numa versão nova): volta ao padrão.
  if (kept.length === 0 && !saved.includes(NONE_SELECTED)) return fallback()
  return kept
}

export function toggleCompareId(current: string[], id: string): string[] {
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  return next.length ? next : [NONE_SELECTED]
}

/** Propriedade inicial do gráfico do Comparar: a primeira do conjunto do fluido. */
export function defaultChartProp(sources: Source[]): PropertyKey {
  return propertyDefsFor(sources[0]?.propertySet)[0].key
}
