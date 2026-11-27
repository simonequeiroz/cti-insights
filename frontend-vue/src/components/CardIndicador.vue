<script setup>
// Cartão de indicador (KPI) do Dashboard. O mesmo componente mostra
// faturamento total, clientes, serviços contratados e ticket médio: quem usa
// passa o título e o valor já formatado pelas props.
defineProps({
  titulo: { type: String, required: true },
  valor: { type: [String, Number], required: true }
})
</script>

<template>
  <article class="min-w-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
    <p class="text-xs text-gray-500">
      {{ titulo }}
    </p>

    <p class="mt-2 text-lg font-bold tracking-tight whitespace-nowrap text-cti-grafite sm:text-2xl">
      {{ valor }}
    </p>
  </article>
</template>
