// Confere as tabelas embutidas de Ar e Água (Kreith, Incropera, Çengel).
// Este arquivo não repete números dos livros: lê as tabelas carregadas pelo app.
import { describe, expect, it } from 'vitest'
import { findFluid } from '../data/fluids/registry'
import { checkTransportTable } from '../lib/transportChecks'

const ar = findFluid('ar')!
const agua = findFluid('agua')!

/**
 * Tolerância por referência entre ν, α, Pr impressos e μ/ρ, k/(ρ·cp), μ·cp/k.
 * O Kreith imprime Pr com 2 algarismos, e α/Pr da própria tabela divergem
 * sistematicamente 2–5 % do calculado em todas as linhas: é do livro, não de digitação.
 */
const TOL: Record<string, number> = { 'ar-kreith': 0.05, 'agua-kreith': 0.05 }

/**
 * Pontos em que a tabela IMPRESSA diverge além da tolerância. Conferidos na
 * imagem ampliada e mantidos como impressos.
 */
const PRINTED: Record<string, string[]> = {
  'ar-incropera': ['T = 1026,85 °C: α'], // 1300 K: α = 238×10⁻⁶ (k/(ρ·cp) dá ≈ 257×10⁻⁶)
  'agua-kreith': ['T = 75 °C: ν', 'T = 75 °C: Pr'], // ν = 0,366 e Pr = 2,23 (μ/ρ ≈ 0,386; μ·cp/k ≈ 2,35)
  // Perto do ponto crítico (625, 630, 645 K) a Tabela A.6 dá cp com 2–3 algarismos.
  'agua-incropera': ['T = 351,85 °C: Pr', 'T = 356,85 °C: Pr', 'T = 371,85 °C: Pr'],
}

describe('tabelas embutidas de Ar e Água', () => {
  it('todas as referências carregam, sem erro, com as linhas transcritas', () => {
    const counts = (f: typeof ar) => f.sources.map((s) => f.rowsBySource[s.id].length)
    expect(ar.errors).toEqual({})
    expect(agua.errors).toEqual({})
    expect(counts(ar)).toEqual([11, 35, 41])
    expect(counts(agua)).toEqual([22, 54, 40])
  })

  it.each([...ar.sources, ...agua.sources].map((s) => [s.id]))('%s: ν, α e Pr impressos batem com μ, ρ, k e cp', (id) => {
    const fluid = id.startsWith('ar-') ? ar : agua
    const msgs = checkTransportTable(fluid.rowsBySource[id], TOL[id])
    const known = PRINTED[id] ?? []
    const isKnown = (m: string) => known.some((k) => m.startsWith(`${k} impresso`))
    expect(msgs.filter((m) => !isKnown(m))).toEqual([])
    // Se uma exceção deixar de aparecer, a tabela mudou: rever a lista acima.
    for (const k of known) expect(msgs.some((m) => m.startsWith(`${k} impresso`)), k).toBe(true)
  })

  it('o ar das três referências está a 1 atm, e a média não fica bloqueada por pressão', () => {
    for (const s of ar.sources) expect(s.pressureKPa).toBe(101.325)
  })
})
