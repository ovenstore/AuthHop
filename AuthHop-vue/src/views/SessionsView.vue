<template>
  <section class="page-card">
    <h1 class="section-title">Active Sessions</h1>
    <p class="subtitle">
      External-site sessions published from your trusted devices. These are what AuthHop can hop to
      another trusted device.
    </p>

    <div class="toolbar">
      <button class="ghost-button" type="button" :disabled="loading" @click="sessionsStore.fetchSessions()">
        Refresh
      </button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="loading && !sessions.length" class="empty-state">Loading sessions…</div>
    <div v-else-if="!sessions.length" class="empty-state">
      No active external sessions. Sign in to a linked site (e.g. the demo app) on a trusted device.
    </div>

    <div v-else class="table-panel">
      <table>
        <thead>
          <tr>
            <th>Site</th>
            <th>Account</th>
            <th>Device</th>
            <th>Expires</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="session in sessions" :key="session.id">
            <td><span class="badge">{{ session.site_id }}</span></td>
            <td>
              <strong>{{ session.external_display_name || session.external_email }}</strong>
              <div v-if="session.external_display_name" style="opacity: 0.75; font-size: 0.9em">
                {{ session.external_email }}
              </div>
            </td>
            <td>{{ session.device_name }}</td>
            <td>{{ formatDate(session.expires_at) }}</td>
            <td>
              <span class="badge" :class="{ muted: !session.alive }">
                {{ session.alive ? 'active' : 'ended' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { onMounted } from 'vue';
import { storeToRefs } from 'pinia';
import { useSessionsStore } from '../stores/sessions';

const sessionsStore = useSessionsStore();
const { sessions, loading, error } = storeToRefs(sessionsStore);
const formatDate = (value) => (value ? new Date(value).toLocaleString() : '—');

onMounted(() => sessionsStore.fetchSessions());
</script>
