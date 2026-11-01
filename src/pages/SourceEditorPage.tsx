import { useEffect, useState } from 'react'
import { useFeedback } from '../components/feedback'
import { ImportDialog } from '../components/ImportDialog'
import { RowEditor } from '../components/RowEditor'
import { SimulatedBanner } from '../components/SourceResult'
import { exportSourceCsv, roundSig } from '../data/csv'
import { kinematicViscosity, prandtl, thermalDiffusivity } from '../domain/derived'
import { formatNumber, formatPlain, formatTemp, parseNumber } from '../domain/numbers'
import type { DataRow, PressureUnit, PropertyKey, Source, TempUnit } from '../domain/types'
import { fromCanonical, getUnitDef, PRESSURE_UNITS, pressureFromKPa, pressureToKPa, PROPERTY_DEFS, TEMP_UNITS, tempUnitLabel } from '../domain/units'
import { repo } from '../hooks/useData'
import { href, navigate } from '../hooks/useRoute'
import { dateStamp, downloadText, slug } from '../lib/files'

interface Props {
  source: Source
  rows: DataRow[]
}

type MetaDraft = Omit<Source, 'pressureKPa'> & { pressureText: string }

function toDraft(s: Source): MetaDraft {
  return {
    ...s,
    pressureText: s.pressureKPa == null ? '' : formatPlain(roundSig(pressureFromKPa(s.pressureKPa, s.pressureUnit), 10), ','),
  }
}

export function SourceEditorPage({ source, rows }: Props) {
  const { confirm, toast } = useFeedback()
  const [draft, setDraft] = useState<MetaDraft>(() => toDraft(source))
  const [pressureError, setPressureError] = useState<string | null>(null)
  const [editing, setEditing] = useState<DataRow | null>(null)
  const [rowOpen, setRowOpen] = useState(false)
  const [importOpen, setImportOpen] = useState(false)
  const [showCalc, setShowCalc] = useState(false)

  // Recarrega o rascunho só ao trocar de fonte.
  useEffect(() => {
    setDraft(toDraft(source))
    setPressureError(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source.id])

  const dirty = JSON.stringify(toDraft(source)) !== JSON.stringify({ ...draft, updatedAt: source.updatedAt })

  async function saveMeta() {
    let pressureKPa: number | null = null
    const p = parseNumber(draft.pressureText)
    if (p != null) {
      if (Number.isNaN(p) || p <= 0) {
        setPressureError('Pressão inválida: use um número positivo ou deixe vazio.')
        return
      }
      pressureKPa = pressureToKPa(p, draft.pressureUnit)
    }
    if (!draft.shortName.trim()) {
      toast('O nome curto não pode ficar vazio.', 'error')
      return
    }
    setPressureError(null)
    const { pressureText: _ignored, ...rest } = draft
    void _ignored
    await repo.saveSource({ ...rest, shortName: draft.shortName.trim(), pressureKPa })
    toast('Metadados salvos')
  }

  const set = <K extends keyof MetaDraft>(k: K, v: MetaDraft[K]) => setDraft((d) => ({ ...d, [k]: v }))

  const unitOf = (k: PropertyKey) => getUnitDef(k, draft.inputUnits[k] ?? source.inputUnits[k])
  const shownProps = PROPERTY_DEFS.filter((d) => rows.some((r) => r.values[d.key] != null))
  const calcCols: { key: PropertyKey; fn: (r: DataRow) => number | null }[] = [
    { key: 'kinematicViscosity', fn: (r) => kinematicViscosity(r.values.dynamicViscosity, r.values.density) },
    { key: 'thermalDiffusivity', fn: (r) => thermalDiffusivity(r.values.conductivity, r.values.density, r.values.specificHeat) },
    { key: 'prandtl', fn: (r) => prandtl(r.values.dynamicViscosity, r.values.specificHeat, r.values.conductivity) },
  ]

  return (
    <div className="page">
      <p className="crumbs">
        <a href={href({ page: 'biblioteca' })}>Biblioteca</a> / {source.shortName}
      </p>
      <header className="page-head">
        <h1>{source.shortName}</h1>
        <p className="page-lede">
          {rows.length} {rows.length === 1 ? 'linha' : 'linhas'}
          {rows.length > 0 && `, de ${formatTemp(rows[0].temperatureC)} a ${formatTemp(rows[rows.length - 1].temperatureC)} °C`}
        </p>
      </header>
      {source.isSimulated && <SimulatedBanner />}

      <section className="panel" aria-labelledby="meta-title">
        <h2 id="meta-title">Referência</h2>
        <p className="muted small">Preencha com os dados do exemplar que você consulta. Nada aqui é presumido pelo app.</p>
        <form
          className="meta-form"
          onSubmit={(e) => {
            e.preventDefault()
            void saveMeta()
          }}
        >
          <div className="field">
            <label htmlFor="m-name">Nome curto</label>
            <input id="m-name" value={draft.shortName} maxLength={60} onChange={(e) => set('shortName', e.target.value)} required />
          </div>
          <div className="field">
            <label htmlFor="m-authors">Autores</label>
            <input id="m-authors" value={draft.authors} onChange={(e) => set('authors', e.target.value)} />
          </div>
          <div className="field field-wide">
            <label htmlFor="m-title">Título</label>
            <input id="m-title" value={draft.title} onChange={(e) => set('title', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="m-ed">Edição</label>
            <input id="m-ed" value={draft.edition} onChange={(e) => set('edition', e.target.value)} placeholder="ex.: 7ª" />
          </div>
          <div className="field">
            <label htmlFor="m-year">Ano</label>
            <input id="m-year" inputMode="numeric" value={draft.year} onChange={(e) => set('year', e.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="m-page">Página / tabela</label>
            <input id="m-page" value={draft.pageTable} onChange={(e) => set('pageTable', e.target.value)} placeholder="ex.: p. 000, Tabela A.0" />
          </div>
          <div className="field">
            <label htmlFor="m-fluid">Fluido</label>
            <input id="m-fluid" value={draft.fluid} onChange={(e) => set('fluid', e.target.value)} />
          </div>
          <div className={`field${pressureError ? ' has-error' : ''}`}>
            <label htmlFor="m-p">Pressão de referência</label>
            <div className="input-with-unit">
              <input id="m-p" inputMode="decimal" value={draft.pressureText} onChange={(e) => set('pressureText', e.target.value)} placeholder="não cadastrada" />
              <select aria-label="Unidade da pressão" value={draft.pressureUnit} onChange={(e) => set('pressureUnit', e.target.value as PressureUnit)}>
                {PRESSURE_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            {pressureError ? <p className="field-error">{pressureError}</p> : <p className="field-hint">Necessária para a média entre referências.</p>}
          </div>
          <div className="field">
            <label htmlFor="m-tu">Unidade de temperatura do livro</label>
            <select id="m-tu" value={draft.originalTempUnit} onChange={(e) => set('originalTempUnit', e.target.value as TempUnit)}>
              {TEMP_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <fieldset className="field-wide units-fieldset">
            <legend>Unidades como aparecem no livro</legend>
            <p className="muted small">
              Usadas para digitar, importar CSV sem coluna de unidade e exibir a tabela abaixo. Os valores salvos ficam em SI e são convertidos — trocar aqui não altera os dados.
            </p>
            <div className="units-grid">
              {PROPERTY_DEFS.filter((d) => d.units.length > 1).map((d) => (
                <label key={d.key} className="map-item">
                  <span>
                    {d.symbol} — {d.label}
                  </span>
                  <select
                    value={unitOf(d.key).id}
                    onChange={(e) => set('inputUnits', { ...draft.inputUnits, [d.key]: e.target.value })}
                    title={unitOf(d.key).hint}
                  >
                    {d.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="field field-wide">
            <label htmlFor="m-notes">Observações</label>
            <textarea id="m-notes" rows={3} value={draft.notes} onChange={(e) => set('notes', e.target.value)} />
          </div>
          <div className="field-wide button-row">
            <button type="submit" className="btn btn-primary" disabled={!dirty}>
              {dirty ? 'Salvar referência' : 'Referência salva'}
            </button>
            {dirty && (
              <button type="button" className="btn" onClick={() => setDraft(toDraft(source))}>
                Descartar alterações
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="panel" aria-labelledby="rows-title">
        <header className="panel-head">
          <h2 id="rows-title">Tabela</h2>
          <div className="panel-actions">
            <button
              type="button"
              className="btn btn-primary btn-small"
              onClick={() => {
                setEditing(null)
                setRowOpen(true)
              }}
            >
              Adicionar linha
            </button>
            <button type="button" className="btn btn-small" onClick={() => setImportOpen(true)}>
              Importar CSV
            </button>
            {rows.length > 0 && (
              <>
                <button type="button" className="btn btn-small" onClick={() => downloadText(`artermo-${slug(source.shortName)}-${dateStamp()}.csv`, exportSourceCsv(source, rows, ';'), 'text/csv;charset=utf-8')}>
                  Exportar CSV (;)
                </button>
                <button type="button" className="btn btn-small" onClick={() => downloadText(`artermo-${slug(source.shortName)}-${dateStamp()}-virgula.csv`, exportSourceCsv(source, rows, ','), 'text/csv;charset=utf-8')}>
                  Exportar CSV (,)
                </button>
              </>
            )}
          </div>
        </header>

        {rows.length === 0 ? (
          <div className="empty">
            <p className="empty-title">Nenhuma linha ainda.</p>
            <p>Digite linha a linha (“Salvar e próxima linha” agiliza) ou importe um CSV. Células vazias ficam como dado ausente.</p>
          </div>
        ) : (
          <>
            <label className="check">
              <input type="checkbox" checked={showCalc} onChange={(e) => setShowCalc(e.target.checked)} /> Mostrar ν, α e Pr calculados pelo app em cada linha
            </label>
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th scope="col">T</th>
                    {shownProps.map((d) => (
                      <th scope="col" key={d.key}>
                        {d.symbol}
                        <span className="cell-unit">{d.canonical === '—' ? '—' : unitOf(d.key).label}</span>
                      </th>
                    ))}
                    {showCalc &&
                      calcCols.map((c) => {
                        const d = PROPERTY_DEFS.find((x) => x.key === c.key)!
                        return (
                          <th scope="col" key={`calc-${c.key}`} className="col-calc">
                            {d.symbol} calc.
                            <span className="cell-unit">{d.canonical === '—' ? '—' : unitOf(d.key).label}</span>
                          </th>
                        )
                      })}
                    <th scope="col">
                      <span className="sr-only">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <th scope="row">
                        {formatTemp(r.originalTemperature.value)} {tempUnitLabel(r.originalTemperature.unit)}
                        {r.originalTemperature.unit !== 'C' && <span className="cell-unit">{formatTemp(r.temperatureC)} °C</span>}
                      </th>
                      {shownProps.map((d) => {
                        const v = r.values[d.key]
                        return <td key={d.key}>{v == null ? <span className="muted">—</span> : formatNumber(roundSig(fromCanonical(d.key, v, unitOf(d.key).id), 12), { sig: 6 })}</td>
                      })}
                      {showCalc &&
                        calcCols.map((c) => {
                          const v = c.fn(r)
                          return (
                            <td key={`calc-${c.key}`} className="col-calc">
                              {v == null ? <span className="muted">—</span> : formatNumber(fromCanonical(c.key, v, unitOf(c.key).id), { sig: 4 })}
                            </td>
                          )
                        })}
                      <td className="row-actions">
                        <button
                          type="button"
                          className="btn btn-small"
                          onClick={() => {
                            setEditing(r)
                            setRowOpen(true)
                          }}
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-danger-ghost"
                          aria-label={`Excluir linha de ${formatTemp(r.originalTemperature.value)} ${tempUnitLabel(r.originalTemperature.unit)}`}
                          onClick={async () => {
                            const ok = await confirm({
                              title: 'Excluir linha?',
                              message: `A linha de ${formatTemp(r.originalTemperature.value)} ${tempUnitLabel(r.originalTemperature.unit)} de ${source.shortName} será apagada.`,
                              confirmLabel: 'Excluir linha',
                              danger: true,
                            })
                            if (ok) {
                              await repo.deleteRow(r.id)
                              toast('Linha excluída')
                            }
                          }}
                        >
                          Excluir
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {showCalc && <p className="muted small">Colunas “calc.” são calculadas pelo ArTermo com os valores da própria linha (ν = μ/ρ, α = k/(ρ·cp), Pr = μ·cp/k). Não são dados do livro.</p>}
          </>
        )}
      </section>

      <section className="panel danger-zone">
        <h2>Excluir</h2>
        <div className="button-row">
          <button
            type="button"
            className="btn btn-danger-ghost"
            disabled={rows.length === 0}
            onClick={async () => {
              const ok = await confirm({
                title: `Apagar a tabela de ${source.shortName}?`,
                message: `As ${rows.length} linhas serão apagadas. Os metadados da referência continuam.`,
                confirmLabel: 'Apagar tabela',
                danger: true,
              })
              if (ok) {
                await repo.clearRows(source.id)
                toast('Tabela apagada')
              }
            }}
          >
            Apagar tabela
          </button>
          <button
            type="button"
            className="btn btn-danger-ghost"
            onClick={async () => {
              const ok = await confirm({
                title: `Excluir a referência ${source.shortName}?`,
                message: `A referência e suas ${rows.length} linhas serão apagadas deste dispositivo. Exporte um CSV ou backup antes, se quiser guardar.`,
                confirmLabel: 'Excluir referência',
                danger: true,
              })
              if (ok) {
                await repo.deleteSource(source.id)
                toast(`Referência ${source.shortName} excluída`)
                navigate({ page: 'biblioteca' })
              }
            }}
          >
            Excluir referência
          </button>
        </div>
      </section>

      <RowEditor source={{ ...source, inputUnits: { ...source.inputUnits } }} row={editing} open={rowOpen} onClose={() => setRowOpen(false)} />
      <ImportDialog key={source.id} source={source} existingCount={rows.length} open={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  )
}
