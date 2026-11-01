// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
import { describe, expect, it } from 'vitest'
import { getFluid } from '../data/fluids/registry'
import { querySource } from '../domain/query'
import { compareReportCsv, fluidRangeNotice, sourceReportCsv, sourceReportText, type RequestedTemp } from '../lib/report'

const agua = getFluid('agua')
const ar = getFluid('ar')
const src = agua.sources[0]
const at = (tC: number): RequestedTemp => ({ value: tC, unit: 'C', tC })
const q = (tC: number) => querySource([], tC, { allowExtrapolation: false })
const AVISO_AGUA = agua.def.validRange!.message

describe('relatórios exportados', () => {
  it('o alerta de faixa vale só fora da faixa válida do fluido', () => {
    expect(fluidRangeNotice('agua', 120)).toBe(AVISO_AGUA)
    expect(fluidRangeNotice('agua', 50)).toBe('')
    expect(fluidRangeNotice('ar', 120)).toBe('')
    expect(fluidRangeNotice('nao-existe', 120)).toBe('')
  })

  it('texto copiado diz o fluido e traz o alerta fora da faixa', () => {
    const fora = sourceReportText(src, q(120), at(120), 'published', 4)
    expect(fora).toContain('Fluido: Água (1 atm)')
    expect(fora).toContain(`AVISO: ${AVISO_AGUA}`)
    expect(sourceReportText(src, q(50), at(50), 'published', 4)).not.toContain('AVISO')
  })

  it('CSV de uma referência tem as linhas de fluido e de aviso', () => {
    const csv = sourceReportCsv(src, q(120), at(120), 'published')
    expect(csv).toContain('fluido;Água (1 atm)')
    expect(csv).toContain('aviso;')
    expect(sourceReportCsv(ar.sources[0], q(120), at(120), 'published')).not.toContain('aviso;')
  })

  it('CSV da comparação tem as linhas de fluido e de aviso de faixa', () => {
    const csv = compareReportCsv(at(120), agua.sources, [], 'Exigir todas', '')
    expect(csv).toContain('fluido;Água (1 atm)')
    expect(csv).toContain('aviso;')
  })
})
