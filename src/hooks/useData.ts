import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { createRepository } from '../data/repository'
import type { DataRow, Source } from '../domain/types'

/** Repositório único da aplicação (IndexedDB local). */
export const repo = createRepository(db)

/** Fontes em ordem, atualizadas automaticamente quando o banco muda. */
export function useSources(): Source[] | undefined {
  return useLiveQuery(() => repo.listSources(), [])
}

/** Todas as linhas agrupadas por fonte. */
export function useRowsBySource(): Record<string, DataRow[]> | undefined {
  return useLiveQuery(async () => {
    const rows = await repo.listRows()
    const out: Record<string, DataRow[]> = {}
    for (const r of rows) (out[r.sourceId] ??= []).push(r)
    return out
  }, [])
}

export function useFavorites() {
  return useLiveQuery(() => repo.listFavorites(), []) ?? []
}

export function useHistory() {
  return useLiveQuery(() => db.history.orderBy('at').reverse().limit(12).toArray(), []) ?? []
}
