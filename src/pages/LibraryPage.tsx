import { useState } from 'react'
import { useFeedback } from '../components/feedback'
import { csvTemplate } from '../data/csv'
import { DEFAULT_SOURCE_IDS } from '../data/defaults'
import { formatTemp } from '../domain/numbers'
import type { DataRow, Source } from '../domain/types'
import { repo } from '../hooks/useData'
import { href, navigate } from '../hooks/useRoute'
import { downloadText } from '../lib/files'
import { citation, pressureText } from '../lib/report'

interface Props {
  sources: Source[]
  rowsBySource: Record<string, DataRow[]>
}

export function LibraryPage({ sources, rowsBySource }: Props) {
  const { toast } = useFeedback()
  const [newName, setNewName] = useState('')
  const missingDefaults = DEFAULT_SOURCE_IDS.filter((id) => !sources.some((s) => s.id === id))

  return (
    <div className="page">
      <header className="page-head">
        <h1>Biblioteca de dados</h1>
        <p className="page-lede">Cada referência tem a própria tabela, preenchida por você a partir do seu exemplar. Os dados ficam só neste dispositivo.</p>
      </header>

      <ul className="source-list">
        {sources.map((s) => {
          const rows = rowsBySource[s.id] ?? []
          const ts = rows.map((r) => r.temperatureC)
          const c = citation(s)
          return (
            <li key={s.id} className={`source-card${s.isSimulated ? ' is-sim' : ''}`}>
              <a href={href({ page: 'biblioteca', sourceId: s.id })} className="source-card-link">
                <span className="source-card-name">{s.shortName}</span>
                <span className="source-card-count">
                  {rows.length} {rows.length === 1 ? 'linha' : 'linhas'}
                </span>
              </a>
              <p className="source-card-cite">{c || <span className="muted">Sem metadados cadastrados</span>}</p>
              <p className="source-card-facts">
                {rows.length > 0 ? (
                  <span>
                    {formatTemp(Math.min(...ts))} a {formatTemp(Math.max(...ts))} °C
                  </span>
                ) : (
                  <span className="muted">Tabela vazia</span>
                )}
                <span className={s.pressureKPa == null ? 'warn-text' : ''}>Pressão: {pressureText(s)}</span>
                {s.isSimulated && <span className="sim-tag">SIMULADO</span>}
              </p>
            </li>
          )
        })}
      </ul>

      <section className="panel">
        <h2>Outras ações</h2>
        <form
          className="inline-form"
          onSubmit={async (e) => {
            e.preventDefault()
            const name = newName.trim()
            if (!name) return
            const s = await repo.addSource(name)
            setNewName('')
            toast(`Referência “${name}” criada`)
            navigate({ page: 'biblioteca', sourceId: s.id })
          }}
        >
          <label htmlFor="new-src">Nova referência</label>
          <input id="new-src" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nome curto, ex.: Bejan" maxLength={60} />
          <button type="submit" className="btn" disabled={!newName.trim()}>
            Criar
          </button>
        </form>
        <div className="button-row">
          <button type="button" className="btn" onClick={() => downloadText('artermo-modelo.csv', csvTemplate(), 'text/csv;charset=utf-8')}>
            Baixar modelo CSV com instruções
          </button>
          {missingDefaults.length > 0 && (
            <button
              type="button"
              className="btn"
              onClick={async () => {
                const n = await repo.restoreDefaultSources()
                toast(`${n} referência(s) padrão recriada(s), vazias`)
              }}
            >
              Recriar Kreith, Incropera e Çengel
            </button>
          )}
          <a className="btn" href={href({ page: 'config' })}>
            Backup completo (JSON)
          </a>
        </div>
        <p className="muted small">
          Apagar os dados do navegador ou desinstalar o app remove as tabelas deste dispositivo. Exporte um backup JSON de tempos em tempos.
        </p>
      </section>
    </div>
  )
}
