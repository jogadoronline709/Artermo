import { formatNumber, formatTemp } from '../domain/numbers'
import type { DataRow, Source } from '../domain/types'
import { fromCanonical, getUnitDef, propertyDefsFor, tempUnitLabel } from '../domain/units'

export interface ReadOnlyColumn {
  key: string
  label: string
  unit: string
  title?: string
}

export interface ReadOnlyTableData {
  columns: ReadOnlyColumn[]
  /** Células já formatadas para exibição, na ordem de `columns`. */
  rows: string[][]
}

/**
 * Monta a tabela embutida de uma referência para exibição.
 * T sempre em °C; a temperatura original aparece com a unidade de cada linha
 * (o CSV pode declarar a unidade linha a linha). Propriedades na unidade
 * declarada na referência; ausente = "—".
 */
export function buildReadOnlyTable(source: Source, rows: DataRow[], sig: number): ReadOnlyTableData {
  const showOriginal = rows.some((r) => r.originalTemperature.unit !== 'C')
  const props = propertyDefsFor(source.propertySet).filter((d) => rows.some((r) => r.values[d.key] != null))

  const columns: ReadOnlyColumn[] = [
    { key: 'tC', label: 'T', unit: '°C' },
    ...(showOriginal ? [{ key: 'tOrig', label: 'T original', unit: '' }] : []),
    ...props.map((d) => ({ key: d.key, label: d.symbol, unit: getUnitDef(d.key, source.inputUnits[d.key]).label, title: d.label })),
  ]

  return {
    columns,
    rows: rows.map((r) => [
      formatTemp(r.temperatureC),
      ...(showOriginal ? [`${formatTemp(r.originalTemperature.value)} ${tempUnitLabel(r.originalTemperature.unit)}`] : []),
      ...props.map((d) => {
        const v = r.values[d.key]
        return v == null ? '—' : formatNumber(fromCanonical(d.key, v, source.inputUnits[d.key]), { sig })
      }),
    ]),
  }
}
