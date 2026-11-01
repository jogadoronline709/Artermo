// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE,
// gerados pelas relações de gás ideal. Nenhum valor foi retirado de livros.
import { describe, expect, it } from 'vitest'
import type { DataRow } from '../domain/types'
import { checkIdealGasTable } from '../lib/idealGasChecks'

const R = 287 // J/(kg·K)
const CP = 1000 // J/(kg·K), constante só para gerar a tabela sintética

/** Tabela coerente: h = cp·T, u = h − R·T, s° = cp·ln(T/200), Pᵣ = exp(s°/R), vᵣ = 2,87·T/Pᵣ. */
function synthetic(): DataRow[] {
  const rows: DataRow[] = []
  for (let T = 200; T <= 400; T += 10) {
    const s = CP * Math.log(T / 200)
    const pr = Math.exp(s / R)
    rows.push({
      id: String(T),
      sourceId: 'teste',
      temperatureC: T - 273.15,
      originalTemperature: { value: T, unit: 'K' },
      values: { enthalpy: CP * T, internalEnergy: CP * T - R * T, entropyStd: s, relativePressure: pr, relativeVolume: (2.87 * T) / pr },
    })
  }
  return rows
}

describe('conferência de tabela de gás ideal', () => {
  it('tabela coerente não gera aviso', () => {
    expect(checkIdealGasTable(synthetic())).toEqual([])
  })

  it('um dígito trocado em u é acusado na linha certa', () => {
    const rows = synthetic()
    const r = rows.find((x) => x.originalTemperature.value === 300)!
    r.values.internalEnergy! += 9000 // como digitar 223,0 no lugar de 214,0 kJ/kg
    const msgs = checkIdealGasTable(rows)
    expect(msgs.length).toBeGreaterThan(0)
    expect(msgs[0]).toContain('T = 300 K')
  })

  it('vᵣ crescendo é acusado', () => {
    const rows = synthetic()
    const r = rows.find((x) => x.originalTemperature.value === 250)!
    r.values.relativeVolume! *= 1.5
    expect(checkIdealGasTable(rows).join(' ')).toContain('T = 250 K')
  })

  it('erro em Pᵣ quebra a relação com s° e com vᵣ', () => {
    const rows = synthetic()
    const r = rows.find((x) => x.originalTemperature.value === 350)!
    r.values.relativePressure! *= 1.01
    expect(checkIdealGasTable(rows).join(' ')).toContain('T = 350 K')
  })

  it('temperatura repetida e célula vazia são acusadas', () => {
    const rows = synthetic()
    rows[3] = { ...rows[3], temperatureC: rows[2].temperatureC, originalTemperature: rows[2].originalTemperature }
    delete rows[5].values.entropyStd
    const msgs = checkIdealGasTable(rows).join(' ')
    expect(msgs).toMatch(/crescente/i)
    expect(msgs).toMatch(/vazi/i)
  })
})
