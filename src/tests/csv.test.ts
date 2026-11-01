// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import { autoMap, CSV_HEADERS, parseCsv, validateImport } from '../data/csv'

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

  it('ignora linhas de comentário (usadas para citar a fonte nos CSVs embutidos)', () => {
    const parsed = parseCsv(['# Fonte: tabela de teste', CSV_HEADERS.join(','), '# comentário no meio', '0,C,1.5'].join('\n'))
    expect(parsed.header[0]).toBe('temperature')
    expect(parsed.rows).toHaveLength(1)
  })

  it('não executa nem interpreta fórmulas', () => {
    const parsed = parseCsv('temperature;density\n=1+1;@SUM(1)')
    const v = validateImport(parsed, autoMap(parsed.header), DEFAULTS, 'teste')
    expect(v.rows).toHaveLength(0)
    expect(v.errors.length).toBeGreaterThan(0)
  })
})
