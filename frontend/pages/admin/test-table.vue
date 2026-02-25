<template>
  <div class="space-y-6">
    <TitleDashboard title="Test Table" description="Page de test du composant tableau" />

    <UTable :data="testData" :columns="columns">
      <template #actions-data="{ row }">
        <UButton size="sm">Voir</UButton>
      </template>
    </UTable>
  </div>
</template>

<script setup lang="ts">
const columns = [
  { id: 'id', accessorKey: 'id', header: 'ID' },
  { id: 'name', accessorKey: 'name', header: 'Nom' },
  { id: 'actions', accessorKey: 'actions', header: 'Actions' },
];

const testData = [
  { id: 1, name: 'Test 1' },
  { id: 2, name: 'Test 2' },
];
</script>
