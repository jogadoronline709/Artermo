/**
 * Ar.
 *
 * As tabelas (`kreith.csv`, `incropera.csv`, `cengel.csv`) foram transcritas das
 * imagens fornecidas pelo dono do projeto, com os números como impressos.
 * As unidades de cada coluna estão em `inputUnits` (o CSV traz só os números).
 * Autores, título, edição e ano ficam vazios até o dono informar.
 */
import type { FluidDef } from '../../../domain/fluids'

const ATM = { pressureKPa: 101.325, pressureUnit: 'atm' as const }
const blank = { authors: '', title: '', edition: '', year: '' }

export const AR: FluidDef = {
  id: 'ar',
  name: 'Ar',
  condition: '',
  category: 'gas',
  aliases: ['ar', 'air', 'ar atmosferico', 'ar seco'],
  references: [
    {
      id: 'kreith',
      shortName: 'Kreith',
      ...blank,
      pageTable: 'Tabela 27 — Ar seco à pressão atmosférica',
      ...ATM,
      originalTempUnit: 'C',
      inputUnits: {
        density: 'kg/m3',
        specificHeat: 'J/(kg.K)',
        dynamicViscosity: 'uPa.s',
        kinematicViscosity: '1e-6 m2/s',
        conductivity: 'W/(m.K)',
        thermalDiffusivity: '1e-6 m2/s',
      },
      notes: 'Colunas β e gβ/ν² da tabela original não foram incluídas.',
    },
    {
      id: 'incropera',
      shortName: 'Incropera',
      ...blank,
      pageTable: 'Tabela A.4 — Propriedades termofísicas de gases à pressão atmosférica (ar)',
      ...ATM,
      originalTempUnit: 'K',
      inputUnits: {
        density: 'kg/m3',
        specificHeat: 'kJ/(kg.K)',
        dynamicViscosity: '1e-7 Pa.s',
        kinematicViscosity: '1e-6 m2/s',
        conductivity: '1e-3 W/(m.K)',
        thermalDiffusivity: '1e-6 m2/s',
      },
      notes: 'Inclui a continuação da tabela (1700 K a 3000 K). Em 1300 K, o α impresso (238×10⁻⁶ m²/s) é cerca de 8 % menor que k/(ρ·cp); mantido como impresso.',
    },
    {
      id: 'cengel',
      shortName: 'Çengel',
      ...blank,
      pageTable: 'Tabela A-15 — Propriedades do ar a 1 atm de pressão',
      ...ATM,
      originalTempUnit: 'C',
      inputUnits: {
        density: 'kg/m3',
        specificHeat: 'J/(kg.K)',
        dynamicViscosity: 'Pa.s',
        kinematicViscosity: 'm2/s',
        conductivity: 'W/(m.K)',
        thermalDiffusivity: 'm2/s',
      },
      notes: '',
    },
  ],
}
