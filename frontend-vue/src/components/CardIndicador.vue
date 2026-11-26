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
  <div class="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
    <p class="text-xs text-gray-500">
      {{ titulo }}
    </p>

    <p class="mt-2 text-base font-bold whitespace-nowrap text-[#292A2F]">
      {{ valor }}
    </p>
  </div>
</template>
