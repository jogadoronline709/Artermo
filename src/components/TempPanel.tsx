import { formatTemp } from '../domain/numbers'
import type { DataRow, Source, TempUnit } from '../domain/types'
import { TEMP_UNITS, tempUnitLabel } from '../domain/units'
import { useFavorites, useHistory, repo } from '../hooks/useData'
import { useFeedback } from './feedback'
import { ThermoScale } from './ThermoScale'

interface Props {
  text: string
  /** Número já interpretado do texto (na unidade escolhida), ou null. */
  value: number | null
  unit: TempUnit
  tC: number | null
  error: string | null
  onText: (s: string) => void
  onUnit: (u: TempUnit) => void
  onPick: (value: number, unit: TempUnit) => void
  sources: Source[]
  rowsBySource: Record<string, DataRow[]>
}

export function TempPanel({ text, value, unit, tC, error, onText, onUnit, onPick, sources, rowsBySource }: Props) {
  const favorites = useFavorites()
  const history = useHistory()
  const { toast } = useFeedback()

  const isFav = value != null && favorites.some((f) => f.value === value && f.unit === unit)

  async function toggleFav() {
    if (value == null || !Number.isFinite(value)) return
    const existing = favorites.find((f) => f.value === value && f.unit === unit)
    if (existing) {
      await repo.removeFavorite(existing.id)
      toast('Temperatura removida dos favoritos')
    } else {
      await repo.addFavorite({ value, unit, label: '' })
      toast('Temperatura adicionada aos favoritos')
    }
  }

  return (
    <section className="temp-panel" aria-labelledby="temp-label">
      <label id="temp-label" htmlFor="temp-input" className="temp-label">
        Temperatura
      </label>
      <div className="temp-row">
        <input
          id="temp-input"
          className="temp-input"
          inputMode="decimal"
          autoComplete="off"
          spellCheck={false}
          placeholder="ex.: 25"
          value={text}
          onChange={(e) => onText(e.target.value)}
          aria-invalid={error ? true : undefined}
          aria-describedby="temp-help"
        />
        <button
          type="button"
          className={`icon-btn fav-btn${isFav ? ' on' : ''}`}
          onClick={toggleFav}
          disabled={value == null}
          aria-pressed={isFav}
          aria-label={isFav ? 'Remover dos favoritos' : 'Favoritar esta temperatura'}
          title={isFav ? 'Remover dos favoritos' : 'Favoritar esta temperatura'}
        >
          {isFav ? '★' : '☆'}
        </button>
        <div className="seg seg-units" role="radiogroup" aria-label="Unidade da temperatura">
          {TEMP_UNITS.map((u) => (
            <button key={u.id} type="button" role="radio" aria-checked={unit === u.id} className={unit === u.id ? 'on' : ''} onClick={() => onUnit(u.id)}>
              {u.label}
            </button>
          ))}
        </div>
      </div>
      <p id="temp-help" className={`temp-help${error ? ' is-error' : ''}`}>
        {error ?? (tC != null && unit !== 'C' ? `= ${formatTemp(tC)} °C (usada nos cálculos)` : 'Aceita vírgula ou ponto decimal.')}
      </p>

      <ThermoScale sources={sources} rowsBySource={rowsBySource} tC={tC} unit={unit} />

      {(favorites.length > 0 || history.length > 0) && (
        <div className="chips-block">
          {favorites.length > 0 && (
            <div className="chips" aria-label="Favoritas">
              <span className="chips-title">Favoritas</span>
              {favorites.map((f) => (
                <button key={f.id} type="button" className="chip chip-fav" onClick={() => onPick(f.value, f.unit)}>
                  ★ {formatTemp(f.value)} {tempUnitLabel(f.unit)}
                </button>
              ))}
            </div>
          )}
          {history.length > 0 && (
            <div className="chips" aria-label="Consultas recentes">
              <span className="chips-title">Recentes</span>
              {history.map((h) => (
                <button key={h.id} type="button" className="chip" onClick={() => onPick(h.value, h.unit)}>
                  {formatTemp(h.value)} {tempUnitLabel(h.unit)}
                </button>
              ))}
              <button type="button" className="chip chip-ghost" onClick={() => repo.clearHistory()}>
                Limpar
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  )
}
