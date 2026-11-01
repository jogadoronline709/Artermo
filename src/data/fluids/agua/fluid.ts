/**
 * Água a 1 atm.
 *
 * Para adicionar a tabela de um livro: crie `<ref>.csv` nesta pasta (cabeçalhos de
 * `CSV_HEADERS` em `src/data/csv.ts`), preencha os metadados abaixo conforme o
 * exemplar e rode `npm test`. Nenhum valor é inventado ou completado.
 *
 * Se a tabela do livro for de líquido saturado, registre `pressureKPa: 101.325`
 * e explique a aproximação em `notes` (entre 0 e 100 °C o líquido saturado é
 * tratado como água a 1 atm).
 */
import type { FluidDef, ReferenceDef } from '../../../domain/fluids'

function emptyRef(id: string, shortName: string): ReferenceDef {
  return {
    id,
    shortName,
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
  }
}

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
  references: [emptyRef('kreith', 'Kreith'), emptyRef('incropera', 'Incropera'), emptyRef('cengel', 'Çengel')],
}
