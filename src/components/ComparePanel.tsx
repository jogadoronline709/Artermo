import { lazy, Suspense, useState } from 'react'
import { averageSources, type AverageMode } from '../domain/average'
import { checkCompatibility } from '../domain/compatibility'
import { formatNumber } from '../domain/numbers'
import { effectiveValue, type DerivedChoice, type SourceQuery } from '../domain/query'
import type { DataRow, PropertyKey, Source, TempUnit } from '../domain/types'
import { PROPERTY_DEFS } from '../domain/units'
import { useSettings } from '../hooks/settingsContext'
import { selectedCompareIds, toggleCompareId } from '../lib/compareSelection'
import { copyText, dateStamp, downloadText } from '../lib/files'
import { compareReportCsv, fmtReqTemp, type CompareRow, type RequestedTemp } from '../lib/report'
import { useFeedback } from './feedback'
import { Badge, type BadgeKind } from './PropertyRow'

const PropertyChart = lazy(() => import('./PropertyChart'))

interface Props {
  fluidId: string
  sources: Source[]
  rowsBySource: Record<string, DataRow[]>
  queries: Record<string, SourceQuery>
  req: RequestedTemp | null
  unit: TempUnit
}

interface Cell {
  name: string
  value: number | null
  kind: BadgeKind
  label: string
}

const MODE_LABEL: Record<AverageMode, string> = {
  require_all: 'Exigir todas as referências selecionadas',
  available: 'Média das fontes disponíveis',
}

export function ComparePanel({ fluidId, sources, rowsBySource, queries, req, unit }: Props) {
  const { settings, update } = useSettings()
  const { confirm, toast } = useFeedback()
  const [override, setOverride] = useState(false)
  const [chartProp, setChartProp] = useState<PropertyKey>('density')
  const [showChart, setShowChart] = useState(false)
  const sig = settings.sigDigits

  const selectedIds = selectedCompareIds(settings.compareSelection[fluidId], sources, rowsBySource)
  const selected = sources.filter((s) => selectedIds.includes(s.id))
  const N = selected.length

  // Só as fontes que têm dados entram na verificação de compatibilidade.
  const compat = checkCompatibility(selected.filter((s) => (rowsBySource[s.id]?.length ?? 0) > 0))
  const blocked = !compat.compatible && !override

  const toggleSource = (id: string) => {
    update({ compareSelection: { ...settings.compareSelection, [fluidId]: toggleCompareId(selectedIds, id) } })
    setOverride(false)
  }

  const table: (CompareRow & { cells: Cell[] })[] = !req
    ? []
    : PROPERTY_DEFS.map((d) => {
      const cells: Cell[] = selected.map((s) => {
        const rows = rowsBySource[s.id] ?? []
        if (rows.length === 0) return { name: s.shortName, value: null, kind: 'missing', label: 'Tabela vazia' }
        const e = effectiveValue(queries[s.id][d.key], d.derived ? settings.derivedChoice : 'published')
        if (!e.ok) return { name: s.shortName, value: null, kind: 'missing', label: e.reason }
        return { name: s.shortName, value: e.value, kind: e.status as BadgeKind, label: '' }
      })
      const avg = averageSources(
        cells.map((c, i) => ({ sourceId: selected[i].id, name: c.name, value: c.value, reason: c.label })),
        settings.averageMode,
      )
      return { key: d.key, cells, perSource: cells.map((c) => ({ name: c.name, value: c.value, label: c.label })), avg }
    })

  async function askOverride() {
    const ok = await confirm({
      title: 'Calcular a média mesmo assim?',
      message: `As referências selecionadas não são compatíveis: ${compat.issues.map((i) => i.message).join(' ')} A média será exibida com um aviso permanente e a diferença continuará visível.`,
      confirmLabel: 'Calcular com aviso',
      danger: true,
    })
    if (ok) setOverride(true)
  }

  const warning = !compat.compatible && override ? `Média calculada apesar de incompatibilidade: ${compat.issues.map((i) => i.message).join(' ')}` : ''

  const meanCell = (r: (typeof table)[number]) => {
    if (blocked) return <span className="cell-reason">Bloqueada</span>
    if (r.avg.status === 'ok') return <span className="num">{formatNumber(r.avg.mean, { sig })}</span>
    if (r.avg.status === 'incomplete') return <span className="cell-reason">Incompleta</span>
    return <span className="cell-reason">—</span>
  }

  const nText = (r: (typeof table)[number]) => `${r.avg.n}/${r.avg.total}`

  return (
    <section className="panel" aria-labelledby="cmp-title">
      <header className="panel-head">
        <div>
          <h2 id="cmp-title">Comparar e média</h2>
          <p className="panel-sub">{req ? `T = ${fmtReqTemp(req)}` : 'Informe uma temperatura.'}</p>
        </div>
        {req && N > 0 && (
          <div className="panel-actions">
            <button
              type="button"
              className="btn btn-small"
              onClick={async () => {
                const lines = [`ArTermo — comparação em T = ${fmtReqTemp(req)}`, `Modo: ${MODE_LABEL[settings.averageMode]}`]
                if (warning) lines.push(`AVISO: ${warning}`)
                for (const r of table) {
                  const d = PROPERTY_DEFS.find((x) => x.key === r.key)!
                  const parts = r.cells.map((c) => `${c.name}: ${c.value == null ? c.label : formatNumber(c.value, { sig })}`)
                  const mean = blocked ? 'bloqueada' : r.avg.mean == null ? (r.avg.status === 'incomplete' ? 'incompleta' : '—') : formatNumber(r.avg.mean, { sig })
                  lines.push(`${d.symbol} [${d.canonical}] — ${parts.join('; ')}; média aritmética (${nText(r)}): ${mean}`)
                }
                const ok = await copyText(lines.join('\n'))
                toast(ok ? 'Comparação copiada' : 'Não foi possível copiar', ok ? 'ok' : 'error')
              }}
            >
              Copiar
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() =>
                downloadText(
                  `artermo-comparacao-${dateStamp()}.csv`,
                  compareReportCsv(
                    req,
                    selected,
                    table.map((r) => (blocked ? { ...r, avg: { ...r.avg, mean: null } } : r)),
                    MODE_LABEL[settings.averageMode],
                    blocked ? 'Média bloqueada por incompatibilidade' : warning,
                  ),
                  'text/csv;charset=utf-8',
                )
              }
            >
              Exportar CSV
            </button>
            <button type="button" className="btn btn-small hide-mobile" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          </div>
        )}
      </header>

      <fieldset className="controls">
        <legend className="sr-only">Opções da comparação</legend>
        <div className="control">
          <span className="control-label">Referências</span>
          <div className="checks">
            {sources.map((s) => (
              <label key={s.id} className={`check${s.isSimulated ? ' is-sim' : ''}`}>
                <input type="checkbox" checked={selectedIds.includes(s.id)} onChange={() => toggleSource(s.id)} />
                {s.shortName}
              </label>
            ))}
          </div>
        </div>
        <div className="control">
          <span className="control-label">Média</span>
          <div className="seg" role="radiogroup" aria-label="Modo da média">
            {(['require_all', 'available'] as AverageMode[]).map((m) => (
              <button key={m} type="button" role="radio" aria-checked={settings.averageMode === m} className={settings.averageMode === m ? 'on' : ''} onClick={() => update({ averageMode: m })}>
                {m === 'require_all' ? `Exigir as ${N}` : 'Fontes disponíveis'}
              </button>
            ))}
          </div>
        </div>
        <div className="control">
          <label className="control-label" htmlFor="derived-choice">
            ν, α e Pr
          </label>
          <select id="derived-choice" value={settings.derivedChoice} onChange={(e) => update({ derivedChoice: e.target.value as DerivedChoice })}>
            <option value="published">Somente valor publicado</option>
            <option value="published_else_calculated">Publicado; calculado se faltar</option>
            <option value="calculated">Sempre calculado pelo app</option>
          </select>
        </div>
      </fieldset>

      {N === 0 && <p className="muted pad">Selecione ao menos uma referência.</p>}

      {N > 0 && !compat.compatible && (
        <div className={`alert ${override ? 'alert-danger' : 'alert-warn'}`} role="alert">
          <p>
            <strong>{override ? 'Média calculada com incompatibilidade.' : 'Média bloqueada.'}</strong> Só faz sentido mediar tabelas do mesmo fluido e na mesma pressão de referência.
          </p>
          <ul>
            {compat.issues.map((i) => (
              <li key={i.kind}>{i.message}</li>
            ))}
          </ul>
          <p className="alert-actions">
            {override ? (
              <button type="button" className="btn btn-small" onClick={() => setOverride(false)}>
                Bloquear novamente
              </button>
            ) : (
              <button type="button" className="btn btn-small btn-danger-ghost" onClick={askOverride}>
                Calcular mesmo assim
              </button>
            )}
          </p>
        </div>
      )}

      {req && N > 0 && (
        <>
          {/* Tabela (telas largas) */}
          <div className="table-wrap cmp-table-wrap">
            <table className="cmp-table">
              <thead>
                <tr>
                  <th scope="col">Propriedade</th>
                  {selected.map((s) => (
                    <th key={s.id} scope="col" className={s.isSimulated ? 'is-sim' : ''}>
                      {s.shortName}
                    </th>
                  ))}
                  <th scope="col" className="col-mean">
                    Média aritmética
                  </th>
                  <th scope="col">n</th>
                  <th scope="col">Mín.</th>
                  <th scope="col">Máx.</th>
                  <th scope="col">Amplitude</th>
                  <th scope="col" title="Desvio-padrão amostral (divisor n − 1)">
                    s
                  </th>
                </tr>
              </thead>
              <tbody>
                {table.map((r) => {
                  const d = PROPERTY_DEFS.find((x) => x.key === r.key)!
                  return (
                    <tr key={r.key}>
                      <th scope="row">
                        <span className="prop-sym">{d.symbol}</span>
                        <span className="cell-unit">{d.canonical === '—' ? 'adim.' : d.canonical}</span>
                      </th>
                      {r.cells.map((c) => (
                        <td key={c.name}>
                          {c.value != null ? (
                            <>
                              <span className="num">{formatNumber(c.value, { sig })}</span> <Badge kind={c.kind} compact />
                            </>
                          ) : (
                            <span className="cell-reason">{c.label}</span>
                          )}
                        </td>
                      ))}
                      <td className="col-mean">{meanCell(r)}</td>
                      <td className={r.avg.n < r.avg.total ? 'warn-text' : ''}>{nText(r)}</td>
                      <td>{formatNumber(r.avg.min, { sig })}</td>
                      <td>{formatNumber(r.avg.max, { sig })}</td>
                      <td>
                        {formatNumber(r.avg.range, { sig: 3 })}
                        {r.avg.rangePct != null && r.avg.n > 1 && <span className="muted"> ({formatNumber(r.avg.rangePct, { sig: 2 })} %)</span>}
                      </td>
                      <td>{formatNumber(r.avg.stdSample, { sig: 3 })}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Cartões (celular) */}
          <ul className="cmp-cards">
            {table.map((r) => {
              const d = PROPERTY_DEFS.find((x) => x.key === r.key)!
              return (
                <li key={r.key} className="cmp-card">
                  <div className="cmp-card-head">
                    <span className="prop-sym">{d.symbol}</span>
                    <span className="prop-name">{d.label}</span>
                    <span className="cell-unit">{d.canonical === '—' ? 'adimensional' : d.canonical}</span>
                  </div>
                  <dl className="cmp-card-grid">
                    {r.cells.map((c) => (
                      <div key={c.name}>
                        <dt>{c.name}</dt>
                        <dd>
                          {c.value != null ? (
                            <>
                              <span className="num">{formatNumber(c.value, { sig })}</span> <Badge kind={c.kind} compact />
                            </>
                          ) : (
                            <span className="cell-reason">{c.label}</span>
                          )}
                        </dd>
                      </div>
                    ))}
                    <div className="cmp-card-mean">
                      <dt>
                        Média aritmética <span className={r.avg.n < r.avg.total ? 'warn-text' : 'muted'}>({nText(r)})</span>
                      </dt>
                      <dd>{meanCell(r)}</dd>
                    </div>
                  </dl>
                  {r.avg.n > 1 && (
                    <p className="cmp-card-stats">
                      Mín. {formatNumber(r.avg.min, { sig })}, máx. {formatNumber(r.avg.max, { sig })}, amplitude {formatNumber(r.avg.range, { sig: 3 })}
                      {r.avg.rangePct != null && ` (${formatNumber(r.avg.rangePct, { sig: 2 })} %)`}, s = {formatNumber(r.avg.stdSample, { sig: 3 })}
                    </p>
                  )}
                  {r.avg.excluded.length > 0 && <p className="cmp-card-excl">Fora da média: {r.avg.excluded.map((e) => `${e.name} (${e.reason.toLowerCase()})`).join(', ')}</p>}
                </li>
              )
            })}
          </ul>

          <div className="cmp-notes">
            <p>
              <strong>Média aritmética das referências selecionadas</strong>: cada fonte é interpolada separadamente na temperatura pedida e só então os resultados são
              somados e divididos por n. Não é um valor certificado nem “mais correto” que as tabelas.
            </p>
            <p>
              n/{N} indica quantas referências entraram em cada propriedade. No modo “Exigir as {N}”, a média só aparece quando todas têm valor. Amplitude = máx. − mín. (em % da
              média). s = desvio-padrão amostral, com divisor n − 1, só quando n ≥ 2.
            </p>
            {table.some((r) => r.avg.excluded.length > 0) && (
              <details className="how">
                <summary>Fontes excluídas e motivos</summary>
                <ul>
                  {table
                    .filter((r) => r.avg.excluded.length > 0)
                    .map((r) => {
                      const d = PROPERTY_DEFS.find((x) => x.key === r.key)!
                      return (
                        <li key={r.key}>
                          {d.symbol}: {r.avg.excluded.map((e) => `${e.name} — ${e.reason}`).join('; ')}
                        </li>
                      )
                    })}
                </ul>
              </details>
            )}
          </div>

          <div className="chart-block">
            <div className="chart-head">
              <button type="button" className="btn btn-small" aria-expanded={showChart} onClick={() => setShowChart((v) => !v)}>
                {showChart ? 'Ocultar gráfico' : 'Mostrar gráfico por temperatura'}
              </button>
              {showChart && (
                <select aria-label="Propriedade do gráfico" value={chartProp} onChange={(e) => setChartProp(e.target.value as PropertyKey)}>
                  {PROPERTY_DEFS.map((d) => (
                    <option key={d.key} value={d.key}>
                      {d.symbol} — {d.label}
                    </option>
                  ))}
                </select>
              )}
            </div>
            {showChart && (
              <Suspense fallback={<p className="muted pad">Carregando gráfico…</p>}>
                <PropertyChart sources={selected.filter((s) => (rowsBySource[s.id]?.length ?? 0) > 0)} rowsBySource={rowsBySource} prop={chartProp} tC={req.tC} unit={unit} />
              </Suspense>
            )}
          </div>
        </>
      )}
    </section>
  )
}
