<template>
  <section class="page-card">
    <h1 class="section-title">Authorize {{ request?.site_id || 'site' }}</h1>
    <p class="subtitle">
      A site wants to sign you in with AuthHop. This succeeds automatically when this browser is a trusted device.
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
            <th>Redirect</th>
            <td><code>{{ request.redirect_uri }}</code></td>
          </tr>
          <tr>
            <th>Status</th>
            <td>{{ request.status }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="toolbar">
      <button class="cta-button" type="button" :disabled="loading || request?.status !== 'pending'" @click="approve">
        {{ loading ? 'Authenticating…' : 'Continue' }}
      </button>
      <router-link class="ghost-button" to="/devices">Manage trusted devices</router-link>
      <button class="ghost-button danger" type="button" @click="deny">Deny</button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSsoStore } from '../stores/sso';

const route = useRoute();
const router = useRouter();
const ssoStore = useSsoStore();
const { request, loading, error } = storeToRefs(ssoStore);

const requestId = computed(() => {
  const value = route.query.request_id || route.query.requestId;
  return typeof value === 'string' ? value : '';
});

const redirectBack = (extra = {}) => {
  if (!request.value?.redirect_uri) {
    router.push('/devices');
    return;
  }
  const url = new URL(request.value.redirect_uri);
  Object.entries(extra).forEach(([key, val]) => {
    if (val != null) url.searchParams.set(key, val);
  });
  window.location.assign(url.toString());
};

const approve = async () => {
  try {
    const result = await ssoStore.approveWithTrustedDevice();
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
    ssoStore.error = 'Missing request_id. Start login from the demo site.';
    return;
  }
  try {
    await ssoStore.loadRequest(requestId.value);
    if (ssoStore.request?.status === 'pending') {
      await approve();
    }
  } catch {
    /* error already on store */
  }
});
</script>
