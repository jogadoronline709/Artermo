/**
 * Conferência de uma tabela de propriedades de transporte embutida.
 * Onde a tabela publica ν, α ou Pr junto com as grandezas que os definem,
 * compara o valor impresso com μ/ρ, k/(ρ·cp) e μ·cp/k. Serve para pegar erros
 * de transcrição; a tolerância cobre o arredondamento dos livros.
 */
import { kinematicViscosity, prandtl, thermalDiffusivity } from '../domain/derived'
import { formatTemp } from '../domain/numbers'
import type { DataRow } from '../domain/types'

/** Diferença relativa máxima entre o valor impresso e o calculado. */
export const TRANSPORT_REL_TOL = 0.02

const pct = (x: number) => `${(x * 100).toFixed(1).replace('.', ',')} %`

/** Uma mensagem por divergência, começando por "T = <°C> °C:". Vazio = coerente. */
export function checkTransportTable(rows: DataRow[], tol = TRANSPORT_REL_TOL): string[] {
  const out: string[] = []
  for (const r of rows) {
    const v = r.values
    const checks: [string, number | undefined, number | null][] = [
      ['ν', v.kinematicViscosity, kinematicViscosity(v.dynamicViscosity, v.density)],
      ['α', v.thermalDiffusivity, thermalDiffusivity(v.conductivity, v.density, v.specificHeat)],
      ['Pr', v.prandtl, prandtl(v.dynamicViscosity, v.specificHeat, v.conductivity)],
    ]
    for (const [sym, printed, calc] of checks) {
      if (printed == null || calc == null) continue
      const diff = calc / printed - 1
      if (Math.abs(diff) > tol) out.push(`T = ${formatTemp(r.temperatureC)} °C: ${sym} impresso difere ${pct(diff)} do calculado.`)
    }
  }
  return out
}
