<template>
  <header class="app-header">
    <div class="brand">
      <span class="brand-mark">AH</span>
      <div>
        <h1>AuthHop</h1>
        <p>Trusted-device authentication</p>
      </div>
    </div>

    <nav v-if="isAuthenticated" class="nav-links">
      <router-link to="/devices">Trusted Devices</router-link>
      <router-link to="/history">Recent Auth</router-link>
    </nav>

    <div class="header-actions">
      <template v-if="isAuthenticated">
        <span class="user-chip">{{ displayName }}</span>
        <button type="button" class="ghost-button" @click="logout">Logout</button>
      </template>
      <template v-else>
        <router-link class="ghost-button" to="/login">Login</router-link>
        <router-link class="ghost-button" to="/register">Create account</router-link>
      </template>
    </div>
  </header>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useRouter } from 'vue-router';
import { useUserStore } from '../stores/user';

const userStore = useUserStore();
const { isAuthenticated, displayName } = storeToRefs(userStore);
const router = useRouter();

const logout = async () => {
  await userStore.logout();
  router.push('/login');
};
</script>
