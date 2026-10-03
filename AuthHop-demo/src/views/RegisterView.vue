<template>
  <section class="card">
    <h1>Create demo account</h1>
    <p class="lede">
      Local demo users live in <code>demo_users</code>. You can also skip this and use
      Authenticate with AuthHop on the login page.
    </p>

    <form @submit.prevent="submit">
      <div class="field">
        <label for="displayName">Display name</label>
        <input id="displayName" v-model="form.displayName" type="text" />
      </div>
      <div class="field">
        <label for="email">Email</label>
        <input id="email" v-model="form.email" type="email" required />
      </div>
      <div class="field">
        <label for="password">Password</label>
        <input id="password" v-model="form.password" type="password" minlength="6" required />
      </div>
      <div class="actions">
        <button class="btn" type="submit" :disabled="loading">
          {{ loading ? 'Creating…' : 'Create account' }}
        </button>
        <router-link class="ghost" to="/login">Back to sign in</router-link>
      </div>
    </form>

    <div v-if="error" class="alert">{{ error }}</div>
  </section>
</template>

<script setup>
import { reactive } from 'vue';
import { useRouter } from 'vue-router';
import { storeToRefs } from 'pinia';
import { useDemoUserStore } from '../stores/user';

const userStore = useDemoUserStore();
const { loading, error } = storeToRefs(userStore);
const router = useRouter();
const form = reactive({ email: '', password: '', displayName: '' });

const submit = async () => {
  const ok = await userStore.register({
    email: form.email.trim(),
    password: form.password,
    displayName: form.displayName.trim(),
  });
  if (ok) router.push('/home');
};
</script>
