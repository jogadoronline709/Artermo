import type { DataRow, Source } from '../domain/types'

/** Marca "o usuário desmarcou todas", diferente de "nunca escolheu" (lista vazia). */
export const NONE_SELECTED = '__nenhuma__'

/**
 * Referências que entram na comparação de um fluido.
 * Sem escolha salva: as que têm dados (ou todas, se nenhuma tiver).
 */
export function selectedCompareIds(saved: string[] | undefined, sources: Source[], rowsBySource: Record<string, DataRow[]>): string[] {
  if (!saved || saved.length === 0) {
    const withData = sources.filter((s) => (rowsBySource[s.id]?.length ?? 0) > 0)
    return (withData.length ? withData : sources).map((s) => s.id)
  }
  return saved.filter((id) => sources.some((s) => s.id === id))
}

export function toggleCompareId(current: string[], id: string): string[] {
  const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
  return next.length ? next : [NONE_SELECTED]
}
