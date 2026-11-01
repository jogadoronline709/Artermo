// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
import { describe, expect, it } from 'vitest'
import { newSource } from '../data/defaults'
import type { DataRow } from '../domain/types'
import { NONE_SELECTED, selectedCompareIds, toggleCompareId } from '../lib/compareSelection'

const src = (id: string) => newSource({ id, shortName: id.toUpperCase() })
const row = (sourceId: string): DataRow => ({ id: `${sourceId}-0`, sourceId, temperatureC: 0, originalTemperature: { value: 0, unit: 'C' }, values: { density: 1 } })

const sources = [src('a'), src('b'), src('c')]
const withData = { a: [row('a')], b: [], c: [row('c')] }

describe('seleção de referências do Comparar', () => {
  it('sem seleção salva, usa as referências com dados', () => {
    expect(selectedCompareIds(undefined, sources, withData)).toEqual(['a', 'c'])
    expect(selectedCompareIds([], sources, withData)).toEqual(['a', 'c'])
  })

  it('sem seleção salva e sem dados, usa todas', () => {
    expect(selectedCompareIds(undefined, sources, {})).toEqual(['a', 'b', 'c'])
  })

  it('seleção salva é filtrada às referências do fluido', () => {
    expect(selectedCompareIds(['c', 'zz'], sources, withData)).toEqual(['c'])
  })

  it('sentinela de nenhuma selecionada resulta em lista vazia', () => {
    expect(selectedCompareIds([NONE_SELECTED], sources, withData)).toEqual([])
  })

  it('alternar adiciona, remove e usa o sentinela quando esvazia', () => {
    expect(toggleCompareId(['a'], 'b')).toEqual(['a', 'b'])
    expect(toggleCompareId(['a', 'b'], 'a')).toEqual(['b'])
    expect(toggleCompareId(['a'], 'a')).toEqual([NONE_SELECTED])
  })
})

describe('seleção salva que ficou obsoleta', () => {
  it('se nenhuma referência salva existe mais, volta ao padrão', () => {
    expect(selectedCompareIds(['zz', 'yy'], sources, withData)).toEqual(['a', 'c'])
  })
})
