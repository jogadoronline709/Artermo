# Ar (gás ideal) — Tabela A-17 do Çengel

Data: 2026-11-01 · Status: design aprovado em conversa, aguardando revisão do texto

## 1. Objetivo

Incluir a **Tabela A-17 do Çengel, "Propriedades de gás ideal do ar"**, fornecida pelo
dono do projeto em imagens, como um fluido novo, **"Ar (gás ideal)"**. Ele tem um
conjunto de propriedades diferente do Ar e da Água:

| Propriedade | Símbolo | Unidade no livro | Unidade canônica (SI) |
|---|---|---|---|
| Entalpia | h | kJ/kg | kJ/kg |
| Energia interna | u | kJ/kg | kJ/kg |
| Entropia padrão | s° | kJ/(kg·K) | kJ/(kg·K) |
| Pressão relativa | Pᵣ | — | — |
| Volume relativo | vᵣ | — | — |

Na imagem a pressão relativa aparece como "Pr". No app ela usa o símbolo **Pᵣ** e o nome
"Pressão relativa", para nunca ser confundida com o número de Prandtl (Pr), que continua
existindo no Ar e na Água.

### Decisões do usuário (2026-11-01)

| Pergunta | Decisão |
|---|---|
| O que fazer com a A-17 | Adicionar **também**; o Ar (propriedades de transporte) continua como está |
| Como encaixar | Fluido separado, "Ar (gás ideal)", com conjunto de propriedades próprio |

## 2. O que não muda

Ar e Água (1 atm): mesmas propriedades, mesmas telas, mesmo cálculo de ν, α e Pr.
Interpolação linear, "Como foi calculado?", média n/N, busca, rotas, PWA.

## 3. Modelo

### 3.1 Conjuntos de propriedades

- `PropertyKey` ganha `enthalpy`, `internalEnergy`, `entropyStd`, `relativePressure`,
  `relativeVolume`. As sete atuais não mudam.
- `PropertySetId = 'transporte' | 'gasIdeal'` e `PROPERTY_SETS: Record<PropertySetId, PropertyKey[]>`
  em `src/domain/units.ts`:
  - `transporte`: as sete atuais, na ordem atual.
  - `gasIdeal`: h, u, s°, Pᵣ, vᵣ, nessa ordem.
- `propertyDefsFor(set): PropertyDef[]` devolve os `PropertyDef` do conjunto, na ordem dele.
- Unidades aceitas:
  - h, u: `J/kg`, `kJ/kg`.
  - s°: `J/(kg.K)`, `kJ/(kg.K)`.
  - Pᵣ, vᵣ: adimensionais, sem unidade (como Pr hoje; não exigem unidade declarada).
- ν, α e Pr calculados continuam só no conjunto `transporte`; o conjunto `gasIdeal` não
  tem propriedades derivadas.

### 3.2 Fluido

`FluidDef` ganha dois campos opcionais:

- `propertySet?: PropertySetId` — padrão `'transporte'`.
- `pressureApplies?: boolean` — padrão `true`. Com `false`, a checagem de compatibilidade
  ignora a pressão de referência (ausente ou diferente) e a interface não mostra
  "Pressão: não informada". h e u de gás ideal dependem só de T; s° é tabelada na
  pressão padrão.

O carregador repassa `pressureApplies` para cada `Source` (campo opcional novo,
padrão `true`), e `checkCompatibility` deixa de acusar pressão quando alguma fonte
comparada tem `pressureApplies === false`.

### 3.3 Dados

```
src/data/fluids/ar-gas-ideal/
  fluid.ts      AR_GAS_IDEAL
  cengel.csv    Tabela A-17 transcrita
```

- `id: 'ar-gas-ideal'`, `name: 'Ar'`, `condition: 'gás ideal'` → "Ar (gás ideal)".
- `category: 'gas'`, `propertySet: 'gasIdeal'`, `pressureApplies: false`, sem `validRange`.
- `aliases`: `['ar', 'air', 'gas ideal', 'ideal gas', 'a-17', 'a17']`.
- Uma referência: `cengel`, `shortName: 'Çengel'`, `pageTable: 'Tabela A-17'`,
  `notes: 'Propriedades de gás ideal do ar.'`. Autores, título, edição e ano ficam vazios
  até o dono informar.
- Entra em `FLUID_DEFS` logo depois do Ar: `[AR, AR_GAS_IDEAL, AGUA]`.
- CSV com cabeçalhos `temperature (K)`, `enthalpy (kJ/kg)`, `relative_pressure`,
  `internal_energy (kJ/kg)`, `relative_volume`, `entropy_std (kJ/(kg.K))`, separador `;`
  e vírgula decimal, linha `#` citando a fonte. 200 K a 2.250 K, todas as linhas das
  duas imagens, números exatamente como impressos (separador de milhar removido).

### 3.4 CSV

`HEADER_ALIASES`/`FIELD_LABELS` ganham os cinco campos novos e suas colunas `*_unit`.
Aliases em português: `entalpia`, `energia_interna`, `entropia`, `s0`,
`pressao_relativa`, `volume_relativo`. O alias `pr` continua sendo o número de Prandtl.
`CSV_HEADERS` (modelo de transporte) não muda; o README documenta os cabeçalhos do
conjunto `gasIdeal`.

## 4. Interface

- Gases/Fluidos: cartão "Ar (gás ideal)". Pesquisar "ar" mostra Ar e Ar (gás ideal);
  "gas ideal" ou "a-17" mostra só o novo.
- Página do fluido, Consultar, Comparar, gráfico, "Como foi calculado?", texto copiado
  e CSVs usam `propertyDefsFor(fluid.def.propertySet)` em vez da lista fixa.
- Com `pressureApplies: false`, não aparece a linha de pressão (página do fluido,
  resultado, relatórios).
- Comparar com uma referência só mostra a coluna Çengel e a média 1/1, como já
  acontece hoje com uma referência selecionada.

## 5. Conferência da transcrição

Teste `src/tests/arGasIdeal.test.ts`, sobre a tabela embutida (sem copiar números do
livro no teste). Cada falha cita a temperatura da linha:

1. Temperaturas estritamente crescentes, de 200 K a 2.250 K, sem célula vazia.
2. h, u, s° e Pᵣ estritamente crescentes; vᵣ estritamente decrescente.
3. (h − u)/T dentro de ±0,3 % de 0,287 kJ/(kg·K) — relação de gás ideal h − u = R·T.
4. vᵣ·Pᵣ/T igual em todas as linhas dentro de ±0,3 % da mediana.
5. Entre linhas vizinhas, Δs° = R·ln(Pᵣ₂/Pᵣ₁) dentro de 0,0005 kJ/(kg·K).

As tolerâncias cobrem o arredondamento impresso (4 a 5 algarismos). Se uma linha
falhar, o número é conferido de novo na imagem; a tolerância não é afrouxada para
fazer o teste passar. Se a própria tabela impressa violar uma relação, a linha é
mantida como impressa e o teste lista essa exceção com comentário.

## 6. Testes

- `units`: conversões kJ/kg → J/kg e kJ/(kg·K) → J/(kg·K); `propertyDefsFor` na ordem certa.
- `csv`: cabeçalhos novos e aliases em português; `pr` continua Prandtl.
- `fluidLoader`: Pᵣ e vᵣ não exigem unidade; h sem unidade declarada é erro.
- `compatibility`: fontes com `pressureApplies: false` não geram aviso de pressão.
- `fluids`/registro: "ar" acha os dois Ar; "gas ideal" e "a-17" acham só o novo; a ordem é Ar, Ar (gás ideal), Água.
- `readOnlyTable` e relatórios: só as propriedades do conjunto, sem linha de pressão.
- `arGasIdeal.test.ts` (seção 5).
- `npm run check` e verificação no navegador.

## 7. Fora do escopo

Tabelas de gás ideal de Kreith ou Incropera, outros gases ideais, cálculo de processos
isentrópicos a partir de Pᵣ/vᵣ, tabela A-15 do Çengel (vem depois, quando o dono enviar).
