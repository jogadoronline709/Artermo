# ArTermo — Instruções do projeto

## 1. Objetivo
Construir um aplicativo chamado **ArTermo — Propriedades do Ar**, destinado ao estudo de Transferência de Calor. O aplicativo permite consultar, separadamente, tabelas de propriedades do ar de três referências configuráveis (Kreith, Incropera e Çengel), interpolar propriedades para uma temperatura informada e calcular a média aritmética entre as referências.

O produto inicial deve ser uma **PWA (Progressive Web App)**: interface responsiva para computador e celular, instalável na tela inicial e capaz de funcionar offline depois do primeiro carregamento. Não desenvolver aplicativo nativo nesta primeira versão.

## 2. Princípios obrigatórios
- Idioma da interface: português do Brasil (pt-BR).
- Sistema de unidades padrão: SI.
- Unidade de temperatura padrão na interface: °C.
- Normalizar internamente a temperatura para °C, independentemente da unidade original de cada tabela (°C, K ou °F).
- Não inventar, estimar ou preencher como se fossem reais valores das tabelas de Kreith, Incropera ou Çengel.
- Não copiar, baixar, raspar ou distribuir tabelas integrais protegidas por direitos autorais. As tabelas devem ser inseridas pelo usuário, que consulta seus próprios livros, ou importadas de arquivos preparados por ele.
- Os três conjuntos de dados devem ser independentes e editáveis. Edição, ano, página, pressão de referência e unidade original devem ser registrados por fonte.
- Dados de demonstração, caso usados para desenvolver a interface, devem ser claramente marcados como **SIMULADOS — NÃO USAR EM CÁLCULOS REAIS** e removidos da experiência normal de produção.
- Não afirmar que a média é um valor experimentalmente mais correto. Identificá-la como média aritmética das referências selecionadas.
- Antes de concluir, executar testes, lint (se configurado) e build. Corrigir erros encontrados.

## 3. Stack e arquitetura
Use versões estáveis atuais e consulte a documentação oficial antes de escolher/configurar dependências:
- React + TypeScript + Vite.
- CSS responsivo; pode usar Tailwind CSS se isso simplificar a consistência visual.
- PWA com `vite-plugin-pwa` ou solução equivalente mantida.
- IndexedDB para persistência local (preferencialmente Dexie ou alternativa equivalente).
- Vitest para testes unitários.
- Biblioteca de gráficos leve, por exemplo Recharts, para comparar propriedades por temperatura.

Arquitetura inicialmente **frontend-only**, sem backend, login ou envio de dados para nuvem. Os dados permanecem no dispositivo. Criar funções claras para exportar/importar backup JSON e importar tabelas CSV. Manter o código preparado para uma futura camada de sincronização, sem implementá-la agora.

## 4. Fontes bibliográficas iniciais
Criar três registros vazios e editáveis:
1. Kreith
2. Incropera
3. Çengel

Não presumir edição, ano, página, título traduzido ou valores. O usuário preencherá os metadados de acordo com os exemplares que utiliza. A fonte deve aceitar nome curto, autores, título, edição, ano, página/tabela, pressão de referência, unidade original de temperatura e observações.

Cada fonte possui seu próprio conjunto de linhas. Nunca misturar os dados de uma referência dentro de outra.

## 5. Propriedades e unidades canônicas
Suportar pelo menos estas propriedades:

| Propriedade | Símbolo sugerido | Unidade canônica |
|---|---:|---|
| Massa específica | ρ | kg/m³ |
| Calor específico a pressão constante | cp | J/(kg·K) |
| Condutividade térmica | k | W/(m·K) |
| Viscosidade dinâmica | μ | Pa·s |
| Viscosidade cinemática | ν | m²/s |
| Difusividade térmica | α | m²/s |
| Número de Prandtl | Pr | adimensional |

O usuário deve conseguir cadastrar valores publicados diretamente na tabela. Também deve ser possível marcar propriedades calculadas pelo aplicativo. Distinguir claramente **valor tabelado** de **valor calculado**.

Conversões de entrada necessárias:
- Temperatura: °C, K e °F para °C.
- cp: J/(kg·K) e kJ/(kg·K) para J/(kg·K).
- μ: Pa·s, mPa·s e μPa·s para Pa·s.
- Demais propriedades: validar e converter unidades suportadas para as unidades canônicas.

Mostrar as unidades ao lado de todos os campos e resultados. Nunca converter apenas o rótulo sem converter o valor.

## 6. Cadastro e edição das tabelas
Criar uma área **Biblioteca de dados** com:
- Lista das três fontes e indicação de quantas linhas cada tabela possui.
- Cadastro/edição dos metadados da referência.
- Inclusão, edição e exclusão de linhas de temperatura e propriedades.
- Ordenação automática por temperatura, com validação contra temperaturas duplicadas.
- Campos de propriedade opcionais: célula vazia significa dado ausente, nunca zero.
- Importação CSV com pré-visualização, mapeamento de colunas e validação antes de gravar.
- Exportação CSV de cada fonte.
- Exportação e restauração de backup completo em JSON.
- Confirmação antes de excluir fonte, tabela ou linha.

Aceitar CSV separado por vírgula ou ponto e vírgula e números com ponto ou vírgula decimal, sem interpretar incorretamente separadores. Disponibilizar um modelo CSV vazio com cabeçalhos e instruções.

Cabeçalhos sugeridos do CSV:
`temperature,temperature_unit,density,density_unit,specific_heat,specific_heat_unit,conductivity,conductivity_unit,dynamic_viscosity,dynamic_viscosity_unit,prandtl,kinematic_viscosity,kinematic_viscosity_unit,thermal_diffusivity,thermal_diffusivity_unit`

Se a unidade for definida nos metadados da fonte, permitir omiti-la por linha. Validar a consistência e mostrar erros linha a linha antes da importação.

## 7. Consulta e interpolação
Tela principal **Consultar propriedades**:
- Campo de temperatura desejada, aceitando decimal.
- Seletor de unidade de entrada (°C, K ou °F), com °C padrão.
- Abas ou cartões para consultar separadamente Kreith, Incropera e Çengel.
- Aba **Comparar / Média**.
- Exibir propriedades disponíveis, unidades, indicação de dado tabelado ou interpolado, fonte, edição e página quando cadastradas.

Para cada propriedade e fonte, usar interpolação linear entre os dois pontos válidos que envolvem a temperatura solicitada:

`y = y1 + ((T - T1) / (T2 - T1)) * (y2 - y1)`

Regras:
1. Converter a temperatura solicitada para °C antes da consulta.
2. Se existir uma linha exatamente nessa temperatura (considerando tolerância numérica pequena), retornar o valor da linha sem interpolação e marcar **valor tabelado**.
3. Caso contrário, localizar o ponto válido imediatamente inferior e o imediatamente superior para aquela propriedade e interpolar. Mostrar T1, y1, T2, y2, fração de interpolação e resultado.
4. Cada propriedade pode ter dados ausentes em algumas linhas. Não usar zero como substituto. Localizar os pontos válidos que efetivamente envolvem a temperatura; se não houver par, informar que não há dados suficientes.
5. Por padrão, não extrapolar além da menor/maior temperatura disponível. Mostrar mensagem clara e faixa disponível. Uma eventual opção avançada de extrapolação deve vir desativada por padrão, exigir confirmação e marcar o resultado como extrapolado/estimado.
6. Nunca interpolar entre dados de fontes diferentes.
7. Proteger contra divisão por zero, temperaturas duplicadas e valores não numéricos.

Criar uma janela ou seção **Como foi calculado?** que apresente a fórmula e substitua os símbolos pelos valores efetivamente usados. O usuário deve conseguir conferir o intervalo e o resultado.

## 8. Média das referências
Na aba **Comparar / Média**:
- Interpolar primeiro cada fonte independentemente para a temperatura escolhida.
- Só depois calcular a média aritmética dos resultados interpolados para cada propriedade.
- Exibir colunas Kreith, Incropera, Çengel e Média.
- Mostrar quantas fontes entraram no cálculo (por exemplo, 3/3 ou 2/3), quais foram excluídas e por quê.
- Criar dois modos explícitos:
  a. **Exigir as 3 referências** — se faltar resultado em qualquer fonte, não apresentar média como se fosse completa.
  b. **Média das fontes disponíveis** — calcular com os resultados válidos, sempre mostrando n/3.
- A média deve ser calculada propriedade por propriedade. Não preencher dado ausente com zero.
- Mostrar também mínimo, máximo e amplitude entre fontes para ajudar a visualizar divergências. Opcionalmente mostrar desvio-padrão, com explicação do critério utilizado.
- Exibir aviso de compatibilidade: comparar/mediar apenas tabelas do mesmo fluido e com pressão de referência compatível. Se a pressão não estiver cadastrada ou for diferente, alertar e bloquear a média por padrão; permitir uma substituição manual claramente avisada, sem esconder a diferença.
- Identificar a média como **média aritmética das referências**, não como propriedade certificada ou valor oficial.

## 9. Propriedades derivadas
Implementar, quando os dados necessários estiverem disponíveis, os cálculos:
- `ν = μ / ρ`
- `α = k / (ρ * cp)`
- `Pr = μ * cp / k`

Usar sempre unidades canônicas internamente. Para essas relações, cp deve estar em J/(kg·K), μ em Pa·s, k em W/(m·K) e ρ em kg/m³.

Quando a referência já publicar ν, α ou Pr, conservar o valor publicado e identificá-lo como tabelado. Permitir alternar entre valor publicado e calculado, quando ambos existirem, e mostrar a diferença percentual. Não substituir silenciosamente o valor tabelado pelo calculado.

## 10. Interface e experiência do usuário
Criar visual técnico, limpo e fácil de usar, sem excesso de elementos:
- Cabeçalho com nome ArTermo e indicação de modo offline.
- Navegação simples: **Consultar**, **Comparar**, **Biblioteca**, **Configurações**.
- Priorizar uso em celular: botões grandes, campos confortáveis, tabelas adaptadas para cartões ou rolagem horizontal, sem exigir zoom.
- Em desktop, aproveitar a largura para exibir tabela comparativa.
- Gráfico opcional de propriedade versus temperatura, com uma curva por referência e legenda identificável.
- Botão para copiar resultado e exportar consulta (CSV ou PDF, caso a geração de PDF seja confiável e simples).
- Histórico local de consultas recentes e possibilidade de favoritar temperaturas.
- Tema claro/escuro, mantendo contraste e acessibilidade.
- Estados vazios instrutivos explicando como cadastrar/importar as tabelas, em vez de apresentar números fictícios.

## 11. PWA e funcionamento offline
- Criar manifest, ícones provisórios próprios, nome curto e descrição.
- Configurar service worker para armazenar os arquivos necessários à aplicação.
- Depois do primeiro carregamento, permitir abrir e consultar os dados salvos sem internet.
- Mostrar estado de instalação e instruções de instalação compatíveis com o navegador/dispositivo.
- Dados do usuário devem persistir localmente em IndexedDB e sobreviver ao fechamento do navegador.
- Alertar que apagar os dados do navegador pode remover os dados locais; incentivar exportação periódica de backup.

## 12. Privacidade e segurança
- Não adicionar autenticação ou backend na primeira versão.
- Não transmitir tabelas, consultas ou backups para terceiros.
- Validar todos os arquivos importados; limitar tamanho; tratar erros sem travar a interface.
- Nunca executar conteúdo vindo de CSV/JSON como código.

## 13. Testes obrigatórios
Criar testes automatizados para:
- Interpolação exata em ponto da tabela.
- Interpolação entre dois pontos (incluindo resultado decimal).
- Temperatura abaixo/acima da faixa e bloqueio de extrapolação.
- Propriedade com valores ausentes.
- Fontes com malhas de temperatura diferentes.
- Conversões °C/K/°F.
- Conversões de cp e μ.
- Média de 3 fontes e média de 2 fontes disponíveis.
- Modo que exige 3 fontes.
- Compatibilidade/incompatibilidade de pressão.
- Cálculo de ν, α e Pr e conversão correta de unidades.
- Importação CSV com ponto e vírgula e decimal brasileiro.
- Exportação e restauração JSON.

Os testes devem usar números sintéticos conhecidos e identificar explicitamente que são dados de teste, nunca números atribuídos aos livros.

## 14. Organização sugerida
Manter separação clara entre:
- `src/domain/`: tipos, unidades, interpolação, média e fórmulas.
- `src/data/`: IndexedDB, importação/exportação, repositórios.
- `src/components/`: componentes reutilizáveis.
- `src/pages/`: telas.
- `src/hooks/`: hooks de estado e acesso aos dados.
- `src/tests/`: testes unitários.
- `public/`: manifest e ícones PWA.

Ajuste a organização se houver motivo técnico, mas preserve a separação entre lógica de cálculo, persistência e interface.

## 15. Plano de execução para Claude Code
Trabalhe por etapas, sem tentar gerar tudo em um único arquivo:
1. Inspecione a pasta e informe se há projeto existente; não apague arquivos do usuário.
2. Crie o projeto e configure TypeScript, Vite, PWA, persistência e testes.
3. Implemente primeiro as funções puras de unidades, interpolação, média e propriedades derivadas.
4. Escreva e execute os testes dessas funções antes de construir as telas.
5. Implemente biblioteca de fontes e editor/importador de tabelas.
6. Implemente consulta individual e comparação/média.
7. Implemente PWA/offline, responsividade, histórico e exportação.
8. Execute testes, lint e build; corrija todos os erros.
9. Escreva README em português com instalação local, execução, testes, build, publicação e instalação no celular.
10. Ao final, mostre a estrutura criada, comandos para rodar e limitações conhecidas.

## 16. Critérios de aceite
O projeto só está concluído quando:
- Posso cadastrar os dados de Kreith, Incropera e Çengel separadamente.
- Posso editar os dados posteriormente sem alterar o código.
- Posso consultar uma fonte isolada e ver a interpolação detalhada.
- Posso comparar as três fontes e obter a média com indicação clara de n/3.
- O app trata ausência de dados, unidade e pressão sem mascarar problemas.
- Os dados ficam salvos localmente e podem ser exportados/importados.
- A interface funciona em desktop e celular e pode ser instalada como PWA.
- Testes de cálculo passam e o build termina sem erros.
