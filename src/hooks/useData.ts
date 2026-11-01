import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'
import { createRepository } from '../data/repository'

/** Repositório único da aplicação (IndexedDB local). */
export const repo = createRepository(db)

export function useFavorites() {
  return useLiveQuery(() => repo.listFavorites(), []) ?? []
}

export function useHistory() {
  return useLiveQuery(() => db.history.orderBy('at').reverse().limit(12).toArray(), []) ?? []
}
