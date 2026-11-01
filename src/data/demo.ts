/**
 * DADOS SIMULADOS — NÃO USAR EM CÁLCULOS REAIS.
 *
 * Números redondos e fictícios, gerados por fórmulas lineares simples,
 * apenas para experimentar a interface. Não correspondem a nenhum livro
 * nem a propriedades reais do ar. Só são criados se o usuário pedir em
 * Configurações e ficam marcados como SIMULADOS em toda a interface.
 */
import type { DataRow, Source } from '../domain/types'
import { newSource, uid } from './defaults'

export const DEMO_PREFIX = 'demo-'

interface DemoSpec {
  id: string
  name: string
  temps: number[]
  /** Pequeno deslocamento para as fontes fictícias divergirem entre si. */
  bias: number
  publishDerived: boolean
}

const SPECS: DemoSpec[] = [
  { id: `${DEMO_PREFIX}a`, name: 'Demo A (SIMULADO)', temps: [0, 20, 40, 60, 80, 100], bias: 0, publishDerived: true },
  { id: `${DEMO_PREFIX}b`, name: 'Demo B (SIMULADO)', temps: [0, 25, 50, 75, 100], bias: 0.01, publishDerived: false },
  { id: `${DEMO_PREFIX}c`, name: 'Demo C (SIMULADO)', temps: [10, 30, 50, 70, 90], bias: -0.01, publishDerived: true },
]

export function buildDemoData(startOrder: number): { sources: Source[]; rows: DataRow[] } {
  const sources: Source[] = []
  const rows: DataRow[] = []
  SPECS.forEach((spec, i) => {
    sources.push(
      newSource({
        id: spec.id,
        shortName: spec.name,
        title: 'SIMULADOS — NÃO USAR EM CÁLCULOS REAIS',
        notes: 'Tabela fictícia gerada pelo ArTermo apenas para demonstrar a interface. Exclua quando não precisar mais.',
        pressureKPa: 100,
        pressureUnit: 'kPa',
        isSimulated: true,
        order: startOrder + i,
      }),
    )
    for (const t of spec.temps) {
      const f = 1 + spec.bias
      // Fórmulas lineares fictícias e redondas.
      const density = (1.3 - 0.004 * t) * f
      const specificHeat = (1000 + 0.2 * t) * f
      const conductivity = (0.024 + 0.00007 * t) * f
      const dynamicViscosity = (1.7e-5 + 5e-8 * t) * f
      const values: DataRow['values'] = { density, specificHeat, conductivity, dynamicViscosity }
      if (spec.publishDerived) {
        // "Publicados" fictícios, levemente arredondados, para exibir a diferença calculado × publicado.
        values.kinematicViscosity = Number((dynamicViscosity / density).toPrecision(3))
        values.thermalDiffusivity = Number((conductivity / (density * specificHeat)).toPrecision(3))
        values.prandtl = Number(((dynamicViscosity * specificHeat) / conductivity).toPrecision(3))
      }
      rows.push({ id: uid(), sourceId: spec.id, temperatureC: t, originalTemperature: { value: t, unit: 'C' }, values })
    }
  })
  return { sources, rows }
}
