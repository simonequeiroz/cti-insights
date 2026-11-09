// Papéis de usuário e o que cada um pode fazer. É a única fonte das regras
// de acesso do front: Sidebar, guarda de rota e botões consultam daqui.
// No front isso só esconde/bloqueia telas; quem garante de verdade é o
// back-end, que deve aplicar as mesmas regras em cada endpoint.
//
// Todos consultam o Dashboard e os Relatórios e exportam os dados. Além disso:
//   Consultor     → importa a planilha consolidada da carteira
//   Gestor        → só acompanha os resultados (perfil estratégico)
//   Administrador → importa, aprova cadastros e apaga dados/histórico

export const PAPEIS = [
  {
    valor: 'CONSULTOR',
    rotulo: 'Consultor',
    descricao: 'Importa as planilhas de clientes e acompanha o Dashboard e os Relatórios.'
  },
  {
    valor: 'GESTOR',
    rotulo: 'Gestor',
    descricao: 'Acompanha o Dashboard e os Relatórios e exporta os dados.'
  },
  {
    valor: 'ADMINISTRADOR',
    rotulo: 'Administrador',
    descricao: 'Acesso total: importa planilhas, aprova cadastros e pode apagar dados e histórico.'
  }
]

export const rotuloPapel = valor => PAPEIS.find(papel => papel.valor === valor)?.rotulo || ''

// Ação → papéis que podem fazê-la
const PERMISSOES = {
  importarPlanilha: ['CONSULTOR', 'ADMINISTRADOR'],
  removerHistorico: ['ADMINISTRADOR'],
  limparDados: ['ADMINISTRADOR'],
  gerenciarUsuarios: ['ADMINISTRADOR']
}

export const podeFazer = (papel, acao) => Boolean(PERMISSOES[acao]?.includes(papel))

// Situação do cadastro: só entra quem foi aprovado por um Administrador
export const STATUS_CONTA = {
  PENDENTE: 'PENDENTE',
  APROVADO: 'APROVADO',
  REJEITADO: 'REJEITADO'
}
