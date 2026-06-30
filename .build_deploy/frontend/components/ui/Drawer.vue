<template>
  <Teleport to="body">
    <dialog
      v-if="modelValue"
      :open="modelValue"
      :aria-labelledby="`drawer-title-${drawerId.value}`"
      class="fixed inset-0 size-auto max-h-none max-w-none overflow-hidden bg-transparent backdrop:bg-transparent z-[10000]"
      :class="{ 'hidden': !modelValue }"
    >
      <!-- Backdrop -->
      <div
        class="absolute inset-0 transition-opacity duration-500 ease-in-out"
        :class="{
          'bg-gray-500/75 opacity-100': modelValue,
          'bg-gray-500/75 opacity-0': !modelValue,
        }"
        @click="handleClose"
      />

      <!-- Drawer Panel Container -->
      <div
        tabindex="0"
        class="absolute inset-0 pl-10 focus:outline-none sm:pl-16"
      >
        <!-- Drawer Panel -->
        <div
          class="group/dialog-panel relative ml-auto block size-full max-w-md transform transition duration-500 ease-in-out sm:duration-700"
          :class="{
            'translate-x-0': modelValue,
            'translate-x-full': !modelValue,
          }"
        >
          <!-- Close button -->
          <div
            class="absolute top-0 left-0 -ml-8 flex pt-4 pr-2 duration-500 ease-in-out sm:-ml-10 sm:pr-4"
            :class="{
              'opacity-100': modelValue,
              'opacity-0': !modelValue,
            }"
          >
            <button
              type="button"
              @click="handleClose"
              class="relative rounded-md text-gray-300 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              <span class="absolute -inset-2.5"></span>
              <span class="sr-only">Fermer</span>
              <UIcon name="i-lucide-x" class="size-6" />
            </button>
          </div>

          <!-- Drawer Content -->
          <div class="relative flex h-full flex-col bg-white py-6 shadow-xl overflow-hidden">
            <!-- Header -->
            <div class="px-4 sm:px-6 flex-shrink-0">
              <h2 :id="`drawer-title-${drawerId.value}`" class="text-base font-normal text-gray-900">
                <slot name="title">{{ title }}</slot>
              </h2>
            </div>

            <!-- Content -->
            <div class="relative mt-6 flex-1 px-4 sm:px-6 overflow-y-auto overflow-x-hidden">
              <slot />
            </div>

            <!-- Footer (optional) -->
            <div v-if="$slots.footer" class="px-4 sm:px-6 pt-4 border-t border-gray-200 flex-shrink-0">
              <slot name="footer" />
            </div>
          </div>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title?: string
  closeOnBackdrop?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  title: '',
  closeOnBackdrop: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  close: []
}>()

// Générer un ID unique pour le drawer (une seule fois)
const drawerId = ref(`drawer-${Math.random().toString(36).substr(2, 9)}`)

const handleClose = () => {
  if (props.closeOnBackdrop) {
    emit('update:modelValue', false)
    emit('close')
  }
}
</script>

