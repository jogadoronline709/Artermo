import type { DataRow, Point, PropertyKey } from './types'

/** Tolerância (°C) para considerar que a temperatura pedida coincide com uma linha. */
export const TEMP_TOLERANCE_C = 1e-6

export type InterpResult =
  | { status: 'tabulated'; value: number; t: number }
  | {
      status: 'interpolated'
      value: number
      t1: number
      y1: number
      t2: number
      y2: number
      fraction: number
    }
  | {
      status: 'extrapolated'
      value: number
      t1: number
      y1: number
      t2: number
      y2: number
      fraction: number
      side: 'below' | 'above'
      range: { min: number; max: number }
    }
  | { status: 'out_of_range'; side: 'below' | 'above'; range: { min: number; max: number } }
  | { status: 'no_data' }
  | { status: 'insufficient'; reason: string; range?: { min: number; max: number } }
  | { status: 'invalid'; reason: string }

export type OkInterp = Extract<InterpResult, { value: number }>

export function hasValue(r: InterpResult): r is OkInterp {
  return r.status === 'tabulated' || r.status === 'interpolated' || r.status === 'extrapolated'
}

export interface InterpOptions {
  /** Permite extrapolação linear além da faixa (padrão: false). */
  allowExtrapolation?: boolean
  /** Tolerância em °C para coincidência exata (padrão TEMP_TOLERANCE_C). */
  tolerance?: number
}

/**
 * Extrai os pontos válidos (T, y) de uma propriedade em UMA fonte.
 * Ignora células ausentes ou não numéricas — nunca as substitui por zero.
 */
export function pointsFor(rows: DataRow[], key: PropertyKey): Point[] {
  const pts: Point[] = []
  for (const r of rows) {
    const y = r.values[key]
    if (typeof y === 'number' && Number.isFinite(y) && Number.isFinite(r.temperatureC)) {
      pts.push({ t: r.temperatureC, y })
    }
  }
  return pts.sort((a, b) => a.t - b.t)
}

/**
 * Interpolação linear: y = y1 + ((T − T1) / (T2 − T1)) · (y2 − y1)
 *
 * Regras:
 * - Linha coincidente (dentro da tolerância) → valor tabelado, sem interpolar.
 * - Caso contrário usa os pontos válidos imediatamente inferior e superior.
 * - Fora da faixa → bloqueado por padrão (`out_of_range`), a menos que
 *   `allowExtrapolation` seja verdadeiro (resultado marcado `extrapolated`).
 * - Temperaturas duplicadas com valores diferentes → `invalid`.
 */
export function interpolate(points: Point[], tC: number, opts: InterpOptions = {}): InterpResult {
  const tol = opts.tolerance ?? TEMP_TOLERANCE_C
  if (!Number.isFinite(tC)) return { status: 'invalid', reason: 'Temperatura solicitada não é um número válido.' }

  const pts = points
    .filter((p) => Number.isFinite(p.t) && Number.isFinite(p.y))
    .slice()
    .sort((a, b) => a.t - b.t)
  if (pts.length === 0) return { status: 'no_data' }

  // Proteção contra temperaturas duplicadas.
  for (let i = 1; i < pts.length; i++) {
    if (Math.abs(pts[i].t - pts[i - 1].t) <= tol) {
      if (pts[i].y !== pts[i - 1].y) {
        return {
          status: 'invalid',
          reason: `Temperatura duplicada (${pts[i].t} °C) com valores diferentes. Corrija a tabela.`,
        }
      }
    }
  }
  // Remove duplicatas idênticas.
  const uniq = pts.filter((p, i) => i === 0 || Math.abs(p.t - pts[i - 1].t) > tol)

  const range = { min: uniq[0].t, max: uniq[uniq.length - 1].t }

  const exact = uniq.find((p) => Math.abs(p.t - tC) <= tol)
  if (exact) return { status: 'tabulated', value: exact.y, t: exact.t }

  if (tC < range.min || tC > range.max) {
    const side = tC < range.min ? 'below' : 'above'
    if (!opts.allowExtrapolation) return { status: 'out_of_range', side, range }
    if (uniq.length < 2) {
      return { status: 'insufficient', reason: 'É preciso ao menos dois pontos válidos para extrapolar.', range }
    }
    const [p1, p2] = side === 'below' ? [uniq[0], uniq[1]] : [uniq[uniq.length - 2], uniq[uniq.length - 1]]
    const { value, fraction } = linear(p1, p2, tC)
    return { status: 'extrapolated', value, t1: p1.t, y1: p1.y, t2: p2.t, y2: p2.y, fraction, side, range }
  }

  if (uniq.length < 2) {
    return { status: 'insufficient', reason: 'Há apenas um ponto válido para esta propriedade.', range }
  }

  // Localiza o par que envolve tC.
  let lo = uniq[0]
  let hi = uniq[uniq.length - 1]
  for (let i = 0; i < uniq.length - 1; i++) {
    if (uniq[i].t < tC && tC < uniq[i + 1].t) {
      lo = uniq[i]
      hi = uniq[i + 1]
      break
    }
  }
  const { value, fraction } = linear(lo, hi, tC)
  return { status: 'interpolated', value, t1: lo.t, y1: lo.y, t2: hi.t, y2: hi.y, fraction }
}

function linear(p1: Point, p2: Point, t: number): { value: number; fraction: number } {
  const dt = p2.t - p1.t
  if (dt === 0) throw new Error('Divisão por zero na interpolação (T2 = T1).')
  const fraction = (t - p1.t) / dt
  return { value: p1.y + fraction * (p2.y - p1.y), fraction }
}

/** Mensagem curta em pt-BR para resultados sem valor. */
export function describeNoValue(r: InterpResult, fmtT: (t: number) => string): string {
  switch (r.status) {
    case 'no_data':
      return 'Sem dados cadastrados para esta propriedade.'
    case 'out_of_range':
      return `Fora da faixa disponível (${fmtT(r.range.min)} a ${fmtT(r.range.max)}). Extrapolação desativada.`
    case 'insufficient':
      return `Dados insuficientes: ${r.reason}`
    case 'invalid':
      return r.reason
    default:
      return ''
  }
}

export function statusLabel(status: InterpResult['status']): string {
  switch (status) {
    case 'tabulated':
      return 'Tabelado'
    case 'interpolated':
      return 'Interpolado'
    case 'extrapolated':
      return 'Extrapolado (estimado)'
    case 'out_of_range':
      return 'Fora da faixa'
    case 'no_data':
      return 'Sem dados'
    case 'insufficient':
      return 'Dados insuficientes'
    case 'invalid':
      return 'Dados inválidos'
  }
}
