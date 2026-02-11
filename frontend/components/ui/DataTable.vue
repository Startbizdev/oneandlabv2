<template>
  <div class="overflow-x-auto">
    <div v-if="loading" class="flex items-center justify-center py-12">
      <div class="size-8 animate-spin rounded-full border-2 border-primary-500 border-t-transparent" />
    </div>
    <template v-else-if="data.length > 0">
      <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead class="bg-gray-50 dark:bg-gray-800/50">
          <tr v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
            <th
              v-for="header in headerGroup.headers"
              :key="header.id"
              :colspan="header.colSpan"
              :class="[
                'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400',
              ]"
            >
              <slot
                v-if="hasSlot(`header-${header.column.id}`)"
                :name="`header-${header.column.id}`"
                :header="header"
                :table="table"
              />
              <template v-else>
                {{ typeof header.column.columnDef.header === 'string' ? header.column.columnDef.header : '' }}
              </template>
            </th>
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900/50">
          <tr
            v-for="row in table.getRowModel().rows"
            :key="row.id"
            class="hover:bg-gray-50 dark:hover:bg-gray-800/50"
          >
            <td
              v-for="cell in row.getVisibleCells()"
              :key="cell.id"
              class="whitespace-nowrap px-4 py-3 text-sm text-gray-900 dark:text-gray-100"
            >
              <slot
                v-if="hasSlot(`cell-${cell.column.id}`)"
                :name="`cell-${cell.column.id}`"
                :row="row"
                :cell="cell"
                :table="table"
              />
              <template v-else>
                {{ cell.getValue() }}
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </template>
    <div v-else class="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
      <slot name="empty">Aucune donnée</slot>
    </div>
  </div>
</template>

<script setup lang="ts" generic="TData extends Record<string, unknown>">
import {
  useVueTable,
  getCoreRowModel,
  type ColumnDef,
} from '@tanstack/vue-table'
import { useSlots, computed, toRef } from 'vue'

const props = defineProps<{
  data: TData[]
  columns: ColumnDef<TData, unknown>[]
  loading?: boolean
}>()

const slots = useSlots()

function hasSlot(name: string) {
  return !!slots[name]
}

const table = useVueTable({
  data: toRef(props, 'data'),
  columns: computed(() => props.columns),
  getCoreRowModel: getCoreRowModel(),
})
</script>
