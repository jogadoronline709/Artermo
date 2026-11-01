# ArTermo — Propriedades do Ar

Aplicativo web instalável (PWA) para estudo de Transferência de Calor. Você cadastra as tabelas de propriedades do ar dos **seus** exemplares de Kreith, Incropera e Çengel (ou de outras referências), e o ArTermo:

- interpola linearmente cada propriedade, em cada referência, para a temperatura pedida (°C, K ou °F);
- mostra **como foi calculado** — fórmula, pontos T₁/y₁ e T₂/y₂, fração e resultado;
- compara as referências lado a lado e calcula a **média aritmética das referências** com indicação n/N, mínimo, máximo, amplitude e desvio-padrão amostral;
- calcula ν = μ/ρ, α = k/(ρ·cp) e Pr = μ·cp/k e compara com os valores publicados;
- funciona offline depois do primeiro acesso e guarda tudo só no dispositivo (IndexedDB).

O app **não traz nenhum valor dos livros**. As três referências começam vazias. Os únicos números embutidos são os *dados simulados de demonstração* (opcionais, em Configurações) e os dados sintéticos dos testes — ambos fictícios e identificados como tal.

> Especificação completa do projeto: [`CLAUDE.md`](CLAUDE.md). Prompt original: [`docs/PROMPT_INICIAL.md`](docs/PROMPT_INICIAL.md).

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

1. **Biblioteca** → abra Kreith, Incropera ou Çengel e preencha autores, título, edição, ano, página/tabela, **pressão de referência** e as unidades como aparecem no livro (ex.: μ em 10⁻⁷ Pa·s, cp em kJ/(kg·K)).
2. Cadastre as linhas: **Adicionar linha** (o botão "Salvar e próxima linha" agiliza a digitação) ou **Importar CSV**. Célula vazia é dado ausente — nunca zero.
3. **Consultar** → digite a temperatura e escolha a referência. Abra "Como foi calculado?" para conferir a conta.
4. **Comparar** → escolha as referências, o modo da média (exigir todas ou fontes disponíveis) e se ν, α e Pr devem usar o valor publicado ou o calculado.
5. **Configurações** → exporte um **backup JSON** de tempos em tempos. Apagar os dados do navegador apaga as tabelas.

### Importação CSV

Baixe o modelo em Biblioteca → "Baixar modelo CSV com instruções" (há também o cabeçalho vazio em `public/modelo_dados_ar.csv`). Cabeçalhos:

```
temperature,temperature_unit,density,density_unit,specific_heat,specific_heat_unit,conductivity,conductivity_unit,dynamic_viscosity,dynamic_viscosity_unit,prandtl,kinematic_viscosity,kinematic_viscosity_unit,thermal_diffusivity,thermal_diffusivity_unit
```

- Separador vírgula, ponto e vírgula ou tabulação (detectado automaticamente).
- Decimal com vírgula ou ponto; notação científica aceita (`1,846E-5`). Com separador vírgula, números com vírgula decimal precisam estar entre aspas (o Excel já faz isso).
- Colunas `*_unit` são opcionais: se vazias, vale a unidade do cabeçalho (`T (K)`, `cp [kJ/kg·K]`) ou a unidade cadastrada na referência.
- Cabeçalhos em português também são reconhecidos (`temperatura`, `massa_especifica`, `cp`, `k`, `mu`, `nu`, `alpha`, `Pr`…), e você pode ajustar o mapeamento antes de importar.
- Antes de gravar, o app mostra a pré-visualização e os erros linha a linha (número inválido, unidade desconhecida, temperatura repetida, valor ≤ 0).

Unidades aceitas na importação e na digitação:

| Propriedade | Canônica | Também aceita |
|---|---|---|
| Temperatura | °C | K, °F |
| ρ | kg/m³ | g/cm³, g/L |
| cp | J/(kg·K) | kJ/(kg·K) |
| k | W/(m·K) | mW/(m·K), 10⁻³ W/(m·K) |
| μ | Pa·s | mPa·s, μPa·s, 10⁻⁵ Pa·s, 10⁻⁷ Pa·s (N·s/m²) |
| ν, α | m²/s | mm²/s, cm²/s, 10⁻⁵ m²/s, 10⁻⁶ m²/s |
| Pr | — | — |

As unidades "10⁻ⁿ" servem para tabelas cujo cabeçalho diz, por exemplo, "μ·10⁷ (N·s/m²)": digite o número como está no livro e escolha 10⁻⁷ Pa·s.

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

Abra o app uma vez com internet; depois ele abre e calcula offline. Os dados de cada dispositivo são independentes — use o backup JSON para levar as tabelas de um aparelho para outro.

Para testar no celular antes de publicar, rode `npm run build && npx vite preview --host` e acesse pelo IP do computador na mesma rede (sem HTTPS a instalação e o modo offline podem não funcionar; o restante funciona).

## Estrutura

```
src/
  domain/      cálculo puro: tipos, unidades, números pt-BR, interpolação, média, compatibilidade, derivadas
  data/        IndexedDB (Dexie), repositório, CSV, backup JSON, dados simulados
  hooks/       acesso reativo aos dados, configurações, rotas, estado online/instalação
  components/  régua de temperatura, linhas de propriedade, "Como foi calculado?", comparação, gráfico, diálogos
  pages/       Consultar, Biblioteca, editor de referência, Configurações
  lib/         arquivos (download/cópia) e relatórios CSV/texto
  tests/       testes unitários (Vitest) com dados sintéticos
public/        ícones PWA, favicon e modelo CSV
.github/       CI e publicação no GitHub Pages
```

## Privacidade

Sem login, sem servidor, sem rastreamento. Tabelas, consultas e backups ficam no dispositivo. Arquivos importados são validados, limitados em tamanho (CSV 2 MB, backup 10 MB) e tratados apenas como dados.

## Limitações conhecidas

- Os dados ficam por navegador/dispositivo; não há sincronização (o código separa domínio e persistência para permitir isso no futuro).
- Exportação em PDF usa a impressão do navegador ("Imprimir / PDF").
- Só interpolação linear (sem splines), como pedido pela especificação.
- `npm audit` aponta avisos em dependências de build do `vite-plugin-pwa` (workbox); não afetam o app publicado.
