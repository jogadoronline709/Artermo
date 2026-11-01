import type { Source, TempUnit } from '../domain/types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

/** IDs fixos das três referências iniciais. */
export const DEFAULT_SOURCE_IDS = ['kreith', 'incropera', 'cengel'] as const

export function newSource(partial: Partial<Source> & { shortName: string }): Source {
  const now = new Date().toISOString()
  return {
    id: partial.id ?? uid(),
    shortName: partial.shortName,
    authors: partial.authors ?? '',
    title: partial.title ?? '',
    edition: partial.edition ?? '',
    year: partial.year ?? '',
    pageTable: partial.pageTable ?? '',
    fluid: partial.fluid ?? 'Ar',
    pressureKPa: partial.pressureKPa ?? null,
    pressureUnit: partial.pressureUnit ?? 'kPa',
    originalTempUnit: (partial.originalTempUnit ?? 'C') as TempUnit,
    inputUnits: partial.inputUnits ?? {},
    notes: partial.notes ?? '',
    isSimulated: partial.isSimulated ?? false,
    order: partial.order ?? 0,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  }
}

/**
 * Três referências iniciais VAZIAS. Nenhum metadado (edição, ano, página,
 * pressão) nem valor é presumido — o usuário preenche a partir do seu exemplar.
 */
export function createDefaultSources(): Source[] {
  return [
    newSource({ id: 'kreith', shortName: 'Kreith', order: 0 }),
    newSource({ id: 'incropera', shortName: 'Incropera', order: 1 }),
    newSource({ id: 'cengel', shortName: 'Çengel', order: 2 }),
  ]
}
