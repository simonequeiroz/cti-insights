// Data e hora no padrão brasileiro: "27/09/2026 às 14:30"
export const formatarDataHora = iso => {
  const data = new Date(iso)
  const dia = String(data.getDate()).padStart(2, '0')
  const mes = String(data.getMonth() + 1).padStart(2, '0')
  const ano = data.getFullYear()
  const hora = String(data.getHours()).padStart(2, '0')
  const minuto = String(data.getMinutes()).padStart(2, '0')
  return `${dia}/${mes}/${ano} às ${hora}:${minuto}`
}

export const formatarNumero = valor => {
  return valor === null || valor === undefined ? '--' : Number(valor).toLocaleString('pt-BR')
}

// Número com a palavra certa: "1 cliente", "2 clientes"
export const contar = (quantidade, singular, plural) => {
  return `${formatarNumero(quantidade)} ${quantidade === 1 ? singular : plural}`
}
