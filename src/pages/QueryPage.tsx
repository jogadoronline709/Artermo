import { useEffect, useMemo } from 'react'
import { ComparePanel } from '../components/ComparePanel'
import { SourceResult } from '../components/SourceResult'
import { TempPanel } from '../components/TempPanel'
import { querySource, type SourceQuery } from '../domain/query'
import type { DataRow, Source, TempUnit } from '../domain/types'
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
  sources: Source[]
  rowsBySource: Record<string, DataRow[]>
  temp: TempState
  /** id da fonte ativa ou "comparar". */
  tab: string
}

export function QueryPage({ sources, rowsBySource, temp, tab }: Props) {
  const { settings } = useSettings()

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
            <h2>Comece pelas suas tabelas</h2>
            <p>O ArTermo não traz valores dos livros. Você cadastra os dados do seu próprio exemplar e o app faz as contas.</p>
            <ol>
              <li>Na Biblioteca, abra Kreith, Incropera ou Çengel e preencha edição, ano, página e pressão de referência.</li>
              <li>Digite as linhas da tabela ou importe um CSV (há um modelo pronto para baixar).</li>
              <li>Volte aqui, informe a temperatura e compare as referências.</li>
            </ol>
            <a className="btn btn-primary" href={href({ page: 'biblioteca' })}>
              Abrir a Biblioteca
            </a>
            <p className="muted small">Quer só experimentar a interface? Em Configurações há dados simulados de demonstração, marcados como fictícios.</p>
          </section>
        )}
      </div>

      <div className="query-main">
        <nav className="tabs" aria-label="Referências">
          {sources.map((s) => (
            <a key={s.id} href={href({ page: 'consultar', tab: s.id })} className={`tab${activeTab === s.id ? ' on' : ''}${s.isSimulated ? ' is-sim' : ''}`} aria-current={activeTab === s.id ? 'page' : undefined}>
              {s.shortName}
              <span className="tab-count">{rowsBySource[s.id]?.length ?? 0}</span>
            </a>
          ))}
          <a href={href({ page: 'comparar' })} className={`tab tab-compare${activeTab === 'comparar' ? ' on' : ''}`} aria-current={activeTab === 'comparar' ? 'page' : undefined}>
            Comparar / Média
          </a>
        </nav>

        {activeTab === 'comparar' ? (
          <ComparePanel sources={sources} rowsBySource={rowsBySource} queries={queries} req={req} unit={temp.unit} />
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
          />
        ) : (
          <section className="panel empty">
            <p className="empty-title">Nenhuma referência cadastrada.</p>
            <a className="btn btn-primary" href={href({ page: 'biblioteca' })}>
              Abrir a Biblioteca
            </a>
          </section>
        )}
      </div>
    </div>
  )
}
