<template>
  <section class="page-card login-hero">
    <div class="brand-inline">
      <span class="brand-mark">AH</span>
      <h1 class="section-title" style="margin: 0">Sign in to AuthHop</h1>
    </div>

    <p class="subtitle">
      AuthHop checks for a passkey on this device first. If none is available, use email and password.
    </p>

    <div v-if="webauthnSupported && hasLocalPasskey" class="toolbar">
      <button class="cta-button" type="button" :disabled="loading" @click="unlockWithPasskey">
        {{ loading ? 'Waiting for passkey…' : 'Continue with passkey' }}
      </button>
      <button class="ghost-button" type="button" @click="showPassword = true">Use password</button>
    </div>

    <div v-else-if="webauthnSupported" class="alert alert-info">
      No passkey on this browser yet. Sign in, then use
      <strong>Add this as a trusted device</strong> to enroll WebAuthn here.
    </div>

    <div v-else class="alert alert-info">WebAuthn unavailable — use email and password.</div>

    <form v-if="showPassword || !hasLocalPasskey || !webauthnSupported" @submit.prevent="submit">
      <div v-if="hasLocalPasskey && webauthnSupported" class="login-divider">or</div>
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
    <p class="subtitle" style="margin-top: 1.25rem; margin-bottom: 0; font-size: 0.85rem">
      {{ usingSupabase ? 'Supabase connected.' : 'Mock mode — set VITE_SUPABASE_* in .env' }}
    </p>
  </section>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const { loading, error, webauthnSupported, hasLocalPasskey, usingSupabase } = storeToRefs(userStore);
const router = useRouter();
const route = useRoute();

const form = reactive({ email: '', password: '' });
const showPassword = ref(!(webauthnSupported.value && hasLocalPasskey.value));

const goNext = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/devices';
  router.push(redirect);
};

const unlockWithPasskey = async () => {
  const ok = await userStore.tryWebAuthnUnlock();
  if (ok) goNext();
  else showPassword.value = true;
};

const submit = async () => {
  const ok = await userStore.loginWithPassword({
    email: form.email.trim(),
    password: form.password,
  });
  if (ok) goNext();
};

onMounted(async () => {
  if (webauthnSupported.value && hasLocalPasskey.value && userStore.token) {
    showPassword.value = false;
    await unlockWithPasskey();
  }
});
</script>
