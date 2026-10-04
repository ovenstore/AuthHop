<template>
  <section class="page-card login-hero">
    <div class="brand-inline">
      <span class="brand-mark">AH</span>
      <h1 class="section-title" style="margin: 0">Sign in to AuthHop</h1>
    </div>

    <p class="subtitle">
      If this browser is a trusted device, you are signed in automatically. Otherwise use email and password.
    </p>

    <div v-if="loading && hasTrustedDevice" class="alert alert-info">
      Signing in with this trusted device…
    </div>

    <form v-else @submit.prevent="submit">
      <div class="form-field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="username" required />
      </div>
      <div class="form-field">
        <label for="password">Password</label>
        <input id="password" v-model="form.password" type="password" autocomplete="current-password" required />
      </div>
      <div class="form-actions">
        <button class="cta-button" type="submit" :disabled="loading">
          {{ loading ? 'Signing in…' : 'Sign in' }}
        </button>
        <router-link class="ghost-button" :to="{ path: '/register', query: route.query }">
          Create account
        </router-link>
      </div>
    </form>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
  </section>
</template>

<script setup>
import { onMounted, reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const { loading, error, hasTrustedDevice } = storeToRefs(userStore);
const router = useRouter();
const route = useRoute();

const form = reactive({ email: '', password: '' });

const goNext = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/devices';
  router.push(redirect);
};

const submit = async () => {
  const ok = await userStore.loginWithPassword({
    email: form.email.trim(),
    password: form.password,
  });
  if (ok) goNext();
};

onMounted(async () => {
  if (userStore.isAuthenticated) {
    goNext();
    return;
  }
  if (hasTrustedDevice.value) {
    const ok = await userStore.tryTrustedDeviceLogin();
    if (ok) goNext();
  }
});
</script>
