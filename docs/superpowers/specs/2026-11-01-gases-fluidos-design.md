# Gases/Fluidos — tabelas embutidas e somente leitura

Data: 2026-11-01 · Status: aprovado em conversa, aguardando revisão do texto

## 1. Objetivo

Transformar o ArTermo de "propriedades do ar com tabelas digitadas pelo usuário" em
**ArTermo — Propriedades Termofísicas**: um app com vários fluidos, cujas tabelas vêm
**embutidas no código** e são **somente leitura**.

- Fluidos iniciais: **Ar** e **Água (1 atm)**.
- Cada fluido tem as referências **Kreith, Incropera e Çengel**, inicialmente **sem dados**.
- O dono do projeto fornecerá as tabelas depois; elas serão adicionadas como arquivos
  no código. Até lá, nenhuma tela mostra números de livro.
- Novo fluido no futuro = nova pasta de dados + uma entrada no registro. Nenhuma tela muda.

### Decisões do usuário (2026-11-01)

| Pergunta | Decisão |
|---|---|
| Referências da Água | Kreith, Incropera, Çengel (vazias) |
| Como escolher fluido | Área **Gases/Fluidos** com barra de pesquisa; cada fluido mostra suas tabelas |
| Quem altera os dados | Ninguém pelo app. Só o desenvolvedor, a partir de tabelas fornecidas pelo dono |
| Nome do app | **ArTermo — Propriedades Termofísicas** |
| Regras do CLAUDE.md | Atualizar para permitir dados embutidos fornecidos pelo dono, com fonte citada |
| Biblioteca editável | **Removida**, substituída por Gases/Fluidos |

## 2. O que não muda

Interpolação linear e suas regras, "Como foi calculado?", média n/N com os dois modos,
checagem de pressão/fluido antes da média, ν/α/Pr publicados × calculados, gráfico,
histórico, favoritos, tema, conversão °C/K/°F, cópia e exportação do resultado da
consulta, PWA offline e GitHub Pages.

## 3. Dados embutidos

### 3.1 Organização

```
src/data/fluids/
  registry.ts          lista de fluidos (ordem de exibição)
  loader.ts            CSV + metadados → Source/DataRow (função pura)
  ar/
    fluid.ts           FluidDef do Ar
    (kreith.csv, incropera.csv, cengel.csv — quando fornecidos)
  agua/
    fluid.ts           FluidDef da Água (1 atm)
    (kreith.csv, incropera.csv, cengel.csv — quando fornecidos)
```

Os CSVs são carregados com `import.meta.glob('./*/*.csv', { query: '?raw', import: 'default', eager: true })`
e entram no bundle (logo, funcionam offline). Referência sem arquivo CSV = tabela vazia.

### 3.2 Tipos (em `src/domain/fluids.ts`)

```ts
interface ReferenceDef {
  id: string                 // 'kreith' — único dentro do fluido
  shortName: string          // 'Kreith'
  authors: string; title: string; edition: string; year: string; pageTable: string
  pressureKPa: number | null
  pressureUnit: PressureUnit
  originalTempUnit: TempUnit // unidade padrão das linhas do CSV
  inputUnits: PropertyUnitPrefs // unidade padrão de cada coluna do CSV
  notes: string
}

interface FluidDef {
  id: string                 // 'ar', 'agua' — estável; usado em URL e configurações
  name: string               // 'Ar', 'Água'
  condition: string          // '' para o Ar, '1 atm' para a Água
  category: 'gas' | 'liquido'
  aliases: string[]          // termos de busca: 'agua', 'water', 'h2o'…
  validRange?: { minC?: number; maxC?: number; message: string }
  references: ReferenceDef[]
}
```

Nome exibido: `name` + ` (condition)` quando houver condição → "Água (1 atm)".

`Source` (já existente) ganha `fluidId: string`; seu `id` passa a ser `<fluidId>-<refId>`
(ex.: `agua-kreith`), único no app inteiro. O campo `fluid` recebe o nome exibido do
fluido, e a checagem de compatibilidade atual continua funcionando sem mudança.
`isSimulated` é removido (não há mais dados simulados).

### 3.3 Carregamento e validação

`loadFluid(def, csvByRefId)` é pura: para cada referência, usa o parser e o validador
de CSV que já existem (`parseCsv` + `autoMap` + `validateImport`), com os padrões de
unidade de `ReferenceDef`. Devolve `{ def, sources, rowsBySource, errors }`.

- Erros de uma tabela não derrubam o app: a referência aparece com aviso
  "Tabela embutida com erro" e não entra em cálculos.
- Um teste percorre **todas** as tabelas embutidas e falha se houver qualquer erro.
  Assim uma tabela inválida nunca é publicada.
- Linhas iniciadas por `#` continuam sendo comentários (útil para citar a fonte no
  próprio arquivo).

### 3.4 Regras para tabelas fornecidas no futuro

- Cada referência cita autores, título, edição, ano e página/tabela, conforme informado
  pelo dono. Nada é presumido.
- Números são copiados exatamente como fornecidos, com a unidade original declarada no
  `ReferenceDef` ou na coluna `*_unit`. Escalas que faltarem (ex.: μ em 10⁻⁶ Pa·s,
  α em 10⁻⁷ m²/s) são adicionadas em `units.ts` com teste.
- **Água (1 atm):** se a tabela for de líquido saturado, registra-se
  `pressureKPa = 101,325` e uma nota explicando que, entre 0 e 100 °C, o líquido
  saturado é tratado como água a 1 atm. A diferença fica escrita em `notes`, visível na tela.

### 3.5 Faixa válida da Água

`agua/fluid.ts` define `validRange: { minC: 0, maxC: 100, message }`. Quando a
temperatura consultada sai dessa faixa, Consultar e Comparar mostram um alerta
permanente: acima de 100 °C a água a 1 atm é vapor, e valores de uma tabela de líquido
saturado correspondem à pressão de saturação, maior que 1 atm. O cálculo não é
bloqueado; o alerta não pode ser fechado. O Ar não define faixa.

## 4. Telas e navegação

Menu: **Consultar · Comparar · Gases/Fluidos · Configurações**.

| Rota | Tela |
|---|---|
| `#/fluidos` | Lista de fluidos com barra de pesquisa |
| `#/fluidos/<fluidId>` | Página do fluido, primeira referência aberta |
| `#/fluidos/<fluidId>/<refId>` | Página do fluido com a referência escolhida |
| `#/consultar[/<sourceId>]`, `#/comparar` | Como hoje, restritos ao fluido ativo |
| `#/biblioteca…` (antiga) | Redireciona para `#/fluidos` |

### 4.1 Gases/Fluidos (lista)

- Campo de busca no topo, com foco automático no desktop.
- A busca ignora acentos, maiúsculas e espaços extras e compara com `name`,
  `condition` e `aliases` (ex.: "agua", "ÁGUA", "water", "h2o" → Água).
- Cartões dos fluidos com nome exibido, categoria (Gás/Líquido) e quantas referências
  têm dados (ex.: "0 de 3 referências com dados").
- Busca sem resultado: "Nenhum fluido encontrado para "x"."

### 4.2 Página do fluido

- Título com o nome exibido, a categoria e o aviso de faixa válida, se houver.
- Botão **Consultar este fluido**: define o fluido ativo e abre Consultar.
- Abas por referência (Kreith · Incropera · Çengel). Cada aba mostra a citação, a
  pressão, as notas e a **tabela completa somente leitura**: temperatura na unidade
  original e em °C, e cada propriedade na unidade original do livro. Em celular, a
  tabela rola na horizontal com a primeira coluna fixa.
- Referência sem dados: "Tabela ainda não disponível nesta versão do app."

### 4.3 Consultar e Comparar

- Uma faixa no topo mostra "Fluido: Água (1 atm)" e o link **trocar** (vai para Gases/Fluidos).
- As abas, a média e o gráfico usam apenas as referências do fluido ativo.
- O fluido ativo fica em `settings.activeFluidId` (padrão `'ar'`). Se o id salvo não
  existir mais, o app volta para `'ar'`.
- A seleção de referências da comparação passa a ser por fluido:
  `settings.compareSelection: Record<fluidId, string[]>`, que substitui `compareSourceIds`.
  Lista ausente ou vazia significa "todas as referências com dados".
- O painel "Comece pelas suas tabelas" é substituído por: "Os dados de <fluido> ainda
  não foram incluídos nesta versão do app.", mostrado quando nenhuma referência do
  fluido ativo tem dados.

### 4.4 Configurações

- Saem: Backup JSON (exportar/restaurar), Dados de demonstração.
- "Apagar tudo" vira **"Limpar histórico, favoritos e preferências"**.
- Continuam: Aparência, Cálculo, Instalar, Armazenamento e Sobre. O texto de
  Armazenamento deixa de falar em perder tabelas, porque elas vêm com o app.

## 5. Persistência

- O Dexie passa para a versão 2: remove as tabelas `sources` e `rows` e o `populate`.
  Ficam `favorites`, `history` e `settings`.
- As tabelas digitadas antes no navegador são descartadas. Isso foi aceito: o app acabou
  de ser criado e a Biblioteca deixa de existir.
- O repositório perde as operações de fonte/linha/backup/demo e mantém favoritos,
  histórico e configurações.

## 6. Remoções

`LibraryPage`, `SourceEditorPage`, `RowEditor`, `ImportDialog`, `data/backup.ts`,
`data/demo.ts`, `tests/backup.test.ts`, as partes de `csv.ts` usadas só por
importação/exportação manual (`mergeRows`, `exportSourceCsv`, `csvTemplate`),
`public/modelo_dados_ar.csv` (e sua entrada em `includeAssets`), o tipo de
compatibilidade `simulated` e os estilos que ficarem sem uso.

## 7. Nome e textos

"ArTermo — Propriedades Termofísicas" em: `index.html` (title e description),
manifest PWA (`name` e `description`), subtítulo do cabeçalho ("Propriedades
termofísicas"), `package.json` (description), README e CLAUDE.md.

## 8. Documentação

- **CLAUDE.md:** reescrever as seções afetadas (princípios, fontes, Biblioteca → Gases/Fluidos,
  testes, critérios de aceite). Nova regra: "Os dados embutidos vêm de tabelas fornecidas
  pelo dono do projeto, que responde pelo direito de uso; cada referência cita a fonte;
  nenhum valor é inventado, estimado ou completado." Acrescentar o roteiro "como
  adicionar um fluido ou uma tabela".
- **README:** atualizar nome, uso e estrutura; trocar a seção de importação CSV por
  "Dados embutidos".

## 9. Testes

Com dados sintéticos marcados como dados de teste:

- Registro: ids de fluido únicos, ids de referência únicos dentro do fluido, todo fluido
  com pelo menos uma referência.
- Busca: "agua", "ÁGUA", "h2o", "water" → Água; "ar" → Ar; vazio → todos; "xyz" → nenhum.
- `loadFluid`: um CSV sintético vira linhas em °C e SI; unidade padrão vinda do
  `ReferenceDef`; referência sem CSV fica vazia; um CSV inválido gera erro só naquela
  referência; ids `<fluido>-<ref>` não colidem entre fluidos.
- Isolamento: linhas da Água nunca aparecem nas fontes do Ar.
- Faixa válida: 50 °C sem alerta; 120 °C e −5 °C com alerta; Ar sem alerta.
- Todas as tabelas embutidas reais validam sem erro.
- Os testes de interpolação, média, unidades, derivadas e CSV continuam passando.
- Antes de concluir: `npm run check` (lint + testes + build) e verificação manual no navegador.

## 10. Fora do escopo

Dados reais (chegam depois), propriedades novas (ex.: β), fluidos além de Ar e Água,
sincronização, edição de tabelas pelo usuário.
