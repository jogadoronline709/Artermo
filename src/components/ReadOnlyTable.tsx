import { formatNumber, formatTemp } from '../domain/numbers'
import type { DataRow, Source } from '../domain/types'
import { fromCanonical, getUnitDef, PROPERTY_DEFS, tempUnitLabel } from '../domain/units'

interface Props {
  source: Source
  rows: DataRow[]
  sig: number
}

/** Tabela embutida de uma referência, exibida nas unidades em que o livro publica. */
export function ReadOnlyTable({ source, rows, sig }: Props) {
  const props = PROPERTY_DEFS.filter((d) => rows.some((r) => r.values[d.key] != null))
  const tUnit = tempUnitLabel(source.originalTempUnit)
  return (
    <div className="table-wrap ro-table-wrap">
      <table className="ro-table">
        <caption className="sr-only">Tabela de {source.shortName} (somente leitura)</caption>
        <thead>
          <tr>
            <th scope="col">
              T<span className="cell-unit">{tUnit}</span>
            </th>
            {source.originalTempUnit !== 'C' && (
              <th scope="col">
                T<span className="cell-unit">°C</span>
              </th>
            )}
            {props.map((d) => (
              <th key={d.key} scope="col" title={d.label}>
                {d.symbol}
                <span className="cell-unit">{getUnitDef(d.key, source.inputUnits[d.key]).label}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <th scope="row" className="num">
                {formatTemp(r.originalTemperature.value)}
              </th>
              {source.originalTempUnit !== 'C' && <td className="num">{formatTemp(r.temperatureC)}</td>}
              {props.map((d) => {
                const v = r.values[d.key]
                return (
                  <td key={d.key} className="num">
                    {v == null ? '—' : formatNumber(fromCanonical(d.key, v, source.inputUnits[d.key]), { sig })}
                  </td>
                )
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
