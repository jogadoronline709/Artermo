import type { DataRow, Source } from '../domain/types'
import { buildReadOnlyTable } from '../lib/readOnlyTable'

interface Props {
  source: Source
  rows: DataRow[]
  sig: number
}

/** Tabela embutida de uma referência (somente leitura). */
export function ReadOnlyTable({ source, rows, sig }: Props) {
  const t = buildReadOnlyTable(source, rows, sig)
  return (
    <div className="table-wrap ro-table-wrap">
      <table className="ro-table">
        <caption className="sr-only">Tabela de {source.shortName} (somente leitura)</caption>
        <thead>
          <tr>
            {t.columns.map((c) => (
              <th key={c.key} scope="col" title={c.title}>
                {c.label}
                {c.unit && <span className="cell-unit">{c.unit}</span>}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {t.rows.map((cells, i) => (
            <tr key={rows[i].id}>
              {cells.map((cell, j) =>
                j === 0 ? (
                  <th key={j} scope="row" className="num">
                    {cell}
                  </th>
                ) : (
                  <td key={j} className="num">
                    {cell}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
