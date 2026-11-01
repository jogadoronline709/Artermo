import { formatNumber, formatTemp } from '../domain/numbers'
import type { InterpResult } from '../domain/interpolation'
import type { CalculatedResult } from '../domain/query'
import type { PropertyKey } from '../domain/types'
import { getPropertyDef } from '../domain/units'

/** Números longos o bastante para conferir a conta à mão. */
const full = (v: number) => formatNumber(v, { sig: 7 })

export function InterpExplain({ k, r, tC }: { k: PropertyKey; r: InterpResult; tC: number }) {
  const d = getPropertyDef(k)
  const u = d.canonical === '—' ? '' : ` ${d.canonical}`
  if (r.status === 'tabulated') {
    return (
      <div className="explain">
        <p>
          A tabela tem uma linha exatamente em T = {formatTemp(r.t)} °C. O valor é lido diretamente, <strong>sem interpolação</strong>.
        </p>
        <p className="formula">
          {d.symbol} = {full(r.value)}
          {u}
        </p>
      </div>
    )
  }
  if (r.status === 'interpolated' || r.status === 'extrapolated') {
    const T = formatTemp(tC)
    const T1 = formatTemp(r.t1)
    const T2 = formatTemp(r.t2)
    return (
      <div className="explain">
        {r.status === 'extrapolated' && (
          <p className="warn-text">
            Extrapolação: T está {r.side === 'below' ? 'abaixo' : 'acima'} da faixa da tabela ({formatTemp(r.range.min)} a {formatTemp(r.range.max)} °C). O resultado é uma
            estimativa, usando os dois pontos da extremidade.
          </p>
        )}
        <p className="formula">y = y₁ + ((T − T₁) / (T₂ − T₁)) · (y₂ − y₁)</p>
        <dl className="explain-grid">
          <dt>T</dt>
          <dd>{T} °C</dd>
          <dt>T₁</dt>
          <dd>{T1} °C</dd>
          <dt>y₁</dt>
          <dd>
            {full(r.y1)}
            {u}
          </dd>
          <dt>T₂</dt>
          <dd>{T2} °C</dd>
          <dt>y₂</dt>
          <dd>
            {full(r.y2)}
            {u}
          </dd>
          <dt>fração</dt>
          <dd>
            ({T} − {T1}) / ({T2} − {T1}) = {formatNumber(r.fraction, { sig: 6 })}
          </dd>
        </dl>
        <p className="formula">
          {d.symbol} = {full(r.y1)} + {formatNumber(r.fraction, { sig: 6 })} · ({full(r.y2)} − {full(r.y1)})
        </p>
        <p className="formula formula-result">
          {d.symbol} = {full(r.value)}
          {u}
        </p>
      </div>
    )
  }
  return null
}

export function CalcExplain({ k, c }: { k: PropertyKey; c: CalculatedResult }) {
  const d = getPropertyDef(k)
  const u = d.canonical === '—' ? '' : ` ${d.canonical}`
  const sym = (ik: PropertyKey) => getPropertyDef(ik).symbol
  const val = (ik: PropertyKey) => (c.inputs[ik] ? full(c.inputs[ik]!.value) : '?')
  let substituted = ''
  if (k === 'kinematicViscosity') substituted = `${val('dynamicViscosity')} / ${val('density')}`
  if (k === 'thermalDiffusivity') substituted = `${val('conductivity')} / (${val('density')} · ${val('specificHeat')})`
  if (k === 'prandtl') substituted = `${val('dynamicViscosity')} · ${val('specificHeat')} / ${val('conductivity')}`

  return (
    <div className="explain">
      <p>Calculado pelo ArTermo com as propriedades desta mesma fonte, já interpoladas para a temperatura pedida e em unidades SI.</p>
      <p className="formula">{c.formula}</p>
      <ul className="explain-inputs">
        {(Object.keys(c.inputs) as PropertyKey[]).map((ik) => (
          <li key={ik}>
            {sym(ik)} = {val(ik)} {getPropertyDef(ik).canonical} <span className="muted">({c.inputs[ik]!.status === 'tabulated' ? 'tabelado' : c.inputs[ik]!.status === 'extrapolated' ? 'extrapolado' : 'interpolado'})</span>
          </li>
        ))}
        {c.missing.map((ik) => (
          <li key={ik} className="muted">
            {sym(ik)}: indisponível nesta temperatura
          </li>
        ))}
      </ul>
      {c.value != null && (
        <>
          <p className="formula">
            {d.symbol} = {substituted}
          </p>
          <p className="formula formula-result">
            {d.symbol} = {full(c.value)}
            {u}
          </p>
        </>
      )}
    </div>
  )
}
