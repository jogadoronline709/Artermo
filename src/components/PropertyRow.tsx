import { useState } from 'react'
import { describeNoValue, hasValue } from '../domain/interpolation'
import { formatNumber, formatTemp } from '../domain/numbers'
import type { DerivedChoice, PropertyResult } from '../domain/query'
import type { PropertyDef } from '../domain/units'
import { CalcExplain, InterpExplain } from './HowCalculated'

export type BadgeKind = 'tabulated' | 'interpolated' | 'extrapolated' | 'calculated' | 'missing'

const BADGE: Record<BadgeKind, string> = {
  tabulated: 'Tabelado',
  interpolated: 'Interpolado',
  extrapolated: 'Extrapolado',
  calculated: 'Calculado',
  missing: 'Sem valor',
}

export function Badge({ kind, compact }: { kind: BadgeKind; compact?: boolean }) {
  const short: Record<BadgeKind, string> = { tabulated: 'tab.', interpolated: 'interp.', extrapolated: 'extrap.', calculated: 'calc.', missing: '—' }
  return (
    <span className={`badge badge-${kind}`} title={BADGE[kind]}>
      {compact ? short[kind] : BADGE[kind]}
    </span>
  )
}

interface Props {
  def: PropertyDef
  r: PropertyResult
  tC: number
  sig: number
  choice: DerivedChoice
}

export function PropertyRow({ def, r, tC, sig, choice }: Props) {
  const pub = r.published
  const calc = r.calculated
  const hasPub = hasValue(pub)
  const hasCalc = calc?.value != null
  const [view, setView] = useState<'published' | 'calculated'>(choice === 'calculated' ? 'calculated' : 'published')

  // Sem valor publicado, o calculado é exibido — sempre marcado como "Calculado",
  // nunca no lugar silencioso do tabelado.
  const showCalc = hasCalc && (!hasPub || view === 'calculated')
  const value = showCalc ? calc!.value! : hasValue(pub) ? pub.value : null
  const kind: BadgeKind = showCalc ? 'calculated' : hasValue(pub) ? pub.status : 'missing'
  const unit = def.canonical === '—' ? 'adimensional' : def.canonical
  const estimated = showCalc ? calc!.usesExtrapolation : pub.status === 'extrapolated'

  return (
    <li className={`prop${value == null ? ' is-missing' : ''}${estimated ? ' is-estimated' : ''}`}>
      <div className="prop-id">
        <span className="prop-sym">{def.symbol}</span>
        <span className="prop-name">{def.label}</span>
      </div>
      <div className="prop-val">
        {value != null ? (
          <>
            <span className="num">{formatNumber(value, { sig })}</span>
            <span className="unit">{unit}</span>
          </>
        ) : (
          <span className="prop-reason">{describeNoValue(pub, (t) => `${formatTemp(t)} °C`)}</span>
        )}
        <Badge kind={kind} />
      </div>

      {hasPub && hasCalc && (
        <div className="prop-derived">
          <div className="seg seg-small" role="radiogroup" aria-label={`Valor de ${def.symbol} exibido`}>
            <button type="button" role="radio" aria-checked={view === 'published'} className={view === 'published' ? 'on' : ''} onClick={() => setView('published')}>
              Publicado
            </button>
            <button type="button" role="radio" aria-checked={view === 'calculated'} className={view === 'calculated' ? 'on' : ''} onClick={() => setView('calculated')}>
              Calculado
            </button>
          </div>
          {r.diffPct != null && (
            <span className="diff" title="(calculado − publicado) / publicado">
              calculado {r.diffPct >= 0 ? '+' : '−'}
              {formatNumber(Math.abs(r.diffPct), { sig: 3 })} % em relação ao publicado
            </span>
          )}
        </div>
      )}
      {!hasPub && hasCalc && pub.status === 'no_data' && <p className="prop-note">A fonte não publica {def.symbol}; valor calculado a partir das outras propriedades.</p>}
      {!hasPub && hasCalc && pub.status !== 'no_data' && <p className="prop-note">Coluna publicada indisponível nesta temperatura; valor calculado a partir das outras propriedades.</p>}

      {(hasPub || hasCalc) && (
        <details className="how">
          <summary>Como foi calculado?</summary>
          {showCalc ? <CalcExplain k={def.key} c={calc!} /> : <InterpExplain k={def.key} r={pub} tC={tC} />}
        </details>
      )}
    </li>
  )
}
