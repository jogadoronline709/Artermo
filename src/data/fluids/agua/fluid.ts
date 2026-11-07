/**
 * Água a 1 atm.
 *
 * As tabelas (`kreith.csv`, `incropera.csv`, `cengel.csv`) foram transcritas das
 * imagens fornecidas pelo dono do projeto, com os números como impressos.
 * São tabelas de líquido saturado: entre 0 e 100 °C são tratadas como água a
 * 1 atm (por isso `pressureKPa: 101.325`); acima de 100 °C a pressão é a de
 * saturação, e a interface avisa. As unidades de cada coluna estão em `inputUnits`.
 */
import type { FluidDef } from '../../../domain/fluids'

const SAT = {
  pressureKPa: 101.325,
  pressureUnit: 'atm' as const,
}
const SAT_NOTE = 'Líquido saturado: de 0 a 100 °C tratado como água a 1 atm; acima de 100 °C, valores na pressão de saturação.'
const blank = { authors: '', title: '', edition: '', year: '' }

export const AGUA: FluidDef = {
  id: 'agua',
  name: 'Água',
  condition: '1 atm',
  category: 'liquido',
  aliases: ['agua', 'water', 'h2o', 'agua liquida'],
  validRange: {
    minC: 0,
    maxC: 100,
    message:
      'Fora de 0 a 100 °C, a água a 1 atm não é líquida (gelo abaixo de 0 °C, vapor acima de 100 °C). Acima de 100 °C, valores de uma tabela de líquido saturado correspondem à pressão de saturação, maior que 1 atm.',
  },
  references: [
    {
      id: 'kreith',
      shortName: 'Kreith',
      ...blank,
      pageTable: 'Tabela 13 — Água na pressão de saturação',
      ...SAT,
      originalTempUnit: 'C',
      inputUnits: {
        density: 'kg/m3',
        specificHeat: 'J/(kg.K)',
        dynamicViscosity: 'uPa.s',
        kinematicViscosity: '1e-6 m2/s',
        conductivity: 'W/(m.K)',
        thermalDiffusivity: '1e-6 m2/s',
      },
      notes: `${SAT_NOTE} A imagem fornecida termina em 280 °C (a linha de 300 °C está cortada). Colunas β e gβ/ν² não foram incluídas. Em 75 °C, ν (0,366) e Pr (2,23) impressos ficam cerca de 5 % abaixo de μ/ρ e μ·cp/k; mantidos como impressos.`,
    },
    {
      id: 'incropera',
      shortName: 'Incropera',
      ...blank,
      pageTable: 'Tabela A.6 — Propriedades termofísicas da água saturada',
      ...SAT,
      originalTempUnit: 'K',
      inputUnits: {
        density: 'kg/m3',
        specificHeat: 'kJ/(kg.K)',
        dynamicViscosity: '1e-7 Pa.s',
        conductivity: '1e-3 W/(m.K)',
      },
      notes: `${SAT_NOTE} ρ = 1/v_f. De 273,15 a 373,15 K, valores da tabela preparada pelo dono; de 375 a 645 K, da Tabela A.6 (a imagem da continuação não era legível). ν e α não são publicados nessa tabela: o app os calcula (ν = μ/ρ, α = k/(ρ·cp)).`,
    },
    {
      id: 'cengel',
      shortName: 'Çengel',
      ...blank,
      pageTable: 'Tabela A-9 — Propriedades da água saturada (líquido)',
      ...SAT,
      originalTempUnit: 'C',
      inputUnits: {
        density: 'kg/m3',
        specificHeat: 'J/(kg.K)',
        dynamicViscosity: 'Pa.s',
        conductivity: 'W/(m.K)',
      },
      notes: `${SAT_NOTE} Só as colunas do líquido. ν e α não são publicados nessa tabela: o app os calcula (ν = μ/ρ, α = k/(ρ·cp)).`,
    },
  ],
}
