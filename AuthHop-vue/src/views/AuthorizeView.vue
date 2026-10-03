<template>
  <section class="page-card">
    <h1 class="section-title">Authorize {{ request?.site_id || 'site' }}</h1>
    <p class="subtitle">
      A relying party wants to sign you in with AuthHop. This only succeeds if
      <strong>this device is trusted</strong> and you complete WebAuthn.
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
        {{ loading ? 'Verifying device…' : 'Authenticate with this trusted device' }}
      </button>
      <router-link class="ghost-button" to="/devices">Manage trusted devices</router-link>
      <button class="ghost-button danger" type="button" @click="deny">Deny</button>
    </div>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
    <div v-if="hint" class="alert alert-info">{{ hint }}</div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useSsoStore } from '../stores/sso';

const route = useRoute();
const router = useRouter();
const ssoStore = useSsoStore();
const { request, loading, error } = storeToRefs(ssoStore);
const hint = ref('');

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
  hint.value = '';
  try {
    const result = await ssoStore.approveWithTrustedDevice();
    redirectBack({ code: result.code, state: result.state });
  } catch (err) {
    hint.value =
      'If this device is not enrolled yet, open Trusted Devices → Add this as a trusted device, then try again.';
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
    await ssoStore.loadRequest(requestId.value, {
      siteId: typeof route.query.mock_site_id === 'string' ? route.query.mock_site_id : '',
      redirectUri:
        typeof route.query.mock_redirect_uri === 'string' ? route.query.mock_redirect_uri : '',
      state: typeof route.query.mock_state === 'string' ? route.query.mock_state : '',
    });
  } catch {
    /* error already on store */
  }
});
</script>
