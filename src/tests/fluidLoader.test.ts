// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import { groupCsvByFluid, loadFluid, sourceIdFor } from '../data/fluids/loader'
import { findFluid, FLUID_DEFS, FLUIDS, getFluid, ORPHAN_CSVS } from '../data/fluids/registry'
import { fluidDisplayName, type FluidDef, type ReferenceDef } from '../domain/fluids'

function ref(id: string, extra: Partial<ReferenceDef> = {}): ReferenceDef {
  return {
    id,
    shortName: id.toUpperCase(),
    authors: '',
    title: '',
    edition: '',
    year: '',
    pageTable: '',
    pressureKPa: null,
    pressureUnit: 'kPa',
    originalTempUnit: 'C',
    inputUnits: {},
    notes: '',
    ...extra,
  }
}

function fluid(id: string, refs: ReferenceDef[]): FluidDef {
  return { id, name: `Fluido ${id}`, condition: '1 atm', category: 'liquido', aliases: [], references: refs }
}

const CSV_K = ['temperature,density,specific_heat', '273.15,1.5,1.2', '293.15,1.4,1.3'].join('\n')

describe('loadFluid', () => {
  const def = fluid('x', [ref('r1', { originalTempUnit: 'K', inputUnits: { specificHeat: 'kJ/(kg.K)' } }), ref('r2')])
  const loaded = loadFluid(def, { r1: CSV_K })

  it('cria uma fonte por referência, com id <fluido>-<ref> e o nome exibido do fluido', () => {
    expect(loaded.sources.map((s) => s.id)).toEqual(['x-r1', 'x-r2'])
    expect(loaded.sources.map((s) => s.order)).toEqual([0, 1])
    for (const s of loaded.sources) {
      expect(s.fluidId).toBe('x')
      expect(s.fluid).toBe(fluidDisplayName(def))
    }
    expect(sourceIdFor('x', 'r1')).toBe('x-r1')
  })

  it('converte as linhas para °C e SI usando as unidades padrão da referência', () => {
    const rows = loaded.rowsBySource['x-r1']
    expect(rows.map((r) => r.temperatureC)).toEqual([0, 20])
    expect(rows[0].originalTemperature).toEqual({ value: 273.15, unit: 'K' })
    expect(rows[0].values.specificHeat).toBeCloseTo(1200, 9)
    expect(rows[1].values.density).toBe(1.4)
    expect(new Set(rows.map((r) => r.id)).size).toBe(rows.length)
    expect(rows.every((r) => r.sourceId === 'x-r1')).toBe(true)
  })

  it('referência sem CSV fica vazia e sem erro', () => {
    expect(loaded.rowsBySource['x-r2']).toEqual([])
    expect(loaded.errors).toEqual({})
  })

  it('CSV inválido gera erro só naquela referência e nenhuma linha', () => {
    const bad = loadFluid(def, { r1: 'temperature,density\n0,1.5\n20,abc', r2: 'temperature,density\n0,2' })
    expect(bad.rowsBySource['x-r1']).toEqual([])
    expect(bad.errors['x-r1'].join(' ')).toContain('Linha 3')
    expect(bad.errors['x-r2']).toBeUndefined()
    expect(bad.rowsBySource['x-r2']).toHaveLength(1)
  })

  it('fluidos diferentes com a mesma referência não se misturam', () => {
    const a = loadFluid(fluid('a', [ref('kreith')]), { kreith: 'temperature,density\n0,1' })
    const b = loadFluid(fluid('b', [ref('kreith')]), { kreith: 'temperature,density\n0,2' })
    expect(a.sources[0].id).not.toBe(b.sources[0].id)
    expect(a.rowsBySource['b-kreith']).toBeUndefined()
    expect(b.rowsBySource['b-kreith'][0].values.density).toBe(2)
  })
})

describe('groupCsvByFluid', () => {
  it('agrupa por pasta do fluido e separa caminhos fora do padrão', () => {
    const g = groupCsvByFluid({ './agua/kreith.csv': 'a', './x.csv': 'b' })
    expect(g.byFluid.agua.kreith).toBe('a')
    expect(g.malformed).toEqual(['./x.csv'])
  })
})

describe('registro de fluidos', () => {
  it('tem ids de fluido únicos e ids de referência únicos por fluido', () => {
    const ids = FLUID_DEFS.map((f) => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const f of FLUID_DEFS) {
      expect(f.references.length).toBeGreaterThan(0)
      const refs = f.references.map((r) => r.id)
      expect(new Set(refs).size).toBe(refs.length)
    }
  })

  it('todas as tabelas embutidas são válidas e nenhum CSV fica sem dono', () => {
    for (const f of FLUIDS) expect(f.errors, f.def.id).toEqual({})
    expect(ORPHAN_CSVS).toEqual([])
  })

  it('inclui Ar e Água (1 atm) com Kreith, Incropera e Çengel', () => {
    expect(FLUID_DEFS.map((f) => f.id)).toEqual(['ar', 'agua'])
    expect(findFluid('agua')?.def.condition).toBe('1 atm')
    for (const f of FLUID_DEFS) expect(f.references.map((r) => r.shortName)).toEqual(['Kreith', 'Incropera', 'Çengel'])
  })

  it('id ausente ou desconhecido cai no Ar', () => {
    expect(getFluid(undefined).def.id).toBe('ar')
    expect(getFluid('nao-existe').def.id).toBe('ar')
    expect(findFluid('nao-existe')).toBeUndefined()
  })
})
