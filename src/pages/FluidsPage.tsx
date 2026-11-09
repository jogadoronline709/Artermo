import { useState } from 'react'
import type { LoadedFluid } from '../data/fluids/registry'
import { categoryLabel, fluidDisplayName, searchFluids } from '../domain/fluids'
import { useSettings } from '../hooks/settingsContext'
import { href } from '../hooks/useRoute'

interface Props {
  fluids: LoadedFluid[]
}

function withDataCount(f: LoadedFluid): number {
  return f.sources.filter((s) => (f.rowsBySource[s.id]?.length ?? 0) > 0).length
}

export function FluidsPage({ fluids }: Props) {
  const { settings } = useSettings()
  const [query, setQuery] = useState('')
  const [autoFocus] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(min-width: 768px)').matches)
  const found = searchFluids(fluids, query)

  return (
    <div className="page">
      <header className="page-head">
        <h1>Fluidos</h1>
        <p className="page-lede">Escolha um fluido para ver as tabelas de cada referência e consultar suas propriedades. As tabelas vêm com o app e não podem ser alteradas.</p>
      </header>

      <div className="fluid-search">
        <label htmlFor="fluid-q">Pesquisar fluido</label>
        <input id="fluid-q" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Ex.: água, ar, H₂O" autoComplete="off" autoFocus={autoFocus} />
      </div>

      {found.length === 0 ? (
        <p className="empty-title">Nenhum fluido encontrado para “{query.trim()}”.</p>
      ) : (
        <ul className="source-list">
          {found.map((f) => {
            const n = withDataCount(f)
            const isActive = f.def.id === settings.activeFluidId
            return (
              <li key={f.def.id} className={`source-card${isActive ? ' is-active' : ''}`}>
                <a href={href({ page: 'fluidos', fluidId: f.def.id })} className="source-card-link">
                  <span className="source-card-name">{fluidDisplayName(f.def)}</span>
                  <span className="source-card-count">{categoryLabel(f.def.category)}</span>
                </a>
                <p className="source-card-facts">
                  <span className={n === 0 ? 'muted' : ''}>
                    {n} de {f.sources.length} referências com dados
                  </span>
                  {isActive && <span className="fluid-active-tag">Em uso na consulta</span>}
                </p>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
