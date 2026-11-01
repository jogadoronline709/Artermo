/**
 * Transforma as definições de fluido e seus CSVs embutidos em fontes e linhas
 * prontas para cálculo. Função pura: não lê arquivos nem o banco.
 *
 * Tabelas embutidas são validadas com rigor maior que uma importação comum:
 * qualquer aviso, coluna desconhecida ou unidade não declarada vira erro, para
 * que um número na unidade errada nunca seja publicado.
 */
import type { DataRow, PropertyKey, PropertyUnitPrefs, Source } from '../../domain/types'
import { fluidDisplayName, type FluidDef, type ReferenceDef } from '../../domain/fluids'
import { getPropertyDef, parsePropertyUnit, parseTempUnit, PROPERTY_KEYS, PROPERTY_SETS } from '../../domain/units'
import { autoMap, headerUnit, parseCsv, validateImport, type ColumnMapping, type FieldId, type ParsedCsv } from '../csv'
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

/** Propriedades adimensionais não precisam de unidade declarada. */
const DIMENSIONLESS: PropertyKey[] = ['prandtl', 'relativePressure', 'relativeVolume']

/**
 * Confere de onde vem a unidade de cada coluna (célula `*_unit`, cabeçalho ou
 * referência) e devolve a unidade de exibição de cada propriedade.
 */
function checkUnits(parsed: ParsedCsv, map: ColumnMapping, ref: ReferenceDef, def: FluidDef): { inputUnits: PropertyUnitPrefs; errors: string[] } {
  const errors: string[] = []
  const inputUnits: PropertyUnitPrefs = {}
  const mapped = new Set(Object.values(map))
  const cell = (cells: string[], f: FieldId) => {
    const i = map[f]
    return i == null ? '' : (cells[i] ?? '').trim()
  }

  parsed.header.forEach((h, i) => {
    if (h.trim() && !mapped.has(i)) errors.push(`Coluna "${h.trim()}" não reconhecida.`)
  })

  // Coluna reconhecida, mas de outro conjunto de propriedades (ex.: "Pr" numa tabela de gás ideal seria Prandtl).
  const set = def.propertySet ?? 'transporte'
  for (const k of PROPERTY_KEYS) {
    if (map[k] == null || PROPERTY_SETS[set].includes(k)) continue
    const hint = k === 'prandtl' && set === 'gasIdeal' ? ' Para a pressão relativa (Pᵣ), use o cabeçalho relative_pressure.' : ''
    errors.push(`Coluna "${parsed.header[map[k] as number].trim()}" (${getPropertyDef(k).label}) não pertence às propriedades deste fluido.${hint}`)
  }

  if (map.temperature != null) {
    const hdr = parseTempUnit(headerUnit(parsed.header[map.temperature] ?? ''))
    const undeclared = parsed.rows.some((r) => cell(r.cells, 'temperature') && !cell(r.cells, 'temperature_unit') && !hdr && !ref.originalTempUnit)
    if (undeclared) errors.push('Unidade da temperatura não declarada (use o cabeçalho, a coluna temperature_unit ou originalTempUnit na referência).')
  }

  for (const k of PROPERTY_KEYS) {
    if (map[k] == null || DIMENSIONLESS.includes(k)) continue
    const symbol = getPropertyDef(k).symbol
    const hdr = parsePropertyUnit(k, headerUnit(parsed.header[map[k] as number] ?? '')) || undefined
    const used = new Set<string | undefined>()
    for (const r of parsed.rows) {
      if (!cell(r.cells, k)) continue
      const own = parsePropertyUnit(k, cell(r.cells, `${k}_unit` as FieldId))
      if (own === null) continue // unidade inválida: o validador já acusa na linha
      used.add(own ?? hdr ?? ref.inputUnits[k])
    }
    if (used.has(undefined)) errors.push(`Unidade de ${symbol} não declarada (use o cabeçalho, a coluna ${k}_unit ou inputUnits na referência).`)
    else if (used.size > 1) errors.push(`Unidades diferentes na mesma coluna de ${symbol}: ${[...used].join(', ')}.`)
    else if (used.size === 1) inputUnits[k] = [...used][0]
  }
  return { inputUnits, errors }
}

export function loadFluid(def: FluidDef, csvByRefId: Record<string, string | undefined>): LoadedFluid {
  const sources: Source[] = []
  const rowsBySource: Record<string, DataRow[]> = {}
  const errors: Record<string, string[]> = {}

  def.references.forEach((ref, order) => {
    const id = sourceIdFor(def.id, ref.id)
    const { id: _refId, ...meta } = ref
    const source = newSource({
      ...meta,
      id,
      fluidId: def.id,
      fluid: fluidDisplayName(def),
      propertySet: def.propertySet ?? 'transporte',
      pressureApplies: def.pressureApplies ?? true,
      order,
      createdAt: '',
      updatedAt: '',
    })
    sources.push(source)
    rowsBySource[id] = []

    const csv = csvByRefId[ref.id]
    if (csv == null) return
    try {
      const parsed = parseCsv(csv)
      const map = autoMap(parsed.header)
      const units = checkUnits(parsed, map, ref, def)
      const v = validateImport(parsed, map, { tempUnit: ref.originalTempUnit ?? 'C', units: ref.inputUnits }, id)
      const issues = [...units.errors, ...[...v.errors, ...v.warnings].map((e) => `Linha ${e.line} — ${e.field ? `${e.field}: ` : ''}${e.message}`)]
      if (issues.length) {
        errors[id] = issues
        return
      }
      // A tabela é exibida na unidade em que cada coluna foi publicada.
      source.inputUnits = { ...ref.inputUnits, ...units.inputUnits }
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
