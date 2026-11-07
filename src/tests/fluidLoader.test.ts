// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import { describe, expect, it } from 'vitest'
import { groupCsvByFluid, loadFluid, sourceIdFor } from '../data/fluids/loader'
import { findFluid, FLUID_DEFS, FLUIDS, fluidOfSourceId, getFluid, ORPHAN_CSVS } from '../data/fluids/registry'
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
    inputUnits: { density: 'kg/m3' },
    notes: '',
    ...extra,
  }
}

function fluid(id: string, refs: ReferenceDef[]): FluidDef {
  return { id, name: `Fluido ${id}`, condition: '1 atm', category: 'liquido', aliases: [], references: refs }
}

const CSV_K = ['temperature,density,specific_heat', '273.15,1.5,1.2', '293.15,1.4,1.3'].join('\n')

describe('loadFluid', () => {
  const def = fluid('x', [ref('r1', { originalTempUnit: 'K', inputUnits: { density: 'kg/m3', specificHeat: 'kJ/(kg.K)' } }), ref('r2')])
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

describe('unidades das tabelas embutidas', () => {
  // Referência sem nenhuma unidade declarada.
  const bare = (csv: string) => {
    const r = ref('r', { originalTempUnit: undefined, inputUnits: {} })
    return loadFluid(fluid('u', [r]), { r: csv })
  }
  const errs = (l: ReturnType<typeof bare>) => (l.errors['u-r'] ?? []).join(' | ')

  it('unidade de cabeçalho não reconhecida é erro, não aviso', () => {
    const l = bare('temperature (C),dynamic_viscosity (10^-6 Pa.s)\n0,17.2')
    expect(l.rowsBySource['u-r']).toEqual([])
    expect(errs(l)).toContain('10^-6 Pa.s')
  })

  it('coluna não reconhecida é erro', () => {
    const l = bare('temperature (C),density (kg/m3),thermal_difusivity\n0,1,2')
    expect(errs(l)).toContain('thermal_difusivity')
    expect(l.rowsBySource['u-r']).toEqual([])
  })

  it('unidade não declarada em lugar nenhum é erro (temperatura e propriedade)', () => {
    const l = bare('temperature,density\n0,1')
    expect(errs(l)).toMatch(/temperatura/i)
    expect(errs(l)).toContain('ρ')
  })

  it('Pr não precisa de unidade', () => {
    const l = bare('temperature (C),prandtl\n0,0.7')
    expect(l.errors).toEqual({})
    expect(l.rowsBySource['u-r'][0].values.prandtl).toBe(0.7)
  })

  it('unidade do cabeçalho vira a unidade de exibição da referência', () => {
    const l = bare('temperature (K),dynamic_viscosity (1e-7 Pa.s)\n273.15,172')
    expect(l.errors).toEqual({})
    expect(l.sources[0].inputUnits.dynamicViscosity).toBe('1e-7 Pa.s')
    expect(l.rowsBySource['u-r'][0].values.dynamicViscosity).toBeCloseTo(1.72e-5, 18)
  })

  it('unidade por linha igual em toda a coluna vira a unidade de exibição', () => {
    const l = bare('temperature,temperature_unit,specific_heat,specific_heat_unit\n0,C,1.1,kJ/(kg.K)\n10,C,1.2,kJ/(kg.K)')
    expect(l.errors).toEqual({})
    expect(l.sources[0].inputUnits.specificHeat).toBe('kJ/(kg.K)')
  })

  it('unidades diferentes na mesma coluna são erro', () => {
    const l = bare('temperature (C),specific_heat,specific_heat_unit\n0,1.1,kJ/(kg.K)\n10,1200,J/(kg.K)')
    expect(errs(l)).toMatch(/unidades diferentes/i)
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

  it('lista Ar e Água (1 atm), nessa ordem, cada um com Kreith, Incropera e Çengel', () => {
    expect(FLUID_DEFS.map((f) => f.id)).toEqual(['ar', 'agua'])
    expect(findFluid('agua')?.def.condition).toBe('1 atm')
    for (const id of ['ar', 'agua']) expect(findFluid(id)?.def.references.map((r) => r.shortName)).toEqual(['Kreith', 'Incropera', 'Çengel'])
  })

  it('id ausente ou desconhecido cai no Ar', () => {
    expect(getFluid(undefined).def.id).toBe('ar')
    expect(getFluid('nao-existe').def.id).toBe('ar')
    expect(findFluid('nao-existe')).toBeUndefined()
  })
})

describe('fluido de uma referência', () => {
  it('descobre o fluido pelo id da fonte', () => {
    expect(fluidOfSourceId('agua-kreith')?.def.id).toBe('agua')
    expect(fluidOfSourceId('ar-cengel')?.def.id).toBe('ar')
    expect(fluidOfSourceId('nao-existe')).toBeUndefined()
  })
})

describe('conjunto de propriedades e pressão por fluido', () => {
  const r = ref('r', { inputUnits: {} })
  it('o fluido repassa conjunto e uso da pressão para as fontes', () => {
    const gas = loadFluid({ ...fluid('g', [r]), propertySet: 'gasIdeal', pressureApplies: false }, {})
    expect(gas.sources[0].propertySet).toBe('gasIdeal')
    expect(gas.sources[0].pressureApplies).toBe(false)
    const plain = loadFluid(fluid('p', [r]), {})
    expect(plain.sources[0].propertySet ?? 'transporte').toBe('transporte')
    expect(plain.sources[0].pressureApplies).not.toBe(false)
  })

  const gasFluid = () => ({ ...fluid('g', [r]), propertySet: 'gasIdeal' as const, pressureApplies: false })

  it('Pᵣ e vᵣ dispensam unidade; h sem unidade é erro', () => {
    const ok = loadFluid(gasFluid(), { r: 'temperature (K),relative_pressure,relative_volume\n300,1.5,500' })
    expect(ok.errors).toEqual({})
    const bad = loadFluid(gasFluid(), { r: 'temperature (K),enthalpy\n300,300' })
    expect(bad.errors['g-r'].join(' ')).toContain('Unidade de h')
  })

  it('coluna "Pr" em tabela de gás ideal é erro (seria lida como Prandtl)', () => {
    const l = loadFluid(gasFluid(), { r: 'temperature (K),Pr\n300,1.3860' })
    expect(l.rowsBySource['g-r']).toEqual([])
    const msg = l.errors['g-r'].join(' ')
    expect(msg).toContain('"Pr"')
    expect(msg).toContain('relative_pressure')
  })

  it('coluna de gás ideal em tabela de transporte é erro', () => {
    const l = loadFluid(fluid('t', [r]), { r: 'temperature (K),density (kg/m3),enthalpy (kJ/kg)\n300,1.2,300' })
    expect(l.errors['t-r'].join(' ')).toContain('"enthalpy (kJ/kg)"')
  })
})
