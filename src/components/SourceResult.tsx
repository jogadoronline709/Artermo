import type { DerivedChoice, SourceQuery } from '../domain/query'
import type { DataRow, Source } from '../domain/types'
import { PROPERTY_DEFS } from '../domain/units'
import { href } from '../hooks/useRoute'
import { copyText, dateStamp, downloadText, slug } from '../lib/files'
import { citation, fmtReqTemp, pressureText, sourceReportCsv, sourceReportText, type RequestedTemp } from '../lib/report'
import { useFeedback } from './feedback'
import { PropertyRow } from './PropertyRow'
import { formatTemp } from '../domain/numbers'

interface Props {
  source: Source
  rows: DataRow[]
  query: SourceQuery | null
  req: RequestedTemp | null
  sig: number
  choice: DerivedChoice
  allowExtrapolation: boolean
}

export function SimulatedBanner() {
  return (
    <p className="sim-banner" role="note">
      <strong>SIMULADOS — NÃO USAR EM CÁLCULOS REAIS.</strong> Tabela fictícia de demonstração, sem relação com nenhum livro.
    </p>
  )
}

export function SourceMeta({ source }: { source: Source }) {
  const c = citation(source)
  return (
    <div className="source-meta">
      <p className="source-cite">{c || <span className="muted">Referência sem metadados — cadastre edição, ano e página na Biblioteca.</span>}</p>
      <p className="source-facts">
        <span>Fluido: {source.fluid || '—'}</span>
        <span className={source.pressureKPa == null ? 'warn-text' : ''}>Pressão: {pressureText(source)}</span>
      </p>
    </div>
  )
}

export function SourceResult({ source, rows, query, req, sig, choice, allowExtrapolation }: Props) {
  const { toast } = useFeedback()

  if (rows.length === 0) {
    return (
      <section className="panel">
        <header className="panel-head">
          <h2>{source.shortName}</h2>
        </header>
        {source.isSimulated && <SimulatedBanner />}
        <div className="empty">
          <p className="empty-title">A tabela de {source.shortName} ainda está vazia.</p>
          <p>
            Abra a Biblioteca para digitar as linhas do seu exemplar ou importar um arquivo CSV. Comece pelos metadados: edição, ano, página da tabela e pressão de referência.
          </p>
          <a className="btn btn-primary" href={href({ page: 'biblioteca', sourceId: source.id })}>
            Preencher a tabela de {source.shortName}
          </a>
        </div>
      </section>
    )
  }

  const ts = rows.map((r) => r.temperatureC)
  const range = `${formatTemp(Math.min(...ts))} a ${formatTemp(Math.max(...ts))} °C, ${rows.length} ${rows.length === 1 ? 'linha' : 'linhas'}`

  return (
    <section className="panel" aria-labelledby={`res-${source.id}`}>
      <header className="panel-head">
        <div>
          <h2 id={`res-${source.id}`}>{source.shortName}</h2>
          <p className="panel-sub">{range}</p>
        </div>
        {query && req && (
          <div className="panel-actions">
            <button
              type="button"
              className="btn btn-small"
              onClick={async () => {
                const ok = await copyText(sourceReportText(source, query, req, choice, sig))
                toast(ok ? 'Resultado copiado' : 'Não foi possível copiar', ok ? 'ok' : 'error')
              }}
            >
              Copiar
            </button>
            <button
              type="button"
              className="btn btn-small"
              onClick={() => downloadText(`artermo-${slug(source.shortName)}-${formatTemp(req.tC).replace(',', '_')}C-${dateStamp()}.csv`, sourceReportCsv(source, query, req, choice), 'text/csv;charset=utf-8')}
            >
              Exportar CSV
            </button>
            <button type="button" className="btn btn-small hide-mobile" onClick={() => window.print()}>
              Imprimir / PDF
            </button>
          </div>
        )}
      </header>
      {source.isSimulated && <SimulatedBanner />}
      <SourceMeta source={source} />
      {allowExtrapolation && <p className="warn-text small">Extrapolação ativada em Configurações: resultados fora da faixa aparecem como estimativas.</p>}

      {query && req ? (
        <>
          <p className="print-only">T = {fmtReqTemp(req)}</p>
          <ul className="props">
            {PROPERTY_DEFS.map((d) => (
              <PropertyRow key={`${source.id}-${d.key}`} def={d} r={query[d.key]} tC={req.tC} sig={sig} choice={choice} />
            ))}
          </ul>
        </>
      ) : (
        <p className="muted pad">Informe uma temperatura para consultar.</p>
      )}
    </section>
  )
}
