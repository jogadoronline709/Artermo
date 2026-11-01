import type { AverageResult } from '../domain/average'
import { hasValue } from '../domain/interpolation'
import { formatNumber, formatPlain, formatTemp } from '../domain/numbers'
import { effectiveValue, type DerivedChoice, type SourceQuery } from '../domain/query'
import type { PropertyKey, Source, TempUnit } from '../domain/types'
import { PROPERTY_DEFS, pressureFromKPa, tempUnitLabel } from '../domain/units'

export interface RequestedTemp {
  value: number
  unit: TempUnit
  tC: number
}

export function fmtReqTemp(t: RequestedTemp): string {
  const base = `${formatTemp(t.value)} ${tempUnitLabel(t.unit)}`
  return t.unit === 'C' ? base : `${base} (${formatTemp(t.tC)} °C)`
}

/** Referência bibliográfica a partir dos metadados que o usuário cadastrou. */
export function citation(s: Source): string {
  const parts = [
    s.authors,
    s.title,
    s.edition && (/ed/i.test(s.edition) ? s.edition : `${s.edition} ed.`),
    s.year,
    s.pageTable,
  ].filter((x) => x && x.trim())
  return parts.join(', ')
}

export function pressureText(s: Source): string {
  if (s.pressureKPa == null) return 'pressão não cadastrada'
  const v = pressureFromKPa(s.pressureKPa, s.pressureUnit)
  return `${formatTemp(v)} ${s.pressureUnit}`
}

const STATUS_TXT: Record<string, string> = {
  tabulated: 'tabelado',
  interpolated: 'interpolado',
  extrapolated: 'EXTRAPOLADO (estimado)',
  calculated: 'calculado pelo app',
}

export function sourceReportText(s: Source, q: SourceQuery, t: RequestedTemp, choice: DerivedChoice, sig: number): string {
  const lines = [
    `ArTermo — ${s.shortName}`,
    citation(s) || '(referência sem metadados cadastrados)',
    `Pressão de referência: ${pressureText(s)}`,
    `T = ${fmtReqTemp(t)}`,
    '',
  ]
  for (const d of PROPERTY_DEFS) {
    const e = effectiveValue(q[d.key], d.derived ? choice : 'published')
    if (e.ok) lines.push(`${d.symbol} = ${formatNumber(e.value, { sig })} ${d.canonical} (${STATUS_TXT[e.status] ?? e.status})`)
    else lines.push(`${d.symbol}: ${e.reason}`)
  }
  return lines.join('\n')
}

function csvLine(cells: (string | number)[]): string {
  return cells
    .map((c) => {
      const s = String(c)
      return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    })
    .join(';')
}

/** CSV (separador ; e vírgula decimal, para Excel pt-BR) com o detalhamento da interpolação. */
export function sourceReportCsv(s: Source, q: SourceQuery, t: RequestedTemp, choice: DerivedChoice): string {
  const out = [
    csvLine(['fonte', s.shortName]),
    csvLine(['referencia', citation(s)]),
    csvLine(['pressao', pressureText(s)]),
    csvLine(['T_solicitada', formatPlain(t.value, ','), tempUnitLabel(t.unit)]),
    csvLine(['T_C', formatPlain(t.tC, ',')]),
    '',
    csvLine(['propriedade', 'simbolo', 'valor', 'unidade', 'situacao', 'T1_C', 'y1', 'T2_C', 'y2', 'fracao', 'publicado', 'calculado']),
  ]
  for (const d of PROPERTY_DEFS) {
    const r = q[d.key]
    const e = effectiveValue(r, d.derived ? choice : 'published')
    const p = r.published
    const interp = p.status === 'interpolated' || p.status === 'extrapolated' ? p : null
    out.push(
      csvLine([
        d.label,
        d.symbol,
        e.ok ? formatPlain(e.value, ',') : '',
        d.canonical,
        e.ok ? (STATUS_TXT[e.status] ?? e.status) : e.reason,
        interp ? formatPlain(interp.t1, ',') : '',
        interp ? formatPlain(interp.y1, ',') : '',
        interp ? formatPlain(interp.t2, ',') : '',
        interp ? formatPlain(interp.y2, ',') : '',
        interp ? formatPlain(interp.fraction, ',') : '',
        hasValue(p) ? formatPlain(p.value, ',') : '',
        r.calculated?.value != null ? formatPlain(r.calculated.value, ',') : '',
      ]),
    )
  }
  return out.join('\r\n') + '\r\n'
}

export interface CompareRow {
  key: PropertyKey
  perSource: { name: string; value: number | null; label: string }[]
  avg: AverageResult
}

export function compareReportCsv(t: RequestedTemp, sources: Source[], rows: CompareRow[], modeLabel: string, warning: string): string {
  const out = [
    csvLine(['ArTermo — comparação e média aritmética das referências']),
    csvLine(['T_solicitada', formatPlain(t.value, ','), tempUnitLabel(t.unit)]),
    csvLine(['T_C', formatPlain(t.tC, ',')]),
    csvLine(['modo', modeLabel]),
    ...(warning ? [csvLine(['aviso', warning])] : []),
    '',
    csvLine(['propriedade', 'unidade', ...sources.map((s) => s.shortName), 'media_aritmetica', 'n', 'total', 'minimo', 'maximo', 'amplitude', 'desvio_padrao_amostral', 'excluidas']),
  ]
  for (const r of rows) {
    const d = PROPERTY_DEFS.find((x) => x.key === r.key)!
    const f = (v: number | null) => (v == null ? '' : formatPlain(v, ','))
    out.push(
      csvLine([
        `${d.label} (${d.symbol})`,
        d.canonical,
        ...r.perSource.map((p) => (p.value == null ? p.label : formatPlain(p.value, ','))),
        f(r.avg.mean),
        r.avg.n,
        r.avg.total,
        f(r.avg.min),
        f(r.avg.max),
        f(r.avg.range),
        f(r.avg.stdSample),
        r.avg.excluded.map((e) => `${e.name}: ${e.reason}`).join(' | '),
      ]),
    )
  }
  return out.join('\r\n') + '\r\n'
}
