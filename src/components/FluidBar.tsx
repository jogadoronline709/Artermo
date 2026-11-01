import type { LoadedFluid } from '../data/fluids/registry'
import { fluidDisplayName, rangeWarning } from '../domain/fluids'

interface Props {
  fluid: LoadedFluid
  /** Temperatura consultada em °C, para o alerta de faixa válida. */
  tC: number | null
}

/** Fluido ativo em Consultar/Comparar e alerta permanente fora da faixa válida. */
export function FluidBar({ fluid, tC }: Props) {
  const warning = tC != null ? rangeWarning(fluid.def, tC) : null
  return (
    <div className="fluid-bar">
      <p className="fluid-bar-name">
        Fluido: <strong>{fluidDisplayName(fluid.def)}</strong>
        <a className="fluid-bar-change" href="#/fluidos">
          trocar
        </a>
      </p>
      {warning && (
        <div className="alert alert-warn" role="alert">
          <p>{warning}</p>
        </div>
      )}
    </div>
  )
}
