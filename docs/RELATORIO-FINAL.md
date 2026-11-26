# Relatório final: Sistema CTI Insights

**Projeto Integrador II** · SENAI "Roberto Mange" · ADS, Turma B (CSTADS126N2)
**Grupo Data Pulse:** Simone Queiroz Batista, Justino Ricardo Jairi Silvestre,
Thyphanny Katherine Silva Franca, Miguel Herculano Viana e Ryan Vinicius da Silva
**Entrega:** 03/12/2026 · **Repositório:** https://github.com/simonequeiroz/cti-insights

<!-- ATUALIZAR antes de 03/12: link do sistema publicado (Vercel), tempos da H02 e gráficos novos. -->

## 1. Problema

A carteira de clientes do Provedor CTI é controlada em planilhas Excel, sem
padronização nem centralização. O mesmo segmento aparece como `IND.`,
`Indústria` ou `INDISTIRA`. Com isso, não dá para comparar segmentos, níveis e
consultores, e os clientes com potencial de **upsell** (contratar mais
serviços) ficam invisíveis.

## 2. Solução

O CTI Insights é um sistema web que recebe a planilha da carteira, valida e
padroniza os dados, grava tudo num banco PostgreSQL na nuvem e mostra um
dashboard com indicadores, gráficos e insights em texto.

```
Planilha → Vue 3 (valida) → Spring Boot (revalida e registra) → Python/pandas (padroniza,
calcula e escreve os insights) → PostgreSQL no Neon → Spring Boot → Dashboard em Vue
```

O fluxo completo está em [FLUXO-DO-SISTEMA.md](FLUXO-DO-SISTEMA.md), e as
instruções de execução estão no [README](../README.md).

## 3. Hipóteses e resultados

As hipóteses são as da entrega da Sprint 1 (28/08/2026).

### H01: o ETL em Python reduz as inconsistências de grafia

**Teste:** uma planilha com 100 registros e erros propositais, processada pela
rota `/testar` do Python, que não grava no banco. A planilha tinha:
- 15 grafias de segmento (`IND.`, `industria`, `INDÚSTRIA`, `COM`, `serv.`, `TI`…);
- 5 grafias de consultor (`ana souza`, `ANA SOUZA`, `carlos  lima`…);
- faturamento como número ou como texto (`R$ 1.234,56`);
- datas em `dd/mm/aaaa` e em `aaaa-mm-dd`.

**Resultado:**

| Medida | Valor |
|---|---|
| Registros recebidos | 100 |
| Registros padronizados e aceitos | 94 |
| Segmentos corrigidos | 100% das grafias que estão no dicionário (94 de 94), em 6 segmentos oficiais |
| Consultores unificados | 5 grafias viraram 3 nomes (`Ana Souza`, `Carlos Lima`, `Beatriz Reis`) |
| Registros descartados | 6, todos com o erro de digitação `INDISTIRA` |
| Tempo de processamento | cerca de 2,4 s para 100 linhas |

**Conclusão: confirmada, com uma ressalva.** Toda grafia prevista no
dicionário foi padronizada. Um erro de digitação que não está no dicionário
(`INDISTIRA`) não é adivinhado. O sistema descarta a linha e avisa o usuário na
tela antes de importar, para que ele corrija a planilha.

### H02: o dashboard reduz o tempo para ver o faturamento por segmento

**Meta da Sprint 1:** indicadores na tela em até 10 segundos.

**Resultado:** o processamento de 100 linhas leva cerca de 2,4 s no Python, e o
dashboard abre com os gráficos prontos em [ATUALIZAR: tempo medido] s. No
Excel, a mesma resposta exige padronizar os segmentos à mão e montar uma
tabela dinâmica.

**Conclusão:** confirmada. A meta de 10 segundos é atendida com folga.

### H03: o cruzamento de dados revela oportunidades de upsell

**Resultado:** o sistema gera dois tipos de oportunidade:
- **Por segmento:** destaca o segmento que concentra muitos serviços e pouco
  faturamento (ex.: "Comércio tem 50% dos serviços contratados, mas só 19% do
  faturamento").
- **Por cliente:** lista quem fatura acima da mediana do segmento com poucos
  serviços (ex.: "Faturamento acima da mediana do segmento, com poucos
  serviços: 1 contra média de 1,5").

**Conclusão:** confirmada com dados fictícios. A utilidade real depende de
testar com a carteira verdadeira da CTI.

## 4. O que cada disciplina entregou

| Disciplina | Entrega |
|---|---|
| **Frameworks Front-end** | Vue 3, Tailwind e Chart.js. Telas de upload (validação no navegador, revisão e confirmação), dashboard com KPIs, 4 gráficos, insights e upsell, relatórios com exportação CSV e edição de clientes. Layout responsivo testado em 1366 px e 390 px. Chamadas à API com axios e mensagens de erro amigáveis. |
| **Desenvolvimento Back-end** | Spring Boot 4 e Java 21. API REST (`/api/uploads`, `/api/clientes` com CRUD, `/api/dashboard`, `/api/usuarios`), login por sessão com CSRF, três papéis, revalidação das linhas e chamada ao Python. |
| **Ciência de Dados** | pandas e SciPy. Padronização, média, mediana, desvio padrão, quartis e coeficiente de variação por segmento e nível, curva ABC, upsell e insights em texto. Teste estatístico: correlação de Pearson e Spearman entre faturamento e número de serviços, com valor-p. |
| **Computação em Nuvem** | Banco PostgreSQL no Neon (plano gratuito), conexão com SSL e credenciais em variáveis de ambiente. <!-- ATUALIZAR: Vercel (front) e Render (Spring e Python). --> |
| **Automação Industrial** | Ver a seção 5. |
| **Relações Humanas e Cidadania** | Divisão de tarefas com prazos e responsáveis, trabalho em branches com Pull Request e registro de confidencialidade e LGPD em [CONFIDENCIALIDADE-E-LGPD.md](CONFIDENCIALIDADE-E-LGPD.md). |

## 5. Automação Industrial: o que se aplica e o que não se aplica

**Aplica-se:**
- **Integração de sistemas:** o Vue, o Spring e o Python trocam dados por
  HTTP/REST. É o mesmo princípio da comunicação entre um CLP e os sistemas de
  TI.
- **Coleta de dados:** a planilha cumpre o papel que, numa fábrica, seria dos
  sensores.
- **Dashboard como painel de monitoramento:** os gráficos se atualizam assim
  que a planilha é processada.

**Não se aplica:** sensores, atuadores, robôs industriais, CLP, PC industrial
e o envio de sinais ao CLP. O projeto trabalha com dados comerciais em
planilha, não com sinais físicos de uma planta industrial. Por isso, o grupo
não forçou uma implementação que não existe.

<!-- ATUALIZAR: link do documento que compara HTTP/REST com Modbus ou OPC-UA. -->

## 6. Testes e evidências

| Teste | Resultado |
|---|---|
| Fluxo completo: login, upload, dashboard e logout, contra o banco real | Aprovado |
| Front no Chrome: servidor fora do ar, senha errada, login, gráficos, celular a 390 px e logout | 8 de 8 |
| Inclusão, edição e exclusão de cliente com recálculo do dashboard | 11 de 11 |
| H01: 100 registros com erros propositais (`analytics-python/teste_h01.py`) | 94 de 94 grafias previstas padronizadas |
| Back-end (`mvnw test`, com a suíte de integração no Neon) | 5 de 5 |
| Front (`npm run lint` e `npm run build`) | Sem erros |

Os prints estão em [`evidencias/`](../evidencias/).

## 7. Limitações e melhorias futuras

**Limitações dos dados:**
- Os testes usaram dados fictícios. Com a carteira real, os insights podem
  mudar.
- Com poucos clientes, as estatísticas têm pouco valor. Com 2 clientes, por
  exemplo, média e mediana sempre coincidem.
- Erros de digitação fora do dicionário (`INDISTIRA`) são descartados, não
  corrigidos.
- A planilha não tem histórico: cada envio substitui a carteira, então não
  há comparação entre períodos.

**Limitações dos insights** (encontradas pelo próprio grupo):
- Algumas frases precisam de ajuste. Ex.: "correlação fraca positiva" quando
  o valor-p mostra que não há correlação, e "o consultor" para uma consultora.

**Melhorias futuras realistas:**
1. Sugerir a correção de erros de digitação próximos de um segmento conhecido
   (ex.: `INDISTIRA` → "Você quis dizer Indústria?").
2. Guardar o histórico das carteiras e comparar períodos (crescimento por
   segmento e por consultor).
3. Importar direto do sistema de faturamento da CTI, sem depender da planilha.
4. Enviar a lista de oportunidades de upsell para cada consultor.

## 8. Contribuição dos integrantes

| Integrante | Área | Principais contribuições |
|---|---|---|
| Simone Queiroz Batista | Gestão, SAGA e QA | Organização do repositório e das sprints, revisão e integração dos Pull Requests, telas de importação e cadastro no Vue, testes de ponta a ponta, documentação e entrega final. |
| Justino Ricardo Jairi Silvestre | Back-end | API Spring Boot, autenticação e papéis, CRUD de clientes, integração JDBC com o banco e chamada ao ETL em Python. |
| Thyphanny Katherine Silva Franca | Front-end | Criação do projeto Vue, Home, dashboard e identidade visual. |
| Miguel Herculano Viana | Ciência de Dados | ETL em pandas, planilha de correção, linhas rejeitadas e testes do tratamento. |
| Ryan Vinicius da Silva | Banco e nuvem | Projeto PostgreSQL no Neon e configuração da conexão. |

<!-- CONFIRMAR: os commits de "Daniel Morais" (ETL em Python, upsell e documentação do banco) e de
"giovanineves02" pertencem a qual integrante? Ajustar a tabela acima. -->

O histórico completo está nos
[Pull Requests](https://github.com/simonequeiroz/cti-insights/pulls?q=is%3Apr) e nos
[commits](https://github.com/simonequeiroz/cti-insights/commits/main) do repositório.
