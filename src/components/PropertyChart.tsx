import { CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { pointsFor } from '../domain/interpolation'
import { formatNumber, formatTemp } from '../domain/numbers'
import type { DataRow, PropertyKey, Source, TempUnit } from '../domain/types'
import { fromCelsius, getPropertyDef, tempUnitLabel } from '../domain/units'

/** Cores e tracejados distintos por fonte (não dependem só da cor). */
const SERIES_STYLE = [
  { color: '#2f6fbf', dash: undefined },
  { color: '#c4402f', dash: '7 4' },
  { color: '#11847c', dash: '2 3' },
  { color: '#9a6a00', dash: '10 3 2 3' },
  { color: '#8143a8', dash: '4 2' },
  { color: '#5f6b75', dash: '1 2' },
]

interface Props {
  sources: Source[]
  rowsBySource: Record<string, DataRow[]>
  prop: PropertyKey
  tC: number | null
  unit: TempUnit
}

export default function PropertyChart({ sources, rowsBySource, prop, tC, unit }: Props) {
  const def = getPropertyDef(prop)
  const series = sources.map((s, i) => ({
    source: s,
    style: SERIES_STYLE[i % SERIES_STYLE.length],
    data: pointsFor(rowsBySource[s.id] ?? [], prop).map((p) => ({ t: fromCelsius(p.t, unit), y: p.y })),
  }))
  const any = series.some((s) => s.data.length > 0)
  if (!any) return <p className="muted pad">Nenhuma fonte selecionada tem dados de {def.symbol}.</p>

  const ul = tempUnitLabel(unit)
  return (
    <div className="chart" role="img" aria-label={`Gráfico de ${def.label} em função da temperatura, uma curva por referência`}>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.12} />
          <XAxis
            type="number"
            dataKey="t"
            domain={['dataMin', 'dataMax']}
            tickFormatter={(v: number) => formatTemp(v)}
            stroke="currentColor"
            fontSize={12}
            label={{ value: `T (${ul})`, position: 'insideBottomRight', offset: -4, fill: 'currentColor', fontSize: 12 }}
          />
          <YAxis
            type="number"
            domain={['auto', 'auto']}
            tickFormatter={(v: number) => formatNumber(v, { sig: 3 })}
            stroke="currentColor"
            fontSize={12}
            width={78}
          />
          <Tooltip
            formatter={(v) => [`${formatNumber(Number(v), { sig: 5 })} ${def.canonical === '—' ? '' : def.canonical}`, def.symbol]}
            labelFormatter={(l) => `T = ${formatTemp(Number(l))} ${ul}`}
            contentStyle={{ background: 'var(--surface)', border: '1px solid var(--line)', color: 'var(--ink)', borderRadius: 8 }}
          />
          <Legend wrapperStyle={{ fontSize: 13 }} />
          {tC != null && <ReferenceLine x={fromCelsius(tC, unit)} stroke="currentColor" strokeOpacity={0.6} strokeDasharray="3 3" />}
          {series.map((s) => (
            <Line
              key={s.source.id}
              data={s.data}
              dataKey="y"
              name={s.source.shortName}
              stroke={s.style.color}
              strokeDasharray={s.style.dash}
              strokeWidth={2}
              dot={{ r: 3 }}
              isAnimationActive={false}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
      <p className="chart-note">
        {def.label} ({def.canonical === '—' ? 'adimensional' : def.canonical}) com os pontos tabelados de cada referência. Linhas retas entre pontos = interpolação linear. A linha
        tracejada vertical marca a temperatura consultada.
      </p>
    </div>
  )
}
