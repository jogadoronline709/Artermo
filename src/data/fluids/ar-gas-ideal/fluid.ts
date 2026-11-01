/**
 * Ar como gás ideal (h, u, s°, pressão relativa, volume relativo).
 *
 * Tabelas deste fluido usam o conjunto de propriedades 'gasIdeal'. A pressão de
 * referência não se aplica: h e u de gás ideal dependem só de T, e s° é tabelada
 * na pressão padrão. Declare a unidade de cada coluna no cabeçalho do CSV.
 * Pᵣ (pressão relativa) e vᵣ (volume relativo) são adimensionais.
 */
import type { FluidDef } from '../../../domain/fluids'

export const AR_GAS_IDEAL: FluidDef = {
  id: 'ar-gas-ideal',
  name: 'Ar',
  condition: 'gás ideal',
  category: 'gas',
  aliases: ['ar', 'air', 'gas ideal', 'ideal gas', 'a-17', 'a17'],
  propertySet: 'gasIdeal',
  pressureApplies: false,
  references: [
    {
      id: 'cengel',
      shortName: 'Çengel',
      authors: '',
      title: '',
      edition: '',
      year: '',
      pageTable: 'Tabela A-17',
      pressureKPa: null,
      pressureUnit: 'kPa',
      inputUnits: {},
      notes:
        'Propriedades de gás ideal do ar. A tabela impressa traz valores fora das relações de gás ideal em 550 K (h), 630 K e 820 K (Pᵣ), 1040 K e 1800 K (vᵣ); foram mantidos como impressos. Confira esses pontos antes de usar.',
    },
  ],
}
