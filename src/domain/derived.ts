/**
 * Propriedades derivadas. Todas as entradas DEVEM estar em unidade canônica:
 * ρ [kg/m³], cp [J/(kg·K)], k [W/(m·K)], μ [Pa·s].
 * Retornam `null` quando faltam dados ou há valor não físico (≤ 0 ou não finito).
 */

function ok(...xs: (number | null | undefined)[]): boolean {
  return xs.every((x) => typeof x === 'number' && Number.isFinite(x) && x > 0)
}

/** ν = μ / ρ  [m²/s] */
export function kinematicViscosity(mu?: number | null, rho?: number | null): number | null {
  if (!ok(mu, rho)) return null
  return (mu as number) / (rho as number)
}

/** α = k / (ρ · cp)  [m²/s] */
export function thermalDiffusivity(k?: number | null, rho?: number | null, cp?: number | null): number | null {
  if (!ok(k, rho, cp)) return null
  return (k as number) / ((rho as number) * (cp as number))
}

/** Pr = μ · cp / k  [adimensional] */
export function prandtl(mu?: number | null, cp?: number | null, k?: number | null): number | null {
  if (!ok(mu, cp, k)) return null
  return ((mu as number) * (cp as number)) / (k as number)
}

/** Diferença percentual do calculado em relação ao publicado: (calc − pub) / pub × 100. */
export function percentDiff(calculated: number, published: number): number | null {
  if (!Number.isFinite(calculated) || !Number.isFinite(published) || published === 0) return null
  return ((calculated - published) / Math.abs(published)) * 100
}

export const DERIVED_FORMULAS = {
  kinematicViscosity: { text: 'ν = μ / ρ', inputs: ['dynamicViscosity', 'density'] },
  thermalDiffusivity: { text: 'α = k / (ρ · cp)', inputs: ['conductivity', 'density', 'specificHeat'] },
  prandtl: { text: 'Pr = μ · cp / k', inputs: ['dynamicViscosity', 'specificHeat', 'conductivity'] },
} as const
