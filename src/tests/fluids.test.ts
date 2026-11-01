// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import { fluidDisplayName, rangeWarning, searchFluids, type FluidDef } from '../domain/fluids'

const AGUA: FluidDef = {
  id: 'agua',
  name: 'Água',
  condition: '1 atm',
  category: 'liquido',
  aliases: ['agua', 'water', 'h2o'],
  validRange: { minC: 0, maxC: 100, message: 'FORA' },
  references: [],
}

const AR: FluidDef = {
  id: 'ar',
  name: 'Ar',
  condition: '',
  category: 'gas',
  aliases: ['air'],
  references: [],
}

const items = [{ def: AR }, { def: AGUA }]
const ids = (q: string) => searchFluids(items, q).map((i) => i.def.id)

describe('nome exibido do fluido', () => {
  it('inclui a condição entre parênteses quando existe', () => {
    expect(fluidDisplayName(AGUA)).toBe('Água (1 atm)')
    expect(fluidDisplayName(AR)).toBe('Ar')
  })
})

describe('busca de fluidos', () => {
  it.each(['agua', 'ÁGUA', '  Água  ', 'ag', 'water', 'H₂O', 'h2o'])('"%s" encontra só a água', (q) => {
    expect(ids(q)).toEqual(['agua'])
  })

  it('"ar" encontra o ar', () => {
    expect(ids('ar')).toContain('ar')
  })

  it('consulta vazia ou só espaços devolve todos, na ordem original', () => {
    expect(ids('')).toEqual(['ar', 'agua'])
    expect(ids('   ')).toEqual(['ar', 'agua'])
  })

  it('consulta sem correspondência devolve lista vazia', () => {
    expect(ids('xyz')).toEqual([])
  })
})

describe('faixa válida', () => {
  it('não alerta dentro da faixa, incluindo os limites', () => {
    expect(rangeWarning(AGUA, 0)).toBeNull()
    expect(rangeWarning(AGUA, 100)).toBeNull()
    expect(rangeWarning(AGUA, 50)).toBeNull()
  })

  it('alerta fora da faixa', () => {
    expect(rangeWarning(AGUA, -0.01)).toBe('FORA')
    expect(rangeWarning(AGUA, 100.01)).toBe('FORA')
  })

  it('fluido sem faixa nunca alerta', () => {
    expect(rangeWarning(AR, 5000)).toBeNull()
  })
})

describe('busca por palavras e categoria', () => {
  const items2 = [{ def: { ...AR, category: 'gas' as const } }, { def: AGUA }]
  const ids2 = (q: string) => searchFluids(items2, q).map((i) => i.def.id)

  it.each(['agua 1 atm', 'Água (1 atm)', 'atm agua'])('"%s" encontra a água', (q) => {
    expect(ids2(q)).toEqual(['agua'])
  })

  it('a categoria também é pesquisável', () => {
    expect(ids2('gás')).toEqual(['ar'])
    expect(ids2('liquido')).toEqual(['agua'])
  })

  it('palavra que não existe em nenhum termo não encontra nada', () => {
    expect(ids2('agua xyz')).toEqual([])
  })
})
