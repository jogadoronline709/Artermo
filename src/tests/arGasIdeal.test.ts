// Confere a Tabela A-17 embutida (Ar como gás ideal) por relações físicas.
// Este arquivo não repete números do livro: lê a tabela carregada pelo app.
import { describe, expect, it } from 'vitest'
import { FLUIDS, findFluid } from '../data/fluids/registry'
import { searchFluids } from '../domain/fluids'
import { checkIdealGasTable } from '../lib/idealGasChecks'

const fluid = findFluid('ar-gas-ideal')!
const rows = fluid.rowsBySource['ar-gas-ideal-cengel']

describe('Ar (gás ideal) — Tabela A-17 embutida', () => {
  it('carrega sem erro, de 200 K a 2.250 K', () => {
    expect(fluid.errors).toEqual({})
    expect(rows.length).toBeGreaterThan(100)
    expect(rows[0].originalTemperature).toEqual({ value: 200, unit: 'K' })
    expect(rows[rows.length - 1].originalTemperature).toEqual({ value: 2250, unit: 'K' })
  })

  /**
   * Valores que a tabela IMPRESSA traz fora das relações de gás ideal. Foram
   * conferidos na imagem ampliada e mantidos como impressos (não se corrige o
   * livro). Entre parênteses, o valor que as relações indicam. 640 K e 840 K só
   * aparecem porque Δs° compara com a linha anterior (630 K e 820 K).
   */
  const PRINTED_INCONSISTENCIES: Record<number, string> = {
    550: 'h = 555,74 (h − u = R·T indica ≈ 554,7)',
    630: 'Pᵣ = 19,84 (≈ 19,48)',
    640: 'consequência de Pᵣ em 630 K',
    820: 'Pᵣ = 52,59 (≈ 52,49)',
    840: 'consequência de Pᵣ em 820 K',
    1040: 'vᵣ = 23,29 (≈ 22,39)',
    1800: 'vᵣ = 3,994 (≈ 3,944)',
  }
  const isKnown = (msg: string) => Object.keys(PRINTED_INCONSISTENCIES).some((t) => msg.startsWith(`T = ${t} K:`))

  it('é coerente com h − u = R·T, vᵣ·Pᵣ/T constante e Δs° = R·ln(Pᵣ₂/Pᵣ₁), fora as inconsistências impressas', () => {
    const msgs = checkIdealGasTable(rows)
    expect(msgs.filter((m) => !isKnown(m))).toEqual([])
    // Se alguma deixar de aparecer, a tabela embutida mudou: rever esta lista.
    for (const t of Object.keys(PRINTED_INCONSISTENCIES)) expect(msgs.some((m) => m.startsWith(`T = ${t} K:`)), `T = ${t} K`).toBe(true)
  })

  it('é encontrado pela busca', () => {
    const ids = (q: string) => searchFluids(FLUIDS, q).map((f) => f.def.id)
    expect(ids('ar')).toEqual(['ar', 'ar-gas-ideal'])
    expect(ids('gas ideal')).toEqual(['ar-gas-ideal'])
    expect(ids('a-17')).toEqual(['ar-gas-ideal'])
  })
})
