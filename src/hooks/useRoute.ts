import { useEffect, useState } from 'react'

export type Route =
  | { page: 'consultar'; tab?: string }
  | { page: 'comparar' }
  | { page: 'fluidos'; fluidId?: string; refId?: string }
  | { page: 'config' }

/** Rotas por hash (#/consultar, #/fluidos/agua/kreith…) — funcionam offline e no GitHub Pages. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  switch (parts[0]) {
    case 'comparar':
      return { page: 'comparar' }
    case 'fluidos': {
      const r: Route = { page: 'fluidos' }
      if (parts[1]) r.fluidId = parts[1]
      if (parts[1] && parts[2]) r.refId = parts[2]
      return r
    }
    // A antiga Biblioteca editável virou Fluidos.
    case 'biblioteca':
      return { page: 'fluidos' }
    case 'config':
      return { page: 'config' }
    default:
      return { page: 'consultar', tab: parts[1] }
  }
}

export function href(route: Route): string {
  switch (route.page) {
    case 'consultar':
      return route.tab ? `#/consultar/${encodeURIComponent(route.tab)}` : '#/consultar'
    case 'comparar':
      return '#/comparar'
    case 'fluidos': {
      let h = '#/fluidos'
      if (route.fluidId) {
        h += `/${encodeURIComponent(route.fluidId)}`
        if (route.refId) h += `/${encodeURIComponent(route.refId)}`
      }
      return h
    }
    case 'config':
      return '#/config'
  }
}

export function navigate(route: Route) {
  window.location.hash = href(route)
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => {
      const next = parseHash(window.location.hash)
      setRoute((prev) => {
        // Trocar só a aba de referência dentro do mesmo fluido não volta ao topo.
        const samePage = prev.page === next.page && (prev.page !== 'fluidos' || (next.page === 'fluidos' && prev.fluidId === next.fluidId))
        if (!samePage) window.scrollTo({ top: 0 })
        return next
      })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
