import { useEffect, useRef, useState } from 'react'
import { parseNumber, formatPlain } from '../domain/numbers'
import type { DataRow, PropertyKey, Source, TempUnit } from '../domain/types'
import { ABSOLUTE_ZERO_C, fromCanonical, getUnitDef, PROPERTY_DEFS, TEMP_UNITS, toCanonical, toCelsius } from '../domain/units'
import { DuplicateTemperatureError } from '../data/repository'
import { roundSig } from '../data/csv'
import { repo } from '../hooks/useData'
import { useFeedback } from './feedback'
import { Modal } from './Modal'

interface Props {
  source: Source
  /** Linha em edição; null = nova linha. */
  row: DataRow | null
  open: boolean
  onClose: () => void
}

type Draft = { t: string; tUnit: TempUnit; values: Record<PropertyKey, string>; units: Record<PropertyKey, string> }

function emptyDraft(source: Source): Draft {
  const values = {} as Record<PropertyKey, string>
  const units = {} as Record<PropertyKey, string>
  for (const d of PROPERTY_DEFS) {
    values[d.key] = ''
    units[d.key] = getUnitDef(d.key, source.inputUnits[d.key]).id
  }
  return { t: '', tUnit: source.originalTempUnit, values, units }
}

function draftFromRow(source: Source, row: DataRow): Draft {
  const d = emptyDraft(source)
  d.t = formatPlain(row.originalTemperature.value, ',')
  d.tUnit = row.originalTemperature.unit
  for (const p of PROPERTY_DEFS) {
    const v = row.values[p.key]
    if (v != null) d.values[p.key] = formatPlain(roundSig(fromCanonical(p.key, v, d.units[p.key]), 12), ',')
  }
  return d
}

export function RowEditor({ source, row, open, onClose }: Props) {
  const [draft, setDraft] = useState<Draft>(() => (row ? draftFromRow(source, row) : emptyDraft(source)))
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const firstRef = useRef<HTMLInputElement>(null)
  const { toast } = useFeedback()

  useEffect(() => {
    if (open) {
      setDraft(row ? draftFromRow(source, row) : emptyDraft(source))
      setErrors({})
      window.setTimeout(() => firstRef.current?.focus(), 30)
    }
    // Reinicia só ao abrir ou trocar de linha/fonte (não a cada atualização do banco).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?.id, source.id])

  function validate(): Omit<DataRow, 'id'> | null {
    const errs: Record<string, string> = {}
    const t = parseNumber(draft.t)
    let tC = NaN
    if (t == null) errs.t = 'Informe a temperatura.'
    else if (Number.isNaN(t)) errs.t = 'Número inválido.'
    else {
      tC = toCelsius(t, draft.tUnit)
      if (tC < ABSOLUTE_ZERO_C - 1e-9) errs.t = 'Abaixo do zero absoluto.'
    }
    const values: DataRow['values'] = {}
    for (const d of PROPERTY_DEFS) {
      const v = parseNumber(draft.values[d.key])
      if (v == null) continue
      if (Number.isNaN(v)) errs[d.key] = 'Número inválido.'
      else if (v <= 0) errs[d.key] = 'Deve ser positivo. Deixe vazio se não houver dado.'
      else values[d.key] = toCanonical(d.key, v, draft.units[d.key])
    }
    if (!Object.keys(errs).length && Object.keys(values).length === 0) errs.form = 'Preencha ao menos uma propriedade.'
    setErrors(errs)
    if (Object.keys(errs).length) return null
    return { sourceId: source.id, temperatureC: tC, originalTemperature: { value: t as number, unit: draft.tUnit }, values }
  }

  async function save(next: boolean) {
    const data = validate()
    if (!data) return
    setSaving(true)
    try {
      await repo.saveRow({ ...data, id: row?.id })
      if (next && !row) {
        toast('Linha salva')
        setDraft((d) => ({ ...emptyDraft(source), tUnit: d.tUnit, units: d.units }))
        window.setTimeout(() => firstRef.current?.focus(), 30)
      } else {
        toast(row ? 'Linha atualizada' : 'Linha salva')
        onClose()
      }
    } catch (e) {
      if (e instanceof DuplicateTemperatureError) setErrors({ t: 'Já existe uma linha com esta temperatura nesta fonte.' })
      else toast(`Erro ao salvar: ${(e as Error).message}`, 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      open={open}
      title={`${row ? 'Editar linha' : 'Nova linha'} — ${source.shortName}`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="btn" onClick={onClose}>
            Cancelar
          </button>
          {!row && (
            <button type="button" className="btn" disabled={saving} onClick={() => save(false)}>
              Salvar e fechar
            </button>
          )}
          <button type="submit" form="row-form" className="btn btn-primary" disabled={saving}>
            {row ? 'Salvar alterações' : 'Salvar e próxima linha'}
          </button>
        </>
      }
    >
      <form
        id="row-form"
        className="row-form"
        onSubmit={(e) => {
          e.preventDefault()
          void save(true)
        }}
        noValidate
      >
        <p className="muted small">Campo vazio = dado ausente (nunca zero). Use vírgula ou ponto decimal; notação como 1,846E-5 também é aceita.</p>
        <div className={`field field-unit${errors.t ? ' has-error' : ''}`}>
          <label htmlFor="rf-t">Temperatura</label>
          <div className="input-with-unit">
            <input id="rf-t" ref={firstRef} inputMode="decimal" autoComplete="off" value={draft.t} onChange={(e) => setDraft({ ...draft, t: e.target.value })} />
            <select aria-label="Unidade da temperatura" value={draft.tUnit} onChange={(e) => setDraft({ ...draft, tUnit: e.target.value as TempUnit })}>
              {TEMP_UNITS.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>
          {errors.t && <p className="field-error">{errors.t}</p>}
        </div>
        {PROPERTY_DEFS.map((d) => (
          <div key={d.key} className={`field field-unit${errors[d.key] ? ' has-error' : ''}`}>
            <label htmlFor={`rf-${d.key}`}>
              <span className="prop-sym">{d.symbol}</span> {d.label}
            </label>
            <div className="input-with-unit">
              <input
                id={`rf-${d.key}`}
                inputMode="decimal"
                autoComplete="off"
                value={draft.values[d.key]}
                onChange={(e) => setDraft({ ...draft, values: { ...draft.values, [d.key]: e.target.value } })}
              />
              <select
                aria-label={`Unidade de ${d.symbol}`}
                value={draft.units[d.key]}
                onChange={(e) => setDraft({ ...draft, units: { ...draft.units, [d.key]: e.target.value } })}
                disabled={d.units.length === 1}
              >
                {d.units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label}
                  </option>
                ))}
              </select>
            </div>
            {errors[d.key] && <p className="field-error">{errors[d.key]}</p>}
          </div>
        ))}
        {errors.form && <p className="field-error">{errors.form}</p>}
      </form>
    </Modal>
  )
}
