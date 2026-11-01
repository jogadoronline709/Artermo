/**
 * Registro dos fluidos disponíveis no app. Para adicionar um fluido, crie a
 * pasta `src/data/fluids/<id>/` com `fluid.ts` e inclua-o em `FLUID_DEFS`.
 */
import type { FluidDef } from '../../domain/fluids'
import { AGUA } from './agua/fluid'
import { AR } from './ar/fluid'
import { AR_GAS_IDEAL } from './ar-gas-ideal/fluid'
import { groupCsvByFluid, loadFluid, type LoadedFluid } from './loader'

export type { LoadedFluid } from './loader'

export const DEFAULT_FLUID_ID = 'ar'

/** Ordem de exibição. */
export const FLUID_DEFS: FluidDef[] = [AR, AR_GAS_IDEAL, AGUA]

const glob = import.meta.glob<string>('./*/*.csv', { query: '?raw', import: 'default', eager: true })
const { byFluid, malformed } = groupCsvByFluid(glob)

export const FLUIDS: LoadedFluid[] = FLUID_DEFS.map((def) => loadFluid(def, byFluid[def.id] ?? {}))

/** CSVs fora do padrão `<fluido>/<ref>.csv` ou sem fluido/referência correspondente. */
export const ORPHAN_CSVS: string[] = [
  ...malformed,
  ...Object.entries(byFluid).flatMap(([fluidId, refs]) => {
    const def = FLUID_DEFS.find((f) => f.id === fluidId)
    return Object.keys(refs)
      .filter((refId) => !def?.references.some((r) => r.id === refId))
      .map((refId) => `./${fluidId}/${refId}.csv`)
  }),
]

export function findFluid(id: string): LoadedFluid | undefined {
  return FLUIDS.find((f) => f.def.id === id)
}

/** Fluido dono de uma fonte (ex.: 'agua-kreith' → Água). */
export function fluidOfSourceId(sourceId: string): LoadedFluid | undefined {
  return FLUIDS.find((f) => f.sources.some((s) => s.id === sourceId))
}

/** Fluido pelo id; se não existir, o Ar. */
export function getFluid(id: string | undefined): LoadedFluid {
  return (id ? findFluid(id) : undefined) ?? (findFluid(DEFAULT_FLUID_ID) as LoadedFluid)
}
