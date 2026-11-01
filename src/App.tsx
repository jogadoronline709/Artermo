import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { parseNumber } from './domain/numbers'
import type { TempUnit } from './domain/types'
import { ABSOLUTE_ZERO_C, toCelsius } from './domain/units'
import { useFeedback } from './components/feedback'
import { findFluid, FLUIDS, getFluid } from './data/fluids/registry'
import { useSettings } from './hooks/settingsContext'
import { repo } from './hooks/useData'
import { useOnline } from './hooks/usePlatform'
import { href, useRoute, type Route } from './hooks/useRoute'
import { FluidPage } from './pages/FluidPage'
import { FluidsPage } from './pages/FluidsPage'
import { QueryPage, type TempState } from './pages/QueryPage'
import { SettingsPage } from './pages/SettingsPage'

const NAV: { page: Route['page']; label: string; icon: string }[] = [
  { page: 'consultar', label: 'Consultar', icon: 'M4 18h16M7 18V9m5 9V5m5 13v-6' },
  { page: 'comparar', label: 'Comparar', icon: 'M5 7h14M5 12h14M5 17h14M9 4v16M15 4v16' },
  { page: 'fluidos', label: 'Gases/Fluidos', icon: 'M12 3s-6 6.5-6 11a6 6 0 0 0 12 0c0-4.5-6-11-6-11z' },
  { page: 'config', label: 'Configurações', icon: 'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm8 3-2-.6-.6-1.5 1-1.9-1.4-1.4-1.9 1-1.5-.6L13 4h-2l-.6 2-1.5.6-1.9-1-1.4 1.4 1 1.9L6 10.4 4 11v2l2 .6.6 1.5-1 1.9 1.4 1.4 1.9-1 1.5.6.6 2h2l.6-2 1.5-.6 1.9 1 1.4-1.4-1-1.9.6-1.5 2-.6z' },
]

function useTemperature(): TempState {
  const [text, setText] = useState('25')
  const [unit, setUnit] = useState<TempUnit>('C')

  const parsed = useMemo(() => {
    const v = parseNumber(text)
    if (v == null) return { value: null, tC: null, error: null }
    if (Number.isNaN(v)) return { value: null, tC: null, error: 'Digite um número, ex.: 25 ou 26,85.' }
    const tC = toCelsius(v, unit)
    if (tC < ABSOLUTE_ZERO_C - 1e-9) return { value: null, tC: null, error: 'Temperatura abaixo do zero absoluto.' }
    return { value: v, tC, error: null }
  }, [text, unit])

  // Registra no histórico quando o valor fica estável por um instante.
  useEffect(() => {
    if (parsed.value == null) return
    const v = parsed.value
    const id = window.setTimeout(() => void repo.addHistory(v, unit), 1500)
    return () => window.clearTimeout(id)
  }, [parsed.value, unit])

  return {
    text,
    unit,
    ...parsed,
    setText,
    setUnit,
    pick: (v, u) => {
      setText(String(v).replace('.', ','))
      setUnit(u)
    },
  }
}

export default function App() {
  const route = useRoute()
  const online = useOnline()
  const temp = useTemperature()
  const { toast } = useFeedback()
  const { settings } = useSettings()
  const fluid = getFluid(settings.activeFluidId)

  useEffect(() => {
    const onReady = () => toast('Pronto para uso offline')
    window.addEventListener('artermo:offline-ready', onReady)
    return () => window.removeEventListener('artermo:offline-ready', onReady)
  }, [toast])

  const navPage = route.page

  let content: ReactNode = null
  if (route.page === 'consultar' || route.page === 'comparar') {
    const tab = route.page === 'comparar' ? 'comparar' : (route.tab ?? fluid.sources[0]?.id ?? 'comparar')
    content = <QueryPage fluid={fluid} temp={temp} tab={tab} />
  } else if (route.page === 'fluidos') {
    const f = route.fluidId ? findFluid(route.fluidId) : undefined
    if (route.fluidId && !f)
      content = (
        <div className="page">
          <p className="empty-title">Fluido não encontrado.</p>
          <a className="btn" href={href({ page: 'fluidos' })}>
            Ver todos os fluidos
          </a>
        </div>
      )
    else content = f ? <FluidPage key={f.def.id} fluid={f} refId={route.refId} /> : <FluidsPage fluids={FLUIDS} />
  } else content = <SettingsPage />

  return (
    <div className="app">
      <a className="skip" href="#main">
        Ir para o conteúdo
      </a>
      <header className="topbar">
        <a className="brand" href={href({ page: 'consultar' })} aria-label="ArTermo — início">
          <svg className="brand-mark" viewBox="0 0 32 32" aria-hidden="true">
            <rect x="13" y="3" width="6" height="19" rx="3" fill="none" stroke="currentColor" strokeWidth="2" />
            <circle cx="16" cy="24" r="5" fill="var(--hot)" />
            <path d="M16 20V11" stroke="var(--hot)" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M22 9h5M22 13h4M22 17h5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="brand-name">ArTermo</span>
          <span className="brand-sub">Propriedades termofísicas</span>
        </a>
        <span className={`net${online ? '' : ' is-offline'}`} role="status">
          <span className="net-dot" aria-hidden="true" />
          {online ? 'Online' : 'Offline — usando dados salvos'}
        </span>
        <nav className="nav" aria-label="Principal">
          {NAV.map((n) => (
            <a key={n.page} href={href({ page: n.page } as Route)} className={`nav-item${navPage === n.page ? ' on' : ''}`} aria-current={navPage === n.page ? 'page' : undefined}>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d={n.icon} fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
              <span>{n.label}</span>
            </a>
          ))}
        </nav>
      </header>
      <main id="main" className="main">
        {content}
      </main>
    </div>
  )
}
