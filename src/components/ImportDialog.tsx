import { useMemo, useState } from 'react'
import {
  autoMap,
  FIELD_LABELS,
  MAX_CSV_BYTES,
  parseCsv,
  validateImport,
  type ColumnMapping,
  type FieldId,
  type MergeMode,
  type ParsedCsv,
} from '../data/csv'
import { formatNumber, formatTemp } from '../domain/numbers'
import type { PropertyKey, PropertyUnitPrefs, Source, TempUnit } from '../domain/types'
import { getPropertyDef, getUnitDef, PROPERTY_DEFS, TEMP_UNITS } from '../domain/units'
import { repo } from '../hooks/useData'
import { readTextFile } from '../lib/files'
import { useFeedback } from './feedback'
import { Modal } from './Modal'

interface Props {
  source: Source
  existingCount: number
  open: boolean
  onClose: () => void
}

export function ImportDialog({ source, existingCount, open, onClose }: Props) {
  const { toast, confirm } = useFeedback()
  const [parsed, setParsed] = useState<ParsedCsv | null>(null)
  const [fileName, setFileName] = useState('')
  const [readError, setReadError] = useState<string | null>(null)
  const [mapping, setMapping] = useState<ColumnMapping>({})
  const [tempUnit, setTempUnit] = useState<TempUnit>(source.originalTempUnit)
  const [units, setUnits] = useState<PropertyUnitPrefs>(() => ({ ...source.inputUnits }))
  const [mode, setMode] = useState<MergeMode>(existingCount ? 'upsert' : 'replace')
  const [pasted, setPasted] = useState('')
  const [busy, setBusy] = useState(false)

  function reset() {
    setParsed(null)
    setFileName('')
    setReadError(null)
    setMapping({})
    setPasted('')
    setTempUnit(source.originalTempUnit)
    setUnits({ ...source.inputUnits })
    setMode(existingCount ? 'upsert' : 'replace')
  }

  function load(text: string, name: string) {
    try {
      const p = parseCsv(text)
      setParsed(p)
      setMapping(autoMap(p.header))
      setFileName(name)
      setReadError(null)
    } catch (e) {
      setReadError((e as Error).message)
      setParsed(null)
    }
  }

  const validation = useMemo(
    () => (parsed ? validateImport(parsed, mapping, { tempUnit, units }, source.id) : null),
    [parsed, mapping, tempUnit, units, source.id],
  )

  async function doImport() {
    if (!validation || validation.errors.length || !validation.rows.length) return
    if (mode === 'replace' && existingCount > 0) {
      const ok = await confirm({
        title: 'Substituir a tabela inteira?',
        message: `As ${existingCount} linhas atuais de ${source.shortName} serão apagadas e trocadas pelas ${validation.rows.length} linhas do arquivo.`,
        confirmLabel: 'Substituir tabela',
        danger: true,
      })
      if (!ok) return
    }
    setBusy(true)
    try {
      const r = await repo.importRows(source.id, validation.rows, mode)
      toast(mode === 'replace' ? `${r.added} linhas importadas` : `${r.added} linhas adicionadas, ${r.replaced} substituídas`)
      reset()
      onClose()
    } catch (e) {
      toast(`Falha na importação: ${(e as Error).message}`, 'error')
    } finally {
      setBusy(false)
    }
  }

  const columns = parsed?.header ?? []
  const usedProps = PROPERTY_DEFS.filter((d) => mapping[d.key] != null)
  const canImport = !!validation && validation.errors.length === 0 && validation.rows.length > 0 && !busy

  return (
    <Modal
      open={open}
      wide
      title={`Importar CSV — ${source.shortName}`}
      onClose={() => {
        reset()
        onClose()
      }}
      footer={
        <>
          <button
            type="button"
            className="btn"
            onClick={() => {
              reset()
              onClose()
            }}
          >
            Cancelar
          </button>
          {parsed && (
            <button type="button" className="btn btn-primary" disabled={!canImport} onClick={doImport}>
              {validation && validation.rows.length ? `Importar ${validation.rows.length} linhas` : 'Importar'}
            </button>
          )}
        </>
      }
    >
      {!parsed ? (
        <div className="import-start">
          <p>
            Escolha um arquivo CSV com os valores do seu exemplar. Separador vírgula ou ponto e vírgula; decimal com vírgula ou ponto. Nada é gravado antes da sua confirmação.
          </p>
          <label className="file-drop">
            <input
              type="file"
              accept=".csv,.txt,text/csv,text/plain"
              onChange={async (e) => {
                const f = e.target.files?.[0]
                e.target.value = ''
                if (!f) return
                try {
                  load(await readTextFile(f, MAX_CSV_BYTES), f.name)
                } catch (err) {
                  setReadError((err as Error).message)
                }
              }}
            />
            <span>Selecionar arquivo CSV</span>
          </label>
          <details className="how">
            <summary>Ou colar o conteúdo</summary>
            <textarea rows={6} value={pasted} onChange={(e) => setPasted(e.target.value)} placeholder="temperature;density;specific_heat&#10;0;1,2;1,005" />
            <button type="button" className="btn btn-small" disabled={!pasted.trim()} onClick={() => load(pasted.slice(0, MAX_CSV_BYTES), 'texto colado')}>
              Ler texto colado
            </button>
          </details>
          {readError && <p className="field-error">{readError}</p>}
        </div>
      ) : (
        <div className="import-steps">
          <p className="muted small">
            {fileName}: {parsed.rows.length} linhas de dados, separador “{parsed.delimiter === '\t' ? 'tabulação' : parsed.delimiter}”.{' '}
            <button type="button" className="link-btn" onClick={reset}>
              Trocar arquivo
            </button>
          </p>

          <h3>Colunas</h3>
          <p className="muted small">Confira a associação automática. Colunas de unidade são opcionais: quando vazias, valem as unidades padrão abaixo.</p>
          <div className="map-grid">
            {FIELD_LABELS.filter((f) => f.id !== 'prandtl_unit').map((f) => (
              <label key={f.id} className="map-item">
                <span>{f.label}</span>
                <select
                  value={mapping[f.id] ?? ''}
                  onChange={(e) => {
                    const v = e.target.value
                    setMapping((m) => {
                      const next = { ...m }
                      if (v === '') delete next[f.id as FieldId]
                      else next[f.id as FieldId] = Number(v)
                      return next
                    })
                  }}
                >
                  <option value="">— não importar —</option>
                  {columns.map((c, i) => (
                    <option key={i} value={i}>
                      {c || `(coluna ${i + 1})`}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>

          <h3>Unidades padrão</h3>
          <p className="muted small">Usadas quando a linha não informa unidade e o cabeçalho também não. Pré-preenchidas com as unidades cadastradas na fonte.</p>
          <div className="map-grid">
            <label className="map-item">
              <span>Temperatura</span>
              <select value={tempUnit} onChange={(e) => setTempUnit(e.target.value as TempUnit)}>
                {TEMP_UNITS.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </label>
            {usedProps
              .filter((d) => d.units.length > 1)
              .map((d) => (
                <label key={d.key} className="map-item">
                  <span>
                    {d.symbol} — {d.label}
                  </span>
                  <select value={getUnitDef(d.key, units[d.key]).id} onChange={(e) => setUnits((u) => ({ ...u, [d.key]: e.target.value }))}>
                    {d.units.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.label}
                      </option>
                    ))}
                  </select>
                </label>
              ))}
          </div>

          {existingCount > 0 && (
            <>
              <h3>Linhas existentes</h3>
              <div className="radio-list">
                <label>
                  <input type="radio" name="merge" checked={mode === 'upsert'} onChange={() => setMode('upsert')} /> Manter as {existingCount} linhas atuais, substituir as de mesma
                  temperatura e acrescentar as novas
                </label>
                <label>
                  <input type="radio" name="merge" checked={mode === 'replace'} onChange={() => setMode('replace')} /> Apagar a tabela atual e usar só o arquivo
                </label>
              </div>
            </>
          )}

          <h3>Validação</h3>
          {validation && validation.errors.length > 0 && (
            <div className="alert alert-danger" role="alert">
              <p>
                <strong>
                  {validation.errors.length} {validation.errors.length === 1 ? 'problema impede' : 'problemas impedem'} a importação.
                </strong>{' '}
                Corrija o arquivo ou o mapeamento.
              </p>
              <ul className="issue-list">
                {validation.errors.slice(0, 50).map((e, i) => (
                  <li key={i}>
                    Linha {e.line}
                    {e.field ? ` (${e.field})` : ''}: {e.message}
                  </li>
                ))}
                {validation.errors.length > 50 && <li>… e mais {validation.errors.length - 50}.</li>}
              </ul>
            </div>
          )}
          {validation && validation.warnings.length > 0 && (
            <div className="alert alert-warn">
              <ul className="issue-list">
                {validation.warnings.slice(0, 20).map((w, i) => (
                  <li key={i}>
                    Linha {w.line}
                    {w.field ? ` (${w.field})` : ''}: {w.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {validation && validation.errors.length === 0 && validation.rows.length > 0 && (
            <p className="ok-text">{validation.rows.length} linhas válidas, convertidas para °C e unidades SI. Pré-visualização:</p>
          )}
          {validation && validation.rows.length > 0 && (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>T (°C)</th>
                    {usedProps.map((d) => (
                      <th key={d.key}>
                        {d.symbol}
                        <span className="cell-unit">{d.canonical === '—' ? '' : d.canonical}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {validation.rows.slice(0, 12).map((r, i) => (
                    <tr key={i}>
                      <td>{formatTemp(r.temperatureC)}</td>
                      {usedProps.map((d) => (
                        <td key={d.key}>{r.values[d.key as PropertyKey] != null ? formatNumber(r.values[d.key as PropertyKey], { sig: 6 }) : <span className="muted">—</span>}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {validation.rows.length > 12 && <p className="muted small">… e mais {validation.rows.length - 12} linhas.</p>}
            </div>
          )}
          <p className="muted small">Unidade de cada coluna na pré-visualização: {usedProps.map((d) => `${d.symbol} em ${getPropertyDef(d.key).canonical}`).join('; ')}.</p>
        </div>
      )}
    </Modal>
  )
}
