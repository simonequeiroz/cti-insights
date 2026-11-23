// Filtro por período de contratação, usado no Dashboard e nos Relatórios.
//
// Datas no formato "aaaa-mm-dd" (o mesmo de <input type="date"> e de
// cliente.data_contratacao), então a comparação de texto já respeita a ordem
// cronológica. Início e fim são inclusivos; qualquer um dos dois pode estar
// vazio (período aberto). Com o filtro ativo, cliente sem data fica de fora
// (bases importadas antes da data ser obrigatória).
export const dentroDoPeriodo = (cliente, dataInicio, dataFim) => {
  if (!dataInicio && !dataFim) {
    return true
  }

  const data = cliente.data_contratacao

  if (!data) {
    return false
  }

  if (dataInicio && data < dataInicio) {
    return false
  }

  if (dataFim && data > dataFim) {
    return false
  }

  return true
}

// "De" maior que "Até" é um período impossível: sinaliza para a tela avisar
// em vez de mostrar tudo vazio sem explicação.
export const periodoInvertido = (dataInicio, dataFim) => {
  return Boolean(dataInicio && dataFim && dataInicio > dataFim)
}
