import { useEffect, useState } from 'react'

export type Route =
  | { page: 'consultar'; tab?: string }
  | { page: 'comparar' }
  | { page: 'biblioteca'; sourceId?: string }
  | { page: 'config' }

/** Rotas por hash (#/consultar, #/biblioteca/kreith…) — funcionam offline e no GitHub Pages. */
export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('/').filter(Boolean).map(decodeURIComponent)
  switch (parts[0]) {
    case 'comparar':
      return { page: 'comparar' }
    case 'biblioteca':
      return { page: 'biblioteca', sourceId: parts[1] }
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
    case 'biblioteca':
      return route.sourceId ? `#/biblioteca/${encodeURIComponent(route.sourceId)}` : '#/biblioteca'
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
        const samePage = prev.page === next.page && (prev.page !== 'biblioteca' || (next.page === 'biblioteca' && prev.sourceId === next.sourceId))
        if (!samePage) window.scrollTo({ top: 0 })
        return next
      })
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
