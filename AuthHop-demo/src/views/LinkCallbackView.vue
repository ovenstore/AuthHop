<template>
  <section class="card">
    <h1>Linking AuthHop…</h1>
    <p class="lede">Connecting this browser so Demo sessions can be published to AuthHop.</p>
    <div v-if="loading" class="alert info">Please wait…</div>
    <div v-if="error" class="alert">{{ error }}</div>
    <div v-if="error" class="actions" style="margin-top: 1rem">
      <router-link class="ghost" to="/home">Back</router-link>
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
  const linkToken = typeof route.query.link_token === 'string' ? route.query.link_token : '';
  const state = typeof route.query.state === 'string' ? route.query.state : '';
  const linkError = typeof route.query.error === 'string' ? route.query.error : '';

  const ok = await userStore.completeDeviceLink({ linkToken, state, error: linkError });
  if (ok) router.replace('/home');
});
</script>
