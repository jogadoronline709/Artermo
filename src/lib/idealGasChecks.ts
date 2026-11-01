/**
 * Conferência de consistência de uma tabela de gás ideal do ar (h, u, s°, Pᵣ, vᵣ).
 * Serve para pegar erros de transcrição: cada relação abaixo vale para a tabela
 * impressa dentro do arredondamento de 4 a 5 algarismos.
 */
import { formatTemp } from '../domain/numbers'
import type { DataRow, PropertyKey } from '../domain/types'

/** Constante do ar, J/(kg·K). */
const R_AR = 287
/** Tolerância relativa para (h − u)/(R·T) e para vᵣ·Pᵣ/T. */
const REL_TOL = 0.003
/** Tolerância absoluta para Δs° − R·ln(Pᵣ₂/Pᵣ₁), J/(kg·K) (= 0,0005 kJ/(kg·K)). */
const S_TOL = 0.5

const KEYS: PropertyKey[] = ['enthalpy', 'internalEnergy', 'entropyStd', 'relativePressure', 'relativeVolume']
const SYMBOL: Partial<Record<PropertyKey, string>> = { enthalpy: 'h', internalEnergy: 'u', entropyStd: 's°', relativePressure: 'Pᵣ', relativeVolume: 'vᵣ' }

const kelvin = (r: DataRow) => r.temperatureC + 273.15
const at = (r: DataRow) => `T = ${formatTemp(Math.round(kelvin(r) * 100) / 100)} K`
const pct = (x: number) => `${(x * 100).toFixed(2).replace('.', ',')} %`

/** Devolve uma mensagem por violação, citando a temperatura da linha. Vazio = tabela coerente. */
export function checkIdealGasTable(rows: DataRow[]): string[] {
  const out: string[] = []
  const complete = (r: DataRow) => KEYS.every((k) => r.values[k] != null)

  rows.forEach((r) => {
    const missing = KEYS.filter((k) => r.values[k] == null)
    if (missing.length) out.push(`${at(r)}: célula vazia em ${missing.map((k) => SYMBOL[k]).join(', ')}.`)
  })
  const full = rows.filter(complete)

  // (h − u) = R·T
  for (const r of full) {
    const ratio = ((r.values.enthalpy as number) - (r.values.internalEnergy as number)) / (R_AR * kelvin(r))
    if (Math.abs(ratio - 1) > REL_TOL) out.push(`${at(r)}: (h − u)/(R·T) difere ${pct(ratio - 1)} de 1.`)
  }

  // vᵣ·Pᵣ/T constante
  const c = full.map((r) => ((r.values.relativeVolume as number) * (r.values.relativePressure as number)) / kelvin(r))
  const median = [...c].sort((a, b) => a - b)[Math.floor(c.length / 2)]
  full.forEach((r, i) => {
    if (Math.abs(c[i] / median - 1) > REL_TOL) out.push(`${at(r)}: vᵣ·Pᵣ/T difere ${pct(c[i] / median - 1)} do valor típico da tabela.`)
  })

  // Vizinhos: ordem, monotonicidade e Δs° = R·ln(Pᵣ₂/Pᵣ₁)
  for (let i = 1; i < rows.length; i++) {
    const a = rows[i - 1]
    const b = rows[i]
    if (!(b.temperatureC > a.temperatureC)) out.push(`${at(b)}: temperatura não é estritamente crescente.`)
    if (!complete(a) || !complete(b)) continue
    for (const k of ['enthalpy', 'internalEnergy', 'entropyStd', 'relativePressure'] as PropertyKey[]) {
      if (!((b.values[k] as number) > (a.values[k] as number))) out.push(`${at(b)}: ${SYMBOL[k]} deveria crescer em relação à linha anterior.`)
    }
    if (!((b.values.relativeVolume as number) < (a.values.relativeVolume as number))) out.push(`${at(b)}: vᵣ deveria diminuir em relação à linha anterior.`)
    const ds = (b.values.entropyStd as number) - (a.values.entropyStd as number)
    const expected = R_AR * Math.log((b.values.relativePressure as number) / (a.values.relativePressure as number))
    if (Math.abs(ds - expected) > S_TOL) {
      out.push(`${at(b)}: Δs° = ${(ds / 1000).toFixed(5)} kJ/(kg·K), mas R·ln(Pᵣ₂/Pᵣ₁) = ${(expected / 1000).toFixed(5)}.`)
    }
  }
  return out
}
