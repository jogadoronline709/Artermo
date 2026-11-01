import { formatTemp } from '../domain/numbers'
import type { DataRow, Source, TempUnit } from '../domain/types'
import { fromCelsius, tempUnitLabel } from '../domain/units'

interface Props {
  sources: Source[]
  rowsBySource: Record<string, DataRow[]>
  tC: number | null
  unit: TempUnit
}

/**
 * Régua de temperatura: mostra a faixa e os pontos tabelados de cada fonte
 * e onde a temperatura pedida cai. Deixa visível, antes de qualquer número,
 * se a consulta exigirá interpolação ou se está fora da faixa.
 */
export function ThermoScale({ sources, rowsBySource, tC, unit }: Props) {
  const withData = sources.filter((s) => (rowsBySource[s.id]?.length ?? 0) > 0)
  if (withData.length === 0) return null

  const all = withData.flatMap((s) => rowsBySource[s.id].map((r) => r.temperatureC))
  const dataMin = Math.min(...all)
  const dataMax = Math.max(...all)
  let lo = dataMin
  let hi = dataMax
  if (tC != null && Number.isFinite(tC)) {
    lo = Math.min(lo, tC)
    hi = Math.max(hi, tC)
  }
  if (hi - lo < 1e-9) {
    lo -= 1
    hi += 1
  }
  const pad = (hi - lo) * 0.04
  lo -= pad
  hi += pad
  const pct = (t: number) => ((t - lo) / (hi - lo)) * 100
  const ul = tempUnitLabel(unit)
  const fmt = (t: number) => `${formatTemp(fromCelsius(t, unit))} ${ul}`

  return (
    <figure className="scale" aria-label="Faixa de temperatura disponível em cada fonte">
      <div className="scale-names">
        {withData.map((s) => (
          <span key={s.id} className="scale-name" title={s.shortName}>
            {s.shortName}
          </span>
        ))}
      </div>
      <div className="scale-tracks">
        {withData.map((s) => {
          const ts = rowsBySource[s.id].map((r) => r.temperatureC)
          const min = Math.min(...ts)
          const max = Math.max(...ts)
          const inside = tC != null && tC >= min - 1e-9 && tC <= max + 1e-9
          return (
            <span className="scale-track" key={s.id} title={`${s.shortName}: ${fmt(min)} a ${fmt(max)} (${ts.length} linhas)`}>
              <span className={`scale-band${inside ? '' : ' is-out'}`} style={{ left: `${pct(min)}%`, width: `${pct(max) - pct(min)}%` }} />
              {ts.map((t) => (
                <span key={t} className="scale-tick" style={{ left: `${pct(t)}%` }} />
              ))}
            </span>
          )
        })}
        {tC != null && Number.isFinite(tC) && <span className="scale-marker" style={{ left: `${pct(tC)}%` }} aria-hidden="true" />}
      </div>
      <figcaption className="scale-axis">
        <span style={{ left: `${pct(dataMin)}%` }}>{fmt(dataMin)}</span>
        <span style={{ left: `${pct(dataMax)}%` }} className="scale-axis-end">
          {fmt(dataMax)}
        </span>
      </figcaption>
    </figure>
  )
}
