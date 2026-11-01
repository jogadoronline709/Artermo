import { DERIVED_FORMULAS, kinematicViscosity, percentDiff, prandtl, thermalDiffusivity } from './derived'
import { hasValue, interpolate, pointsFor, type InterpOptions, type InterpResult, type OkInterp } from './interpolation'
import type { DataRow, DerivedKey, PropertyKey } from './types'
import { PROPERTY_KEYS } from './units'

export interface CalculatedResult {
  /** Valor calculado (unidade canônica) ou null se faltar entrada. */
  value: number | null
  formula: string
  /** Entradas usadas (já interpoladas para a temperatura pedida). */
  inputs: Partial<Record<PropertyKey, OkInterp>>
  /** Entradas que faltaram. */
  missing: PropertyKey[]
  /** Alguma entrada foi extrapolada → resultado também é estimado. */
  usesExtrapolation: boolean
}

export interface PropertyResult {
  key: PropertyKey
  /** Resultado a partir da coluna publicada na tabela da fonte. */
  published: InterpResult
  /** Só para ν, α e Pr: valor calculado pelo app a partir de μ, ρ, k, cp. */
  calculated?: CalculatedResult
  /** Diferença percentual calculado × publicado, quando ambos existem. */
  diffPct?: number | null
}

export type SourceQuery = Record<PropertyKey, PropertyResult>

/**
 * Consulta UMA fonte em uma temperatura (°C). Cada propriedade é interpolada
 * apenas com os pontos desta fonte — nunca mistura fontes.
 */
export function querySource(rows: DataRow[], tC: number, opts: InterpOptions = {}): SourceQuery {
  const out = {} as SourceQuery
  for (const key of PROPERTY_KEYS) {
    out[key] = { key, published: interpolate(pointsFor(rows, key), tC, opts) }
  }
  for (const key of Object.keys(DERIVED_FORMULAS) as DerivedKey[]) {
    const calc = computeDerived(key, out)
    out[key].calculated = calc
    const pub = out[key].published
    if (calc.value != null && hasValue(pub)) out[key].diffPct = percentDiff(calc.value, pub.value)
  }
  return out
}

function computeDerived(key: DerivedKey, q: SourceQuery): CalculatedResult {
  const f = DERIVED_FORMULAS[key]
  const inputs: Partial<Record<PropertyKey, OkInterp>> = {}
  const missing: PropertyKey[] = []
  for (const ik of f.inputs) {
    const r = q[ik].published
    if (hasValue(r)) inputs[ik] = r
    else missing.push(ik)
  }
  const v = (k: PropertyKey) => inputs[k]?.value
  let value: number | null = null
  if (missing.length === 0) {
    if (key === 'kinematicViscosity') value = kinematicViscosity(v('dynamicViscosity'), v('density'))
    else if (key === 'thermalDiffusivity') value = thermalDiffusivity(v('conductivity'), v('density'), v('specificHeat'))
    else value = prandtl(v('dynamicViscosity'), v('specificHeat'), v('conductivity'))
  }
  const usesExtrapolation = Object.values(inputs).some((r) => r?.status === 'extrapolated')
  return { value, formula: f.text, inputs, missing, usesExtrapolation }
}

/** Qual valor usar para ν, α e Pr ao exibir/comparar. */
export type DerivedChoice = 'published' | 'calculated' | 'published_else_calculated'

export type EffectiveValue =
  | { ok: true; value: number; origin: 'published' | 'calculated'; estimated: boolean; status: InterpResult['status'] | 'calculated' }
  | { ok: false; reason: string }

/** Valor efetivo de uma propriedade conforme a escolha para derivadas. */
export function effectiveValue(r: PropertyResult, choice: DerivedChoice = 'published'): EffectiveValue {
  const pub = r.published
  const calc = r.calculated
  const fromPub = (): EffectiveValue | null =>
    hasValue(pub) ? { ok: true, value: pub.value, origin: 'published', estimated: pub.status === 'extrapolated', status: pub.status } : null
  const fromCalc = (): EffectiveValue | null =>
    calc && calc.value != null
      ? { ok: true, value: calc.value, origin: 'calculated', estimated: calc.usesExtrapolation, status: 'calculated' }
      : null

  if (!calc || choice === 'published') return fromPub() ?? { ok: false, reason: reasonOf(pub) }
  if (choice === 'calculated') {
    return fromCalc() ?? { ok: false, reason: calc.missing.length ? 'Faltam dados para calcular' : 'Cálculo indisponível' }
  }
  return fromPub() ?? fromCalc() ?? { ok: false, reason: reasonOf(pub) }
}

export function reasonOf(r: InterpResult): string {
  switch (r.status) {
    case 'no_data':
      return 'Sem dados'
    case 'out_of_range':
      return r.side === 'below' ? 'Abaixo da faixa' : 'Acima da faixa'
    case 'insufficient':
      return 'Dados insuficientes'
    case 'invalid':
      return 'Dados inválidos'
    default:
      return ''
  }
}
