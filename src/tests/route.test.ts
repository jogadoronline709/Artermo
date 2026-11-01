import { describe, expect, it } from 'vitest'
import { href, parseHash, type Route } from '../hooks/useRoute'

describe('rotas', () => {
  it('reconhece a lista e a página de um fluido', () => {
    expect(parseHash('#/fluidos')).toEqual({ page: 'fluidos' })
    expect(parseHash('#/fluidos/agua')).toEqual({ page: 'fluidos', fluidId: 'agua' })
    expect(parseHash('#/fluidos/agua/kreith')).toEqual({ page: 'fluidos', fluidId: 'agua', refId: 'kreith' })
  })

  it('links antigos da Biblioteca levam a Gases/Fluidos', () => {
    expect(parseHash('#/biblioteca')).toEqual({ page: 'fluidos' })
    expect(parseHash('#/biblioteca/kreith')).toEqual({ page: 'fluidos' })
  })

  it('gera o endereço de uma referência de um fluido', () => {
    expect(href({ page: 'fluidos', fluidId: 'agua', refId: 'cengel' })).toBe('#/fluidos/agua/cengel')
  })

  it.each<Route>([
    { page: 'consultar', tab: 'agua-kreith' },
    { page: 'comparar' },
    { page: 'fluidos', fluidId: 'agua', refId: 'kreith' },
    { page: 'config' },
  ])('ida e volta: %o', (r) => {
    expect(parseHash(href(r))).toEqual(r)
  })
})
