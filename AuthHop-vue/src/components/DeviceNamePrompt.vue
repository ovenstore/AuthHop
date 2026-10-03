<template>
  <div class="modal-overlay" @click.self="emit('cancel')">
    <div class="modal-card" role="dialog" aria-modal="true">
      <h2>{{ title }}</h2>
      <p>{{ message }}</p>

      <div class="form-field">
        <label for="device-name-input">{{ label }}</label>
        <input
          id="device-name-input"
          ref="inputRef"
          v-model="value"
          type="text"
          :placeholder="placeholder"
          autocomplete="off"
          @keydown.enter.prevent="confirm"
        />
      </div>

      <div v-if="error" class="alert alert-danger">{{ error }}</div>

      <div class="form-actions">
        <button type="button" class="cta-button" :class="{ danger }" :disabled="!value.trim()" @click="confirm">
          {{ confirmLabel }}
        </button>
        <button type="button" class="ghost-button" @click="emit('cancel')">Cancel</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { nextTick, onMounted, ref } from 'vue';

const props = defineProps({
  title: { type: String, required: true },
  message: { type: String, default: '' },
  label: { type: String, default: 'Device name' },
  placeholder: { type: String, default: 'e.g. Work Laptop' },
  confirmLabel: { type: String, default: 'Confirm' },
  danger: { type: Boolean, default: false },
  error: { type: String, default: '' },
});

const emit = defineEmits(['confirm', 'cancel']);
const value = ref('');
const inputRef = ref(null);

onMounted(async () => {
  await nextTick();
  inputRef.value?.focus();
});

const confirm = () => {
  const name = value.value.trim();
  if (!name) return;
  emit('confirm', name);
};
</script>
