# Gases/Fluidos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar a Biblioteca editável por uma área Gases/Fluidos com tabelas embutidas somente leitura (Ar e Água 1 atm, cada um com Kreith, Incropera e Çengel ainda vazios), com busca e fluido ativo em Consultar/Comparar.

**Architecture:** Cada fluido é um `FluidDef` em `src/data/fluids/<id>/fluid.ts` mais CSVs opcionais na mesma pasta, carregados com `import.meta.glob` e validados pelo parser CSV que já existe. Um registro (`registry.ts`) entrega `LoadedFluid` (fontes + linhas) às telas. O IndexedDB deixa de guardar fontes e linhas e fica só com favoritos, histórico e configurações.

**Tech Stack:** React 19 + TypeScript + Vite 8, Dexie 4, Vitest 5, oxlint. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-01-gases-fluidos-design.md`

## Global Constraints

- Interface em pt-BR; temperatura interna em °C; propriedades em SI canônico.
- Nenhum valor de livro é inventado, estimado ou completado. Nesta entrega nenhum CSV real é criado: todas as referências ficam vazias.
- Célula vazia = dado ausente, nunca zero.
- Testes usam apenas números sintéticos, com o cabeçalho `// ATENÇÃO: todos os números deste arquivo são DADOS SINTÉTICOS DE TESTE.`
- Nome do app: **ArTermo — Propriedades Termofísicas**; subtítulo do cabeçalho: **Propriedades termofísicas**.
- Fluidos: `ar` → "Ar" (gás, sem condição); `agua` → "Água" com condição "1 atm" (líquido). Referências de ambos: `kreith` "Kreith", `incropera` "Incropera", `cengel` "Çengel", com metadados vazios.
- Id de fonte: `<fluidId>-<refId>` (ex.: `agua-kreith`). Fluido padrão: `ar`.
- Texto de tabela vazia: "Tabela ainda não disponível nesta versão do app."
- Texto de fluido sem dados: "Os dados de <nome exibido> ainda não foram incluídos nesta versão do app."
- Nenhuma dependência nova. `npm run check` (lint + testes + build) passa ao fim de cada tarefa.
- Commits: `git -c user.name="jogadoronline709" -c user.email="jogadoronline709@gmail.com" commit`, mensagem terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Configurações salvas na versão antiga** (têm `compareSourceIds`, não têm `activeFluidId`/`compareSelection`) → o app abre no Ar sem erro. Teste em Task 2 (`getFluid(undefined)`) e Task 3 (`selectedCompareIds(undefined, …)`).
2. **Banco IndexedDB v1 com fontes e linhas digitadas** → atualiza para v2 sem erro e preserva favoritos e histórico. Teste em Task 5.
3. **Link antigo `#/biblioteca/kreith`** → abre Gases/Fluidos. Teste em Task 4.
4. **Busca com acento, maiúscula, espaços, prefixo ou "H₂O" subscrito** → encontra o fluido. Teste em Task 1.
5. **Água em exatamente 0 °C e 100 °C** → sem alerta (faixa inclusiva); −0,01 °C e 100,01 °C → alerta. Teste em Task 1.

---

### Task 1: Domínio de fluidos (tipos, nome, busca, faixa válida)

**Files:**
- Create: `src/domain/fluids.ts`
- Test: `src/tests/fluids.test.ts`

**Interfaces:**
- Produces:
  - `type FluidCategory = 'gas' | 'liquido'`
  - `interface ReferenceDef { id; shortName; authors; title; edition; year; pageTable: string; pressureKPa: number | null; pressureUnit: PressureUnit; originalTempUnit: TempUnit; inputUnits: PropertyUnitPrefs; notes: string }`
  - `interface FluidDef { id: string; name: string; condition: string; category: FluidCategory; aliases: string[]; validRange?: { minC?: number; maxC?: number; message: string }; references: ReferenceDef[] }`
  - `fluidDisplayName(def: Pick<FluidDef, 'name' | 'condition'>): string` → `"Água (1 atm)"` / `"Ar"`
  - `categoryLabel(c: FluidCategory): string` → `'Gás'` / `'Líquido'`
  - `normalizeSearch(s: string): string` — minúsculas, sem acentos (NFD), dígitos subscritos `₀–₉` → `0–9`, espaços colapsados, trim
  - `searchFluids<T extends { def: FluidDef }>(items: T[], query: string): T[]` — consulta normalizada vazia → todos; senão, mantém itens em que algum de `name`, `condition`, `fluidDisplayName`, `aliases` normalizado **contém** a consulta; preserva a ordem
  - `rangeWarning(def: FluidDef, tC: number): string | null` — `null` se não há `validRange` ou `minC ≤ tC ≤ maxC` (limites ausentes não restringem); senão `validRange.message`

- [ ] **Step 1: Escrever os testes** em `src/tests/fluids.test.ts`, com uma `FluidDef` sintética de água (`id 'agua'`, `name 'Água'`, `condition '1 atm'`, `aliases ['agua','water','h2o']`, `validRange { minC: 0, maxC: 100, message: 'FORA' }`) e uma de ar (`aliases ['air']`, sem faixa):
  - `fluidDisplayName` → `'Água (1 atm)'` e `'Ar'`
  - `searchFluids` com `'agua'`, `'ÁGUA'`, `'  Água  '`, `'ag'`, `'water'`, `'H₂O'`, `'h2o'` → só água; `'ar'` → contém ar; `''` e `'   '` → ambos; `'xyz'` → `[]`
  - `rangeWarning(agua, 0)`, `(agua, 100)`, `(agua, 50)` → `null`; `(agua, -0.01)` e `(agua, 100.01)` → `'FORA'`; `rangeWarning(ar, 5000)` → `null`
- [ ] **Step 2:** `npx vitest run src/tests/fluids.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3: Implementar** `src/domain/fluids.ts` com as assinaturas acima (importa `PressureUnit`, `TempUnit`, `PropertyUnitPrefs` de `./types`).
- [ ] **Step 4:** `npx vitest run src/tests/fluids.test.ts` → PASS.
- [ ] **Step 5: Commit** `feat: domínio de fluidos (busca e faixa válida)`.

---

### Task 2: Carregador, registro e definições de Ar e Água

**Files:**
- Modify: `src/domain/types.ts` (adicionar `fluidId: string` em `Source`)
- Modify: `src/data/defaults.ts` (`newSource` aceita `fluidId`, padrão `''`)
- Modify: `src/data/backup.ts` (o objeto `Source` montado em `parseBackup` ganha `fluidId: ''`, só para compilar; o arquivo é apagado na Task 5)
- Create: `src/data/fluids/loader.ts`, `src/data/fluids/registry.ts`, `src/data/fluids/ar/fluid.ts`, `src/data/fluids/agua/fluid.ts`
- Test: `src/tests/fluidLoader.test.ts`

**Interfaces:**
- Consumes: Task 1 (`FluidDef`, `ReferenceDef`, `fluidDisplayName`); `parseCsv`, `autoMap`, `validateImport` de `src/data/csv.ts`; `newSource` de `src/data/defaults.ts`.
- Produces:
  - `interface LoadedFluid { def: FluidDef; sources: Source[]; rowsBySource: Record<string, DataRow[]>; errors: Record<string, string[]> }`
  - `sourceIdFor(fluidId: string, refId: string): string` → `` `${fluidId}-${refId}` ``
  - `loadFluid(def: FluidDef, csvByRefId: Record<string, string | undefined>): LoadedFluid`
  - `groupCsvByFluid(glob: Record<string, string>): { byFluid: Record<string, Record<string, string>>; malformed: string[] }` — chave `./<fluidId>/<refId>.csv`; qualquer outra forma vai para `malformed`
  - `registry.ts`: `DEFAULT_FLUID_ID = 'ar'`, `FLUID_DEFS: FluidDef[]` (`[AR, AGUA]`), `FLUIDS: LoadedFluid[]`, `findFluid(id: string): LoadedFluid | undefined`, `getFluid(id: string | undefined): LoadedFluid` (cai em `ar` se o id não existir), `ORPHAN_CSVS: string[]` (CSV malformado ou cujo fluido/referência não existe)
  - `ar/fluid.ts` exporta `AR: FluidDef`; `agua/fluid.ts` exporta `AGUA: FluidDef`

- [ ] **Step 1: Escrever os testes** (dados sintéticos) em `src/tests/fluidLoader.test.ts`:
  - `loadFluid` com uma def sintética de 2 referências e CSV só para a primeira (`temperature,density,specific_heat\n0;…` em vírgula; `originalTempUnit 'K'` e `inputUnits { specificHeat: 'kJ/(kg.K)' }` no `ReferenceDef`): fonte 1 com linhas em °C (`273,15 K → 0 °C`) e cp ×1000; fonte 2 com `[]`; `errors` = `{}`; ids `x-r1`, `x-r2`; `source.fluidId === 'x'`; `source.fluid === fluidDisplayName(def)`; `order` 0 e 1; ids de linha únicos.
  - CSV inválido (densidade `abc`) → `rowsBySource[id]` = `[]` e `errors[id]` não vazio contendo o número da linha; a outra referência não é afetada.
  - Dois fluidos com referência `kreith` → ids diferentes e nenhuma linha de um aparece no outro.
  - `groupCsvByFluid({'./agua/kreith.csv':'a', './x.csv':'b'})` → `byFluid.agua.kreith === 'a'`, `malformed` = `['./x.csv']`.
  - Registro: ids de fluido únicos; ids de referência únicos por fluido; todo fluido com ≥ 1 referência; `FLUIDS.every(f => Object.keys(f.errors).length === 0)`; `ORPHAN_CSVS` = `[]`; `getFluid(undefined).def.id === 'ar'`; `getFluid('nao-existe').def.id === 'ar'`; `findFluid('agua')?.def.condition === '1 atm'`.
- [ ] **Step 2:** `npx vitest run src/tests/fluidLoader.test.ts` → FAIL.
- [ ] **Step 3: Implementar.**
  - `loadFluid`: para cada `ReferenceDef` (índice = `order`) cria `newSource({ id, fluidId: def.id, fluid: fluidDisplayName(def), ...metadados, createdAt: '', updatedAt: '' })`. Com CSV: `parseCsv` → `autoMap(header)` → `validateImport(parsed, map, { tempUnit: ref.originalTempUnit, units: ref.inputUnits }, id)`. Se houver `errors`, linhas = `[]` e mensagens `Linha N — campo: mensagem` (campo opcional). Senão, linhas com id `${sourceId}-${i}`. Erro lançado pelo parser também vira `errors[id]`.
  - `registry.ts`: `import.meta.glob<string>('./*/*.csv', { query: '?raw', import: 'default', eager: true })` → `groupCsvByFluid` → `loadFluid` por def.
  - `AR`: `aliases ['ar', 'air', 'ar atmosferico', 'ar seco']`, categoria `gas`, sem `validRange`.
  - `AGUA`: `aliases ['agua', 'water', 'h2o', 'agua liquida']`, categoria `liquido`, `validRange { minC: 0, maxC: 100, message: 'Fora de 0 a 100 °C, a água a 1 atm não é líquida (gelo abaixo de 0 °C, vapor acima de 100 °C). Acima de 100 °C, valores de uma tabela de líquido saturado correspondem à pressão de saturação, maior que 1 atm.' }`.
  - As três referências de cada fluido: metadados `''`, `pressureKPa: null`, `pressureUnit: 'kPa'`, `originalTempUnit: 'C'`, `inputUnits: {}`, `notes: ''`.
  - Comentário no topo de cada `fluid.ts`: "Para adicionar a tabela de um livro: crie `<ref>.csv` nesta pasta (cabeçalhos de `CSV_HEADERS`), preencha os metadados abaixo conforme o exemplar e rode `npm test`."
- [ ] **Step 4:** `npx vitest run` → PASS (todos); `npx tsc -b` sem erro.
- [ ] **Step 5: Commit** `feat: registro de fluidos com tabelas embutidas (Ar e Água 1 atm)`.

---

### Task 3: Consultar e Comparar usam o fluido ativo

**Files:**
- Modify: `src/data/types.ts` (`AppSettings`: adicionar `activeFluidId: string` = `'ar'` e `compareSelection: Record<string, string[]>` = `{}`; remover `compareSourceIds`)
- Create: `src/lib/compareSelection.ts`, `src/components/FluidBar.tsx`
- Modify: `src/App.tsx`, `src/pages/QueryPage.tsx`, `src/components/ComparePanel.tsx`, `src/components/SourceResult.tsx`, `src/styles.css`
- Test: `src/tests/compareSelection.test.ts`

**Interfaces:**
- Consumes: Task 2 (`getFluid`, `LoadedFluid`); Task 1 (`fluidDisplayName`, `rangeWarning`).
- Produces:
  - `NONE_SELECTED = '__nenhuma__'`
  - `selectedCompareIds(saved: string[] | undefined, sources: Source[], rowsBySource: Record<string, DataRow[]>): string[]` — `saved` ausente/vazio → ids com dados (ou todos, se nenhum tiver dados); senão, `saved` filtrado aos ids de `sources` (o sentinela resulta em `[]`)
  - `toggleCompareId(current: string[], id: string): string[]` — alterna; se ficar vazio devolve `[NONE_SELECTED]`
  - `QueryPage` recebe `fluid: LoadedFluid` no lugar de `sources`/`rowsBySource`; `ComparePanel` recebe também `fluidId: string`
  - `FluidBar({ fluid: LoadedFluid; tC: number | null })`

- [ ] **Step 1: Testes** (sintéticos) em `src/tests/compareSelection.test.ts`: `selectedCompareIds(undefined, [a,b,c], {a:[1 linha], c:[1 linha]})` → `['a','c']`; com nenhum dado → `['a','b','c']`; `(['c','zz'], …)` → `['c']`; `(['__nenhuma__'], …)` → `[]`; `toggleCompareId(['a'], 'a')` → `['__nenhuma__']`; `toggleCompareId(['a'], 'b')` → `['a','b']`.
- [ ] **Step 2:** `npx vitest run src/tests/compareSelection.test.ts` → FAIL.
- [ ] **Step 3: Implementar.**
  - `compareSelection.ts` conforme as assinaturas.
  - `ComparePanel`: lê `settings.compareSelection[fluidId]` via `selectedCompareIds`; ao alternar, `update({ compareSelection: { ...settings.compareSelection, [fluidId]: toggleCompareId(selectedIds, id) } })`.
  - `App.tsx`: `const fluid = getFluid(settings.activeFluidId)` (via `useSettings`) para as rotas consultar/comparar; a rota biblioteca continua como está até a Task 4.
  - `FluidBar`: linha "Fluido: **<nome exibido>**" + link **trocar** para `#/fluidos` (a rota passa a existir na Task 4; até lá o link pode cair em Consultar) + quando `tC != null` e `rangeWarning(...)` existir, um alerta `role="alert"` não descartável, no mesmo estilo do aviso de incompatibilidade do `ComparePanel`. Renderizado no topo de `QueryPage` (vale para as duas abas).
  - `QueryPage`: o painel "Comece pelas suas tabelas" vira um painel com o texto de fluido sem dados (Global Constraints), mostrado quando nenhuma fonte do fluido tem linhas.
  - `SourceResult`: com tabela vazia, mostra o texto de tabela vazia; sem botão de editar/preencher. Nova prop `loadErrors?: string[]` (QueryPage passa `fluid.errors[active.id]`): se não vazia, mostra "Tabela embutida com erro — não entra nos cálculos." e a lista.
  - `QueryPage` repassa `fluid.sources` e `fluid.rowsBySource` a `TempPanel`, `SourceResult` e `ComparePanel`, como hoje.
- [ ] **Step 4:** `npm run check` → PASS. No navegador (`npm run dev`), Consultar mostra "Fluido: Ar", as abas Kreith/Incropera/Çengel e o texto de tabela vazia.
- [ ] **Step 5: Commit** `feat: Consultar e Comparar restritos ao fluido ativo`.

---

### Task 4: Área Gases/Fluidos e rotas

**Files:**
- Modify: `src/hooks/useRoute.ts`, `src/App.tsx` (menu e rotas), `src/styles.css`
- Create: `src/pages/FluidsPage.tsx`, `src/pages/FluidPage.tsx`, `src/components/ReadOnlyTable.tsx`
- Delete: `src/pages/LibraryPage.tsx`, `src/pages/SourceEditorPage.tsx`, `src/components/RowEditor.tsx`, `src/components/ImportDialog.tsx`
- Test: `src/tests/route.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3 (`searchFluids`, `categoryLabel`, `fluidDisplayName`, `FLUIDS`, `findFluid`, `LoadedFluid`, `settings.activeFluidId`).
- Produces:
  - `Route` = `{ page: 'consultar'; tab?: string } | { page: 'comparar' } | { page: 'fluidos'; fluidId?: string; refId?: string } | { page: 'config' }` (sem `biblioteca`)
  - `FluidsPage({ fluids: LoadedFluid[] })`, `FluidPage({ fluid: LoadedFluid; refId?: string })`, `ReadOnlyTable({ source: Source; rows: DataRow[]; sig: number })`

- [ ] **Step 1: Testes** em `src/tests/route.test.ts`: `parseHash('#/fluidos')` → `{page:'fluidos'}`; `'#/fluidos/agua'` → `fluidId 'agua'`; `'#/fluidos/agua/kreith'` → também `refId 'kreith'`; `'#/biblioteca'` e `'#/biblioteca/kreith'` → `{page:'fluidos'}` sem ids; `href({page:'fluidos', fluidId:'agua', refId:'cengel'})` → `'#/fluidos/agua/cengel'`; ida e volta `parseHash(href(r))` igual a `r` para as quatro páginas.
- [ ] **Step 2:** `npx vitest run src/tests/route.test.ts` → FAIL.
- [ ] **Step 3: Implementar.**
  - Rotas conforme a interface (decodificar segmentos como hoje).
  - Menu: Consultar · Comparar · **Gases/Fluidos** (`#/fluidos`) · Configurações; o item fica ativo em qualquer `#/fluidos…`. O link "trocar" do `FluidBar` aponta para `#/fluidos`.
  - `FluidsPage`: título "Gases/Fluidos"; `<input type="search">` com rótulo "Pesquisar fluido" e `autoFocus` só quando `matchMedia('(min-width: 768px)')`; cartões de `searchFluids(fluids, q)` com nome exibido, `categoryLabel` e "N de M referências com dados", cada um linkando para `#/fluidos/<id>`; o cartão do fluido ativo é marcado; sem resultado: `Nenhum fluido encontrado para "q".`
  - `FluidPage`: cabeçalho com nome exibido e categoria; aviso `validRange.message` quando houver (texto informativo, não alerta); botão **Consultar este fluido** → `update({ activeFluidId })` e `navigate({ page: 'consultar' })`; abas por referência (links `#/fluidos/<fluid>/<ref>`; `refId` inválido ou ausente → primeira); na aba: citação (`citation` de `lib/report.ts`), pressão (`pressureText`), notas, `loadErrors` se houver, e `ReadOnlyTable` ou o texto de tabela vazia. Fluido inexistente em `#/fluidos/<id>` → mensagem "Fluido não encontrado." + link para a lista.
  - `ReadOnlyTable`: colunas T (unidade original) e T (°C), depois só as propriedades com algum valor na tabela, cada uma convertida com `fromCanonical` para `source.inputUnits[k] ?? unidade canônica` e o rótulo da unidade no cabeçalho; célula ausente = "—"; números com `formatNumber(…, { sig })`. CSS: rolagem horizontal com primeira coluna `position: sticky`.
  - Apagar as quatro telas/componentes da Biblioteca e tudo em `App.tsx` que dependia delas.
- [ ] **Step 4:** `npm run check` → PASS. No navegador: pesquisar "água" mostra só Água (1 atm); abrir Água → abas vazias; "Consultar este fluido" → Consultar mostra "Fluido: Água (1 atm)"; 120 °C mostra o alerta da faixa; `#/biblioteca` cai em Gases/Fluidos; largura 375 px sem rolagem horizontal na página.
- [ ] **Step 5: Commit** `feat: área Gases/Fluidos com busca e tabelas somente leitura`.

---

### Task 5: Persistência só para preferências; remoção de backup, demo e CSV manual

**Files:**
- Modify: `src/data/db.ts`, `src/data/repository.ts`, `src/hooks/useData.ts`, `src/pages/SettingsPage.tsx`, `src/data/csv.ts`, `src/tests/csv.test.ts`, `src/domain/types.ts`, `src/domain/compatibility.ts`, `src/components/SourceResult.tsx`, `src/components/ThermoScale.tsx`, `src/components/ComparePanel.tsx`, `src/lib/report.ts`, `src/tests/calculations.test.ts` (se referir `simulated`), `vite.config.ts`, `src/styles.css`
- Delete: `src/data/backup.ts`, `src/data/demo.ts`, `src/tests/backup.test.ts`, `public/modelo_dados_ar.csv`
- Test: `src/tests/repository.test.ts`

**Interfaces:**
- Produces: `ArTermoDB` v2 com `favorites`, `history`, `settings`; repositório com `listFavorites`, `addFavorite`, `removeFavorite`, `addHistory`, `clearHistory`, `getSettings`, `saveSettings` (inalterados) e o novo `clearUserData(): Promise<void>` (apaga favoritos, histórico e configurações). `useData.ts` exporta só `repo`, `useFavorites`, `useHistory`.

- [ ] **Step 1: Testes** em `src/tests/repository.test.ts` (com `fake-indexeddb/auto`, banco de nome único por teste):
  - Atualização v1 → v2: abrir um `new Dexie(nome)` com o esquema v1 literal (`sources: 'id, order'`, `rows: 'id, sourceId, [sourceId+temperatureC]'`, `favorites: 'id, createdAt'`, `history: '++id, at'`, `settings: 'key'`), gravar 1 fonte, 1 linha, 1 favorito e 1 histórico, fechar; abrir `new ArTermoDB(nome)` → abre sem erro, `tables` sem `sources`/`rows`, 1 favorito e 1 histórico preservados.
  - `getSettings()` com registro antigo `{ compareSourceIds: ['kreith'], theme: 'dark' }` → `activeFluidId === 'ar'`, `compareSelection` = `{}`, `theme === 'dark'`.
  - `clearUserData()` → zero favoritos, zero histórico, `getSettings()` igual a `DEFAULT_SETTINGS`.
  - Histórico mantém no máximo 30 entradas e ignora repetição consecutiva (comportamento atual).
- [ ] **Step 2:** `npx vitest run src/tests/repository.test.ts` → FAIL.
- [ ] **Step 3: Implementar.**
  - `db.ts`: manter `version(1)` como está e acrescentar `version(2).stores({ sources: null, rows: null })`; remover o `populate` e os campos `sources`/`rows` da classe.
  - `repository.ts`: remover fontes, linhas, importação, backup, demo e `resetAll`; adicionar `clearUserData`.
  - Remover `isSimulated` de `Source`, o tipo `'simulated'` e seu bloco em `compatibility.ts`, `SimulatedBanner` e as marcações `is-sim` em componentes, CSS e `report.ts`.
  - `csv.ts`: remover `mergeRows`, `MergeMode`, `exportSourceCsv`, `csvTemplate`, `MAX_CSV_BYTES` e o que ficar sem uso (o `oxlint` e o `tsc` apontam); manter `parseCsv`, `autoMap`, `headerUnit`, `validateImport`, `CSV_HEADERS`. Remover de `csv.test.ts` só os testes dessas funções.
  - `vite.config.ts`: tirar `modelo_dados_ar.csv` de `includeAssets`.
  - `SettingsPage`: remover as seções Backup e Dados de demonstração; "Apagar tudo" vira "Limpar histórico, favoritos e preferências" (confirmação: "Histórico, favoritos e preferências deste dispositivo serão apagados. As tabelas dos fluidos não são afetadas.") e chama `repo.clearUserData()`; Armazenamento passa a dizer que as tabelas vêm com o app e só preferências, favoritos e histórico ficam no dispositivo.
- [ ] **Step 4:** `npm run check` → PASS; `grep -rn "isSimulated\|backup\|demo\|biblioteca" src` sem ocorrências de código.
- [ ] **Step 5: Commit** `refactor: IndexedDB só para preferências; remove backup, demo e CSV manual`.

---

### Task 6: Novo nome e documentação

**Files:**
- Modify: `index.html`, `vite.config.ts` (manifest), `src/App.tsx` (subtítulo), `package.json` (`description`), `README.md`, `CLAUDE.md`

- [ ] **Step 1: Textos do app.** `<title>` e `name` do manifest: `ArTermo — Propriedades Termofísicas`. `description` (HTML e manifest): `Consulta, interpolação e comparação de propriedades termofísicas de gases e fluidos (Ar, Água a 1 atm…) a partir de tabelas de referência embutidas. Funciona offline.` Subtítulo do cabeçalho: `Propriedades termofísicas`. `package.json` `description`: `ArTermo — Propriedades Termofísicas (PWA)`.
- [ ] **Step 2: README.** Título e introdução com o novo nome; "Como usar" passa a ser Gases/Fluidos → escolher fluido → Consultar/Comparar; a seção "Importação CSV" vira "Dados embutidos" (onde ficam os arquivos, formato `CSV_HEADERS`, comentários `#`, unidades aceitas — manter a tabela de unidades); remover o backup das instruções de instalação; atualizar a árvore de `src/`.
- [ ] **Step 3: CLAUDE.md.** Seção 1 com o novo nome e fluidos. Seção 2: trocar as regras de "não distribuir tabelas / inseridas pelo usuário" por: "Os dados embutidos vêm de tabelas fornecidas pelo dono do projeto, que responde pelo direito de uso. Cada referência cita autores, título, edição, ano e página/tabela conforme informado. Nenhum valor é inventado, estimado ou completado. Os dados são somente leitura no app." Seção 4 → fluidos iniciais (Ar; Água 1 atm, faixa 0–100 °C) com Kreith, Incropera e Çengel. Seção 6 → "Gases/Fluidos" (busca, página por fluido, tabela somente leitura). Seção 11: tirar o incentivo ao backup. Seções 13 e 16 alinhadas à spec. Nova seção **"Como adicionar um fluido ou uma tabela"**: (1) pasta `src/data/fluids/<id>/` com `fluid.ts`; (2) incluir em `FLUID_DEFS` no `registry.ts`; (3) CSV `<refId>.csv` com cabeçalhos `CSV_HEADERS`; (4) preencher os metadados no `ReferenceDef`; (5) adicionar em `units.ts` escalas que faltarem, com teste; (6) `npm run check`.
- [ ] **Step 4:** `npm run check` → PASS.
- [ ] **Step 5: Commit** `docs: ArTermo — Propriedades Termofísicas; regras de dados embutidos`.

---

### Task 7: Verificação final

- [ ] **Step 1:** `npm run check` → lint sem avisos, todos os testes passando, build com service worker gerado.
- [ ] **Step 2:** `npm run build` + `npm run preview`; no navegador em 1280 px e 375 px: menu com Gases/Fluidos; busca "H₂O" → Água (1 atm); página da Água com três abas vazias e o aviso de faixa; "Consultar este fluido" → barra "Fluido: Água (1 atm)"; 120 °C → alerta; Comparar sem média e com o texto de fluido sem dados; Configurações sem Backup e sem Demo; console sem erros.
- [ ] **Step 3:** Conferir que nenhuma tela mostra números de livro e que `src/data/fluids/` não tem CSV.
