/**
 * Ar.
 *
 * Para adicionar a tabela de um livro: crie `<ref>.csv` nesta pasta (cabeçalhos de
 * `CSV_HEADERS` em `src/data/csv.ts`), preencha os metadados abaixo conforme o
 * exemplar e rode `npm test`. Nenhum valor é inventado ou completado.
 * Declare a unidade de cada coluna (no cabeçalho do CSV, ex. "temperature (K)", ou em
 * originalTempUnit/inputUnits abaixo): coluna sem unidade declarada é erro.
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
    inputUnits: {},
    notes: '',
  }
}

export const AR: FluidDef = {
  id: 'ar',
  name: 'Ar',
  condition: '',
  category: 'gas',
  aliases: ['ar', 'air', 'ar atmosferico', 'ar seco'],
  references: [emptyRef('kreith', 'Kreith'), emptyRef('incropera', 'Incropera'), emptyRef('cengel', 'Çengel')],
}
