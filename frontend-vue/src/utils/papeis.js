// Papéis de usuário e o que cada um pode fazer. É a única fonte das regras
// de acesso do front: Sidebar, guarda de rota e botões consultam daqui.
// No front isso só esconde/bloqueia telas; quem garante de verdade é o
// back-end, que deve aplicar as mesmas regras em cada endpoint.
//
// Níveis: cada papel pode tudo o que o anterior pode, e mais um pouco.
//   Analista      → consulta e exporta (Dashboard, Relatórios)
//   Gestor        → + importa planilhas (é quem responde pela base)
//   Administrador → + aprova cadastros e apaga dados/histórico

export const PAPEIS = [
  {
    valor: 'ANALISTA',
    rotulo: 'Analista',
    descricao: 'Consulta o Dashboard e os Relatórios e exporta os dados.'
  },
  {
    valor: 'GESTOR',
    rotulo: 'Gestor',
    descricao: 'Tudo do Analista, e também importa as planilhas de clientes.'
  },
  {
    valor: 'ADMINISTRADOR',
    rotulo: 'Administrador',
    descricao: 'Acesso total: aprova cadastros e pode apagar dados e histórico.'
  }
]

export const rotuloPapel = valor => PAPEIS.find(papel => papel.valor === valor)?.rotulo || ''

// Ação → papéis que podem fazê-la
const PERMISSOES = {
  importarPlanilha: ['GESTOR', 'ADMINISTRADOR'],
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
