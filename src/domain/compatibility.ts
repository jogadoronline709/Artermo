import type { Source } from './types'

/** Diferença relativa máxima para considerar pressões compatíveis (0,5 %). */
export const PRESSURE_REL_TOLERANCE = 0.005

export interface CompatIssue {
  kind: 'pressure_missing' | 'pressure_different' | 'fluid_different' | 'simulated'
  message: string
}

export interface CompatResult {
  /** true quando não há nenhum problema que bloqueie a média por padrão. */
  compatible: boolean
  issues: CompatIssue[]
}

function normFluid(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
}

/**
 * Verifica se as fontes podem ser comparadas/mediadas:
 * mesmo fluido e pressão de referência cadastrada e compatível.
 * Também acusa mistura de dados SIMULADOS com dados reais.
 */
export function checkCompatibility(sources: Pick<Source, 'shortName' | 'fluid' | 'pressureKPa' | 'isSimulated'>[]): CompatResult {
  const issues: CompatIssue[] = []
  if (sources.length < 2) return { compatible: true, issues }

  const missing = sources.filter((s) => s.pressureKPa == null || !Number.isFinite(s.pressureKPa))
  if (missing.length) {
    issues.push({
      kind: 'pressure_missing',
      message: `Pressão de referência não cadastrada em: ${missing.map((s) => s.shortName).join(', ')}.`,
    })
  }

  const withP = sources.filter((s) => s.pressureKPa != null && Number.isFinite(s.pressureKPa))
  if (withP.length >= 2) {
    const ps = withP.map((s) => s.pressureKPa as number)
    const pMin = Math.min(...ps)
    const pMax = Math.max(...ps)
    const rel = pMax === 0 ? 0 : (pMax - pMin) / pMax
    if (rel > PRESSURE_REL_TOLERANCE) {
      issues.push({
        kind: 'pressure_different',
        message: `Pressões de referência diferentes: ${withP.map((s) => `${s.shortName} = ${fmtKPa(s.pressureKPa as number)} kPa`).join('; ')} (diferença de ${(rel * 100).toFixed(2).replace('.', ',')} %).`,
      })
    }
  }

  const fluids = new Set(sources.map((s) => normFluid(s.fluid || '')))
  if (fluids.size > 1) {
    issues.push({
      kind: 'fluid_different',
      message: `Fluidos diferentes: ${sources.map((s) => `${s.shortName} = "${s.fluid || '—'}"`).join('; ')}.`,
    })
  }

  const sim = sources.filter((s) => s.isSimulated)
  if (sim.length && sim.length < sources.length) {
    issues.push({
      kind: 'simulated',
      message: `Mistura de dados SIMULADOS (${sim.map((s) => s.shortName).join(', ')}) com fontes reais.`,
    })
  }

  return { compatible: issues.length === 0, issues }
}

function fmtKPa(v: number): string {
  return String(Math.round(v * 1000) / 1000).replace('.', ',')
}
