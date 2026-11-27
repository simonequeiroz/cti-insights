# Guia de acesso: login, cadastro e gestão de usuários

**Sistema CTI Insights** · Para quem vai usar o sistema na CTI (consultores,
gestores e administradores) e para quem vai avaliar o projeto.

## 1. Resumo em 30 segundos

- **Ninguém entra sem aprovação.** A pessoa cria a conta, e um
  **administrador** aprova dentro do sistema, na tela **Usuários**.
- **O sistema não envia e-mail.** Não há link de confirmação nem
  recuperação de senha por e-mail. Tudo passa pelo administrador.
- **O primeiro administrador já nasce aprovado.** Ele é criado
  automaticamente pelo servidor, com os dados configurados na instalação.
- **Cada papel vê e faz só o que precisa** (seção 3).

## 2. Passo a passo

### 2.1 Criar a conta (primeiro acesso)

1. Na página inicial, clique em **Entrar no Sistema** → **Criar conta**.
2. Preencha:

   | Campo | Regra |
   |---|---|
   | Nome completo | Nome **e** sobrenome |
   | E-mail | Um e-mail válido, que ainda não tenha cadastro |
   | Papel | Consultor, Gestor ou Administrador (o que você **pede**; o administrador confirma) |
   | Senha | Pelo menos **8 caracteres** |
   | Confirmar senha | Igual à senha |

3. Clique em **Criar conta**. A tela avisa que o cadastro está **aguardando
   aprovação**.
4. Avise o administrador de que você se cadastrou.

> Se o e-mail já tiver cadastro, o sistema avisa e indica o login.

### 2.2 Aprovar um cadastro (administrador)

1. Entre no sistema. Quando há cadastros esperando, o menu lateral mostra
   um **aviso** na opção **Usuários**.
2. Em **Usuários**, na lista **Aguardando aprovação**, confira o nome, o
   e-mail e o **papel pedido**.
3. Se o papel estiver errado, troque no seletor **antes** de aprovar.
4. Clique em **Aprovar** ou **Recusar**.

A partir da aprovação, a pessoa já consegue entrar.

### 2.3 Entrar no sistema (login)

1. Na página inicial, clique em **Entrar no Sistema**.
2. Digite o e-mail e a senha do cadastro e clique em **Entrar no Sistema**.
3. O sistema abre o **Dashboard**. Se você tinha tentado abrir outra tela
   antes do login, ele volta para essa tela.

| Mensagem na tela | O que significa | O que fazer |
|---|---|---|
| "E-mail ou senha inválidos." | O e-mail ou a senha não conferem. Por segurança, o sistema não diz qual dos dois está errado | Confira e tente de novo. Se esqueceu a senha, veja a seção 2.4 |
| "Seu cadastro ainda está aguardando a aprovação de um administrador." | A conta existe, mas ainda não foi aprovada | Aguarde ou avise o administrador |
| "Seu cadastro não foi aprovado. Procure o administrador do sistema." | O cadastro foi recusado ou o acesso foi bloqueado | Fale com o administrador |
| "Sua sessão foi encerrada..." | Você ficou **30 minutos sem usar** o sistema, ou o servidor foi reiniciado | Entre de novo. Você volta para a tela onde estava |

### 2.4 Esqueci minha senha

1. Na tela de login, clique em **Esqueci minha senha** para ver a orientação.
2. Peça ao administrador uma **senha temporária**.
3. O administrador, em **Usuários**, clica em **Gerar senha temporária**. A
   senha aparece **uma única vez**, para ele copiar e passar a você por um
   meio seguro (pessoalmente ou por mensagem direta).
4. Entre com a senha temporária. O sistema **obriga** você a criar uma
   senha nova antes de liberar as outras telas.

> Ao gerar a senha temporária, a senha antiga para de funcionar na hora.

### 2.5 Trocar a própria senha

No menu lateral, clique em **Trocar senha** e informe a senha atual, a
senha nova (pelo menos 8 caracteres, diferente da atual) e a confirmação.

### 2.6 Sair

Clique em **Sair**, no menu lateral. A sessão é encerrada no servidor. Em
computador compartilhado, **sempre saia** ao terminar.

## 3. Papéis: quem pode fazer o quê

| Ação | Consultor | Gestor | Administrador |
|---|:---:|:---:|:---:|
| Ver o Dashboard, os insights e a carteira de clientes | ✅ | ✅ | ✅ |
| Exportar os dados (CSV e PDF) | ✅ | ✅ | ✅ |
| Importar a planilha da carteira | ✅ | — | ✅ |
| Incluir e editar clientes | ✅ | — | ✅ |
| Excluir clientes | — | — | ✅ |
| Apagar histórico de envios e dados | — | — | ✅ |
| Aprovar cadastros, trocar papéis, bloquear acesso e gerar senha temporária | — | — | ✅ |

- **Consultor:** cuida da carteira no dia a dia.
- **Gestor:** acompanha os resultados (perfil estratégico, só leitura).
- **Administrador:** tudo do consultor, mais a gestão de acessos.

Telas que o papel não pode usar **não aparecem no menu**. Se alguém tentar
abrir pelo endereço, o sistema volta para o Dashboard com um aviso. O
servidor também confere o papel em cada pedido: não adianta "burlar" a
tela.

## 4. Gestão de acessos (administrador)

Na tela **Usuários**, lista **Equipe com cadastro avaliado**:

| Ação | Efeito |
|---|---|
| **Salvar papel** | Aparece quando você muda o seletor de papel. Troca o papel da pessoa. Vale **na hora**, mesmo se ela estiver logada |
| **Bloquear acesso** | A pessoa sai do sistema **na hora** e não consegue mais entrar. Dá para reativar depois |
| **Dar acesso como…** | Para quem foi recusado ou bloqueado: devolve o acesso com o papel escolhido |
| **Gerar senha temporária** | Para quem esqueceu a senha (seção 2.4) |

O administrador **não consegue mudar o próprio papel nem se bloquear**.
Assim, o sistema nunca fica sem administrador.

## 5. Boas práticas

**Para todos**
- Use uma senha só sua, com pelo menos 8 caracteres. Não reaproveite a
  senha de outros sistemas.
- Não compartilhe a sua conta: cada ação fica registrada em nome de quem
  fez (por exemplo, quem enviou cada planilha).
- Saia do sistema ao terminar, principalmente em computador compartilhado.

**Para o administrador**
- Confira o **papel pedido** antes de aprovar: dê o menor papel que a
  pessoa precisa (gestor só acompanha; consultor mexe na carteira).
- Tenha **pelo menos dois administradores**, para não depender de uma
  pessoa só para aprovar cadastros e gerar senhas.
- Quando alguém sair da equipe, **bloqueie o acesso** no mesmo dia.
- Passe a senha temporária por um meio seguro e nunca em grupo.

## 6. Como funciona por dentro (para a banca)

- **Senhas:** guardadas com **BCrypt** (criptografia de mão única).
  Ninguém consegue ler a senha, nem o administrador.
- **Sessão:** depois do login, o navegador guarda um **cookie de sessão
  protegido** (`HttpOnly`), que o JavaScript não consegue ler. Os pedidos que
  alteram dados levam também um **token CSRF**. A sessão expira depois de
  **30 minutos** sem uso. Por que sessão e não token JWT:
  [decisões do back-end](DECISOES-BACKEND.md#login-sessão-com-cookie-em-vez-de-token-jwt).
- **Na hora:** a cada pedido, o servidor confere de novo a situação e o
  papel da conta. Por isso bloquear ou trocar o papel vale imediatamente.
- **Primeiro administrador:** criado quando o servidor liga pela primeira
  vez, a partir das variáveis `ADMIN_NAME`, `ADMIN_EMAIL` e `ADMIN_PASSWORD`
  do `.env` (que não vai para o Git). Depois disso, mudar essas variáveis
  não altera a conta.
