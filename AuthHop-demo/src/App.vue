<template>
  <div class="app-shell">
    <header class="topbar">
      <div class="logo">
        <span class="logo-mark">D</span>
        <div>
          <strong>Demo App</strong>
          <p>Signs in via AuthHop when the device is trusted</p>
        </div>
      </div>
      <div v-if="isAuthenticated" class="topbar-actions">
        <span class="chip">{{ displayName }}</span>
        <button type="button" class="ghost" @click="logout">Log out</button>
      </div>
    </header>
    <main class="frame">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useDemoUserStore } from './stores/user';

const userStore = useDemoUserStore();
const { isAuthenticated, displayName } = storeToRefs(userStore);
const router = useRouter();

const logout = async () => {
  await userStore.logout();
  router.push('/login');
};
</script>
