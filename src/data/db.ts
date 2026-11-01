import Dexie, { type EntityTable } from 'dexie'
import type { AppSettings, Favorite, HistoryEntry } from './types'

export interface SettingRecord {
  key: 'app'
  value: AppSettings
}

/**
 * Banco local (IndexedDB) do ArTermo. Guarda só preferências, favoritos e
 * histórico — as tabelas dos fluidos vêm embutidas no app.
 */
export class ArTermoDB extends Dexie {
  favorites!: EntityTable<Favorite, 'id'>
  history!: EntityTable<HistoryEntry, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>

  constructor(name = 'artermo') {
    super(name)
    // v1 guardava as tabelas digitadas pelo usuário (Biblioteca editável).
    this.version(1).stores({
      sources: 'id, order',
      rows: 'id, sourceId, [sourceId+temperatureC]',
      favorites: 'id, createdAt',
      history: '++id, at',
      settings: 'key',
    })
    // v2: tabelas passam a ser embutidas; remove fontes e linhas antigas.
    this.version(2).stores({ sources: null, rows: null })
  }
}

export const db = new ArTermoDB()
