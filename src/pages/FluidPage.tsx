import { ReadOnlyTable } from '../components/ReadOnlyTable'
import { EMPTY_TABLE_TEXT, LoadErrors } from '../components/SourceResult'
import { sourceIdFor } from '../data/fluids/loader'
import type { LoadedFluid } from '../data/fluids/registry'
import { categoryLabel, fluidDisplayName } from '../domain/fluids'
import { formatTemp } from '../domain/numbers'
import { useSettings } from '../hooks/settingsContext'
import { href, navigate } from '../hooks/useRoute'
import { citation, pressureText } from '../lib/report'

interface Props {
  fluid: LoadedFluid
  refId?: string
}

export function FluidPage({ fluid, refId }: Props) {
  const { settings, update } = useSettings()
  const { def, sources, rowsBySource, errors } = fluid
  const active = (refId ? sources.find((s) => s.id === sourceIdFor(def.id, refId)) : undefined) ?? sources[0]
  const rows = active ? (rowsBySource[active.id] ?? []) : []
  const ts = rows.map((r) => r.temperatureC)

  return (
    <div className="page">
      <header className="page-head fluid-head">
        <p className="muted small">
          <a href={href({ page: 'fluidos' })}>Gases/Fluidos</a> › {categoryLabel(def.category)}
        </p>
        <h1>{fluidDisplayName(def)}</h1>
        {def.validRange && <p className="page-lede">{def.validRange.message}</p>}
        <p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => {
              update({ activeFluidId: def.id })
              navigate({ page: 'consultar' })
            }}
          >
            Consultar este fluido
          </button>
          {settings.activeFluidId === def.id && <span className="fluid-active-tag">Em uso na consulta</span>}
        </p>
      </header>

      <nav className="tabs" aria-label="Referências">
        {def.references.map((r, i) => {
          const s = sources[i]
          const on = s.id === active?.id
          return (
            <a key={s.id} href={href({ page: 'fluidos', fluidId: def.id, refId: r.id })} className={`tab${on ? ' on' : ''}`} aria-current={on ? 'page' : undefined}>
              {s.shortName}
              <span className="tab-count">{rowsBySource[s.id]?.length ?? 0}</span>
            </a>
          )
        })}
      </nav>

      {active && (
        <section className="panel" aria-labelledby="ref-title">
          <header className="panel-head">
            <div>
              <h2 id="ref-title">{active.shortName}</h2>
              {rows.length > 0 && (
                <p className="panel-sub">
                  {formatTemp(Math.min(...ts))} a {formatTemp(Math.max(...ts))} °C, {rows.length} {rows.length === 1 ? 'linha' : 'linhas'} · somente leitura
                </p>
              )}
            </div>
          </header>
          <div className="source-meta">
            <p className="source-cite">{citation(active) || <span className="muted">Referência sem metadados.</span>}</p>
            <p className="source-facts">
              <span className={active.pressureKPa == null ? 'warn-text' : ''}>Pressão: {pressureText(active)}</span>
            </p>
            {active.notes && <p className="small">{active.notes}</p>}
          </div>
          {errors[active.id]?.length ? (
            <LoadErrors errors={errors[active.id]} />
          ) : rows.length > 0 ? (
            <ReadOnlyTable source={active} rows={rows} sig={settings.sigDigits} />
          ) : (
            <div className="empty">
              <p className="empty-title">{EMPTY_TABLE_TEXT}</p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
