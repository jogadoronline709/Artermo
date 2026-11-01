// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.
// Nenhum valor foi retirado de Kreith, Incropera ou Çengel.
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseBackup, serializeBackup } from '../data/backup'
import { ArTermoDB } from '../data/db'
import { createRepository, DuplicateTemperatureError } from '../data/repository'

let db: ArTermoDB
let repo: ReturnType<typeof createRepository>
let n = 0

beforeEach(async () => {
  db = new ArTermoDB(`artermo-teste-${n++}`)
  await db.open()
  repo = createRepository(db)
})

afterEach(async () => {
  await db.delete()
})

describe('banco local e referências iniciais', () => {
  it('começa com Kreith, Incropera e Çengel vazias e sem metadados presumidos', async () => {
    const sources = await repo.listSources()
    expect(sources.map((s) => s.shortName)).toEqual(['Kreith', 'Incropera', 'Çengel'])
    for (const s of sources) {
      expect(s.edition).toBe('')
      expect(s.year).toBe('')
      expect(s.pageTable).toBe('')
      expect(s.pressureKPa).toBeNull()
    }
    expect(await repo.listRows()).toHaveLength(0)
  })

  it('mantém as tabelas de cada fonte separadas e bloqueia temperatura duplicada', async () => {
    await repo.saveRow({ sourceId: 'kreith', temperatureC: 0, originalTemperature: { value: 0, unit: 'C' }, values: { density: 1 } })
    await repo.saveRow({ sourceId: 'cengel', temperatureC: 0, originalTemperature: { value: 0, unit: 'C' }, values: { density: 2 } })
    await expect(
      repo.saveRow({ sourceId: 'kreith', temperatureC: 0, originalTemperature: { value: 273.15, unit: 'K' }, values: { density: 3 } }),
    ).rejects.toBeInstanceOf(DuplicateTemperatureError)
    expect((await repo.listRows('kreith')).map((r) => r.values.density)).toEqual([1])
    expect((await repo.listRows('cengel')).map((r) => r.values.density)).toEqual([2])
  })

  it('exclui a fonte junto com suas linhas', async () => {
    await repo.saveRow({ sourceId: 'incropera', temperatureC: 10, originalTemperature: { value: 10, unit: 'C' }, values: { density: 1 } })
    await repo.deleteSource('incropera')
    expect((await repo.listSources()).map((s) => s.id)).toEqual(['kreith', 'cengel'])
    expect(await repo.listRows()).toHaveLength(0)
    await repo.restoreDefaultSources()
    expect((await repo.listSources()).map((s) => s.id)).toContain('incropera')
  })
})

describe('exportação e restauração do backup JSON', () => {
  it('faz ida e volta completa', async () => {
    const [k] = await repo.listSources()
    await repo.saveSource({ ...k, edition: 'edição de teste', pressureKPa: 100 })
    await repo.saveRow({ sourceId: 'kreith', temperatureC: 0, originalTemperature: { value: 0, unit: 'C' }, values: { density: 1.5, prandtl: 0.5 } })
    await repo.saveRow({ sourceId: 'kreith', temperatureC: 26.85, originalTemperature: { value: 300, unit: 'K' }, values: { density: 1.25 } })
    await repo.addFavorite({ value: 25, unit: 'C', label: 'ambiente' })

    const text = serializeBackup(await repo.exportBackup())

    await repo.resetAll()
    expect(await repo.listRows()).toHaveLength(0)

    const parsed = parseBackup(text)
    expect(parsed.ok).toBe(true)
    if (!parsed.ok) return
    await repo.restoreBackup(parsed.data)

    const sources = await repo.listSources()
    expect(sources.find((s) => s.id === 'kreith')?.edition).toBe('edição de teste')
    expect(sources.find((s) => s.id === 'kreith')?.pressureKPa).toBe(100)
    const rows = await repo.listRows('kreith')
    expect(rows.map((r) => r.values.density)).toEqual([1.5, 1.25])
    expect(rows[1].originalTemperature).toEqual({ value: 300, unit: 'K' })
    expect(rows[0].values.specificHeat).toBeUndefined()
    expect(await repo.listFavorites()).toHaveLength(1)
  })

  it('rejeita arquivos inválidos sem alterar nada', () => {
    expect(parseBackup('não é json').ok).toBe(false)
    expect(parseBackup('{"format":"outro"}').ok).toBe(false)
    const bad = JSON.stringify({
      format: 'artermo-backup',
      version: 1,
      sources: [{ id: 'a', shortName: 'A' }],
      rows: [
        { id: 'r1', sourceId: 'a', temperatureC: 0, values: { density: 1 } },
        { id: 'r2', sourceId: 'a', temperatureC: 0, values: { density: 2 } },
      ],
    })
    const r = parseBackup(bad)
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors.join(' ')).toContain('duplicada')
  })

  it('descarta campos desconhecidos e nunca executa conteúdo', () => {
    const text = JSON.stringify({
      format: 'artermo-backup',
      version: 1,
      sources: [{ id: 'a', shortName: 'A', __proto__x: 'x', evil: '() => alert(1)' }],
      rows: [{ id: 'r1', sourceId: 'a', temperatureC: 5, values: { density: 1, inventada: 3 } }],
    })
    const r = parseBackup(text)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(Object.keys(r.data.sources[0])).not.toContain('evil')
    expect(Object.keys(r.data.rows[0].values)).toEqual(['density'])
  })
})
