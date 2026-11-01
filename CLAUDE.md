# ArTermo — Instruções do projeto

## 1. Objetivo
Aplicativo **ArTermo — Propriedades Termofísicas**, destinado ao estudo de Transferência de Calor. O aplicativo traz embutidas tabelas de propriedades de gases e fluidos (inicialmente **Ar** e **Água a 1 atm**), cada fluido com referências bibliográficas separadas (Kreith, Incropera e Çengel). Permite consultar cada referência, interpolar propriedades para uma temperatura informada e calcular a média aritmética entre as referências.

O produto é uma **PWA (Progressive Web App)**: interface responsiva para computador e celular, instalável na tela inicial e capaz de funcionar offline depois do primeiro carregamento. Não desenvolver aplicativo nativo nesta versão.

## 2. Princípios obrigatórios
- Idioma da interface: português do Brasil (pt-BR).
- Sistema de unidades padrão: SI.
- Unidade de temperatura padrão na interface: °C.
- Normalizar internamente a temperatura para °C, independentemente da unidade original de cada tabela (°C, K ou °F).
- **Dados embutidos:** as tabelas vêm de arquivos fornecidos pelo dono do projeto, que responde pelo direito de uso. Cada referência cita autores, título, edição, ano e página/tabela conforme informado. Nenhum valor é inventado, estimado ou completado — nem para "preencher" uma tabela incompleta.
- As tabelas são **somente leitura** no app. O usuário não cadastra, edita, importa nem apaga dados de tabela.
- Cada fluido e cada referência têm seu próprio conjunto de linhas. Nunca misturar dados de fluidos ou de referências diferentes.
- Não afirmar que a média é um valor experimentalmente mais correto. Identificá-la como média aritmética das referências selecionadas.
- Testes usam apenas números sintéticos, identificados como dados de teste, nunca números atribuídos aos livros.
- Antes de concluir, executar testes, lint e build (`npm run check`). Corrigir erros encontrados.

## 3. Stack e arquitetura
- React + TypeScript + Vite.
- CSS responsivo próprio (`src/styles.css`).
- PWA com `vite-plugin-pwa`.
- IndexedDB (Dexie) apenas para preferências, favoritos e histórico.
- Vitest para testes unitários.
- Recharts para o gráfico de propriedade × temperatura.

Arquitetura **frontend-only**, sem backend, login ou envio de dados para nuvem. As tabelas entram no bundle (funcionam offline).

## 4. Fluidos e referências
Fluidos atuais (registro em `src/data/fluids/registry.ts`):

| id | Nome exibido | Categoria | Faixa válida |
|---|---|---|---|
| `ar` | Ar | Gás | — |
| `ar-gas-ideal` | Ar (gás ideal) | Gás | — |
| `agua` | Água (1 atm) | Líquido | 0 a 100 °C |

Ar e Água têm as referências Kreith, Incropera e Çengel e usam o conjunto de propriedades `transporte`. **Ar (gás ideal)** usa o conjunto `gasIdeal`, `pressureApplies: false` e tem só o Çengel (Tabela A-17, 200–2.250 K, já embutida). Na A-17 impressa, 5 valores fogem das relações de gás ideal (550 K h; 630 e 820 K Pᵣ; 1040 e 1800 K vᵣ): ficam como impressos, listados em `arGasIdeal.test.ts` e nas observações da referência. Enquanto o dono não fornecer a tabela, a referência fica vazia e a interface mostra "Tabela ainda não disponível nesta versão do app."

Metadados por referência (`ReferenceDef`): nome curto, autores, título, edição, ano, página/tabela, pressão de referência, unidade original de temperatura, unidades das colunas e observações. Não presumir nenhum deles.

**Água (1 atm):** se a tabela do livro for de líquido saturado, registrar `pressureKPa: 101.325` e explicar a aproximação em `notes` (entre 0 e 100 °C o líquido saturado é tratado como água a 1 atm). Fora de 0–100 °C, Consultar e Comparar mostram alerta permanente (gelo/vapor; acima de 100 °C a tabela de líquido saturado corresponde à pressão de saturação).

## 5. Propriedades e unidades canônicas

| Propriedade | Símbolo | Unidade canônica |
|---|---:|---|
| Massa específica | ρ | kg/m³ |
| Calor específico a pressão constante | cp | J/(kg·K) |
| Condutividade térmica | k | W/(m·K) |
| Viscosidade dinâmica | μ | Pa·s |
| Viscosidade cinemática | ν | m²/s |
| Difusividade térmica | α | m²/s |
| Número de Prandtl | Pr | adimensional |

Conjunto `gasIdeal` (fluidos com `propertySet: 'gasIdeal'`):

| Propriedade | Símbolo | Unidade canônica |
|---|---:|---|
| Entalpia | h | kJ/kg |
| Energia interna | u | kJ/kg |
| Entropia padrão | s° | kJ/(kg·K) |
| Pressão relativa | Pᵣ | adimensional |
| Volume relativo | vᵣ | adimensional |

Pᵣ nunca deve ser confundido com Pr (Prandtl): no CSV, a coluna é `relative_pressure`. Telas e relatórios listam só as propriedades do conjunto do fluido (`propertyDefsFor`). ν, α e Pr calculados existem só no conjunto `transporte`.

Distinguir claramente **valor tabelado** de **valor calculado**. Conversões de entrada ficam em `src/domain/units.ts` (temperatura °C/K/°F; cp em J ou kJ; μ em Pa·s, mPa·s, μPa·s e escalas 10⁻ⁿ; etc.). Mostrar as unidades ao lado de todos os valores. Nunca converter apenas o rótulo sem converter o valor.

## 6. Gases/Fluidos
- Barra de pesquisa: ignora acentos, maiúsculas e espaços e procura no nome, na condição e nos apelidos (ex.: "agua", "water", "H₂O").
- Cartões de fluido com nome exibido, categoria e quantas referências têm dados.
- Página do fluido: aviso de faixa válida, botão **Consultar este fluido** (define o fluido ativo) e abas por referência com citação, pressão, observações e a **tabela completa somente leitura**, nas unidades do livro.
- Tabela embutida com erro de validação aparece marcada e não entra nos cálculos (o teste `fluidLoader.test.ts` impede que isso seja publicado).

## 7. Consulta e interpolação
Tela **Consultar**:
- Faixa "Fluido: <nome> · trocar" no topo; as abas mostram só as referências do fluido ativo.
- Campo de temperatura (decimal), seletor °C/K/°F (°C padrão).
- Exibir propriedades, unidades, indicação de tabelado/interpolado, fonte, edição e página.

Interpolação linear entre os dois pontos válidos que envolvem a temperatura:

`y = y1 + ((T - T1) / (T2 - T1)) * (y2 - y1)`

Regras:
1. Converter a temperatura solicitada para °C antes da consulta.
2. Linha exatamente nessa temperatura (tolerância pequena) → valor da linha, marcado **valor tabelado**.
3. Caso contrário, usar o ponto válido imediatamente inferior e o imediatamente superior daquela propriedade. Mostrar T1, y1, T2, y2, fração e resultado.
4. Dado ausente nunca vira zero; sem par válido, informar que não há dados suficientes.
5. Não extrapolar por padrão. A extrapolação é opção avançada, desativada por padrão, com confirmação, e marca o resultado como extrapolado.
6. Nunca interpolar entre dados de fontes diferentes.
7. Proteger contra divisão por zero, temperaturas duplicadas e valores não numéricos.

Seção **Como foi calculado?** com a fórmula e os valores efetivamente usados.

## 8. Média das referências
Na aba **Comparar / Média** (sempre dentro do fluido ativo):
- Interpolar cada referência independentemente; só depois calcular a média aritmética, propriedade por propriedade.
- Mostrar n/N, quais referências foram excluídas e por quê.
- Modos **Exigir todas** e **Média das fontes disponíveis**.
- Mostrar mínimo, máximo, amplitude e desvio-padrão amostral (critério explicado).
- Bloquear a média por padrão quando a pressão não estiver cadastrada, for diferente ou os fluidos diferirem; permitir substituição manual com aviso permanente.
- A seleção de referências do Comparar é guardada por fluido.

## 9. Propriedades derivadas
- `ν = μ / ρ`, `α = k / (ρ * cp)`, `Pr = μ * cp / k`, sempre em unidades canônicas.
- Valor publicado é conservado e identificado como tabelado; permitir alternar entre publicado e calculado e mostrar a diferença percentual. Nunca substituir silenciosamente.

## 10. Interface e experiência do usuário
- Cabeçalho com "ArTermo — Propriedades termofísicas" e indicação de modo offline.
- Navegação: **Consultar**, **Comparar**, **Gases/Fluidos**, **Configurações**.
- Priorizar celular: botões grandes, tabelas com rolagem horizontal, sem exigir zoom.
- Gráfico opcional de propriedade × temperatura, uma curva por referência.
- Copiar resultado e exportar consulta (CSV; PDF pela impressão do navegador).
- Histórico local de consultas e temperaturas favoritas.
- Tema claro/escuro com contraste adequado.
- Estados vazios explicam que a tabela ainda não foi incluída, sem mostrar números fictícios.

## 11. PWA e funcionamento offline
- Manifest, ícones, nome curto e descrição.
- Service worker armazena os arquivos do app, inclusive as tabelas embutidas.
- Depois do primeiro carregamento, abre e consulta sem internet.
- Mostrar estado e instruções de instalação por navegador/dispositivo.
- Preferências, favoritos e histórico persistem em IndexedDB.

## 12. Privacidade e segurança
- Sem autenticação ou backend.
- Não transmitir consultas para terceiros.
- Conteúdo de CSV é tratado só como dado, nunca executado.

## 13. Testes obrigatórios
- Interpolação exata, entre dois pontos, fora da faixa e bloqueio de extrapolação.
- Propriedade com valores ausentes; fontes com malhas de temperatura diferentes.
- Conversões °C/K/°F, cp e μ.
- Média de 3 e de 2 fontes; modo que exige todas; compatibilidade de pressão.
- ν, α e Pr com unidades corretas.
- Leitura CSV com ponto e vírgula, decimal brasileiro e comentários.
- Fluidos: busca, faixa válida, carregamento das tabelas embutidas, isolamento entre fluidos e **validade de todas as tabelas embutidas**.
- Rotas (inclusive links antigos `#/biblioteca` → Gases/Fluidos) e atualização do banco local.

## 14. Organização
- `src/domain/`: tipos, unidades, interpolação, média, fórmulas e fluidos (busca, faixa válida).
- `src/data/fluids/`: registro, carregador e uma pasta por fluido (`fluid.ts` + CSVs).
- `src/data/`: leitor CSV, IndexedDB e repositório (preferências, favoritos, histórico).
- `src/components/`, `src/pages/`, `src/hooks/`, `src/lib/`, `src/tests/`, `public/`.

Preservar a separação entre lógica de cálculo, dados e interface.

## 15. Como adicionar um fluido ou uma tabela
1. **Fluido novo:** crie `src/data/fluids/<id>/fluid.ts` exportando um `FluidDef` (id, nome, condição, categoria, apelidos de busca, faixa válida se houver, referências). Copie `agua/fluid.ts` como modelo. Para tabelas de gás ideal, use `propertySet: 'gasIdeal'` e `pressureApplies: false` (modelo: `ar-gas-ideal/fluid.ts`); se o gás não for ar, `checkIdealGasTable` precisa da constante R do gás.
2. Inclua o fluido em `FLUID_DEFS`, em `src/data/fluids/registry.ts` (a ordem da lista é a ordem de exibição).
3. **Tabela de uma referência:** crie `src/data/fluids/<id>/<refId>.csv` (ex.: `agua/kreith.csv`) com os cabeçalhos de `CSV_HEADERS` (`src/data/csv.ts`). Copie os números exatamente como fornecidos; use `#` no topo para citar a fonte.
4. Preencha no `ReferenceDef` os metadados conforme informados pelo dono: autores, título, edição, ano, página/tabela e pressão de referência. **Toda coluna precisa de unidade declarada** — no cabeçalho do CSV (ex.: `temperature (K)`, `dynamic_viscosity (1e-7 Pa.s)`), na coluna `*_unit` ou em `originalTempUnit`/`inputUnits` da referência. Coluna sem unidade, unidade não reconhecida, coluna desconhecida ou unidades diferentes na mesma coluna são erro de carga (só Pr dispensa unidade). A tabela é exibida na unidade declarada de cada coluna.
5. Se o livro usar uma escala de unidade que falte (ex.: μ em 10⁻⁶ Pa·s, α em 10⁻⁷ m²/s), adicione-a em `src/domain/units.ts` com teste em `units.test.ts`.
6. Rode `npm run check`. O teste "todas as tabelas embutidas são válidas" falha se houver qualquer erro de validação ou CSV sem fluido/referência correspondente.

## 16. Critérios de aceite
- Gases/Fluidos lista Ar e Água (1 atm), com busca funcionando com acentos, maiúsculas e "H₂O".
- Cada referência mostra a tabela somente leitura, ou o aviso de tabela não disponível.
- Consultar e Comparar usam o fluido ativo, com interpolação detalhada e média com n/N.
- O app trata ausência de dados, unidade, pressão e faixa válida sem mascarar problemas.
- A interface funciona em desktop e celular e pode ser instalada como PWA.
- Testes passam e o build termina sem erros.
