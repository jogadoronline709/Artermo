// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
import { describe, expect, it } from 'vitest'
import { newSource } from '../data/defaults'
import { getFluid } from '../data/fluids/registry'
import { querySource } from '../domain/query'
import { compareReportCsv, fluidRangeNotice, missingTableLabel, pressureText, sourceReportCsv, sourceReportText, type RequestedTemp } from '../lib/report'

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

describe('textos sem "cadastrado"', () => {
  it('pressão ausente aparece como não informada', () => {
    expect(pressureText(src)).toBe('não informada')
    expect(sourceReportText(src, q(50), at(50), 'published', 4)).toContain('(referência sem metadados)')
  })

  it('tabela com erro e tabela vazia têm rótulos diferentes', () => {
    expect(missingTableLabel(['Linha 2 — erro'])).toBe('Tabela com erro')
    expect(missingTableLabel(undefined)).toBe('Tabela vazia')
    expect(missingTableLabel([])).toBe('Tabela vazia')
  })
})

describe('relatórios de gás ideal', () => {
  const gas = newSource({ id: 'g', shortName: 'G', fluidId: 'x', fluid: 'Ar (gás ideal)', propertySet: 'gasIdeal', pressureApplies: false })
  it('sem linha de pressão e só com propriedades do conjunto', () => {
    const txt = sourceReportText(gas, q(25), at(25), 'published', 4)
    expect(txt).not.toContain('Pressão de referência')
    expect(txt).toContain('h:')
    expect(txt).not.toContain('ρ')
    const csv = sourceReportCsv(gas, q(25), at(25), 'published')
    expect(csv).not.toContain('pressao;')
    expect(csv).toContain('Entalpia')
    expect(csv).not.toContain('Massa específica')
  })

  it('fontes de transporte mantêm a linha de pressão', () => {
    expect(sourceReportText(src, q(50), at(50), 'published', 4)).toContain('Pressão de referência')
  })

  it('CSV da comparação só tem linhas do conjunto', () => {
    const csv = compareReportCsv(at(25), [gas], [], 'Exigir todas', '')
    expect(csv).toContain('fluido;Ar (gás ideal)')
  })
})

describe('observações da referência nos relatórios', () => {
  const noted = newSource({ id: 'n', shortName: 'N', fluidId: 'x', fluid: 'X', propertySet: 'gasIdeal', pressureApplies: false, notes: 'Valor impresso suspeito em 550 K.' })
  it('texto copiado e CSV levam as observações', () => {
    expect(sourceReportText(noted, q(25), at(25), 'published', 4)).toContain('Observações: Valor impresso suspeito em 550 K.')
    expect(sourceReportCsv(noted, q(25), at(25), 'published')).toContain('observacoes;Valor impresso suspeito em 550 K.')
  })
  it('sem observações, nenhuma linha extra', () => {
    expect(sourceReportText(src, q(50), at(50), 'published', 4)).not.toContain('Observações')
  })
})
