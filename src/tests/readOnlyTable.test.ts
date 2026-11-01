// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
import { describe, expect, it } from 'vitest'
import { newSource } from '../data/defaults'
import type { DataRow } from '../domain/types'
import { buildReadOnlyTable } from '../lib/readOnlyTable'

const row = (id: string, tC: number, orig: DataRow['originalTemperature'], values: DataRow['values']): DataRow => ({ id, sourceId: 's', temperatureC: tC, originalTemperature: orig, values })

describe('tabela somente leitura', () => {
  it('mostra T em °C e a temperatura original com a unidade de cada linha', () => {
    // Referência declarada em °C, mas o CSV trouxe a unidade K linha a linha.
    const src = newSource({ id: 's', shortName: 'S', originalTempUnit: 'C' })
    const t = buildReadOnlyTable(src, [row('1', 0, { value: 273.15, unit: 'K' }, { density: 1.5 })], 5)
    expect(t.columns.map((c) => `${c.label} ${c.unit}`)).toEqual(['T °C', 'T original ', 'ρ kg/m³'])
    expect(t.rows[0]).toEqual(['0', '273,15 K', '1,5000'])
  })

  it('omite a coluna original quando todas as linhas já estão em °C', () => {
    const src = newSource({ id: 's', shortName: 'S' })
    const t = buildReadOnlyTable(src, [row('1', 20, { value: 20, unit: 'C' }, { density: 1 })], 3)
    expect(t.columns.map((c) => c.label)).toEqual(['T', 'ρ'])
    expect(t.rows[0][0]).toBe('20')
  })

  it('converte cada propriedade para a unidade declarada na referência e mostra ausente como travessão', () => {
    const src = newSource({ id: 's', shortName: 'S', inputUnits: { specificHeat: 'kJ/(kg.K)' } })
    const t = buildReadOnlyTable(
      src,
      [row('1', 0, { value: 0, unit: 'C' }, { specificHeat: 1100 }), row('2', 10, { value: 10, unit: 'C' }, { density: 2 })],
      3,
    )
    expect(t.columns.map((c) => `${c.label} ${c.unit}`)).toEqual(['T °C', 'ρ kg/m³', 'cp kJ/(kg·K)'])
    expect(t.rows[0]).toEqual(['0', '—', '1,10'])
    expect(t.rows[1]).toEqual(['10', '2,00', '—'])
  })
})
