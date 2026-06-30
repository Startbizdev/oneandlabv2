<template>
  <div class="space-y-3">
    <canvas
      ref="canvasRef"
      class="block w-full touch-none rounded-lg border border-gray-300 bg-white dark:border-gray-600 dark:bg-gray-900"
      :width="width"
      :height="height"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointerleave="onPointerUp"
      @pointercancel="onPointerUp"
    />
    <div class="flex flex-wrap gap-2">
      <UButton size="sm" color="neutral" variant="soft" @click="clear">
        Effacer
      </UButton>
      <slot name="actions" />
    </div>
  </div>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    width?: number;
    height?: number;
    strokeColor?: string;
    strokeWidth?: number;
  }>(),
  {
    width: 560,
    height: 180,
    strokeColor: '#111111',
    strokeWidth: 2.2,
  },
);

const canvasRef = ref<HTMLCanvasElement | null>(null);
const drawing = ref(false);
let lastX = 0;
let lastY = 0;

function getCtx() {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  return canvas.getContext('2d');
}

function clear() {
  const canvas = canvasRef.value;
  const ctx = getCtx();
  if (!canvas || !ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function onPointerDown(e: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  drawing.value = true;
  canvas.setPointerCapture(e.pointerId);
  const rect = canvas.getBoundingClientRect();
  lastX = e.clientX - rect.left;
  lastY = e.clientY - rect.top;
}

function onPointerMove(e: PointerEvent) {
  if (!drawing.value) return;
  const canvas = canvasRef.value;
  const ctx = getCtx();
  if (!canvas || !ctx) return;
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  ctx.strokeStyle = props.strokeColor;
  ctx.lineWidth = props.strokeWidth;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(x, y);
  ctx.stroke();
  lastX = x;
  lastY = y;
}

function onPointerUp(e: PointerEvent) {
  if (!drawing.value) return;
  drawing.value = false;
  const canvas = canvasRef.value;
  try {
    canvas?.releasePointerCapture(e.pointerId);
  } catch {
    /* ignore */
  }
}

function isEmpty(): boolean {
  const canvas = canvasRef.value;
  const ctx = getCtx();
  if (!canvas || !ctx) return true;
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] !== 0) return false;
  }
  return true;
}

function exportPngBase64(): string | null {
  const canvas = canvasRef.value;
  if (!canvas || isEmpty()) return null;
  const dataUrl = canvas.toDataURL('image/png');
  const idx = dataUrl.indexOf(',');
  return idx >= 0 ? dataUrl.slice(idx + 1) : null;
}

function loadFromBase64(pngBase64: string | null | undefined) {
  clear();
  if (!pngBase64?.trim()) return;
  const canvas = canvasRef.value;
  const ctx = getCtx();
  if (!canvas || !ctx) return;
  const img = new Image();
  img.onload = () => {
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  };
  img.src = pngBase64.startsWith('data:') ? pngBase64 : `data:image/png;base64,${pngBase64}`;
}

defineExpose({ clear, exportPngBase64, isEmpty, loadFromBase64 });
</script>
