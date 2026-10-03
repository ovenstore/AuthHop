<template>
  <section class="page-card login-hero">
    <div class="brand-inline">
      <span class="brand-mark">AH</span>
      <h1 class="section-title" style="margin: 0">Create AuthHop account</h1>
    </div>
    <p class="subtitle">
      After signing up, enroll this browser with
      <strong>Add this as a trusted device</strong> so other sites can authenticate you via AuthHop.
    </p>

    <form @submit.prevent="submit">
      <div class="form-field">
        <label for="displayName">Display name</label>
        <input id="displayName" v-model="form.displayName" type="text" autocomplete="nickname" />
      </div>
      <div class="form-field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="username" required />
      </div>
      <div class="form-field">
        <label for="password">Password</label>
        <input id="password" v-model="form.password" type="password" autocomplete="new-password" minlength="6" required />
      </div>
      <div class="form-actions">
        <button class="cta-button" type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create account' }}
        </button>
        <router-link class="ghost-button" :to="{ path: '/login', query: route.query }">
          Already have an account
        </router-link>
      </div>
    </form>

    <div v-if="error" class="alert alert-danger">{{ error }}</div>
  </section>
</template>

<script setup>
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const { loading, error } = storeToRefs(userStore);
const router = useRouter();
const route = useRoute();
const form = reactive({ email: '', password: '', displayName: '' });

const submit = async () => {
  const ok = await userStore.register({
    email: form.email.trim(),
    password: form.password,
    displayName: form.displayName.trim(),
  });
  if (ok) {
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/devices';
    router.push(redirect);
  }
};
</script>
