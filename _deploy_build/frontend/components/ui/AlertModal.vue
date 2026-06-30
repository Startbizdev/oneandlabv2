<template>
  <Teleport to="body">
    <dialog
      v-if="modelValue"
      :open="modelValue"
      aria-labelledby="dialog-title"
      class="fixed inset-0 size-auto max-h-none max-w-none overflow-y-auto bg-transparent backdrop:bg-transparent z-[9999]"
      @click.self="handleClose"
    >
      <!-- Backdrop -->
      <div
        class="fixed inset-0 transition-opacity"
        :class="{
          'bg-gray-500/75 opacity-100': modelValue,
          'bg-gray-500/75 opacity-0': !modelValue,
        }"
        style="transition-duration: 300ms; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
      />

      <!-- Dialog Panel Container -->
      <div
        tabindex="0"
        class="flex min-h-full items-end justify-center p-4 text-center focus:outline-none sm:items-center sm:p-0"
      >
        <!-- Dialog Panel -->
        <div
          class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg"
          :class="{
            'translate-y-0 opacity-100 scale-100': modelValue,
            'translate-y-4 opacity-0 sm:translate-y-0 sm:scale-95': !modelValue,
          }"
          style="transition-duration: 300ms; transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);"
        >
          <!-- Content -->
          <div class="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div class="sm:flex sm:items-start">
              <!-- Icon -->
              <div
                class="mx-auto flex size-12 shrink-0 items-center justify-center rounded-full sm:mx-0 sm:size-10"
                :class="iconBgClass"
              >
                <UIcon :name="icon" class="size-6" :class="iconColorClass" />
              </div>

              <!-- Text Content -->
              <div class="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3
                  id="dialog-title"
                  class="text-base font-normal text-gray-900"
                >
                  {{ title }}
                </h3>
                <div class="mt-2">
                  <p class="text-sm text-gray-500">
                    {{ message }}
                  </p>
                  <slot name="content" />
                </div>
              </div>
            </div>
          </div>

          <!-- Footer Actions -->
          <div class="bg-gray-50 px-4 py-3 sm:flex sm:flex-row-reverse sm:px-6">
            <button
              type="button"
              :disabled="loading || disabled"
              @click="handleConfirm"
              class="inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-normal text-white shadow-xs sm:ml-3 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              :class="[confirmButtonClass, confirmHoverClass]"
            >
              <span v-if="loading" class="mr-2">
                <UIcon name="i-lucide-loader-2" class="size-4 animate-spin" />
              </span>
              {{ confirmLabel }}
            </button>
            <button
              v-if="showCancel"
              type="button"
              :disabled="loading"
              @click="handleClose"
              class="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-normal text-gray-900 shadow-xs ring-1 ring-inset ring-gray-300 hover:bg-gray-50 sm:mt-0 sm:w-auto disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {{ cancelLabel }}
            </button>
          </div>
        </div>
      </div>
    </dialog>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  modelValue: boolean
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  confirmColor?: 'error' | 'primary' | 'success' | 'warning' | 'info' | 'neutral'
  icon?: string
  iconType?: 'error' | 'warning' | 'info' | 'success'
  loading?: boolean
  disabled?: boolean
  showCancel?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  confirmLabel: 'Confirmer',
  cancelLabel: 'Annuler',
  confirmColor: 'error',
  icon: 'i-lucide-alert-triangle',
  iconType: 'error',
  loading: false,
  disabled: false,
  showCancel: true,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  confirm: []
  cancel: []
}>()

const iconBgClass = computed(() => {
  const classes = {
    error: 'bg-red-100',
    warning: 'bg-amber-100',
    info: 'bg-blue-100',
    success: 'bg-green-100',
  }
  return classes[props.iconType] || classes.error
})

const iconColorClass = computed(() => {
  const classes = {
    error: 'text-red-600',
    warning: 'text-amber-600',
    info: 'text-blue-600',
    success: 'text-green-600',
  }
  return classes[props.iconType] || classes.error
})

const confirmButtonClass = computed(() => {
  const classes = {
    error: 'bg-red-600',
    primary: 'bg-primary-600',
    success: 'bg-green-600',
    warning: 'bg-amber-600',
    info: 'bg-blue-600',
    neutral: 'bg-gray-600',
  }
  return classes[props.confirmColor] || classes.error
})

const confirmHoverClass = computed(() => {
  const classes = {
    error: 'hover:bg-red-500',
    primary: 'hover:bg-primary-500',
    success: 'hover:bg-green-500',
    warning: 'hover:bg-amber-500',
    info: 'hover:bg-blue-500',
    neutral: 'hover:bg-gray-500',
  }
  return classes[props.confirmColor] || classes.error
})

const handleClose = () => {
  if (!props.loading) {
    emit('update:modelValue', false)
    emit('cancel')
  }
}

const handleConfirm = () => {
  if (!props.loading && !props.disabled) {
    emit('confirm')
  }
}
</script>

<style scoped>
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(1rem) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.2s ease-out;
}
</style>

