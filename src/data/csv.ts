/**
 * Importação e exportação CSV das tabelas.
 *
 * - Aceita separador vírgula, ponto e vírgula ou tabulação (detectado pelo cabeçalho).
 * - Aceita vírgula ou ponto decimal nos números. Com separador vírgula, números
 *   com vírgula decimal precisam estar entre aspas (é o que o Excel faz).
 * - Linhas iniciadas por "#" são comentários e são ignoradas.
 * - Conteúdo do arquivo é tratado apenas como texto/número — nunca executado.
 */
import { parseNumber } from '../domain/numbers'
import { TEMP_TOLERANCE_C } from '../domain/interpolation'
import type { DataRow, PropertyKey, PropertyUnitPrefs, TempUnit } from '../domain/types'
import {
  ABSOLUTE_ZERO_C,
  getPropertyDef,
  getUnitDef,
  parsePropertyUnit,
  parseTempUnit,
  PROPERTY_DEFS,
  PROPERTY_KEYS,
  toCanonical,
  toCelsius,
} from '../domain/units'

/** Tamanho máximo aceito para arquivos importados (CSV). */
export const MAX_CSV_ROWS = 5000

export type Delimiter = ',' | ';' | '\t'

export interface ParsedCsv {
  delimiter: Delimiter
  header: string[]
  /** Linhas de dados com o número da linha no arquivo (1 = primeira linha). */
  rows: { line: number; cells: string[] }[]
}

/* ------------------------------------------------------------------ */
/* Leitura                                                             */
/* ------------------------------------------------------------------ */

function splitLines(text: string): { line: number; text: string }[] {
  // Divide respeitando quebras de linha dentro de aspas.
  const out: { line: number; text: string }[] = []
  let cur = ''
  let inQ = false
  let line = 1
  let startLine = 1
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    if (ch === '"') {
      inQ = !inQ
      cur += ch
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && text[i + 1] === '\n') i++
      out.push({ line: startLine, text: cur })
      cur = ''
      line++
      startLine = line
    } else {
      if (ch === '\n') line++
      cur += ch
    }
  }
  if (cur.length) out.push({ line: startLine, text: cur })
  return out
}

function countOutsideQuotes(s: string, ch: string): number {
  let n = 0
  let inQ = false
  for (const c of s) {
    if (c === '"') inQ = !inQ
    else if (c === ch && !inQ) n++
  }
  return n
}

export function detectDelimiter(headerLine: string): Delimiter {
  const semi = countOutsideQuotes(headerLine, ';')
  const tab = countOutsideQuotes(headerLine, '\t')
  const comma = countOutsideQuotes(headerLine, ',')
  if (semi > 0 && semi >= comma) return ';'
  if (tab > 0 && tab >= comma) return '\t'
  return ','
}

export function splitCsvLine(line: string, delimiter: Delimiter): string[] {
  const cells: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inQ) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"'
          i++
        } else inQ = false
      } else cur += c
    } else if (c === '"') inQ = true
    else if (c === delimiter) {
      cells.push(cur)
      cur = ''
    } else cur += c
  }
  cells.push(cur)
  return cells.map((c) => c.trim())
}

export function parseCsv(text: string): ParsedCsv {
  const clean = text.replace(/^﻿/, '')
  const lines = splitLines(clean).filter((l) => l.text.trim() !== '' && !l.text.trim().startsWith('#'))
  if (lines.length === 0) throw new Error('Arquivo vazio: nenhum cabeçalho encontrado.')
  const delimiter = detectDelimiter(lines[0].text)
  const header = splitCsvLine(lines[0].text, delimiter)
  const rows = lines.slice(1).map((l) => ({ line: l.line, cells: splitCsvLine(l.text, delimiter) }))
  if (rows.length > MAX_CSV_ROWS) throw new Error(`Arquivo com linhas demais (${rows.length}). Limite: ${MAX_CSV_ROWS}.`)
  // Linha "sep=;" do Excel
  if (/^sep=.$/i.test(header[0] ?? '') && header.length === 1) {
    return parseCsv(lines.slice(1).map((l) => l.text).join('\n'))
  }
  return { delimiter, header, rows }
}

/* ------------------------------------------------------------------ */
/* Mapeamento de colunas                                               */
/* ------------------------------------------------------------------ */

export type FieldId = 'temperature' | 'temperature_unit' | PropertyKey | `${PropertyKey}_unit`

export type ColumnMapping = Partial<Record<FieldId, number>>

export const FIELD_LABELS: { id: FieldId; label: string; unitOf?: PropertyKey | 'temperature' }[] = [
  { id: 'temperature', label: 'Temperatura' },
  { id: 'temperature_unit', label: 'Unidade da temperatura', unitOf: 'temperature' },
  ...PROPERTY_DEFS.flatMap((d) => {
    const items: { id: FieldId; label: string; unitOf?: PropertyKey | 'temperature' }[] = [
      { id: d.key, label: `${d.label} (${d.symbol})` },
    ]
    if (d.csvUnit) items.push({ id: `${d.key}_unit` as FieldId, label: `Unidade de ${d.symbol}`, unitOf: d.key })
    return items
  }),
]

function normHeader(h: string): string {
  return h
    .replace(/[([].*?[)\]]/g, '') // remove unidade entre parênteses/colchetes
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9ρμνα]/g, '')
}

const HEADER_ALIASES: Record<FieldId, string[]> = {
  temperature: ['temperature', 'temperatura', 't', 'temp'],
  temperature_unit: ['temperatureunit', 'temperaturaunidade', 'unidadetemperatura', 'tunit', 'unidadet'],
  density: ['density', 'massaespecifica', 'densidade', 'rho', 'ρ'],
  density_unit: ['densityunit', 'rhounit', 'unidadedensidade', 'unidademassaespecifica'],
  specificHeat: ['specificheat', 'calorespecifico', 'cp'],
  specificHeat_unit: ['specificheatunit', 'cpunit', 'unidadecp', 'unidadecalorespecifico'],
  conductivity: ['conductivity', 'thermalconductivity', 'condutividade', 'condutividadetermica', 'k'],
  conductivity_unit: ['conductivityunit', 'kunit', 'unidadek', 'unidadecondutividade'],
  dynamicViscosity: ['dynamicviscosity', 'viscosidadedinamica', 'mu', 'μ', 'viscosity'],
  dynamicViscosity_unit: ['dynamicviscosityunit', 'muunit', 'unidademu', 'unidadeviscosidadedinamica'],
  kinematicViscosity: ['kinematicviscosity', 'viscosidadecinematica', 'nu', 'ν'],
  kinematicViscosity_unit: ['kinematicviscosityunit', 'nuunit', 'unidadenu', 'unidadeviscosidadecinematica'],
  thermalDiffusivity: ['thermaldiffusivity', 'difusividadetermica', 'difusividade', 'alpha', 'alfa', 'α'],
  thermalDiffusivity_unit: ['thermaldiffusivityunit', 'alphaunit', 'unidadealpha', 'unidadedifusividade'],
  prandtl: ['prandtl', 'pr', 'numerodeprandtl'],
  prandtl_unit: ['prandtlunit'],
}

/** Associa automaticamente colunas do arquivo aos campos do ArTermo. */
export function autoMap(header: string[]): ColumnMapping {
  const map: ColumnMapping = {}
  const used = new Set<number>()
  for (const field of Object.keys(HEADER_ALIASES) as FieldId[]) {
    const aliases = HEADER_ALIASES[field]
    const idx = header.findIndex((h, i) => !used.has(i) && aliases.includes(normHeader(h)))
    if (idx >= 0) {
      map[field] = idx
      used.add(idx)
    }
  }
  return map
}

/** Unidade escrita no próprio cabeçalho, ex.: "T (K)" ou "cp [kJ/kg·K]". */
export function headerUnit(header: string): string | undefined {
  const m = header.match(/[([]\s*([^)\]]+?)\s*[)\]]\s*$/)
  return m ? m[1] : undefined
}

/* ------------------------------------------------------------------ */
/* Validação                                                           */
/* ------------------------------------------------------------------ */

export interface ImportDefaults {
  tempUnit: TempUnit
  units: PropertyUnitPrefs
}

export interface ImportIssue {
  line: number
  field?: string
  message: string
}

export type NewRow = Omit<DataRow, 'id'>

export interface ImportValidation {
  rows: NewRow[]
  errors: ImportIssue[]
  warnings: ImportIssue[]
}

/**
 * Converte e valida as linhas do CSV. Nada é gravado aqui.
 * Valores vazios ficam ausentes (nunca zero). Unidades da linha têm
 * prioridade; depois a unidade do cabeçalho; depois o padrão da fonte.
 */
export function validateImport(parsed: ParsedCsv, mapping: ColumnMapping, defaults: ImportDefaults, sourceId: string): ImportValidation {
  const errors: ImportIssue[] = []
  const warnings: ImportIssue[] = []
  const rows: NewRow[] = []

  if (mapping.temperature == null) {
    errors.push({ line: 1, message: 'Nenhuma coluna foi associada à temperatura.' })
    return { rows, errors, warnings }
  }
  const mappedProps = PROPERTY_KEYS.filter((k) => mapping[k] != null)
  if (mappedProps.length === 0) {
    errors.push({ line: 1, message: 'Nenhuma coluna foi associada a propriedades.' })
    return { rows, errors, warnings }
  }

  // Unidades declaradas no cabeçalho
  const hdrTempUnit = (() => {
    const h = headerUnit(parsed.header[mapping.temperature] ?? '')
    if (!h) return undefined
    const u = parseTempUnit(h)
    if (!u) warnings.push({ line: 1, field: 'Temperatura', message: `Unidade "${h}" do cabeçalho não reconhecida; usando o padrão da fonte.` })
    return u ?? undefined
  })()
  const hdrPropUnit: PropertyUnitPrefs = {}
  for (const k of mappedProps) {
    const h = headerUnit(parsed.header[mapping[k] as number] ?? '')
    if (!h) continue
    const u = parsePropertyUnit(k, h)
    if (u) hdrPropUnit[k] = u
    else warnings.push({ line: 1, field: getPropertyDef(k).symbol, message: `Unidade "${h}" do cabeçalho não reconhecida; usando o padrão da fonte.` })
  }

  const cell = (cells: string[], f: FieldId) => {
    const i = mapping[f]
    return i == null ? undefined : cells[i]
  }

  const seen: { t: number; line: number }[] = []

  for (const { line, cells } of parsed.rows) {
    if (cells.every((c) => c.trim() === '')) continue
    const rowErrors: ImportIssue[] = []

    // Temperatura
    const tRaw = cell(cells, 'temperature') ?? ''
    const t = parseNumber(tRaw)
    let tUnit: TempUnit = hdrTempUnit ?? defaults.tempUnit
    const tuRaw = cell(cells, 'temperature_unit')
    if (tuRaw != null && tuRaw.trim() !== '') {
      const u = parseTempUnit(tuRaw)
      if (u) tUnit = u
      else rowErrors.push({ line, field: 'Unidade da temperatura', message: `Unidade "${tuRaw}" não reconhecida (use °C, K ou °F).` })
    }
    if (t == null) rowErrors.push({ line, field: 'Temperatura', message: 'Temperatura vazia.' })
    else if (Number.isNaN(t)) rowErrors.push({ line, field: 'Temperatura', message: `"${tRaw}" não é um número válido.` })

    const tC = t != null && !Number.isNaN(t) ? toCelsius(t, tUnit) : NaN
    if (Number.isFinite(tC) && tC < ABSOLUTE_ZERO_C - 1e-9) {
      rowErrors.push({ line, field: 'Temperatura', message: 'Temperatura abaixo do zero absoluto.' })
    }

    // Propriedades
    const values: DataRow['values'] = {}
    for (const k of mappedProps) {
      const def = getPropertyDef(k)
      const raw = cell(cells, k) ?? ''
      const v = parseNumber(raw)
      if (v == null) continue // ausente
      if (Number.isNaN(v)) {
        rowErrors.push({ line, field: def.symbol, message: `"${raw}" não é um número válido.` })
        continue
      }
      let unitId = hdrPropUnit[k] ?? defaults.units[k] ?? def.units[0].id
      const uRaw = cell(cells, `${k}_unit` as FieldId)
      if (uRaw != null && uRaw.trim() !== '') {
        const u = parsePropertyUnit(k, uRaw)
        if (u === null) {
          rowErrors.push({ line, field: def.symbol, message: `Unidade "${uRaw}" não suportada para ${def.label}.` })
          continue
        }
        if (u) unitId = u
      }
      if (v <= 0) {
        rowErrors.push({
          line,
          field: def.symbol,
          message: `Valor ${raw} inválido: deve ser positivo. Deixe a célula vazia se o dado não existir.`,
        })
        continue
      }
      values[k] = toCanonical(k, v, getUnitDef(k, unitId).id)
    }

    if (rowErrors.length) {
      errors.push(...rowErrors)
      continue
    }
    if (Object.keys(values).length === 0) {
      warnings.push({ line, message: 'Linha sem nenhuma propriedade preenchida — será ignorada.' })
      continue
    }
    const dup = seen.find((s) => Math.abs(s.t - tC) <= TEMP_TOLERANCE_C)
    if (dup) {
      errors.push({ line, field: 'Temperatura', message: `Temperatura repetida (já aparece na linha ${dup.line}).` })
      continue
    }
    seen.push({ t: tC, line })
    rows.push({ sourceId, temperatureC: tC, originalTemperature: { value: t as number, unit: tUnit }, values })
  }

  rows.sort((a, b) => a.temperatureC - b.temperatureC)
  if (rows.length === 0 && errors.length === 0) errors.push({ line: 1, message: 'Nenhuma linha válida encontrada.' })
  return { rows, errors, warnings }
}

/** Cabeçalhos do formato CSV das tabelas embutidas. */
export const CSV_HEADERS = [
  'temperature',
  'temperature_unit',
  'density',
  'density_unit',
  'specific_heat',
  'specific_heat_unit',
  'conductivity',
  'conductivity_unit',
  'dynamic_viscosity',
  'dynamic_viscosity_unit',
  'prandtl',
  'kinematic_viscosity',
  'kinematic_viscosity_unit',
  'thermal_diffusivity',
  'thermal_diffusivity_unit',
]
