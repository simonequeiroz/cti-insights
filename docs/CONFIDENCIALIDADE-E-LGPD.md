# Confidencialidade e proteção de dados (LGPD)

**Projeto:** Sistema CTI Insights · **Grupo:** Data Pulse · **Turma:** ADS B (CSTADS126N2)
**Disciplina relacionada:** Relações Humanas e Cidadania (Projeto Integrador II)

## 1. Declaração de confidencialidade

O grupo Data Pulse declara que:

1. As informações do Provedor CTI recebidas durante o projeto (planilhas,
   nomes de clientes, faturamento, serviços contratados e consultores) são
   **confidenciais** e foram usadas **somente para fins acadêmicos** deste
   Projeto Integrador.
2. **Nenhum dado real da CTI foi colocado no repositório**, que é público. Os
   testes, os exemplos e as evidências usam **dados fictícios** criados pelo
   grupo (por exemplo, `analytics-python/amostras/clientes.json`).
3. Os dados não serão compartilhados com terceiros nem usados depois do
   projeto. Cópias locais de planilhas recebidas da empresa devem ser apagadas
   ao final da disciplina.
4. Os resultados são apresentados como saem dos dados, **sem manipulação**.
   Quando a base é pequena ou incompleta, o grupo informa a limitação em vez
   de tirar conclusões que os números não sustentam.

| Integrante | Ciente e de acordo |
|---|---|
| Simone Queiroz Batista | ☐ |
| Justino Ricardo Jairi Silvestre | ☐ |
| Thyphanny Katherine Silva Franca | ☐ |
| Miguel Herculano Viana | ☐ |
| Ryan Vinicius da Silva | ☐ |

## 2. Que dados o sistema trata

| Dado | Onde aparece | É dado pessoal? |
|---|---|---|
| Nome, e-mail e senha de quem usa o sistema | Cadastro e login (tabela `usuario`) | **Sim.** Identifica uma pessoa. |
| Nome dos consultores da CTI | Planilha e dashboard (tabela `consultor`) | **Sim.** Identifica um funcionário. |
| Nome da empresa cliente, código, segmento, nível, cidade e UF | Planilha e relatórios (tabela `cliente`) | Em geral não, porque a LGPD protege pessoas físicas. Pode ser, quando a empresa é de uma pessoa só (ex.: MEI com o nome do dono). |
| Faturamento anual e serviços contratados | Planilha, dashboard e insights | Não é dado pessoal, mas é **informação comercial sigilosa** da CTI. |

O sistema **não** coleta CPF, telefone, endereço completo, dados de saúde nem
outros dados sensíveis (art. 5º, II, da LGPD).

## 3. Como o sistema aplica os princípios da LGPD

A LGPD (Lei nº 13.709/2018), no art. 6º, define princípios para o tratamento
de dados pessoais. Esta seção mostra como o CTI Insights aplica cada um.

| Princípio | O que significa | Como o CTI Insights aplica |
|---|---|---|
| **Finalidade** | Usar os dados só para um propósito definido | Os dados servem apenas para analisar a carteira e apoiar a venda de serviços. |
| **Necessidade** | Coletar só o mínimo | A planilha tem só as 10 colunas necessárias para as análises. O cadastro pede só nome, e-mail, papel e senha. |
| **Segurança** | Proteger contra acesso indevido | Login obrigatório, senhas com hash BCrypt, papéis por usuário, conexão SSL com o banco e senhas fora do código (detalhes na seção 4). |
| **Prevenção** | Evitar danos antes que aconteçam | A planilha é validada antes de gravar. O cadastro só vale depois da aprovação de um administrador. |
| **Transparência** | Deixar claro o que é feito com os dados | A tela de importação mostra o que foi corrigido, o que foi descartado e por quê. O histórico registra quem enviou cada planilha e quando. |
| **Qualidade dos dados** | Manter os dados corretos | Padronização automática (`IND.` → `Indústria`) e edição de clientes na tela Clientes. |
| **Responsabilização** | Poder demonstrar as medidas adotadas | Este documento, o histórico de envios (tabela `telemetria`) e o código no repositório. |

## 4. Medidas de segurança implementadas

Todas as medidas abaixo estão no código e podem ser conferidas:

- **Acesso só com login aprovado.** Um cadastro novo fica pendente até um
  administrador aprovar (`UsuarioService.java`).
- **Senhas com hash BCrypt.** A senha nunca é gravada em texto
  (`SecurityConfig.java`).
- **Papéis.** Consultor, gestor e administrador só fazem as ações permitidas
  à sua função. Por exemplo, o gestor só consulta, e só o administrador exclui
  clientes e aprova cadastros. A regra vale no front e é garantida pelo Spring
  em cada rota. O papel limita as **ações**, e não **quais clientes** cada um
  vê: todos os usuários aprovados veem a carteira inteira (veja a seção 6).
- **Sessão protegida.** O cookie de sessão é `HttpOnly` e `SameSite=Lax`, a
  sessão expira após 30 minutos sem uso e as escritas exigem token CSRF.
- **Banco protegido.** O navegador nunca acessa o banco. Só o Spring e o
  Python se conectam, e sempre com SSL (`sslmode=require`).
- **Senhas e chaves fora do código.** Ficam nos arquivos `.env`, que estão no
  `.gitignore`. O repositório traz só os `.env.example`, sem valores. O
  Python só aceita chamadas com a chave `X-ETL-Key`.
- **Insights agregados.** As frases do dashboard falam de segmentos, níveis e
  totais, não expõem dados de uma pessoa.

## 5. Incidente registrado

Em 26/11/2026, o grupo encontrou a senha do banco de dados do projeto num
commit de uma branch do repositório público. A branch já tinha sido apagada,
mas o commit continuava acessível pelo seu identificador.

**O que foi feito:**
- O sistema passou a usar um novo projeto no Neon, com credenciais que ficam
  só nos arquivos `.env` e nunca foram para o repositório.
- A credencial antiga deve ser revogada no painel do Neon (Roles → Reset
  password) pelo responsável pelo projeto antigo.
- O grupo reforçou a regra de nunca escrever senhas em arquivos versionados,
  como `application.properties` e o README, nem na URL de conexão.

**Lição:** apagar uma branch não apaga o histórico do Git. Uma senha que foi
para um repositório público deve ser considerada exposta e trocada na hora.

## 6. Limitações e próximos passos

O sistema é um MVP acadêmico. Para uso real com dados da CTI, faltaria:

- **Carteira por consultor.** Hoje todo usuário aprovado vê os clientes de
  todos os consultores. Pelo princípio da necessidade, o ideal seria cada
  consultor ver só a própria carteira, e só o gestor e o administrador verem
  tudo. Para isso, cada conta de login precisaria ser ligada ao consultor
  correspondente, e o Spring filtraria os clientes de acordo.

- **Política de retenção.** Cada planilha enviada gera uma nova versão da
  carteira, e as versões antigas continuam no banco. Seria preciso definir por
  quanto tempo guardá-las e apagar as antigas.
- **Direitos do titular.** Hoje, para corrigir ou excluir os próprios dados
  (nome e e-mail), o usuário precisa pedir ao administrador. Não há uma tela
  para isso.
- **Registro de acessos.** O histórico registra quem enviou cada planilha, mas
  não quem consultou os dados.
- **Contrato com a empresa.** O uso de dados reais exigiria um termo assinado
  com a CTI, definindo papéis (controlador e operador) e responsabilidades.

## 7. Reflexão do grupo

Trabalhar com a carteira de clientes de uma empresa mostrou que proteção de
dados não é uma etapa no fim do projeto. Ela aparece em decisões pequenas do
dia a dia: não colocar a planilha real no GitHub, não escrever senha no
código, perguntar se uma coluna é mesmo necessária e mostrar ao usuário o que
foi descartado.

O incidente com a senha do banco foi a prova prática disso. Um descuido de
segundos num repositório público expõe um dado que não volta a ser secreto.
A partir dele, o grupo passou a tratar credenciais e dados da empresa com a
mesma atenção que daria a informações próprias.
