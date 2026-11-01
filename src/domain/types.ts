/**
 * Tipos centrais do domínio do ArTermo.
 *
 * Convenções:
 * - Toda temperatura é armazenada internamente em °C (`temperatureC`).
 * - Toda propriedade é armazenada internamente na unidade canônica SI
 *   (ver `PROPERTY_DEFS` em `units.ts`).
 * - Valor ausente é `undefined` — nunca zero.
 */

export type TempUnit = 'C' | 'K' | 'F'

export type PressureUnit = 'kPa' | 'Pa' | 'MPa' | 'bar' | 'atm'

/** Propriedades suportadas, sempre em unidade canônica quando armazenadas. */
export type PropertyKey =
  | 'density'
  | 'specificHeat'
  | 'conductivity'
  | 'dynamicViscosity'
  | 'kinematicViscosity'
  | 'thermalDiffusivity'
  | 'prandtl'
  // Gás ideal (ex.: Çengel, Tabela A-17)
  | 'enthalpy'
  | 'internalEnergy'
  | 'entropyStd'
  | 'relativePressure'
  | 'relativeVolume'

/**
 * Conjunto de propriedades de uma tabela: transporte (ρ, cp, k, μ, ν, α, Pr) ou
 * gás ideal (h, u, s°, Pᵣ, vᵣ).
 */
export type PropertySetId = 'transporte' | 'gasIdeal'

/** Propriedades que podem ser publicadas na tabela e também calculadas pelo app. */
export type DerivedKey = 'kinematicViscosity' | 'thermalDiffusivity' | 'prandtl'

export type PropertyValues = Partial<Record<PropertyKey, number>>

/** Unidade de entrada escolhida por propriedade (id de unidade de `PROPERTY_DEFS`). */
export type PropertyUnitPrefs = Partial<Record<PropertyKey, string>>

export interface Source {
  id: string
  /** Nome curto exibido nas abas e colunas (ex.: "Kreith"). */
  shortName: string
  authors: string
  title: string
  edition: string
  year: string
  /** Página e/ou número da tabela, como o usuário quiser registrar. */
  pageTable: string
  /** Id do fluido no registro (ex.: "agua"). */
  fluidId: string
  /** Nome exibido do fluido da tabela (ex.: "Água (1 atm)"). */
  fluid: string
  /** Pressão de referência em kPa (canônica). `null` = não informada. */
  pressureKPa: number | null
  /** Conjunto de propriedades da tabela (ausente = 'transporte'). */
  propertySet?: PropertySetId
  /** false quando a pressão de referência não se aplica (gás ideal). Ausente = true. */
  pressureApplies?: boolean
  /** Unidade em que o usuário informou a pressão (apenas para exibição). */
  pressureUnit: PressureUnit
  /** Unidade de temperatura usada no livro (padrão para digitação e CSV). */
  originalTempUnit: TempUnit
  /** Unidades em que o livro publica cada propriedade (padrão para digitação e CSV). */
  inputUnits: PropertyUnitPrefs
  notes: string
  order: number
  createdAt: string
  updatedAt: string
}

export interface DataRow {
  id: string
  sourceId: string
  /** Temperatura normalizada em °C. */
  temperatureC: number
  /** Temperatura exatamente como publicada (para exibição/conferência). */
  originalTemperature: { value: number; unit: TempUnit }
  /** Valores em unidade canônica. Ausente = sem dado. */
  values: PropertyValues
}

/** Ponto (T, y) de uma propriedade em uma fonte, já em °C e unidade canônica. */
export interface Point {
  t: number
  y: number
}
