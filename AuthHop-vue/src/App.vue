<template>
  <div class="app-shell">
    <AppHeader />
    <main class="page-frame">
      <router-view />
    </main>
  </div>
</template>

<script setup>
import AppHeader from './components/AppHeader.vue';
</script>
