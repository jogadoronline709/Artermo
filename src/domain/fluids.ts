/**
 * Fluidos e suas referências embutidas.
 *
 * Cada fluido (Ar, Água a 1 atm…) tem uma lista de referências bibliográficas;
 * as tabelas vêm embutidas no app e são somente leitura.
 */
import type { PressureUnit, PropertyUnitPrefs, TempUnit } from './types'

export type FluidCategory = 'gas' | 'liquido'

/** Metadados de uma tabela de referência (um livro) para um fluido. */
export interface ReferenceDef {
  /** Único dentro do fluido, ex.: 'kreith'. Também é o nome do arquivo CSV. */
  id: string
  shortName: string
  authors: string
  title: string
  edition: string
  year: string
  pageTable: string
  pressureKPa: number | null
  pressureUnit: PressureUnit
  /**
   * Unidade da temperatura no CSV, quando não vem no cabeçalho nem na coluna
   * `temperature_unit`. Ausente e não declarada no CSV = erro de carga.
   */
  originalTempUnit?: TempUnit
  /**
   * Unidade de cada coluna do CSV, quando não vem no cabeçalho nem na coluna
   * `*_unit`. Coluna sem unidade em lugar nenhum = erro de carga (exceto Pr).
   */
  inputUnits: PropertyUnitPrefs
  notes: string
}

export interface FluidDef {
  /** Estável: usado em URL, configurações e nome da pasta de dados. */
  id: string
  name: string
  /** Condição da tabela, ex.: '1 atm'. Vazio quando não se aplica. */
  condition: string
  category: FluidCategory
  /** Termos extras para a busca, ex.: 'water', 'h2o'. */
  aliases: string[]
  /** Faixa em que a condição do fluido vale; fora dela a tela mostra `message`. */
  validRange?: { minC?: number; maxC?: number; message: string }
  references: ReferenceDef[]
}

export function fluidDisplayName(def: Pick<FluidDef, 'name' | 'condition'>): string {
  return def.condition ? `${def.name} (${def.condition})` : def.name
}

export function categoryLabel(c: FluidCategory): string {
  return c === 'gas' ? 'Gás' : 'Líquido'
}

const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉'

/** Minúsculas, sem acentos nem pontuação, dígitos subscritos viram normais, espaços colapsados. */
export function normalizeSearch(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[₀-₉]/g, (d) => String(SUBSCRIPT_DIGITS.indexOf(d)))
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Filtra fluidos em que cada palavra da consulta aparece no nome, na condição,
 * na categoria ou nos apelidos. Mantém a ordem.
 */
export function searchFluids<T extends { def: FluidDef }>(items: T[], query: string): T[] {
  const words = normalizeSearch(query).split(' ').filter(Boolean)
  if (!words.length) return items
  return items.filter(({ def }) => {
    const hay = normalizeSearch([def.name, def.condition, categoryLabel(def.category), ...def.aliases].join(' '))
    return words.every((w) => hay.includes(w))
  })
}

/** Mensagem de alerta quando `tC` sai da faixa válida do fluido; `null` dentro dela. */
export function rangeWarning(def: FluidDef, tC: number): string | null {
  const r = def.validRange
  if (!r) return null
  if (r.minC != null && tC < r.minC) return r.message
  if (r.maxC != null && tC > r.maxC) return r.message
  return null
}
