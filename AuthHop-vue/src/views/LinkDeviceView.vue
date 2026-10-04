<template>
  <section class="page-card">
    <h1 class="section-title">Link this device</h1>
    <p class="subtitle">
      Allow <span class="badge">{{ siteId || 'the site' }}</span> to publish active sessions from this
      trusted browser to your AuthHop account.
    </p>

    <div v-if="loading" class="empty-state">Linking device…</div>

    <div v-else-if="error" class="alert alert-danger">{{ error }}</div>

    <div v-else class="empty-state">Preparing device link…</div>

    <div class="toolbar" style="margin-top: 1rem">
      <router-link class="ghost-button" to="/devices">Trusted devices</router-link>
      <button v-if="error" class="cta-button" type="button" :disabled="loading" @click="runLink">
        Try again
      </button>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useDeviceLinkStore } from '../stores/deviceLink';

const route = useRoute();
const linkStore = useDeviceLinkStore();
const { loading, error } = storeToRefs(linkStore);

const siteId = computed(() => {
  const value = route.query.site_id || route.query.siteId;
  return typeof value === 'string' ? value : '';
});

const returnUri = computed(() => {
  const value = route.query.return_uri || route.query.returnUri;
  return typeof value === 'string' ? value : '';
});

const state = computed(() => {
  const value = route.query.state;
  return typeof value === 'string' ? value : '';
});

const redirectBack = (extra = {}) => {
  if (!returnUri.value) return;
  const url = new URL(returnUri.value);
  Object.entries(extra).forEach(([key, val]) => {
    if (val != null) url.searchParams.set(key, val);
  });
  window.location.assign(url.toString());
};

const runLink = async () => {
  if (!siteId.value) {
    linkStore.error = 'Missing site_id.';
    return;
  }
  if (!returnUri.value) {
    linkStore.error = 'Missing return_uri.';
    return;
  }
  try {
    const result = await linkStore.createLink(siteId.value);
    redirectBack({
      link_token: result.link_token,
      state: state.value || undefined,
    });
  } catch {
    /* error on store */
  }
};

onMounted(() => {
  runLink();
});
</script>
