import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import DevicesView from '../views/DevicesView.vue';
import AuthHistoryView from '../views/AuthHistoryView.vue';
import AuthorizeView from '../views/AuthorizeView.vue';
import { useUserStore } from '../stores/user';

const routes = [
  { path: '/', redirect: '/devices' },
  { path: '/login', component: LoginView, meta: { guest: true } },
  { path: '/register', component: RegisterView, meta: { guest: true } },
  { path: '/devices', component: DevicesView, meta: { auth: true } },
  { path: '/history', component: AuthHistoryView, meta: { auth: true } },
  { path: '/authorize', component: AuthorizeView, meta: { auth: true } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

let bootstrapped = false;

router.beforeEach(async (to, from, next) => {
  const userStore = useUserStore();
  userStore.refreshFlags();

  if (!bootstrapped) {
    bootstrapped = true;
    // Prefer WebAuthn unlock when a local passkey + session exist
    if (userStore.webauthnSupported && userStore.hasLocalPasskey && userStore.token) {
      await userStore.tryWebAuthnUnlock();
    } else if (userStore.token) {
      await userStore.restoreSession();
    }
  }

  if (to.meta.auth && !userStore.isAuthenticated) {
    if (userStore.webauthnSupported && userStore.hasLocalPasskey && userStore.token) {
      const ok = await userStore.tryWebAuthnUnlock();
      if (ok) return next();
    }
    return next({
      path: '/login',
      query: {
        redirect: to.fullPath,
        ...(to.path === '/authorize' ? { sso: '1' } : {}),
      },
    });
  }

  if (to.meta.guest && userStore.isAuthenticated) {
    const redirect = typeof to.query.redirect === 'string' ? to.query.redirect : '/devices';
    return next(redirect);
  }

  next();
});

export default router;
