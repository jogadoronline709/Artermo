import Dexie, { type EntityTable } from 'dexie'
import type { DataRow, Source } from '../domain/types'
import { createDefaultSources } from './defaults'
import type { AppSettings, Favorite, HistoryEntry } from './types'

export interface SettingRecord {
  key: 'app'
  value: AppSettings
}

/**
 * Banco local (IndexedDB) do ArTermo. Tudo fica no dispositivo.
 * Uma futura camada de sincronização pode observar `updatedAt` das fontes
 * e os ids estáveis (UUID) das linhas.
 */
export class ArTermoDB extends Dexie {
  sources!: EntityTable<Source, 'id'>
  rows!: EntityTable<DataRow, 'id'>
  favorites!: EntityTable<Favorite, 'id'>
  history!: EntityTable<HistoryEntry, 'id'>
  settings!: EntityTable<SettingRecord, 'key'>

  constructor(name = 'artermo') {
    super(name)
    this.version(1).stores({
      sources: 'id, order',
      rows: 'id, sourceId, [sourceId+temperatureC]',
      favorites: 'id, createdAt',
      history: '++id, at',
      settings: 'key',
    })
    this.on('populate', (tx) => {
      // Três referências iniciais, com tabelas vazias.
      tx.table('sources').bulkAdd(createDefaultSources())
    })
  }
}

export const db = new ArTermoDB()
