/**
 * Operações de leitura e escrita no banco local. A interface usa apenas
 * estas funções — nenhuma tela acessa o IndexedDB diretamente.
 */
import { TEMP_TOLERANCE_C } from '../domain/interpolation'
import type { DataRow, Source } from '../domain/types'
import { buildBackup, type BackupFile } from './backup'
import { mergeRows, type MergeMode, type NewRow } from './csv'
import type { ArTermoDB } from './db'
import { createDefaultSources, DEFAULT_SOURCE_IDS, newSource, uid } from './defaults'
import { buildDemoData } from './demo'
import { DEFAULT_SETTINGS, type AppSettings, type Favorite } from './types'

export class DuplicateTemperatureError extends Error {
  temperatureC: number
  constructor(temperatureC: number) {
    super(`Já existe uma linha nesta fonte com a temperatura ${temperatureC} °C.`)
    this.name = 'DuplicateTemperatureError'
    this.temperatureC = temperatureC
  }
}

export function createRepository(db: ArTermoDB) {
  return {
    /* ---------------- Fontes ---------------- */
    async listSources(): Promise<Source[]> {
      return db.sources.orderBy('order').toArray()
    },

    async saveSource(source: Source): Promise<void> {
      await db.sources.put({ ...source, updatedAt: new Date().toISOString() })
    },

    async addSource(shortName: string, extra: Partial<Source> = {}): Promise<Source> {
      const all = await db.sources.toArray()
      const order = all.reduce((m, s) => Math.max(m, s.order), -1) + 1
      const s = newSource({ ...extra, shortName, order })
      await db.sources.add(s)
      return s
    },

    /** Exclui a fonte E todas as suas linhas. */
    async deleteSource(id: string): Promise<void> {
      await db.transaction('rw', db.sources, db.rows, async () => {
        await db.rows.where('sourceId').equals(id).delete()
        await db.sources.delete(id)
      })
    },

    /** Recria Kreith, Incropera e Çengel caso tenham sido excluídas (sem dados). */
    async restoreDefaultSources(): Promise<number> {
      const existing = new Set((await db.sources.toArray()).map((s) => s.id))
      const missing = createDefaultSources().filter((s) => !existing.has(s.id))
      if (missing.length) await db.sources.bulkAdd(missing)
      return missing.length
    },

    /* ---------------- Linhas ---------------- */
    async listRows(sourceId?: string): Promise<DataRow[]> {
      const rows = sourceId ? await db.rows.where('sourceId').equals(sourceId).toArray() : await db.rows.toArray()
      return rows.sort((a, b) => a.temperatureC - b.temperatureC)
    },

    /** Insere ou atualiza uma linha, bloqueando temperatura duplicada na mesma fonte. */
    async saveRow(row: NewRow & { id?: string }): Promise<DataRow> {
      return db.transaction('rw', db.rows, db.sources, async () => {
        const siblings = await db.rows.where('sourceId').equals(row.sourceId).toArray()
        const clash = siblings.find((r) => r.id !== row.id && Math.abs(r.temperatureC - row.temperatureC) <= TEMP_TOLERANCE_C)
        if (clash) throw new DuplicateTemperatureError(row.temperatureC)
        const full: DataRow = { ...row, id: row.id ?? uid() }
        await db.rows.put(full)
        await db.sources.update(row.sourceId, { updatedAt: new Date().toISOString() })
        return full
      })
    },

    async deleteRow(id: string): Promise<void> {
      await db.rows.delete(id)
    },

    async clearRows(sourceId: string): Promise<void> {
      await db.rows.where('sourceId').equals(sourceId).delete()
    },

    /** Grava o resultado de uma importação CSV já validada. */
    async importRows(sourceId: string, incoming: NewRow[], mode: MergeMode): Promise<{ added: number; replaced: number }> {
      return db.transaction('rw', db.rows, db.sources, async () => {
        const existing = await db.rows.where('sourceId').equals(sourceId).toArray()
        const withIds: DataRow[] = incoming.map((r) => ({ ...r, sourceId, id: uid() }))
        const merged = mergeRows(existing, withIds, mode)
        await db.rows.where('sourceId').equals(sourceId).delete()
        await db.rows.bulkAdd(merged.rows)
        await db.sources.update(sourceId, { updatedAt: new Date().toISOString() })
        return { added: merged.added, replaced: merged.replaced }
      })
    },

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

    /* ---------------- Backup ---------------- */
    async exportBackup(): Promise<BackupFile> {
      const [sources, rows, favorites] = await Promise.all([db.sources.toArray(), db.rows.toArray(), db.favorites.toArray()])
      return buildBackup({ sources, rows, favorites })
    },

    /** Substitui TODAS as fontes, linhas e favoritos pelo conteúdo do backup (já validado). */
    async restoreBackup(b: BackupFile): Promise<void> {
      await db.transaction('rw', db.sources, db.rows, db.favorites, async () => {
        await Promise.all([db.sources.clear(), db.rows.clear(), db.favorites.clear()])
        await db.sources.bulkAdd(b.sources)
        await db.rows.bulkAdd(b.rows)
        await db.favorites.bulkAdd(b.favorites)
      })
    },

    /* ---------------- Dados SIMULADOS (demonstração) ---------------- */
    async loadDemo(): Promise<void> {
      const all = await db.sources.toArray()
      const order = all.reduce((m, s) => Math.max(m, s.order), -1) + 1
      const demo = buildDemoData(order)
      await db.transaction('rw', db.sources, db.rows, async () => {
        for (const s of demo.sources) await db.rows.where('sourceId').equals(s.id).delete()
        await db.sources.bulkPut(demo.sources)
        await db.rows.bulkAdd(demo.rows)
      })
    },
    async removeDemo(): Promise<void> {
      await db.transaction('rw', db.sources, db.rows, async () => {
        const sim = (await db.sources.toArray()).filter((s) => s.isSimulated)
        for (const s of sim) {
          await db.rows.where('sourceId').equals(s.id).delete()
          await db.sources.delete(s.id)
        }
      })
    },

    /** Apaga tudo e volta ao estado inicial (três fontes vazias). */
    async resetAll(): Promise<void> {
      await db.transaction('rw', [db.sources, db.rows, db.favorites, db.history], async () => {
        await Promise.all([db.sources.clear(), db.rows.clear(), db.favorites.clear(), db.history.clear()])
        await db.sources.bulkAdd(createDefaultSources())
      })
    },
  }
}

export type Repository = ReturnType<typeof createRepository>

export { DEFAULT_SOURCE_IDS }
