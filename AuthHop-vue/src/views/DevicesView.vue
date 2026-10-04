<template>
  <section class="page-card">
    <h1 class="section-title">Trusted Devices</h1>
    <p class="subtitle">
      Enroll the browser you are using now. AuthHop stores a cryptographic key in this browser so later
      visits and site logins can succeed automatically on this device.
    </p>

    <div class="toolbar">
      <button class="cta-button" type="button" @click="openAdd">Add this as a trusted device</button>
      <span v-if="userStore.hasTrustedDevice" class="badge">
        <span class="status-dot"></span>
        This browser is enrolled
      </span>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-if="loading && !devices.length" class="empty-state">Loading devices…</div>
    <div v-else-if="!devices.length" class="empty-state">
      No trusted devices yet. Click <strong>Add this as a trusted device</strong> on each browser you trust.
    </div>

    <div v-else class="table-panel">
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Added</th>
            <th>Last seen</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="device in devices" :key="device.id">
            <td><strong>{{ device.device_name }}</strong></td>
            <td>{{ formatDate(device.created_at) }}</td>
            <td>{{ formatDate(device.last_seen_at) }}</td>
            <td>
              <button class="ghost-button danger" type="button" @click="openRemove(device)">Remove</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <DeviceNamePrompt
      v-if="prompt === 'add'"
      title="Add this as a trusted device"
      message="Name this device. A cryptographic key will be created in this browser — no fingerprint or passkey prompt."
      confirm-label="Enroll this device"
      :error="promptError"
      @confirm="confirmAdd"
      @cancel="closePrompt"
    />

    <DeviceNamePrompt
      v-if="prompt === 'remove'"
      title="Remove trusted device"
      :message="`Type “${pendingDevice?.device_name}” to confirm removal.`"
      label="Confirm device name"
      :placeholder="pendingDevice?.device_name || ''"
      confirm-label="Remove device"
      danger
      :error="promptError"
      @confirm="confirmRemove"
      @cancel="closePrompt"
    />
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { storeToRefs } from 'pinia';
import DeviceNamePrompt from '../components/DeviceNamePrompt.vue';
import { useDevicesStore } from '../stores/devices';
import { useUserStore } from '../stores/user';

const devicesStore = useDevicesStore();
const userStore = useUserStore();
const { devices, loading, error } = storeToRefs(devicesStore);

const prompt = ref(null);
const pendingDevice = ref(null);
const promptError = ref('');

const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');
const openAdd = () => {
  promptError.value = '';
  prompt.value = 'add';
};
const openRemove = (device) => {
  pendingDevice.value = device;
  promptError.value = '';
  prompt.value = 'remove';
};
const closePrompt = () => {
  prompt.value = null;
  pendingDevice.value = null;
  promptError.value = '';
};

const confirmAdd = async (name) => {
  promptError.value = '';
  try {
    await devicesStore.addThisAsTrustedDevice(name);
    closePrompt();
  } catch (err) {
    promptError.value = err.message || 'Could not enroll device';
  }
};

const confirmRemove = async (name) => {
  promptError.value = '';
  try {
    await devicesStore.removeDevice(pendingDevice.value.id, name);
    closePrompt();
  } catch (err) {
    promptError.value = err.message || 'Could not remove device';
  }
};

onMounted(() => devicesStore.fetchDevices());
</script>
