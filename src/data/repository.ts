/**
 * Operações de leitura e escrita no banco local. A interface usa apenas
 * estas funções — nenhuma tela acessa o IndexedDB diretamente.
 */
import type { ArTermoDB } from './db'
import { uid } from './defaults'
import { DEFAULT_SETTINGS, type AppSettings, type Favorite } from './types'

export function createRepository(db: ArTermoDB) {
  return {
    /* ---------------- Favoritos e histórico ---------------- */
    async listFavorites(): Promise<Favorite[]> {
      return db.favorites.orderBy('createdAt').toArray()
    },
    async addFavorite(f: Omit<Favorite, 'id' | 'createdAt'>): Promise<void> {
      await db.favorites.add({ ...f, id: uid(), createdAt: new Date().toISOString() })
    },
    async removeFavorite(id: string): Promise<void> {
      await db.favorites.delete(id)
    },
    async addHistory(value: number, unit: Favorite['unit']): Promise<void> {
      await db.transaction('rw', db.history, async () => {
        const last = await db.history.orderBy('at').last()
        if (last && last.value === value && last.unit === unit) return
        await db.history.add({ value, unit, at: new Date().toISOString() })
        const count = await db.history.count()
        if (count > 30) {
          const old = await db.history.orderBy('at').limit(count - 30).primaryKeys()
          await db.history.bulkDelete(old)
        }
      })
    },
    async clearHistory(): Promise<void> {
      await db.history.clear()
    },

    /* ---------------- Configurações ---------------- */
    async getSettings(): Promise<AppSettings> {
      const rec = await db.settings.get('app')
      return { ...DEFAULT_SETTINGS, ...(rec?.value ?? {}) }
    },
    async saveSettings(s: AppSettings): Promise<void> {
      await db.settings.put({ key: 'app', value: s })
    },

    /** Apaga favoritos, histórico e preferências deste dispositivo. */
    async clearUserData(): Promise<void> {
      await db.transaction('rw', [db.favorites, db.history, db.settings], async () => {
        await Promise.all([db.favorites.clear(), db.history.clear(), db.settings.clear()])
      })
    },
  }
}

export type Repository = ReturnType<typeof createRepository>
