/**
 * Média aritmética das referências — calculada SEMPRE depois de interpolar
 * cada fonte de forma independente, propriedade por propriedade.
 *
 * Importante: a média é apenas a média aritmética das referências
 * selecionadas. Não é valor certificado, oficial ou "mais correto".
 */

export type AverageMode = 'require_all' | 'available'

export interface SourceValue {
  sourceId: string
  name: string
  /** Valor já interpolado nesta fonte (unidade canônica) ou null se indisponível. */
  value: number | null
  /** Motivo da ausência (ex.: "Fora da faixa"). */
  reason?: string
}

export interface AverageResult {
  /** ok: média calculada; incomplete: modo "exigir todas" e faltou fonte; none: nenhuma fonte com valor. */
  status: 'ok' | 'incomplete' | 'none'
  mean: number | null
  n: number
  total: number
  included: string[]
  excluded: { name: string; reason: string }[]
  min: number | null
  max: number | null
  /** max − min */
  range: number | null
  /** Amplitude relativa à média, em % (|max − min| / |média| × 100). */
  rangePct: number | null
  /** Desvio-padrão AMOSTRAL (divisor n − 1), só com n ≥ 2. */
  stdSample: number | null
}

export function averageSources(values: SourceValue[], mode: AverageMode): AverageResult {
  const total = values.length
  const valid = values.filter((v) => typeof v.value === 'number' && Number.isFinite(v.value))
  const excluded = values
    .filter((v) => !(typeof v.value === 'number' && Number.isFinite(v.value)))
    .map((v) => ({ name: v.name, reason: v.reason || 'Sem valor' }))
  const nums = valid.map((v) => v.value as number)
  const n = nums.length

  const min = n ? Math.min(...nums) : null
  const max = n ? Math.max(...nums) : null
  const range = n ? (max as number) - (min as number) : null
  const meanAvail = n ? nums.reduce((a, b) => a + b, 0) / n : null
  const stdSample =
    n >= 2 && meanAvail != null
      ? Math.sqrt(nums.reduce((acc, x) => acc + (x - meanAvail) ** 2, 0) / (n - 1))
      : null
  const rangePct = range != null && meanAvail ? (Math.abs(range) / Math.abs(meanAvail)) * 100 : null

  let status: AverageResult['status']
  let mean: number | null
  if (n === 0) {
    status = 'none'
    mean = null
  } else if (mode === 'require_all' && n < total) {
    status = 'incomplete'
    mean = null
  } else {
    status = 'ok'
    mean = meanAvail
  }

  return {
    status,
    mean,
    n,
    total,
    included: valid.map((v) => v.name),
    excluded,
    min,
    max,
    range,
    rangePct,
    stdSample,
  }
}
