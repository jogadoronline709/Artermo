/**
 * Transforma as definições de fluido e seus CSVs embutidos em fontes e linhas
 * prontas para cálculo. Função pura: não lê arquivos nem o banco.
 */
import type { DataRow, Source } from '../../domain/types'
import { fluidDisplayName, type FluidDef } from '../../domain/fluids'
import { autoMap, parseCsv, validateImport } from '../csv'
import { newSource } from '../defaults'

export interface LoadedFluid {
  def: FluidDef
  sources: Source[]
  rowsBySource: Record<string, DataRow[]>
  /** Erros de validação por id de fonte. Fonte com erro fica sem linhas. */
  errors: Record<string, string[]>
}

export function sourceIdFor(fluidId: string, refId: string): string {
  return `${fluidId}-${refId}`
}

export function loadFluid(def: FluidDef, csvByRefId: Record<string, string | undefined>): LoadedFluid {
  const sources: Source[] = []
  const rowsBySource: Record<string, DataRow[]> = {}
  const errors: Record<string, string[]> = {}

  def.references.forEach((ref, order) => {
    const id = sourceIdFor(def.id, ref.id)
    const { id: _refId, ...meta } = ref
    sources.push(newSource({ ...meta, id, fluidId: def.id, fluid: fluidDisplayName(def), order, createdAt: '', updatedAt: '' }))
    rowsBySource[id] = []

    const csv = csvByRefId[ref.id]
    if (csv == null) return
    try {
      const parsed = parseCsv(csv)
      const v = validateImport(parsed, autoMap(parsed.header), { tempUnit: ref.originalTempUnit, units: ref.inputUnits }, id)
      if (v.errors.length) {
        errors[id] = v.errors.map((e) => `Linha ${e.line} — ${e.field ? `${e.field}: ` : ''}${e.message}`)
        return
      }
      rowsBySource[id] = v.rows.map((r, i) => ({ ...r, id: `${id}-${i}` }))
    } catch (e) {
      errors[id] = [e instanceof Error ? e.message : String(e)]
    }
  })

  return { def, sources, rowsBySource, errors }
}

/** Agrupa o resultado de `import.meta.glob('./*\/*.csv')` por fluido e referência. */
export function groupCsvByFluid(glob: Record<string, string>): { byFluid: Record<string, Record<string, string>>; malformed: string[] } {
  const byFluid: Record<string, Record<string, string>> = {}
  const malformed: string[] = []
  for (const [path, text] of Object.entries(glob)) {
    const m = path.match(/^\.\/([^/]+)\/([^/]+)\.csv$/)
    if (!m) {
      malformed.push(path)
      continue
    }
    ;(byFluid[m[1]] ??= {})[m[2]] = text
  }
  return { byFluid, malformed }
}
