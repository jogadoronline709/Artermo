import { useEffect, useMemo } from 'react'
import { ComparePanel } from '../components/ComparePanel'
import { FluidBar } from '../components/FluidBar'
import { SourceResult } from '../components/SourceResult'
import { TempPanel } from '../components/TempPanel'
import type { LoadedFluid } from '../data/fluids/registry'
import { fluidDisplayName } from '../domain/fluids'
import { querySource, type SourceQuery } from '../domain/query'
import type { TempUnit } from '../domain/types'
import { useSettings } from '../hooks/settingsContext'
import { href } from '../hooks/useRoute'
import type { RequestedTemp } from '../lib/report'

export interface TempState {
  text: string
  unit: TempUnit
  value: number | null
  tC: number | null
  error: string | null
  setText: (s: string) => void
  setUnit: (u: TempUnit) => void
  pick: (v: number, u: TempUnit) => void
}

interface Props {
  fluid: LoadedFluid
  temp: TempState
  /** id da fonte ativa ou "comparar". */
  tab: string
}

export function QueryPage({ fluid, temp, tab }: Props) {
  const { settings } = useSettings()
  const { sources, rowsBySource } = fluid

  const queries = useMemo(() => {
    const out: Record<string, SourceQuery> = {}
    if (temp.tC == null) return out
    for (const s of sources) out[s.id] = querySource(rowsBySource[s.id] ?? [], temp.tC, { allowExtrapolation: settings.allowExtrapolation })
    return out
  }, [sources, rowsBySource, temp.tC, settings.allowExtrapolation])

  const req: RequestedTemp | null = temp.tC != null && temp.value != null ? { value: temp.value, unit: temp.unit, tC: temp.tC } : null
  const totalRows = sources.reduce((n, s) => n + (rowsBySource[s.id]?.length ?? 0), 0)
  const active = tab === 'comparar' ? null : (sources.find((s) => s.id === tab) ?? sources[0])
  const activeTab = tab === 'comparar' ? 'comparar' : active?.id

  // Mantém a aba ativa visível quando a barra de abas rola (celular).
  useEffect(() => {
    document.querySelector('.tabs .tab.on')?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  }, [activeTab])

  return (
    <div className="query-layout">
      <div className="query-side">
        <TempPanel
          text={temp.text}
          value={temp.value}
          unit={temp.unit}
          tC={temp.tC}
          error={temp.error}
          onText={temp.setText}
          onUnit={temp.setUnit}
          onPick={temp.pick}
          sources={sources}
          rowsBySource={rowsBySource}
        />
        {totalRows === 0 && (
          <section className="panel onboarding">
            <h2>Sem dados ainda</h2>
            <p>Os dados de {fluidDisplayName(fluid.def)} ainda não foram incluídos nesta versão do app.</p>
            <a className="btn" href="#/fluidos">
              Ver outros fluidos
            </a>
          </section>
        )}
      </div>

      <div className="query-main">
        <FluidBar fluid={fluid} tC={temp.tC} />
        <nav className="tabs" aria-label="Referências">
          {sources.map((s) => (
            <a key={s.id} href={href({ page: 'consultar', tab: s.id })} className={`tab${activeTab === s.id ? ' on' : ''}`} aria-current={activeTab === s.id ? 'page' : undefined}>
              {s.shortName}
              <span className="tab-count">{rowsBySource[s.id]?.length ?? 0}</span>
            </a>
          ))}
          <a href={href({ page: 'comparar' })} className={`tab tab-compare${activeTab === 'comparar' ? ' on' : ''}`} aria-current={activeTab === 'comparar' ? 'page' : undefined}>
            Comparar / Média
          </a>
        </nav>

        {activeTab === 'comparar' ? (
          <ComparePanel fluidId={fluid.def.id} sources={sources} rowsBySource={rowsBySource} queries={queries} req={req} unit={temp.unit} />
        ) : active ? (
          <SourceResult
            key={active.id}
            source={active}
            rows={rowsBySource[active.id] ?? []}
            query={queries[active.id] ?? null}
            req={req}
            sig={settings.sigDigits}
            choice={settings.derivedChoice}
            allowExtrapolation={settings.allowExtrapolation}
            loadErrors={fluid.errors[active.id]}
          />
        ) : (
          <section className="panel empty">
            <p className="empty-title">Este fluido não tem referências.</p>
          </section>
        )}
      </div>
    </div>
  )
}
