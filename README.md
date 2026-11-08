# ArTermo — Propriedades Termofísicas

Aplicativo web instalável (PWA) para estudo de Transferência de Calor. O ArTermo traz embutidas as tabelas de propriedades de **Ar** e **Água (1 atm)**, cada uma com três referências:

| Fluido | Kreith | Incropera | Çengel |
|---|---|---|---|
| Ar (1 atm) | Tabela 28, 0–1000 °C | Tabela A.4, 100–3000 K | Tabela A-15, −150–2000 °C |
| Água (líquido saturado) | Tabela 13, 0–300 °C | Tabela A.6, 273,15–645 K | Tabela A-9, 0,01–374,14 °C |

E o app:

- interpola linearmente cada propriedade, em cada referência, para a temperatura pedida (°C, K ou °F);
- mostra **como foi calculado** — fórmula, pontos T₁/y₁ e T₂/y₂, fração e resultado;
- compara as referências lado a lado e calcula a **média aritmética das referências** com indicação n/N, mínimo, máximo, amplitude e desvio-padrão amostral;
- calcula ν = μ/ρ, α = k/(ρ·cp) e Pr = μ·cp/k e compara com os valores publicados;
- funciona offline depois do primeiro acesso.

As tabelas são **somente leitura** no app. Elas são fornecidas pelo dono do projeto e incluídas no código, sempre com a fonte citada (autores, título, edição, ano, página/tabela). Nenhum valor é inventado, estimado ou completado. Onde o livro não publica ν ou α (Incropera A.6 e Çengel A-9, água), o app os calcula e marca como **calculado**. Um teste confere cada tabela: ν, α e Pr impressos contra μ/ρ, k/(ρ·cp) e μ·cp/k; os poucos pontos em que o próprio livro diverge foram conferidos na imagem, mantidos como impressos e aparecem nas observações da referência.

> Especificação do projeto: [`CLAUDE.md`](CLAUDE.md). Prompt original: [`docs/PROMPT_INICIAL.md`](docs/PROMPT_INICIAL.md).

## Requisitos

- [Node.js](https://nodejs.org/) 20.19 ou mais recente (recomendado 22 LTS) e npm.

## Comandos

```bash
# 1. Instalar dependências
npm install

# 2. Rodar em modo desenvolvimento (abre em http://localhost:5173)
npm run dev

# 3. Rodar os testes unitários (Vitest)
npm test

# 4. Verificar o código (lint) e os tipos
npm run lint
npm run typecheck

# 5. Gerar a versão de produção (pasta dist/)
npm run build

# 6. Testar a versão de produção localmente, com service worker (http://localhost:4173)
npm run preview

# Tudo de uma vez: lint + testes + build
npm run check
```

O modo offline (service worker) só funciona na versão de produção (`npm run build` + `npm run preview`) ou publicada.

## Como usar

1. **Gases/Fluidos** → pesquise o fluido (aceita "água", "agua", "water", "H₂O"…) e abra-o. Cada referência mostra a citação, a pressão de referência e a tabela completa, nas unidades do livro.
2. Clique em **Consultar este fluido**. Consultar e Comparar passam a usar só as referências desse fluido (o topo mostra "Fluido: …").
3. **Consultar** → digite a temperatura e escolha a referência. Abra "Como foi calculado?" para conferir a conta.
4. **Comparar** → escolha as referências, o modo da média (exigir todas ou fontes disponíveis) e se ν, α e Pr devem usar o valor publicado ou o calculado.

**Água (1 atm):** a faixa válida é de 0 a 100 °C. Fora dela, Consultar e Comparar mostram um alerta permanente: a 1 atm a água é gelo abaixo de 0 °C e vapor acima de 100 °C, e valores de uma tabela de líquido saturado acima de 100 °C correspondem à pressão de saturação.

## Dados embutidos

As tabelas ficam em `src/data/fluids/<fluido>/`:

```
src/data/fluids/
  registry.ts        lista de fluidos (ordem de exibição)
  loader.ts          CSV + metadados → fontes e linhas
  ar/fluid.ts        metadados do Ar e das referências
  ar/<ref>.csv       tabela de uma referência (ex.: kreith.csv)
  agua/fluid.ts      metadados da Água (1 atm) e das referências
  agua/<ref>.csv
```

Cada CSV usa os cabeçalhos abaixo (separador vírgula, ponto e vírgula ou tabulação; decimal com vírgula ou ponto; linhas iniciadas por `#` são comentários, úteis para citar a fonte):

```
temperature,temperature_unit,density,density_unit,specific_heat,specific_heat_unit,conductivity,conductivity_unit,dynamic_viscosity,dynamic_viscosity_unit,prandtl,kinematic_viscosity,kinematic_viscosity_unit,thermal_diffusivity,thermal_diffusivity_unit
```

- Colunas `*_unit` são opcionais: se vazias, vale a unidade do cabeçalho (`T (K)`, `cp [kJ/kg·K]`) ou a unidade declarada na referência em `fluid.ts`.
- Célula vazia é dado ausente — nunca zero.
- Um teste automático valida **todas** as tabelas embutidas: uma tabela com erro faz `npm test` falhar e não chega a ser publicada.

Unidades aceitas:

| Propriedade | Canônica | Também aceita |
|---|---|---|
| Temperatura | °C | K, °F |
| ρ | kg/m³ | g/cm³, g/L |
| cp | J/(kg·K) | kJ/(kg·K) |
| k | W/(m·K) | mW/(m·K), 10⁻³ W/(m·K) |
| μ | Pa·s | mPa·s, μPa·s, 10⁻⁵ Pa·s, 10⁻⁷ Pa·s (N·s/m²) |
| ν, α | m²/s | mm²/s, cm²/s, 10⁻⁵ m²/s, 10⁻⁶ m²/s |
| Pr | — | — |
| h, u (gás ideal) | kJ/kg | J/kg |
| s° (gás ideal) | kJ/(kg·K) (no cabeçalho, escreva `kJ/kg.K`) | J/(kg·K) |
| Pᵣ, vᵣ (gás ideal) | — | — |

**Tabelas de gás ideal** (fluido com `propertySet: 'gasIdeal'`) usam os cabeçalhos `temperature`, `enthalpy`, `internal_energy`, `entropy_std`, `relative_pressure` e `relative_volume`. Atenção: a coluna "Pr" dessas tabelas é a **pressão relativa** (`relative_pressure`); o cabeçalho `pr` é lido como número de Prandtl. (Nenhum fluido embutido usa esse conjunto hoje; o suporte fica pronto para o futuro.)

O passo a passo para incluir um fluido ou uma tabela está no [`CLAUDE.md`](CLAUDE.md), seção "Como adicionar um fluido ou uma tabela".

## Regras de cálculo

- Temperatura é sempre convertida para °C antes da consulta; propriedades são guardadas em SI.
- Linha coincidente (tolerância 10⁻⁶ °C) → **valor tabelado**, sem interpolação.
- Caso contrário: `y = y₁ + ((T − T₁)/(T₂ − T₁))·(y₂ − y₁)` com os pontos **válidos** imediatamente abaixo e acima, só da mesma referência. Células vazias são puladas.
- Fora da faixa → bloqueado. A extrapolação é opção avançada, desligada por padrão, pede confirmação e marca o resultado como **extrapolado**.
- Média: primeiro interpola cada referência; depois média aritmética propriedade por propriedade, sempre com n/N. O modo "Exigir todas" não mostra média incompleta.
- A média é bloqueada se as referências com dados tiverem pressão não cadastrada, pressões diferentes (> 0,5 %) ou fluidos diferentes. É possível calcular mesmo assim, com aviso permanente.
- ν, α e Pr publicados nunca são substituídos silenciosamente pelos calculados; a interface mostra ambos e a diferença percentual.

## Publicar no GitHub Pages

1. No repositório: **Settings → Pages → Build and deployment → Source: GitHub Actions**. (Em repositório privado, o GitHub Pages exige plano pago; torne-o público ou use outra hospedagem estática.)
2. **Actions → "Publicar no GitHub Pages" → Run workflow.**
3. O endereço fica `https://<seu-usuario>.github.io/artermo/`.

Para outra hospedagem estática (Netlify, Vercel, Cloudflare Pages), basta servir a pasta `dist/` gerada por `npm run build`. Se o app ficar em uma subpasta, gere com `BASE_PATH=/subpasta/ npm run build`.

O workflow **CI** roda lint, testes e build a cada push na `main`.

## Instalar no celular

A instalação exige o app servido por HTTPS (GitHub Pages serve) ou `localhost`.

- **Android (Chrome):** abra o endereço → menu ⋮ → **Instalar app** (ou "Adicionar à tela inicial"). Em Configurações do ArTermo também aparece o botão **Instalar o ArTermo** quando o navegador permite.
- **iPhone/iPad (Safari):** abra o endereço → botão **Compartilhar** → **Adicionar à Tela de Início**.
- **Computador (Chrome/Edge):** ícone de instalar na barra de endereço.

Abra o app uma vez com internet; depois ele abre e calcula offline. As tabelas vêm com o app; no dispositivo ficam só preferências, favoritos e histórico.

Para testar no celular antes de publicar, rode `npm run build && npx vite preview --host` e acesse pelo IP do computador na mesma rede (sem HTTPS a instalação e o modo offline podem não funcionar; o restante funciona).

## Estrutura

```
src/
  domain/      cálculo puro: tipos, unidades, números pt-BR, interpolação, média, compatibilidade, derivadas, fluidos (busca e faixa válida)
  data/        tabelas embutidas (fluids/), leitor CSV, IndexedDB (Dexie) para preferências, favoritos e histórico
  hooks/       configurações, rotas, estado online/instalação
  components/  régua de temperatura, linhas de propriedade, "Como foi calculado?", comparação, gráfico, tabela somente leitura
  pages/       Consultar, Gases/Fluidos, página do fluido, Configurações
  lib/         arquivos (download/cópia), seleção do Comparar e relatórios CSV/texto
  tests/       testes unitários (Vitest) com dados sintéticos
public/        ícones PWA e favicon
.github/       CI e publicação no GitHub Pages
```

## Privacidade

Sem login, sem servidor, sem rastreamento. Consultas, favoritos e preferências ficam no dispositivo.

## Limitações conhecidas

- As tabelas só mudam com uma nova versão do app; não há edição pelo usuário.
- Exportação em PDF usa a impressão do navegador ("Imprimir / PDF").
- Só interpolação linear (sem splines), como pedido pela especificação.
- `npm audit` aponta avisos em dependências de build do `vite-plugin-pwa` (workbox); não afetam o app publicado.
