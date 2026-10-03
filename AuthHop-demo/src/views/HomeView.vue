<template>
  <section class="card home-panel">
    <h1>You're in</h1>
    <p class="lede">This is the protected demo home page.</p>

    <h2>Hello, {{ displayName }}</h2>
    <div class="meta">
      <div>Email: <code>{{ user?.email }}</code></div>
      <div style="margin-top: 0.4rem">
        AuthHop link:
        <code>{{ linkedToAuthHop ? user.authhop_user_id : 'not linked (password login)' }}</code>
      </div>
    </div>

    <div v-if="linkedToAuthHop" class="alert info" style="margin-top: 1.25rem">
      Signed in through AuthHop on a trusted device.
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useDemoUserStore } from '../stores/user';

const userStore = useDemoUserStore();
const { user, displayName, linkedToAuthHop } = storeToRefs(userStore);
</script>
