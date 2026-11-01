import type { PressureUnit, PropertyKey, TempUnit } from './types'

/* ------------------------------------------------------------------ */
/* Temperatura                                                         */
/* ------------------------------------------------------------------ */

export const TEMP_UNITS: { id: TempUnit; label: string }[] = [
  { id: 'C', label: '°C' },
  { id: 'K', label: 'K' },
  { id: 'F', label: '°F' },
]

export function tempUnitLabel(u: TempUnit): string {
  return u === 'C' ? '°C' : u === 'K' ? 'K' : '°F'
}

/** Converte uma temperatura na unidade `unit` para °C. */
export function toCelsius(value: number, unit: TempUnit): number {
  switch (unit) {
    case 'C':
      return value
    case 'K':
      return value - 273.15
    case 'F':
      return ((value - 32) * 5) / 9
  }
}

/** Converte uma temperatura em °C para a unidade `unit`. */
export function fromCelsius(valueC: number, unit: TempUnit): number {
  switch (unit) {
    case 'C':
      return valueC
    case 'K':
      return valueC + 273.15
    case 'F':
      return (valueC * 9) / 5 + 32
  }
}

/** Zero absoluto em °C — temperaturas abaixo disso são inválidas. */
export const ABSOLUTE_ZERO_C = -273.15

export function parseTempUnit(raw: string | undefined | null): TempUnit | null {
  if (raw == null) return null
  const s = normalizeUnitText(raw)
  if (s === '') return null
  if (['c', '°c', 'ºc', 'degc', 'celsius', 'oc'].includes(s)) return 'C'
  if (['k', 'kelvin'].includes(s)) return 'K'
  if (['f', '°f', 'ºf', 'degf', 'fahrenheit', 'of'].includes(s)) return 'F'
  return null
}

/* ------------------------------------------------------------------ */
/* Pressão                                                             */
/* ------------------------------------------------------------------ */

export const PRESSURE_UNITS: { id: PressureUnit; label: string; toKPa: number }[] = [
  { id: 'kPa', label: 'kPa', toKPa: 1 },
  { id: 'Pa', label: 'Pa', toKPa: 1e-3 },
  { id: 'MPa', label: 'MPa', toKPa: 1e3 },
  { id: 'bar', label: 'bar', toKPa: 100 },
  { id: 'atm', label: 'atm', toKPa: 101.325 },
]

export function pressureToKPa(value: number, unit: PressureUnit): number {
  const u = PRESSURE_UNITS.find((p) => p.id === unit)
  if (!u) throw new Error(`Unidade de pressão desconhecida: ${unit}`)
  return value * u.toKPa
}

export function pressureFromKPa(valueKPa: number, unit: PressureUnit): number {
  const u = PRESSURE_UNITS.find((p) => p.id === unit)
  if (!u) throw new Error(`Unidade de pressão desconhecida: ${unit}`)
  return valueKPa / u.toKPa
}

/* ------------------------------------------------------------------ */
/* Propriedades                                                        */
/* ------------------------------------------------------------------ */

export interface UnitDef {
  /** Identificador estável (usado em CSV e preferências). */
  id: string
  /** Rótulo exibido na interface. */
  label: string
  /** Multiplicador: valor_canônico = valor_informado × factor. */
  factor: number
  /** Grafias aceitas na importação (comparadas após normalização). */
  aliases: string[]
  /** Explicação curta, exibida como dica. */
  hint?: string
}

export interface PropertyDef {
  key: PropertyKey
  label: string
  symbol: string
  /** Rótulo da unidade canônica. */
  canonical: string
  /** Nome da coluna no CSV. */
  csv: string
  /** Nome da coluna de unidade no CSV (se houver). */
  csvUnit?: string
  units: UnitDef[]
  /** Pode ser publicada e também calculada pelo app. */
  derived?: boolean
}

const scaledHint = (exp: number, unit: string) =>
  `Use quando o livro publica o valor multiplicado por 10^${exp} (ex.: cabeçalho "×10^${exp}"). O número digitado é multiplicado por 10^-${exp} para obter ${unit}.`

export const PROPERTY_DEFS: PropertyDef[] = [
  {
    key: 'density',
    label: 'Massa específica',
    symbol: 'ρ',
    canonical: 'kg/m³',
    csv: 'density',
    csvUnit: 'density_unit',
    units: [
      { id: 'kg/m3', label: 'kg/m³', factor: 1, aliases: ['kg/m3', 'kg/m^3', 'kgm-3', 'kg.m-3'] },
      { id: 'g/cm3', label: 'g/cm³', factor: 1000, aliases: ['g/cm3', 'g/cm^3', 'g/ml'] },
      { id: 'g/L', label: 'g/L', factor: 1, aliases: ['g/l'] },
    ],
  },
  {
    key: 'specificHeat',
    label: 'Calor específico (pressão constante)',
    symbol: 'cp',
    canonical: 'J/(kg·K)',
    csv: 'specific_heat',
    csvUnit: 'specific_heat_unit',
    units: [
      { id: 'J/(kg.K)', label: 'J/(kg·K)', factor: 1, aliases: ['j/(kg.k)', 'j/kg.k', 'j/kgk', 'j/(kgk)', 'j/kg/k', 'j/(kg.°c)', 'j/kg.°c'] },
      { id: 'kJ/(kg.K)', label: 'kJ/(kg·K)', factor: 1000, aliases: ['kj/(kg.k)', 'kj/kg.k', 'kj/kgk', 'kj/(kgk)', 'kj/kg/k', 'kj/(kg.°c)', 'kj/kg.°c'] },
    ],
  },
  {
    key: 'conductivity',
    label: 'Condutividade térmica',
    symbol: 'k',
    canonical: 'W/(m·K)',
    csv: 'conductivity',
    csvUnit: 'conductivity_unit',
    units: [
      { id: 'W/(m.K)', label: 'W/(m·K)', factor: 1, aliases: ['w/(m.k)', 'w/m.k', 'w/mk', 'w/(mk)', 'w/m/k', 'w/(m.°c)', 'w/m.°c'] },
      { id: 'mW/(m.K)', label: 'mW/(m·K)', factor: 1e-3, aliases: ['mw/(m.k)', 'mw/m.k', 'mw/mk', 'mw/(mk)'] },
      { id: '1e-3 W/(m.K)', label: '10⁻³ W/(m·K)', factor: 1e-3, aliases: ['1e-3w/(m.k)', 'e-3w/(m.k)', 'x1e-3w/(m.k)', '10^-3w/(m.k)', 'k*10^3', 'k.10^3', 'kx10^3'], hint: scaledHint(3, 'W/(m·K)') },
    ],
  },
  {
    key: 'dynamicViscosity',
    label: 'Viscosidade dinâmica',
    symbol: 'μ',
    canonical: 'Pa·s',
    csv: 'dynamic_viscosity',
    csvUnit: 'dynamic_viscosity_unit',
    units: [
      { id: 'Pa.s', label: 'Pa·s', factor: 1, aliases: ['pa.s', 'pas', 'pa*s', 'n.s/m2', 'ns/m2', 'n.s/m^2', 'kg/(m.s)', 'kg/m.s', 'kg/ms'] },
      { id: 'mPa.s', label: 'mPa·s', factor: 1e-3, aliases: ['mpa.s', 'mpas', 'mpa*s', 'cp', 'cpoise', 'centipoise'] },
      { id: 'uPa.s', label: 'μPa·s', factor: 1e-6, aliases: ['upa.s', 'upas', 'μpa.s', 'µpa.s', 'μpas', 'µpas', 'micropa.s'] },
      { id: '1e-5 Pa.s', label: '10⁻⁵ Pa·s', factor: 1e-5, aliases: ['1e-5pa.s', 'e-5pa.s', '10^-5pa.s', '10^-5kg/(m.s)', '1e-5kg/(m.s)'], hint: scaledHint(5, 'Pa·s') },
      { id: '1e-7 Pa.s', label: '10⁻⁷ Pa·s (N·s/m²)', factor: 1e-7, aliases: ['1e-7pa.s', 'e-7pa.s', '10^-7pa.s', '1e-7n.s/m2', '10^-7n.s/m2', 'mu*10^7', 'mu.10^7'], hint: scaledHint(7, 'Pa·s') },
    ],
  },
  {
    key: 'kinematicViscosity',
    label: 'Viscosidade cinemática',
    symbol: 'ν',
    canonical: 'm²/s',
    csv: 'kinematic_viscosity',
    csvUnit: 'kinematic_viscosity_unit',
    derived: true,
    units: [
      { id: 'm2/s', label: 'm²/s', factor: 1, aliases: ['m2/s', 'm^2/s', 'm²/s'] },
      { id: 'mm2/s', label: 'mm²/s (cSt)', factor: 1e-6, aliases: ['mm2/s', 'mm^2/s', 'mm²/s', 'cst', 'centistokes'] },
      { id: 'cm2/s', label: 'cm²/s (St)', factor: 1e-4, aliases: ['cm2/s', 'cm^2/s', 'cm²/s', 'st', 'stokes'] },
      { id: '1e-5 m2/s', label: '10⁻⁵ m²/s', factor: 1e-5, aliases: ['1e-5m2/s', 'e-5m2/s', '10^-5m2/s'], hint: scaledHint(5, 'm²/s') },
      { id: '1e-6 m2/s', label: '10⁻⁶ m²/s', factor: 1e-6, aliases: ['1e-6m2/s', 'e-6m2/s', '10^-6m2/s', 'nu*10^6', 'nu.10^6'], hint: scaledHint(6, 'm²/s') },
    ],
  },
  {
    key: 'thermalDiffusivity',
    label: 'Difusividade térmica',
    symbol: 'α',
    canonical: 'm²/s',
    csv: 'thermal_diffusivity',
    csvUnit: 'thermal_diffusivity_unit',
    derived: true,
    units: [
      { id: 'm2/s', label: 'm²/s', factor: 1, aliases: ['m2/s', 'm^2/s', 'm²/s'] },
      { id: 'mm2/s', label: 'mm²/s', factor: 1e-6, aliases: ['mm2/s', 'mm^2/s', 'mm²/s'] },
      { id: 'cm2/s', label: 'cm²/s', factor: 1e-4, aliases: ['cm2/s', 'cm^2/s', 'cm²/s'] },
      { id: '1e-5 m2/s', label: '10⁻⁵ m²/s', factor: 1e-5, aliases: ['1e-5m2/s', 'e-5m2/s', '10^-5m2/s'], hint: scaledHint(5, 'm²/s') },
      { id: '1e-6 m2/s', label: '10⁻⁶ m²/s', factor: 1e-6, aliases: ['1e-6m2/s', 'e-6m2/s', '10^-6m2/s', 'alpha*10^6', 'alpha.10^6'], hint: scaledHint(6, 'm²/s') },
    ],
  },
  {
    key: 'prandtl',
    label: 'Número de Prandtl',
    symbol: 'Pr',
    canonical: '—',
    csv: 'prandtl',
    derived: true,
    units: [{ id: '-', label: '— (adimensional)', factor: 1, aliases: ['-', '', 'adim', 'adimensional', '1', 'dimensionless'] }],
  },
]

export const PROPERTY_KEYS: PropertyKey[] = PROPERTY_DEFS.map((d) => d.key)

export const DERIVED_KEYS = ['kinematicViscosity', 'thermalDiffusivity', 'prandtl'] as const

export function getPropertyDef(key: PropertyKey): PropertyDef {
  const d = PROPERTY_DEFS.find((p) => p.key === key)
  if (!d) throw new Error(`Propriedade desconhecida: ${key}`)
  return d
}

export function getUnitDef(key: PropertyKey, unitId: string | undefined): UnitDef {
  const def = getPropertyDef(key)
  if (!unitId) return def.units[0]
  const u = def.units.find((x) => x.id === unitId)
  if (!u) throw new Error(`Unidade "${unitId}" não suportada para ${def.label}`)
  return u
}

/** Converte um valor na unidade `unitId` para a unidade canônica da propriedade. */
export function toCanonical(key: PropertyKey, value: number, unitId?: string): number {
  return value * getUnitDef(key, unitId).factor
}

/** Converte um valor canônico para a unidade `unitId`. */
export function fromCanonical(key: PropertyKey, valueCanonical: number, unitId?: string): number {
  return valueCanonical / getUnitDef(key, unitId).factor
}

/** Normaliza texto de unidade para comparação tolerante (espaços, ·, ², etc.). */
export function normalizeUnitText(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[·⋅∙•*]/g, '.')
    .replace(/²/g, '2')
    .replace(/³/g, '3')
    .replace(/µ/g, 'u')
    .replace(/μ/g, 'u')
    .replace(/×/g, 'x')
    .replace(/⁻/g, '-')
    .replace(/⁰/g, '0')
    .replace(/¹/g, '1')
    .replace(/⁴/g, '4')
    .replace(/⁵/g, '5')
    .replace(/⁶/g, '6')
    .replace(/⁷/g, '7')
    .replace(/º/g, '°')
    .replace(/\^/g, '')
    .replace(/^x(?=10)/, '')
}

/**
 * Identifica a unidade de uma propriedade a partir de um texto livre (ex.: CSV).
 * Retorna o id da unidade, ou `null` se não reconhecida.
 * Texto vazio retorna `undefined` (= usar padrão da fonte).
 */
export function parsePropertyUnit(key: PropertyKey, raw: string | undefined | null): string | null | undefined {
  if (raw == null) return undefined
  const s = normalizeUnitText(raw)
  if (s === '') return undefined
  const def = getPropertyDef(key)
  for (const u of def.units) {
    if (normalizeUnitText(u.id) === s || normalizeUnitText(u.label) === s) return u.id
    if (u.aliases.some((a) => normalizeUnitText(a) === s)) return u.id
  }
  return null
}
