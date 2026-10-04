<template>
  <section class="page-card">
    <h1 class="section-title">Recent Hops</h1>
    <p class="subtitle">
      Times AuthHop hopped (or denied) an external-site session onto one of your trusted devices.
    </p>

    <div class="toolbar">
      <button class="ghost-button" type="button" :disabled="loading" @click="authHistoryStore.fetchHistory()">
        Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading && !events.length" class="empty-state">Loading history…</div>
    <div v-else-if="!events.length" class="empty-state">No authentications yet.</div>

    <div v-else class="table-panel">
      <table>
        <thead>
          <tr>
            <th>When</th>
            <th>Site</th>
            <th>Status</th>
            <th>IP</th>
            <th>Location</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="event in events" :key="event.id">
            <td>{{ formatDate(event.created_at) }}</td>
            <td><span class="badge">{{ event.site_id }}</span></td>
            <td>
              <span class="badge" :class="{ muted: event.status !== 'success' }">{{ event.status }}</span>
            </td>
            <td><code>{{ event.ip_address || '—' }}</code></td>
            <td>{{ event.location_label }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthHistoryStore } from '../stores/authHistory';

const authHistoryStore = useAuthHistoryStore();
const { events, loading, error } = storeToRefs(authHistoryStore);
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

onMounted(() => authHistoryStore.fetchHistory());
</script>
