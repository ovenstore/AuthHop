<template>
  <section class="card">
    <h1>Completing AuthHop sign-in…</h1>
    <p class="lede">Exchanging the one-time code for a demo session.</p>
    <div v-if="loading" class="alert info">Please wait…</div>
    <div v-if="error" class="alert">{{ error }}</div>
    <div v-if="error" class="actions" style="margin-top: 1rem">
      <router-link class="ghost" to="/login">Back to login</router-link>
    </div>
  </section>
</template>

<script setup>
import { onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useDemoUserStore } from '../stores/user';

const route = useRoute();
const router = useRouter();
const userStore = useDemoUserStore();
const { loading, error } = storeToRefs(userStore);

onMounted(async () => {
  const code = typeof route.query.code === 'string' ? route.query.code : '';
  const state = typeof route.query.state === 'string' ? route.query.state : '';
  const oauthError = typeof route.query.error === 'string' ? route.query.error : '';

  const ok = await userStore.completeAuthHopCallback({ code, state, error: oauthError });
  if (ok) router.replace('/home');
});
</script>
