# Automação Industrial: HTTP/REST × Modbus

**Projeto:** Sistema CTI Insights · **Grupo:** Data Pulse · **Turma:** ADS B (CSTADS126N2)
**Disciplina relacionada:** Automação Industrial (Projeto Integrador II)

## 1. Por que este documento existe

O plano de ensino do PI2 (FR-97, seção 1.3.4) pede, para Automação Industrial:

- um documento que **compare o protocolo de comunicação do projeto
  (HTTP/REST) com um protocolo industrial** estudado em aula;
- a explicação de como a **planilha cumpre o papel de "coleta de dados"**;
- o **dashboard como exemplo de visualização e monitoramento**;
- o registro de **quais tópicos não se aplicam** (sensores, atuadores, CLP).

O CTI Insights trabalha com dados **comerciais**, não com máquinas. Por isso,
o próprio plano pede essa parte **de forma teórica** ("sem exigir CLP no
MVP"). O objetivo é mostrar que o sistema resolve, com dados de clientes, o
mesmo problema que a automação resolve numa fábrica: **coletar dados, levá-los
de um sistema a outro e transformá-los em informação para decidir**. É a
chamada integração **TI/TA**, entre tecnologia da informação e tecnologia de
automação.

## 2. A analogia em uma tabela

| Etapa | Numa fábrica (TA) | No CTI Insights (TI) |
|---|---|---|
| **Coletar** | Sensores medem temperatura, pressão, peças produzidas | O consultor preenche a planilha da carteira de clientes |
| **Controlar o processo** | O CLP lê os sensores e comanda os atuadores | Não há equivalente: o sistema não age sobre nada físico |
| **Transportar os dados** | Rede industrial com **Modbus** | Internet com **HTTP/REST** (Vue → Spring → Python) |
| **Tratar e guardar** | Supervisório (SCADA) e historiador de processo | Python/pandas padroniza, calcula e grava no PostgreSQL |
| **Monitorar e decidir** | Tela do supervisório mostra a produção e os alarmes | O dashboard mostra faturamento, curva ABC e oportunidades de upsell |

## 3. Como o CTI Insights se comunica: HTTP/REST

Os três sistemas conversam por **HTTP**, o mesmo protocolo dos sites, seguindo
o estilo **REST**:
- cada **recurso** tem um endereço, por exemplo `/api/clientes` e `/api/dashboard`;
- o **método** diz a ação: `GET` lê, `POST` cria, `PUT` altera e `DELETE` exclui;
- a resposta traz um **código de situação**: `200` deu certo, `401` falta
  login, `403` não tem permissão e `502` o Python falhou;
- os dados viajam em **JSON**, um texto que pessoas e programas conseguem ler.

Exemplo real do sistema, quando o dashboard é aberto:

```
GET /api/dashboard                      ← o Vue pede os números
Cookie: JSESSIONID=…                    ← prova de que a pessoa fez login

HTTP/1.1 200 OK                         ← o Spring responde
{ "estatisticas": { "resumo": { "totalClientes": 32, "faturamentoTotal": 72360000.0 } },
  "insights": [ "Os 13 clientes nível A representam 74,0% do faturamento…" ] }
```

As conexões do sistema:

| De → para | O que vai | Proteção |
|---|---|---|
| Navegador (Vue) → Spring Boot | Login, planilha validada, pedidos de dados | Sessão por cookie, token CSRF e papel do usuário |
| Spring Boot → Python (FastAPI) | Linhas da carteira para tratar (`POST /etl`) | Chave compartilhada no cabeçalho `X-ETL-Key` |
| Spring e Python → PostgreSQL (Neon) | Gravação e leitura dos dados | Conexão criptografada (SSL) e senha fora do código |

## 4. O que é o Modbus

O **Modbus** foi criado em 1979 pela Modicon para seus CLPs. É hoje um dos
protocolos mais usados na indústria, por ser simples, aberto e gratuito.

**Como funciona:**
- **Cliente e servidor**, antes chamados de mestre e escravo. O cliente
  (supervisório ou CLP) **pergunta**, e o servidor (sensor, inversor, outro
  CLP) **responde**. O servidor nunca fala sem ser perguntado.
- **Dados em "registradores" numerados**, como gavetas com endereço:

  | Tipo | Tamanho | Acesso | Exemplo |
  |---|---|---|---|
  | Coil | 1 bit | leitura e escrita | ligar ou desligar um motor |
  | Discrete input | 1 bit | só leitura | sensor de porta aberta |
  | Input register | 16 bits | só leitura | temperatura medida |
  | Holding register | 16 bits | leitura e escrita | velocidade desejada do motor |

- **Códigos de função** dizem a ação: `03` lê holding registers, `04` lê input
  registers, `06` escreve um registrador, `05` liga ou desliga uma coil.
- **Duas formas principais:**
  - **Modbus RTU**, em cabo serial (RS-485), em binário, com conferência de
    erro (CRC);
  - **Modbus TCP**, na rede Ethernet, pela porta 502.

**Exemplo:** o supervisório quer a temperatura de um forno.

```
Pedido   → servidor 1, função 03, a partir do registrador 0, ler 1 registrador
Resposta ← valor 245
```

O número 245 não diz nada sozinho. Quem programou o sistema precisa saber que
o registrador 0 é a temperatura e que o valor está multiplicado por 10, ou
seja, **24,5 °C**.

## 5. Comparação: HTTP/REST × Modbus

| Aspecto | HTTP/REST (CTI Insights) | Modbus |
|---|---|---|
| **Onde é usado** | Sistemas de informação, sites, aplicativos (TI) | Chão de fábrica: CLPs, sensores, inversores (TA) |
| **Quem inicia** | O cliente (navegador ou Spring) pede, e o servidor responde | O cliente (mestre) pergunta, e o servidor (escravo) responde |
| **Como os dados são identificados** | Por **nome**: `/api/clientes`, campo `faturamento` | Por **número**: registrador 40001, sem nome |
| **Formato** | Texto em JSON, legível por pessoas | Binário compacto, ilegível sem a tabela de registradores |
| **Tipos de dados** | Texto, números, datas, listas, objetos | Bits e números de 16 bits; o resto é convenção |
| **Tamanho de cada mensagem** | Grande (cabeçalhos + JSON) | Muito pequena (no máximo 253 bytes de dados) |
| **Transporte** | Internet (TCP/IP), porta 443 com HTTPS | Cabo serial (RTU) ou Ethernet (TCP, porta 502) |
| **Segurança** | HTTPS criptografa; login, sessão e permissões ficam na aplicação | O Modbus original **não tem** senha nem criptografia: a proteção depende de isolar a rede. Existe uma versão com TLS (Modbus/TCP Security), ainda pouco comum. |
| **Tempo de resposta** | Centenas de milissegundos são aceitáveis | Milissegundos, previsível: precisa acompanhar a máquina |
| **Exemplo no contexto** | `GET /api/dashboard` devolve os indicadores da carteira | Função 03 lê a temperatura do forno |

**O que os dois têm em comum:**
- os dois seguem o modelo **pergunta e resposta**: um lado pede e o outro responde;
- os dois são **padrões abertos**, então equipamentos e sistemas de fabricantes
  diferentes conseguem conversar;
- os dois levam dados **de onde são gerados até onde viram decisão**, que é a
  essência da integração TI/TA.

## 6. Se a CTI um dia tivesse dados de máquinas

Imagine que a CTI quisesse acompanhar também os **equipamentos instalados nos
clientes**, como roteadores e nobreaks. A ponte entre os dois mundos seria um
**gateway**: um pequeno programa (em Python, por exemplo, com a biblioteca
`pymodbus`) que conversa em Modbus de um lado e em HTTP do outro.

```
Equipamento ──Modbus TCP──► Gateway ──HTTP/REST (JSON)──► Spring Boot ──► PostgreSQL ──► Dashboard
 (registradores)            (traduz número em nome:        (mesma API do sistema,
                             "registrador 0 = temperatura")  com autenticação)
```

O gateway faz exatamente a tradução da tabela da seção 5: lê **números** em
registradores e envia **dados com nome** em JSON. O restante do CTI Insights
(API, banco e dashboard) seria reaproveitado.

**OPC-UA, a alternativa moderna:** em projetos novos, a indústria tem adotado o
**OPC-UA**. Ele já nasce com segurança (criptografia e certificados) e com dados
**com nome e significado**, como "Forno1.Temperatura" em °C. Fica muito mais
próximo da lógica do REST do que o Modbus.

## 7. A planilha como coleta de dados

Na ementa, "coletar dados" é o papel dos sensores. No CTI Insights, quem coleta
é a **planilha da carteira**: cada linha registra um cliente, como uma
leitura de sensor registra um valor.

| | Sensor + Modbus | Planilha + CTI Insights |
|---|---|---|
| Como coleta | Automática e contínua | Manual, por envio (o consultor preenche e importa) |
| Erros típicos | Ruído, sensor descalibrado, cabo rompido | Grafias diferentes (`IND.`, `industria`), campos vazios, códigos repetidos |
| Tratamento | Filtros, limites de alarme e validação no supervisório | Validação no Vue e no Spring, padronização no Python (`IND.` → `Indústria`) |

**Limitação honesta:** a coleta do CTI Insights **não é automática**. Os dados
são atualizados quando alguém envia uma planilha nova. Importar direto do
sistema de faturamento da CTI está registrado como melhoria futura no
relatório.

## 8. O dashboard como painel de monitoramento

O dashboard cumpre o papel da tela do supervisório: mostra a situação da
carteira (faturamento por segmento, curva ABC, consultores) e destaca o que
pede ação, as **oportunidades de upsell**, como um alarme aponta uma máquina
fora do normal.

Sobre "tempo real": num supervisório, a tela muda a cada poucos segundos. No
CTI Insights, os gráficos são recalculados **assim que uma planilha ou uma
alteração é processada**, o que leva alguns segundos. É "tempo real" no ritmo
do negócio, não no ritmo de uma máquina. Os prints estão em
[`evidencias/entrega-final/`](../evidencias/entrega-final/) (`08-dashboard-desktop.png`).

## 9. O que não se aplica

Para não forçar uma implementação que não existe, o grupo registra que **não
fazem parte** do CTI Insights:
- sensores (eletromecânicos, indutivos, capacitivos, ópticos etc.);
- atuadores (pneumáticos, hidráulicos, motores e servomotores);
- robôs industriais;
- CLP e PC industrial, e o envio e o recebimento de sinais para o CLP.

O motivo: o projeto trata **dados comerciais em planilha**, não sinais físicos
de uma planta industrial. O mesmo registro está no
[relatório final](RELATORIO-FINAL.md), seção 5.

## 10. Perguntas que a banca pode fazer

**"Onde está a automação no projeto de vocês?"**
Não há automação de máquinas. Aplicamos o princípio da integração TI/TA:
coletar dados, transportá-los por um protocolo padrão, tratá-los e exibi-los
para decisão. A planilha faz o papel da coleta, HTTP/REST o do protocolo e o
dashboard o do supervisório.

**"Por que não usaram Modbus?"**
Porque não há equipamento industrial envolvido. Os dados são comerciais e
circulam entre sistemas web, e HTTP/REST é o padrão para isso. Se houvesse
máquinas, um gateway Modbus → HTTP permitiria ligá-las ao mesmo sistema (seção 6).

**"Qual a maior diferença entre os dois protocolos?"**
O Modbus identifica os dados por número (registrador) e não tem segurança
nativa. O HTTP/REST identifica os dados por nome, em JSON, e usa HTTPS, login
e permissões.

## Referências

- SENAI-SP. *Plano de ensino do Projeto Integrador II* (5.01-FR-97 v.4), seção 1.3.4.
- MODBUS ORGANIZATION. *Modbus Application Protocol Specification V1.1b3*. 2012.
- MODBUS ORGANIZATION. *Modbus Messaging on TCP/IP Implementation Guide V1.0b*. 2006.
- IETF. *RFC 9110: HTTP Semantics*. 2022.
- OPC FOUNDATION. *OPC Unified Architecture* (IEC 62541).
