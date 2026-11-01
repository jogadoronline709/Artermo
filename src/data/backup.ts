/**
 * Backup completo em JSON (exportação/restauração).
 * A restauração valida e RECONSTRÓI cada objeto campo a campo: nada vindo
 * do arquivo é executado e chaves desconhecidas são descartadas.
 */
import type { DataRow, PressureUnit, PropertyKey, PropertyUnitPrefs, Source, TempUnit } from '../domain/types'
import { getPropertyDef, PRESSURE_UNITS, PROPERTY_KEYS, toCelsius } from '../domain/units'
import { TEMP_TOLERANCE_C } from '../domain/interpolation'
import type { Favorite } from './types'

export const BACKUP_FORMAT = 'artermo-backup'
export const BACKUP_VERSION = 1
export const MAX_BACKUP_BYTES = 10 * 1024 * 1024

export interface BackupFile {
  format: typeof BACKUP_FORMAT
  version: number
  app: 'ArTermo'
  exportedAt: string
  sources: Source[]
  rows: DataRow[]
  favorites: Favorite[]
}

export function buildBackup(data: { sources: Source[]; rows: DataRow[]; favorites: Favorite[] }, now = new Date()): BackupFile {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    app: 'ArTermo',
    exportedAt: now.toISOString(),
    sources: data.sources,
    rows: data.rows,
    favorites: data.favorites,
  }
}

export function serializeBackup(b: BackupFile): string {
  return JSON.stringify(b, null, 2)
}

export type ParseBackupResult = { ok: true; data: BackupFile } | { ok: false; errors: string[] }

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v)
const str = (v: unknown, max = 2000): string => (typeof v === 'string' ? v.slice(0, max) : '')
const finite = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const TEMP_UNITS: TempUnit[] = ['C', 'K', 'F']

export function parseBackup(text: string): ParseBackupResult {
  if (text.length > MAX_BACKUP_BYTES) return { ok: false, errors: ['Arquivo grande demais (limite de 10 MB).'] }
  let raw: unknown
  try {
    raw = JSON.parse(text)
  } catch {
    return { ok: false, errors: ['O arquivo não é um JSON válido.'] }
  }
  if (!isObj(raw) || raw.format !== BACKUP_FORMAT) {
    return { ok: false, errors: ['Este arquivo não é um backup do ArTermo.'] }
  }
  if (!finite(raw.version) || raw.version > BACKUP_VERSION) {
    return { ok: false, errors: [`Versão de backup não suportada (${String(raw.version)}).`] }
  }
  if (!Array.isArray(raw.sources) || !Array.isArray(raw.rows)) {
    return { ok: false, errors: ['Backup incompleto: faltam "sources" ou "rows".'] }
  }

  const errors: string[] = []
  const sources: Source[] = []
  const ids = new Set<string>()

  raw.sources.forEach((s, i) => {
    if (!isObj(s) || !str(s.id) || !str(s.shortName)) {
      errors.push(`Fonte #${i + 1}: id ou nome ausente.`)
      return
    }
    if (ids.has(s.id as string)) {
      errors.push(`Fonte #${i + 1}: id duplicado.`)
      return
    }
    ids.add(s.id as string)
    const inputUnits: PropertyUnitPrefs = {}
    if (isObj(s.inputUnits)) {
      for (const k of PROPERTY_KEYS) {
        const u = s.inputUnits[k]
        if (typeof u === 'string' && getPropertyDef(k).units.some((x) => x.id === u)) inputUnits[k] = u
      }
    }
    sources.push({
      id: str(s.id, 200),
      shortName: str(s.shortName, 100),
      authors: str(s.authors),
      title: str(s.title),
      edition: str(s.edition, 200),
      year: str(s.year, 50),
      pageTable: str(s.pageTable, 500),
      fluid: str(s.fluid, 100) || 'Ar',
      pressureKPa: finite(s.pressureKPa) && s.pressureKPa > 0 ? s.pressureKPa : null,
      pressureUnit: PRESSURE_UNITS.some((p) => p.id === s.pressureUnit) ? (s.pressureUnit as PressureUnit) : 'kPa',
      originalTempUnit: TEMP_UNITS.includes(s.originalTempUnit as TempUnit) ? (s.originalTempUnit as TempUnit) : 'C',
      inputUnits,
      notes: str(s.notes, 5000),
      isSimulated: s.isSimulated === true,
      order: finite(s.order) ? s.order : i,
      createdAt: str(s.createdAt, 40) || new Date().toISOString(),
      updatedAt: str(s.updatedAt, 40) || new Date().toISOString(),
    })
  })

  const rows: DataRow[] = []
  const rowIds = new Set<string>()
  raw.rows.forEach((r, i) => {
    if (!isObj(r) || !str(r.id) || !ids.has(str(r.sourceId))) {
      errors.push(`Linha #${i + 1}: id ausente ou fonte inexistente.`)
      return
    }
    if (rowIds.has(r.id as string)) {
      errors.push(`Linha #${i + 1}: id duplicado.`)
      return
    }
    rowIds.add(r.id as string)
    if (!finite(r.temperatureC)) {
      errors.push(`Linha #${i + 1}: temperatura inválida.`)
      return
    }
    const ot = isObj(r.originalTemperature) ? r.originalTemperature : {}
    const originalTemperature =
      finite(ot.value) && TEMP_UNITS.includes(ot.unit as TempUnit) && Math.abs(toCelsius(ot.value, ot.unit as TempUnit) - (r.temperatureC as number)) < 1e-6
        ? { value: ot.value, unit: ot.unit as TempUnit }
        : { value: r.temperatureC as number, unit: 'C' as TempUnit }
    const values: DataRow['values'] = {}
    if (isObj(r.values)) {
      for (const k of PROPERTY_KEYS) {
        const v = r.values[k]
        if (v == null) continue
        if (!finite(v) || v <= 0) {
          errors.push(`Linha #${i + 1}: valor inválido em ${getPropertyDef(k as PropertyKey).symbol}.`)
          continue
        }
        values[k] = v
      }
    }
    rows.push({ id: str(r.id, 200), sourceId: str(r.sourceId, 200), temperatureC: r.temperatureC as number, originalTemperature, values })
  })

  // Duplicatas de temperatura dentro de uma mesma fonte.
  for (const s of sources) {
    const ts = rows.filter((r) => r.sourceId === s.id).map((r) => r.temperatureC).sort((a, b) => a - b)
    for (let i = 1; i < ts.length; i++) {
      if (Math.abs(ts[i] - ts[i - 1]) <= TEMP_TOLERANCE_C) {
        errors.push(`Fonte "${s.shortName}": temperatura duplicada (${ts[i]} °C).`)
        break
      }
    }
  }

  const favorites: Favorite[] = []
  if (Array.isArray(raw.favorites)) {
    for (const f of raw.favorites) {
      if (isObj(f) && finite(f.value) && TEMP_UNITS.includes(f.unit as TempUnit)) {
        favorites.push({ id: str(f.id, 200) || `fav-${favorites.length}`, value: f.value, unit: f.unit as TempUnit, label: str(f.label, 100), createdAt: str(f.createdAt, 40) })
      }
    }
  }

  if (errors.length) return { ok: false, errors }
  return {
    ok: true,
    data: { format: BACKUP_FORMAT, version: BACKUP_VERSION, app: 'ArTermo', exportedAt: str(raw.exportedAt, 40), sources, rows, favorites },
  }
}
