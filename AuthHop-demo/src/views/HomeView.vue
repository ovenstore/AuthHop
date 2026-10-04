<template>
  <section class="card home-panel">
    <h1>You're in</h1>
    <p class="lede">This is the protected demo home page.</p>

    <h2>Hello, {{ displayName }}</h2>
    <div class="meta">
      <div>Email: <code>{{ user?.email }}</code></div>
      <div style="margin-top: 0.4rem">
        AuthHop device link:
        <code>{{ isLinkedToAuthHop ? 'linked' : 'not linked' }}</code>
      </div>
      <div v-if="publishedSession" style="margin-top: 0.4rem">
        Published session:
        <code>{{ publishedSession.id }}</code>
      </div>
    </div>

    <div v-if="isLinkedToAuthHop && publishedSession" class="alert info" style="margin-top: 1.25rem">
      This Demo session is published to AuthHop. Other trusted devices can Continue with AuthHop.
    </div>
    <div v-else-if="isLinkedToAuthHop" class="alert info" style="margin-top: 1.25rem">
      Device is linked, but the session could not be published. Try signing in again or re-link.
    </div>
    <div v-else class="alert info" style="margin-top: 1.25rem">
      Link this browser to AuthHop so logins here can be hopped to your other trusted devices.
      <div class="actions" style="margin-top: 0.75rem">
        <button class="btn btn-authhop" type="button" :disabled="loading" @click="linkDevice">
          Link AuthHop device
        </button>
      </div>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia';
import { useDemoUserStore } from '../stores/user';

const userStore = useDemoUserStore();
const { user, displayName, isLinkedToAuthHop, publishedSession, loading } = storeToRefs(userStore);

const linkDevice = () => userStore.startDeviceLink();
</script>
