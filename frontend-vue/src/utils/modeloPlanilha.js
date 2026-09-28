// Gera o modelo de planilha que o consultor baixa antes do primeiro envio.
export const COLUNAS_MODELO = [
  'consultor',
  'codigo_cliente',
  'nome_cliente',
  'segmento',
  'nivel_cliente',
  'data_contratacao',
  'servicos_contratados',
  'faturamento_anual'
]

export const baixarModelo = async () => {
  const XLSX = await import('xlsx')

  // Aba "Clientes" só com o cabeçalho: o exemplo fica nas instruções,
  // assim uma linha de exemplo esquecida nunca é importada.
  const clientes = XLSX.utils.aoa_to_sheet([COLUNAS_MODELO])

  const instrucoes = XLSX.utils.aoa_to_sheet([
    ['Coluna', 'Obrigatória', 'Como preencher', 'Exemplo'],
    ['consultor', 'Sim', 'Nome do consultor responsável', 'Maria Souza'],
    ['codigo_cliente', 'Sim', 'Código único do cliente', 'CLI-001'],
    ['nome_cliente', 'Sim', 'Razão social ou nome fantasia', 'Empresa Exemplo Ltda'],
    ['segmento', 'Sim', 'Ex.: Indústria, Comércio, Serviços', 'Indústria'],
    ['nivel_cliente', 'Sim', 'Somente A, B ou C', 'A'],
    ['data_contratacao', 'Sim', 'Data no formato dd/mm/aaaa', '15/03/2026'],
    ['servicos_contratados', 'Sim', 'Um ou mais serviços; se forem vários, separe com ";"', 'Link Dedicado;Firewall'],
    ['faturamento_anual', 'Não', 'Valor em reais, só números', 120000],
    [],
    ['Preencha os clientes na aba "Clientes", uma linha por cliente, sem mudar o cabeçalho.']
  ])

  const planilha = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(planilha, clientes, 'Clientes')
  XLSX.utils.book_append_sheet(planilha, instrucoes, 'Instrucoes')
  XLSX.writeFile(planilha, 'modelo-cti-insights.xlsx')
}
