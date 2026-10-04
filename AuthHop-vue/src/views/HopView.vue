<template>
  <section class="page-card">
    <h1 class="section-title">Continue on {{ request?.site_id || 'site' }}</h1>
    <p class="subtitle">
      Pick an account that already has an active session on one of your trusted devices. AuthHop will
      sign this browser into that same account.
    </p>

    <div v-if="loading && !request" class="empty-state">Loading request…</div>

    <div v-else-if="request" class="table-panel" style="margin-bottom: 1.25rem">
      <table>
        <tbody>
          <tr>
            <th>Site</th>
            <td><span class="badge">{{ request.site_id }}</span></td>
          </tr>
          <tr>
            <th>Status</th>
            <td>{{ request.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-if="request?.status === 'pending' && !accounts.length && !loading" class="empty-state">
      No hoppable sessions for this site. Sign in to
      <strong>{{ request.site_id }}</strong> with email &amp; password on a trusted, linked device
      first.
    </div>

    <div v-else-if="accounts.length" class="table-panel" style="margin-bottom: 1.25rem">
      <table>
        <thead>
          <tr>
            <th>Account</th>
            <th>Active on</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="account in accounts" :key="account.external_user_id">
            <td>
              <strong>{{ account.external_display_name || account.external_email }}</strong>
              <div v-if="account.external_display_name" style="opacity: 0.75; font-size: 0.9em">
                {{ account.external_email }}
              </div>
            </td>
            <td>{{ formatDevices(account.device_names) }}</td>
            <td>
              <button
                class="cta-button"
                type="button"
                :disabled="loading || request?.status !== 'pending'"
                @click="choose(account.external_user_id)"
              >
                {{ loading ? 'Continuing…' : 'Use this account' }}
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="toolbar">
      <router-link class="ghost-button" to="/sessions">Active sessions</router-link>
      <router-link class="ghost-button" to="/devices">Trusted devices</router-link>
      <button class="ghost-button danger" type="button" @click="deny">Cancel</button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useHopStore } from '../stores/hop';

const route = useRoute();
const router = useRouter();
const hopStore = useHopStore();
const { request, accounts, loading, error } = storeToRefs(hopStore);

const requestId = computed(() => {
  const value = route.query.request_id || route.query.requestId;
  return typeof value === 'string' ? value : '';
});

const formatDevices = (names) => {
  if (!Array.isArray(names) || !names.length) return '—';
  if (names.length === 1) return names[0];
  return names.join(', ');
};

const redirectBack = (extra = {}) => {
  if (!request.value?.redirect_uri) {
    router.push('/sessions');
    return;
  }
  const url = new URL(request.value.redirect_uri);
  Object.entries(extra).forEach(([key, val]) => {
    if (val != null) url.searchParams.set(key, val);
  });
  window.location.assign(url.toString());
};

const choose = async (externalUserId) => {
  try {
    const result = await hopStore.approveAccount(externalUserId);
    redirectBack({ code: result.code, state: result.state });
  } catch {
    /* error on store */
  }
};

const deny = () => {
  redirectBack({ error: 'access_denied', state: request.value?.state });
};

onMounted(async () => {
  if (!requestId.value) {
    hopStore.error = 'Missing request_id. Start from the demo site with Continue with AuthHop.';
    return;
  }
  try {
    await hopStore.loadRequest(requestId.value);
    if (hopStore.request?.status !== 'pending') return;

    const list = await hopStore.loadAvailableAccounts();
    if (list.length === 1) {
      await choose(list[0].external_user_id);
    }
  } catch {
    /* error already on store */
  }
});
</script>
