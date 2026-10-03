<template>
  <section class="card">
    <h1>Sign in</h1>
    <p class="lede">Use a local demo account, or authenticate with AuthHop on a trusted device.</p>

    <button class="btn btn-authhop" type="button" :disabled="loading" @click="authHop">
      <span>Authenticate with AuthHop</span>
    </button>

    <div class="divider">or email &amp; password</div>

    <form @submit.prevent="submit">
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" autocomplete="username" required />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" v-model="form.password" type="password" autocomplete="current-password" required />
      </div>
      <div class="actions">
        <button class="btn" type="submit" :disabled="loading">{{ loading ? 'Signing in…' : 'Sign in' }}</button>
        <router-link class="ghost" to="/register">Create account</router-link>
      </div>
    </form>

    <div v-if="error" class="alert">{{ error }}</div>
  </section>
</template>

<script setup>
import { reactive } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useDemoUserStore } from '../stores/user';

const userStore = useDemoUserStore();
const { loading, error } = storeToRefs(userStore);
const router = useRouter();
const route = useRoute();
const form = reactive({ email: '', password: '' });

const goHome = () => {
  const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/home';
  router.push(redirect);
};

const submit = async () => {
  const ok = await userStore.login({
    email: form.email.trim(),
    password: form.password,
  });
  if (ok) goHome();
};

const authHop = () => userStore.startAuthHopLogin();
</script>
