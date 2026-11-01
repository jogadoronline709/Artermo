import type { Source, TempUnit } from '../domain/types'

export function uid(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
}

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
    fluidId: partial.fluidId ?? '',
    fluid: partial.fluid ?? 'Ar',
    pressureKPa: partial.pressureKPa ?? null,
    ...(partial.propertySet ? { propertySet: partial.propertySet } : {}),
    ...(partial.pressureApplies != null ? { pressureApplies: partial.pressureApplies } : {}),
    pressureUnit: partial.pressureUnit ?? 'kPa',
    originalTempUnit: (partial.originalTempUnit ?? 'C') as TempUnit,
    inputUnits: partial.inputUnits ?? {},
    notes: partial.notes ?? '',
    order: partial.order ?? 0,
    createdAt: partial.createdAt ?? now,
    updatedAt: partial.updatedAt ?? now,
  }
}

