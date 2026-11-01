// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE,
// escolhidos para facilitar a conferência manual. Nenhum valor foi retirado
// de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import { hasValue, interpolate, pointsFor } from '../domain/interpolation'
import { averageSources } from '../domain/average'
import { checkCompatibility } from '../domain/compatibility'
import { kinematicViscosity, percentDiff, prandtl, thermalDiffusivity } from '../domain/derived'
import { effectiveValue, querySource } from '../domain/query'
import { toCanonical, toCelsius } from '../domain/units'
import type { DataRow, PropertyValues } from '../domain/types'

let idSeq = 0
function row(sourceId: string, tC: number, values: PropertyValues): DataRow {
  return {
    id: `teste-${idSeq++}`,
    sourceId,
    temperatureC: tC,
    originalTemperature: { value: tC, unit: 'C' },
    values,
  }
}

// Fonte sintética A: malha de 0 em 0, 20, 40 °C.
const fonteA = [
  row('A', 0, { density: 10, specificHeat: 1000, conductivity: 0.02, dynamicViscosity: 2e-5 }),
  row('A', 20, { density: 8, specificHeat: 1010, conductivity: 0.03, dynamicViscosity: 3e-5 }),
  row('A', 40, { density: 6, specificHeat: 1020, conductivity: 0.04, dynamicViscosity: 4e-5 }),
]

describe('interpolação linear por referência', () => {
  it('retorna valor TABELADO quando a temperatura coincide com uma linha', () => {
    const r = interpolate(pointsFor(fonteA, 'density'), 20)
    expect(r.status).toBe('tabulated')
    expect(hasValue(r) && r.value).toBe(8)
  })

  it('reconhece coincidência dentro da tolerância (ex.: 293,15 K = 20 °C)', () => {
    const r = interpolate(pointsFor(fonteA, 'density'), toCelsius(293.15, 'K'))
    expect(r.status).toBe('tabulated')
  })

  it('interpola entre dois pontos com resultado decimal', () => {
    // y = 10 + ((5 − 0)/(20 − 0)) · (8 − 10) = 10 − 0,5 = 9,5
    const r = interpolate(pointsFor(fonteA, 'density'), 5)
    expect(r.status).toBe('interpolated')
    if (r.status !== 'interpolated') throw new Error()
    expect(r.t1).toBe(0)
    expect(r.t2).toBe(20)
    expect(r.y1).toBe(10)
    expect(r.y2).toBe(8)
    expect(r.fraction).toBeCloseTo(0.25, 15)
    expect(r.value).toBeCloseTo(9.5, 12)

    // 33,3 °C → fração 0,665; k = 0,03 + 0,665·0,01 = 0,03665
    const k = interpolate(pointsFor(fonteA, 'conductivity'), 33.3)
    expect(hasValue(k) && k.value).toBeCloseTo(0.03665, 12)
  })

  it('bloqueia extrapolação abaixo e acima da faixa por padrão', () => {
    const below = interpolate(pointsFor(fonteA, 'density'), -10)
    expect(below).toEqual({ status: 'out_of_range', side: 'below', range: { min: 0, max: 40 } })
    const above = interpolate(pointsFor(fonteA, 'density'), 50)
    expect(above.status).toBe('out_of_range')
    if (above.status === 'out_of_range') expect(above.side).toBe('above')
  })

  it('extrapola apenas quando habilitado e marca como extrapolado', () => {
    const r = interpolate(pointsFor(fonteA, 'density'), 50, { allowExtrapolation: true })
    expect(r.status).toBe('extrapolated')
    // usa (20, 8) e (40, 6): 8 + (30/20)·(−2) = 5
    expect(hasValue(r) && r.value).toBeCloseTo(5, 12)
  })

  it('pula células ausentes e usa os pontos válidos que envolvem T (nunca zero)', () => {
    const rows = [
      row('B', 0, { density: 10 }),
      row('B', 10, { specificHeat: 1005 }), // sem densidade nesta linha
      row('B', 20, { density: 8 }),
    ]
    const r = interpolate(pointsFor(rows, 'density'), 10)
    expect(r.status).toBe('interpolated')
    if (r.status !== 'interpolated') throw new Error()
    expect(r.t1).toBe(0)
    expect(r.t2).toBe(20)
    expect(r.value).toBeCloseTo(9, 12) // e não 0 nem 5
  })

  it('informa ausência de dados e dados insuficientes', () => {
    expect(interpolate([], 10).status).toBe('no_data')
    expect(interpolate([{ t: 0, y: 1 }], 0).status).toBe('tabulated')
    expect(interpolate([{ t: 0, y: 1 }], 5).status).toBe('out_of_range')
  })

  it('protege contra temperaturas duplicadas e valores não numéricos', () => {
    const dup = interpolate(
      [
        { t: 10, y: 1 },
        { t: 10, y: 2 },
        { t: 20, y: 3 },
      ],
      15,
    )
    expect(dup.status).toBe('invalid')
    expect(interpolate([{ t: 0, y: NaN }, { t: 10, y: 1 }, { t: 20, y: 2 }], 5).status).toBe('out_of_range')
    expect(interpolate(pointsFor(fonteA, 'density'), Number.NaN).status).toBe('invalid')
  })

  it('cada fonte é interpolada com sua própria malha de temperaturas', () => {
    // Fonte C com malha diferente (0, 30, 60). Mesma T = 15 °C.
    const fonteC = [row('C', 0, { density: 9 }), row('C', 30, { density: 6 }), row('C', 60, { density: 3 })]
    const a = interpolate(pointsFor(fonteA, 'density'), 15)
    const c = interpolate(pointsFor(fonteC, 'density'), 15)
    if (a.status !== 'interpolated' || c.status !== 'interpolated') throw new Error()
    expect([a.t1, a.t2]).toEqual([0, 20])
    expect(a.value).toBeCloseTo(8.5, 12)
    expect([c.t1, c.t2]).toEqual([0, 30])
    expect(c.value).toBeCloseTo(7.5, 12)
  })
})

describe('propriedades derivadas (unidades canônicas)', () => {
  it('ν = μ/ρ, α = k/(ρ·cp), Pr = μ·cp/k', () => {
    expect(kinematicViscosity(2e-5, 10)).toBeCloseTo(2e-6, 18)
    expect(thermalDiffusivity(0.02, 10, 1000)).toBeCloseTo(2e-6, 18)
    expect(prandtl(2e-5, 1000, 0.02)).toBeCloseTo(1, 12)
  })

  it('converte unidades antes de calcular (kJ/(kg·K) e 10⁻⁷ Pa·s)', () => {
    const mu = toCanonical('dynamicViscosity', 200, '1e-7 Pa.s') // 2e-5 Pa·s
    const cp = toCanonical('specificHeat', 1, 'kJ/(kg.K)') // 1000 J/(kg·K)
    const k = toCanonical('conductivity', 20, '1e-3 W/(m.K)') // 0,02 W/(m·K)
    expect(prandtl(mu, cp, k)).toBeCloseTo(1, 12)
  })

  it('retorna null quando falta entrada ou há divisão por zero', () => {
    expect(kinematicViscosity(2e-5, 0)).toBeNull()
    expect(thermalDiffusivity(0.02, undefined, 1000)).toBeNull()
    expect(prandtl(2e-5, 1000, 0)).toBeNull()
  })

  it('mantém o valor publicado e compara com o calculado', () => {
    const rows = [
      row('D', 0, { density: 10, dynamicViscosity: 2e-5, kinematicViscosity: 2.1e-6 }),
      row('D', 20, { density: 10, dynamicViscosity: 2e-5, kinematicViscosity: 2.1e-6 }),
    ]
    const q = querySource(rows, 10)
    const nu = q.kinematicViscosity
    expect(hasValue(nu.published) && nu.published.value).toBeCloseTo(2.1e-6, 18)
    expect(nu.calculated?.value).toBeCloseTo(2e-6, 18)
    expect(nu.diffPct).toBeCloseTo(((2e-6 - 2.1e-6) / 2.1e-6) * 100, 8)
    expect(percentDiff(2, 0)).toBeNull()

    const pub = effectiveValue(nu, 'published')
    const calc = effectiveValue(nu, 'calculated')
    expect(pub.ok && pub.origin).toBe('published')
    expect(calc.ok && calc.origin).toBe('calculated')
  })

  it('calcula derivada a partir de valores interpolados quando não há coluna publicada', () => {
    const q = querySource(fonteA, 10)
    // ρ = 9, μ = 2,5e-5 → ν = 2,7778e-6
    expect(q.kinematicViscosity.published.status).toBe('no_data')
    expect(q.kinematicViscosity.calculated?.value).toBeCloseTo(2.5e-5 / 9, 18)
    const eff = effectiveValue(q.kinematicViscosity, 'published_else_calculated')
    expect(eff.ok && eff.origin).toBe('calculated')
    expect(effectiveValue(q.kinematicViscosity, 'published').ok).toBe(false)
  })
})

describe('média aritmética das referências', () => {
  const tres = [
    { sourceId: 'k', name: 'Fonte 1', value: 1.0 },
    { sourceId: 'i', name: 'Fonte 2', value: 2.0 },
    { sourceId: 'c', name: 'Fonte 3', value: 4.5 },
  ]

  it('média de 3 fontes com mín, máx, amplitude e desvio-padrão amostral', () => {
    const r = averageSources(tres, 'available')
    expect(r.status).toBe('ok')
    expect(r.mean).toBeCloseTo(2.5, 12)
    expect(r.n).toBe(3)
    expect(r.total).toBe(3)
    expect(r.min).toBe(1)
    expect(r.max).toBe(4.5)
    expect(r.range).toBeCloseTo(3.5, 12)
    // s² = ((1,5)² + (0,5)² + 2²) / 2 = 3,25
    expect(r.stdSample).toBeCloseTo(Math.sqrt(3.25), 12)
  })

  it('média das fontes disponíveis (2/3), sem tratar ausência como zero', () => {
    const r = averageSources([tres[0], tres[1], { sourceId: 'c', name: 'Fonte 3', value: null, reason: 'Fora da faixa' }], 'available')
    expect(r.status).toBe('ok')
    expect(r.mean).toBeCloseTo(1.5, 12) // e não (1+2+0)/3 = 1
    expect(r.n).toBe(2)
    expect(r.total).toBe(3)
    expect(r.excluded).toEqual([{ name: 'Fonte 3', reason: 'Fora da faixa' }])
  })

  it('modo "exigir as 3 referências" não apresenta média incompleta', () => {
    const r = averageSources([tres[0], tres[1], { sourceId: 'c', name: 'Fonte 3', value: null, reason: 'Sem dados' }], 'require_all')
    expect(r.status).toBe('incomplete')
    expect(r.mean).toBeNull()
    expect(r.n).toBe(2)
    expect(averageSources(tres, 'require_all').mean).toBeCloseTo(2.5, 12)
  })

  it('nenhuma fonte disponível', () => {
    const r = averageSources([{ sourceId: 'x', name: 'X', value: null }], 'available')
    expect(r.status).toBe('none')
    expect(r.mean).toBeNull()
  })

  it('interpola primeiro cada fonte e só depois faz a média (malhas diferentes)', () => {
    const fonteC = [row('C', 0, { density: 9 }), row('C', 30, { density: 6 })]
    const a = querySource(fonteA, 15).density.published
    const c = querySource(fonteC, 15).density.published
    if (!hasValue(a) || !hasValue(c)) throw new Error()
    const r = averageSources(
      [
        { sourceId: 'A', name: 'A', value: a.value },
        { sourceId: 'C', name: 'C', value: c.value },
      ],
      'available',
    )
    expect(r.mean).toBeCloseTo((8.5 + 7.5) / 2, 12)
  })
})

describe('compatibilidade de pressão e fluido', () => {
  const base = { fluid: 'Ar' }
  it('compatível quando todas têm a mesma pressão', () => {
    const r = checkCompatibility([
      { ...base, shortName: 'A', pressureKPa: 101.325 },
      { ...base, shortName: 'B', pressureKPa: 101.325 },
      { ...base, shortName: 'C', pressureKPa: 101.3 },
    ])
    expect(r.compatible).toBe(true)
  })
  it('acusa pressão não cadastrada', () => {
    const r = checkCompatibility([
      { ...base, shortName: 'A', pressureKPa: 101.325 },
      { ...base, shortName: 'B', pressureKPa: null },
    ])
    expect(r.compatible).toBe(false)
    expect(r.issues[0].kind).toBe('pressure_missing')
  })
  it('acusa pressões diferentes (100 kPa × 1 atm)', () => {
    const r = checkCompatibility([
      { ...base, shortName: 'A', pressureKPa: 101.325 },
      { ...base, shortName: 'B', pressureKPa: 100 },
    ])
    expect(r.compatible).toBe(false)
    expect(r.issues.map((i) => i.kind)).toContain('pressure_different')
  })
  it('acusa fluidos diferentes', () => {
    const r = checkCompatibility([
      { ...base, shortName: 'A', pressureKPa: 100 },
      { ...base, shortName: 'B', pressureKPa: 100, fluid: 'Nitrogênio' },
    ])
    expect(r.issues.map((i) => i.kind)).toContain('fluid_different')
  })
})

describe('compatibilidade quando a pressão não se aplica', () => {
  it('fontes de gás ideal sem pressão não geram aviso', () => {
    const r = checkCompatibility([
      { shortName: 'A', fluid: 'Ar (gás ideal)', pressureKPa: null, pressureApplies: false },
      { shortName: 'B', fluid: 'Ar (gás ideal)', pressureKPa: null, pressureApplies: false },
    ])
    expect(r).toEqual({ compatible: true, issues: [] })
  })
})
