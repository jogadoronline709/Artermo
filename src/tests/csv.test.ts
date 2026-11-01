// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import { autoMap, csvTemplate, exportSourceCsv, mergeRows, parseCsv, validateImport } from '../data/csv'
import { newSource } from '../data/defaults'
import type { DataRow } from '../domain/types'

const DEFAULTS = { tempUnit: 'C' as const, units: {} }

describe('importação CSV', () => {
  it('lê ponto e vírgula com decimal brasileiro', () => {
    const text = [
      'temperature;temperature_unit;density;density_unit;specific_heat;specific_heat_unit;dynamic_viscosity;dynamic_viscosity_unit',
      '0;C;1,5;kg/m3;1,000;kJ/(kg·K);200;10⁻⁷ Pa·s',
      '20,5;C;1,25;;1005;J/(kg.K);;',
    ].join('\n')
    const parsed = parseCsv(text)
    expect(parsed.delimiter).toBe(';')
    const map = autoMap(parsed.header)
    expect(map.temperature).toBe(0)
    expect(map.specificHeat).toBe(4)
    const v = validateImport(parsed, map, DEFAULTS, 'teste')
    expect(v.errors).toEqual([])
    expect(v.rows).toHaveLength(2)
    expect(v.rows[0].values.density).toBe(1.5)
    expect(v.rows[0].values.specificHeat).toBeCloseTo(1000, 10) // 1,000 kJ → 1000 J
    expect(v.rows[0].values.dynamicViscosity).toBeCloseTo(2e-5, 18)
    expect(v.rows[1].temperatureC).toBe(20.5)
    expect(v.rows[1].values.dynamicViscosity).toBeUndefined() // vazio = ausente, não zero
  })

  it('lê vírgula como separador com ponto decimal e campos entre aspas', () => {
    const text = 'temperature,density,conductivity\n300,1.2,0.026\n"310","1,1",0.027\n'
    const parsed = parseCsv(text)
    expect(parsed.delimiter).toBe(',')
    const v = validateImport(parsed, autoMap(parsed.header), { tempUnit: 'K', units: {} }, 'teste')
    expect(v.errors).toEqual([])
    expect(v.rows[0].temperatureC).toBeCloseTo(26.85, 10)
    expect(v.rows[0].originalTemperature).toEqual({ value: 300, unit: 'K' })
    expect(v.rows[1].values.density).toBe(1.1)
  })

  it('usa a unidade da fonte quando a coluna de unidade está ausente', () => {
    const parsed = parseCsv('temperature;specific_heat\n0;1,1')
    const v = validateImport(parsed, autoMap(parsed.header), { tempUnit: 'C', units: { specificHeat: 'kJ/(kg.K)' } }, 'teste')
    expect(v.rows[0].values.specificHeat).toBeCloseTo(1100, 10)
  })

  it('aceita unidade no cabeçalho, ex.: "T (K)"', () => {
    const parsed = parseCsv('T (K);cp (kJ/kg·K)\n273,15;1,2')
    const v = validateImport(parsed, autoMap(parsed.header), DEFAULTS, 'teste')
    expect(v.errors).toEqual([])
    expect(v.rows[0].temperatureC).toBeCloseTo(0, 10)
    expect(v.rows[0].values.specificHeat).toBeCloseTo(1200, 10)
  })

  it('mostra erros linha a linha antes de gravar', () => {
    const text = [
      'temperature;density;density_unit;conductivity',
      '0;1,2;kg/m3;0,02',
      'abc;1,1;kg/m3;0,02', // temperatura inválida
      '20;x;kg/m3;0,02', // número inválido
      '30;1,0;lb/ft3;0,02', // unidade não suportada
      '40;0;kg/m3;0,02', // zero não é aceito como valor
      '0;1,3;kg/m3;0,03', // temperatura duplicada
    ].join('\n')
    const parsed = parseCsv(text)
    const v = validateImport(parsed, autoMap(parsed.header), DEFAULTS, 'teste')
    expect(v.errors.map((e) => e.line)).toEqual([3, 4, 5, 6, 7])
    expect(v.rows).toHaveLength(1)
  })

  it('ignora linhas de comentário e lê o modelo vazio', () => {
    const parsed = parseCsv(csvTemplate())
    expect(parsed.header[0]).toBe('temperature')
    expect(parsed.rows).toHaveLength(0)
  })

  it('não executa nem interpreta fórmulas', () => {
    const parsed = parseCsv('temperature;density\n=1+1;@SUM(1)')
    const v = validateImport(parsed, autoMap(parsed.header), DEFAULTS, 'teste')
    expect(v.rows).toHaveLength(0)
    expect(v.errors.length).toBeGreaterThan(0)
  })
})

describe('exportação CSV e mesclagem', () => {
  const src = newSource({ id: 'teste', shortName: 'Teste', inputUnits: { dynamicViscosity: '1e-7 Pa.s', specificHeat: 'kJ/(kg.K)' } })
  const rows: DataRow[] = [
    { id: '1', sourceId: 'teste', temperatureC: 26.85, originalTemperature: { value: 300, unit: 'K' }, values: { density: 1.5, specificHeat: 1000, dynamicViscosity: 2e-5 } },
    { id: '2', sourceId: 'teste', temperatureC: 36.85, originalTemperature: { value: 310, unit: 'K' }, values: { density: 1.25 } },
  ]

  it('exporta e reimporta sem perda (ida e volta)', () => {
    for (const delim of [',', ';'] as const) {
      const csv = exportSourceCsv(src, rows, delim)
      const parsed = parseCsv(csv)
      const v = validateImport(parsed, autoMap(parsed.header), DEFAULTS, 'teste')
      expect(v.errors).toEqual([])
      expect(v.rows).toHaveLength(2)
      expect(v.rows[0].temperatureC).toBeCloseTo(26.85, 10)
      expect(v.rows[0].values.specificHeat).toBeCloseTo(1000, 10)
      expect(v.rows[0].values.dynamicViscosity).toBeCloseTo(2e-5, 18)
      expect(v.rows[1].values.specificHeat).toBeUndefined()
    }
    expect(exportSourceCsv(src, rows, ';')).toContain('1,5')
  })

  it('mescla substituindo temperaturas coincidentes', () => {
    const incoming: DataRow[] = [
      { id: 'n1', sourceId: 'teste', temperatureC: 26.85, originalTemperature: { value: 300, unit: 'K' }, values: { density: 9 } },
      { id: 'n2', sourceId: 'teste', temperatureC: 100, originalTemperature: { value: 100, unit: 'C' }, values: { density: 7 } },
    ]
    const m = mergeRows(rows, incoming, 'upsert')
    expect(m.replaced).toBe(1)
    expect(m.added).toBe(1)
    expect(m.rows.map((r) => r.values.density)).toEqual([9, 1.25, 7])
    expect(mergeRows(rows, incoming, 'replace').rows).toHaveLength(2)
  })
})
