// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import type { DataRow, PropertyValues } from '../domain/types'
import { checkTransportTable } from '../lib/transportChecks'

const row = (tC: number, values: PropertyValues): DataRow => ({ id: String(tC), sourceId: 't', temperatureC: tC, originalTemperature: { value: tC, unit: 'C' }, values })

/** Linha coerente: ν = μ/ρ, α = k/(ρ·cp), Pr = μ·cp/k. */
function coherent(tC: number): DataRow {
  const rho = 1.2 - tC / 1000
  const cp = 1000 + tC
  const mu = 1.8e-5 + tC * 1e-8
  const k = 0.025 + tC * 1e-5
  return row(tC, { density: rho, specificHeat: cp, dynamicViscosity: mu, conductivity: k, kinematicViscosity: mu / rho, thermalDiffusivity: k / (rho * cp), prandtl: (mu * cp) / k })
}

describe('conferência de tabela de propriedades de transporte', () => {
  it('tabela coerente não gera aviso', () => {
    expect(checkTransportTable([coherent(0), coherent(50), coherent(100)])).toEqual([])
  })

  it('ν digitado errado é acusado na linha certa', () => {
    const rows = [coherent(0), coherent(50), coherent(100)]
    rows[1].values.kinematicViscosity! *= 1.1
    const msgs = checkTransportTable(rows)
    expect(msgs).toHaveLength(1)
    expect(msgs[0]).toMatch(/^T = 50 °C: ν/)
  })

  it('erro em k aparece em α e em Pr', () => {
    const rows = [coherent(0), coherent(50)]
    rows[0].values.conductivity! *= 0.9
    const msgs = checkTransportTable(rows).join(' ')
    expect(msgs).toContain('α')
    expect(msgs).toContain('Pr')
  })

  it('linha sem os dados necessários não é conferida', () => {
    expect(checkTransportTable([row(0, { density: 1, prandtl: 0.7 })])).toEqual([])
  })

  it('diferença dentro do arredondamento (2 %) é aceita', () => {
    const r = coherent(20)
    r.values.prandtl! *= 1.015
    expect(checkTransportTable([r])).toEqual([])
  })
})
