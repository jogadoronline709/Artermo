// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
import 'fake-indexeddb/auto'
import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { ArTermoDB } from '../data/db'
import { createRepository } from '../data/repository'
import { DEFAULT_SETTINGS } from '../data/types'

let n = 0
const opened: Dexie[] = []
function freshName() {
  return `artermo-repo-teste-${Date.now()}-${n++}`
}
async function openApp(name: string) {
  const db = new ArTermoDB(name)
  await db.open()
  opened.push(db)
  return { db, repo: createRepository(db) }
}

afterEach(async () => {
  for (const db of opened.splice(0)) await db.delete()
})

describe('banco local', () => {
  it('atualiza o banco v1 (com tabelas digitadas) sem perder favoritos e histórico', async () => {
    const name = freshName()
    const v1 = new Dexie(name)
    v1.version(1).stores({
      sources: 'id, order',
      rows: 'id, sourceId, [sourceId+temperatureC]',
      favorites: 'id, createdAt',
      history: '++id, at',
      settings: 'key',
    })
    await v1.open()
    await v1.table('sources').add({ id: 'kreith', order: 0 })
    await v1.table('rows').add({ id: 'r1', sourceId: 'kreith', temperatureC: 0 })
    await v1.table('favorites').add({ id: 'f1', value: 25, unit: 'C', label: '', createdAt: '2026-01-01T00:00:00Z' })
    await v1.table('history').add({ value: 30, unit: 'C', at: '2026-01-01T00:00:00Z' })
    v1.close()

    const { db, repo } = await openApp(name)
    const tables = db.tables.map((t) => t.name)
    expect(tables).not.toContain('sources')
    expect(tables).not.toContain('rows')
    expect(await repo.listFavorites()).toHaveLength(1)
    expect(await db.history.count()).toBe(1)
  })

  it('configurações antigas ganham fluido ativo e seleção por fluido', async () => {
    const { db, repo } = await openApp(freshName())
    await db.settings.put({ key: 'app', value: { compareSourceIds: ['kreith'], theme: 'dark' } as never })
    const s = await repo.getSettings()
    expect(s.activeFluidId).toBe('ar')
    expect(s.compareSelection).toEqual({})
    expect(s.theme).toBe('dark')
    expect(s).not.toHaveProperty('compareSourceIds')
  })

  it('limpar dados do usuário apaga favoritos, histórico e preferências', async () => {
    const { db, repo } = await openApp(freshName())
    await repo.addFavorite({ value: 25, unit: 'C', label: '' })
    await repo.addHistory(30, 'C')
    await repo.saveSettings({ ...DEFAULT_SETTINGS, theme: 'dark', activeFluidId: 'agua' })
    await repo.clearUserData()
    expect(await repo.listFavorites()).toHaveLength(0)
    expect(await db.history.count()).toBe(0)
    expect(await repo.getSettings()).toEqual(DEFAULT_SETTINGS)
  })

  it('histórico ignora repetição seguida e guarda no máximo 30 entradas', async () => {
    const { db, repo } = await openApp(freshName())
    await repo.addHistory(1, 'C')
    await repo.addHistory(1, 'C')
    expect(await db.history.count()).toBe(1)
    for (let i = 2; i <= 40; i++) await repo.addHistory(i, 'C')
    expect(await db.history.count()).toBe(30)
  })
})
