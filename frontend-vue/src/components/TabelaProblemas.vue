<script setup>
// Lista, linha a linha, o que impediu a importação de uma planilha
// (uploadStore guarda isso em "problemas" no registro do histórico).
defineProps({
  problemas: { type: Array, required: true },
  // Total real de problemas; pode ser maior que a lista (que é limitada).
  total: { type: Number, default: 0 }
})
</script>

<template>
  <div class="overflow-hidden rounded-md border border-red-200 bg-white text-left">
    <div class="max-h-64 overflow-y-auto">
      <table class="w-full text-xs">
        <thead class="sticky top-0 bg-red-50 text-red-700">
          <tr>
            <th class="w-20 px-3 py-2 font-semibold">Linha</th>
            <th class="w-44 px-3 py-2 font-semibold">Campo</th>
            <th class="px-3 py-2 font-semibold">Problema</th>
          </tr>
        </thead>

        <tbody>
          <tr
            v-for="problema in problemas"
            :key="`${problema.linha}-${problema.campo}`"
            class="border-t border-red-100"
          >
            <td class="px-3 py-2 font-['IBM_Plex_Mono'] text-gray-500">
              {{ problema.linha }}
            </td>
            <td class="px-3 py-2 font-medium text-[#292A2F]">
              {{ problema.campo }}
            </td>
            <td class="px-3 py-2 text-gray-600">
              {{ problema.descricao }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p
      v-if="total > problemas.length"
      class="border-t border-red-100 bg-red-50/50 px-3 py-2 text-[11px] text-red-700"
    >
      Mostrando os primeiros {{ problemas.length }} de {{ total }} problemas.
    </p>
  </div>
</template>
