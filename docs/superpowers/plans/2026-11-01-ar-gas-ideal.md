# Ar (gás ideal) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adicionar o fluido "Ar (gás ideal)" com a Tabela A-17 do Çengel (h, u, s°, Pᵣ, vᵣ), com conjunto de propriedades próprio e teste de consistência da transcrição.

**Architecture:** Cada fluido declara `propertySet` (`transporte` | `gasIdeal`) e `pressureApplies`; o carregador copia os dois para cada `Source`, e telas/relatórios obtêm a lista de propriedades com `propertyDefsFor(source.propertySet)`. Os dados entram como CSV embutido em `src/data/fluids/ar-gas-ideal/`.

**Tech Stack:** React 19 + TypeScript + Vite 8, Vitest 5, oxlint. Nenhuma dependência nova.

**Spec:** `docs/superpowers/specs/2026-11-01-ar-gas-ideal-design.md`

## Global Constraints

- pt-BR; temperatura interna em °C; valores guardados em SI canônico (h, u em J/kg; s° em J/(kg·K)).
- Símbolos: h, u, s°, **Pᵣ** (pressão relativa), **vᵣ** (volume relativo). O alias CSV `pr` continua sendo Prandtl.
- Números da A-17 copiados exatamente como impressos; nenhum valor inventado ou completado. Testes de código usam dados sintéticos; o teste de consistência lê a tabela embutida sem repetir números dela.
- Ar e Água não mudam de comportamento.
- `npm run check` verde ao fim de cada tarefa. Commits com `git -c user.name="jogadoronline709" -c user.email="jogadoronline709@gmail.com" commit`, mensagem terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Coluna "Pr" num CSV de gás ideal** → se o cabeçalho for `pr`, vira Prandtl; o CSV da A-17 deve usar `relative_pressure`. Teste em Task 1 (alias `pr` → prandtl; `pressao_relativa` → relativePressure).
2. **Fonte de gás ideal na checagem de compatibilidade** → nenhum aviso de pressão, mesmo com `pressureKPa: null`. Teste em Task 2.
3. **Gráfico do Comparar ao trocar para gás ideal** → a propriedade padrão do gráfico deve existir no conjunto (não `density`). Coberto em Task 3 pelo helper `defaultChartProp`.
4. **Erro de transcrição de um dígito** → o teste de consistência acusa a linha. Teste em Task 4 com uma tabela sintética adulterada.
5. **Busca "ar"** → retorna Ar e Ar (gás ideal) nessa ordem, sem a Água. Teste em Task 4.

---

### Task 1: Propriedades de gás ideal e conjuntos

**Files:**
- Modify: `src/domain/types.ts` (`PropertyKey`), `src/domain/units.ts`, `src/data/csv.ts`
- Test: `src/tests/units.test.ts`, `src/tests/csv.test.ts`

**Interfaces:**
- Produces:
  - `PropertyKey` += `'enthalpy' | 'internalEnergy' | 'entropyStd' | 'relativePressure' | 'relativeVolume'`
  - `type PropertySetId = 'transporte' | 'gasIdeal'` (em `types.ts`)
  - `PROPERTY_SETS: Record<PropertySetId, PropertyKey[]>`; `propertyDefsFor(set: PropertySetId = 'transporte'): PropertyDef[]`
  - `PropertyDef`s novos (em `PROPERTY_DEFS`, depois dos sete atuais):
    - `enthalpy`: label `Entalpia`, symbol `h`, canonical `J/kg`, csv `enthalpy`, csvUnit `enthalpy_unit`, units `J/kg` (factor 1) e `kJ/kg` (factor 1000)
    - `internalEnergy`: `Energia interna`, `u`, idem unidades, csv `internal_energy`
    - `entropyStd`: `Entropia padrão`, `s°`, canonical `J/(kg·K)`, csv `entropy_std`, units `J/(kg.K)` (1) e `kJ/(kg.K)` (1000)
    - `relativePressure`: `Pressão relativa`, `Pᵣ`, canonical `—`, csv `relative_pressure`, unidade única adimensional (como `prandtl`)
    - `relativeVolume`: `Volume relativo`, `vᵣ`, canonical `—`, csv `relative_volume`, adimensional
  - `HEADER_ALIASES` novos: `enthalpy`: `enthalpy, entalpia, h`; `internalEnergy`: `internalenergy, energiainterna, u`; `entropyStd`: `entropystd, entropia, s0, so`; `relativePressure`: `relativepressure, pressaorelativa, prel`; `relativeVolume`: `relativevolume, volumerelativo, vrel, vr`; e as colunas `*_unit` correspondentes. `pr` continua só em `prandtl`.

- [ ] **Step 1: Testes.** `units.test.ts`: `toCanonical('enthalpy', 1.5, 'kJ/kg')` = 1500; `toCanonical('entropyStd', 1.2, 'kJ/(kg.K)')` = 1200; `propertyDefsFor('gasIdeal').map(d => d.key)` = `['enthalpy','internalEnergy','entropyStd','relativePressure','relativeVolume']`; `propertyDefsFor('transporte')` = os sete atuais na ordem atual; `propertyDefsFor()` = transporte; `parsePropertyUnit('enthalpy','kJ/kg')` = `'kJ/kg'`. `csv.test.ts`: `autoMap(['temperatura','entalpia','pressao_relativa','pr','s0','volume_relativo','energia_interna'])` mapeia `enthalpy`, `relativePressure`, `prandtl` (coluna `pr`), `entropyStd`, `relativeVolume`, `internalEnergy`; CSV sintético `temperature (K);enthalpy (kJ/kg);relative_pressure` com 2 linhas valida sem erro e converte h ×1000.
- [ ] **Step 2:** `npx vitest run src/tests/units.test.ts src/tests/csv.test.ts` → FAIL.
- [ ] **Step 3: Implementar** conforme as interfaces. `query.ts` continua iterando `PROPERTY_KEYS` (todas); as derivadas só usam chaves de transporte.
- [ ] **Step 4:** `npm run check` → PASS.
- [ ] **Step 5: Commit** `feat: propriedades de gás ideal e conjuntos de propriedades`.

---

### Task 2: Fluido declara conjunto e se a pressão se aplica

**Files:**
- Modify: `src/domain/fluids.ts`, `src/domain/types.ts` (`Source`), `src/data/defaults.ts`, `src/data/fluids/loader.ts`, `src/domain/compatibility.ts`
- Test: `src/tests/fluidLoader.test.ts`, `src/tests/calculations.test.ts`

**Interfaces:**
- Consumes: Task 1 (`PropertySetId`).
- Produces:
  - `FluidDef.propertySet?: PropertySetId` (padrão `'transporte'`), `FluidDef.pressureApplies?: boolean` (padrão `true`)
  - `Source.propertySet?: PropertySetId`, `Source.pressureApplies?: boolean` — preenchidos por `loadFluid` a partir do fluido (`newSource` aceita os dois; padrão ausente = transporte / true)
  - `checkCompatibility`: se alguma fonte tem `pressureApplies === false`, não gera `pressure_missing` nem `pressure_different`
  - Loader: `DIMENSIONLESS` = `['prandtl', 'relativePressure', 'relativeVolume']`

- [ ] **Step 1: Testes.** `fluidLoader.test.ts`: fluido sintético com `propertySet: 'gasIdeal', pressureApplies: false` → `sources[0].propertySet === 'gasIdeal'` e `pressureApplies === false`; fluido sem os campos → `propertySet` `'transporte'` (ou ausente tratado como tal) e `pressureApplies !== false`; CSV `temperature (K),relative_pressure,relative_volume` sem unidades carrega sem erro; CSV `temperature (K),enthalpy` sem unidade de h → erro citando `h`. `calculations.test.ts`: `checkCompatibility([{shortName:'A', fluid:'X', pressureKPa:null, pressureApplies:false}, {…B igual}])` → `compatible: true`, sem issues.
- [ ] **Step 2:** rodar os dois arquivos → FAIL.
- [ ] **Step 3: Implementar.** `checkCompatibility` passa a aceitar `Pick<Source, 'shortName' | 'fluid' | 'pressureKPa' | 'pressureApplies'>`.
- [ ] **Step 4:** `npm run check` → PASS.
- [ ] **Step 5: Commit** `feat: fluidos declaram conjunto de propriedades e uso da pressão`.

---

### Task 3: Telas e relatórios usam o conjunto do fluido

**Files:**
- Modify: `src/components/SourceResult.tsx`, `src/components/ComparePanel.tsx`, `src/lib/readOnlyTable.ts`, `src/lib/report.ts`, `src/pages/FluidPage.tsx`
- Test: `src/tests/readOnlyTable.test.ts`, `src/tests/report.test.ts`, `src/tests/compareSelection.test.ts`

**Interfaces:**
- Consumes: Tasks 1–2 (`propertyDefsFor`, `Source.propertySet`, `Source.pressureApplies`).
- Produces: `defaultChartProp(sources: Source[]): PropertyKey` em `src/lib/compareSelection.ts` → primeira chave de `propertyDefsFor(sources[0]?.propertySet)`.

- [ ] **Step 1: Testes** (fonte sintética `newSource({…, propertySet: 'gasIdeal', pressureApplies: false})`): `buildReadOnlyTable` mostra colunas na ordem h, u, s°, Pᵣ, vᵣ (as que têm dados); `sourceReportText` não contém `Pressão de referência` e contém `h =`, não contém `ρ`; `sourceReportCsv` sem linha `pressao`; `compareReportCsv` só com linhas do conjunto; `defaultChartProp([gasSource])` = `'enthalpy'`, `defaultChartProp([transportSource])` = `'density'`, `defaultChartProp([])` = `'density'`. Relatórios de fonte de transporte continuam com a linha de pressão.
- [ ] **Step 2:** rodar os três arquivos → FAIL.
- [ ] **Step 3: Implementar.** Trocar `PROPERTY_DEFS` por `propertyDefsFor(source.propertySet)` (ou `sources[0]?.propertySet` no Comparar) nos cinco arquivos; esconder a linha "Pressão" (resultado, página do fluido, relatórios) quando `pressureApplies === false`; estado do gráfico do Comparar inicia com `defaultChartProp(sources)` e volta a ele se a propriedade escolhida não estiver no conjunto.
- [ ] **Step 4:** `npm run check` → PASS.
- [ ] **Step 5: Commit** `feat: telas e relatórios exibem as propriedades do fluido`.

---

### Task 4: Dados da A-17 e conferência da transcrição

**Files:**
- Create: `src/data/fluids/ar-gas-ideal/fluid.ts`, `src/data/fluids/ar-gas-ideal/cengel.csv`, `src/tests/arGasIdeal.test.ts`, `src/lib/idealGasChecks.ts`
- Modify: `src/data/fluids/registry.ts` (`FLUID_DEFS = [AR, AR_GAS_IDEAL, AGUA]`), `src/tests/fluidLoader.test.ts` (ordem e nomes do registro), `src/tests/fluids.test.ts` ou `fluidLoader.test.ts` (busca no registro real)

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces:
  - `AR_GAS_IDEAL: FluidDef` conforme a spec 3.3
  - `checkIdealGasTable(rows: DataRow[]): string[]` em `src/lib/idealGasChecks.ts` — devolve uma mensagem por violação, citando a temperatura em K; regras e tolerâncias da spec seção 5 (R = 0,287 kJ/(kg·K))

- [ ] **Step 1: Testes de `checkIdealGasTable`** com tabela **sintética** gerada no próprio teste a partir de R = 0,287 (h = cp·T com cp fixo, u = h − R·T, Pᵣ = exp(s°/R)…, vᵣ = c·T/Pᵣ): tabela coerente → `[]`; mesma tabela com um dígito trocado em u numa linha → uma mensagem citando aquela T; vᵣ crescente numa linha → mensagem; T repetida → mensagem.
- [ ] **Step 2:** rodar → FAIL; implementar `checkIdealGasTable`; rodar → PASS.
- [ ] **Step 3: Transcrever a A-17** das duas imagens para `cengel.csv` (cabeçalhos da spec 3.3, `;`, vírgula decimal, sem separador de milhar, linha `# Çengel, Tabela A-17 — Propriedades de gás ideal do ar. Transcrito das imagens fornecidas pelo dono.`). Criar `fluid.ts` e registrar.
- [ ] **Step 4: Teste da tabela embutida** `arGasIdeal.test.ts`: o fluido `ar-gas-ideal` carrega sem erro; primeira T = 200 K e última = 2.250 K (comparando `originalTemperature.value`); `checkIdealGasTable(rows)` = `[]`. Busca no registro: "ar" → `['ar','ar-gas-ideal']`; "gas ideal" e "a-17" → `['ar-gas-ideal']`.
- [ ] **Step 5:** rodar. Para cada linha acusada: reler o número na imagem e corrigir a transcrição. Se a imagem confirmar o número, registrar a linha como exceção comentada no teste (sem afrouxar a tolerância). Repetir até PASS. `npm run check` → PASS.
- [ ] **Step 6: Commit** `feat: Ar (gás ideal) com a Tabela A-17 do Çengel`.

---

### Task 5: Documentação e verificação final

**Files:**
- Modify: `README.md`, `CLAUDE.md`

- [ ] **Step 1:** README: lista de fluidos, cabeçalhos CSV do conjunto `gasIdeal` e unidades de h, u, s°; nota sobre Pᵣ ≠ Prandtl. CLAUDE.md: seção 4 (tabela de fluidos com "Ar (gás ideal)"), seção 5 (conjunto `gasIdeal`), seção 15 (como escolher `propertySet` e `pressureApplies`).
- [ ] **Step 2:** `npm run check` → PASS. No navegador: Gases/Fluidos mostra Ar, Ar (gás ideal), Água; página do Ar (gás ideal) com a tabela completa em K e kJ/kg, sem linha de pressão; Consultar a 25 °C (298,15 K) mostra h, u, s°, Pᵣ, vᵣ interpolados com "Como foi calculado?"; Comparar sem bloqueio de pressão e gráfico em h; Ar e Água inalterados; console sem erros.
- [ ] **Step 3: Commit** `docs: Ar (gás ideal) no README e no CLAUDE.md`.
