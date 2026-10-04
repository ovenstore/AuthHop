import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import DevicesView from '../views/DevicesView.vue';
import SessionsView from '../views/SessionsView.vue';
import AuthHistoryView from '../views/AuthHistoryView.vue';
import HopView from '../views/HopView.vue';
import LinkDeviceView from '../views/LinkDeviceView.vue';
import { useUserStore } from '../stores/user';

const routes = [
  { path: '/', redirect: '/devices' },
  { path: '/login', component: LoginView, meta: { guest: true } },
  { path: '/register', component: RegisterView, meta: { guest: true } },
  { path: '/devices', component: DevicesView, meta: { auth: true } },
  { path: '/sessions', component: SessionsView, meta: { auth: true } },
  { path: '/history', component: AuthHistoryView, meta: { auth: true } },
  { path: '/hop', component: HopView, meta: { auth: true } },
  { path: '/link-device', component: LinkDeviceView, meta: { auth: true } },
  // Legacy SSO path → hop
  { path: '/authorize', redirect: (to) => ({ path: '/hop', query: to.query }) },
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
    if (userStore.token) {
      const ok = await userStore.restoreSession();
      if (!ok && userStore.hasTrustedDevice) {
        await userStore.tryTrustedDeviceLogin();
      }
    } else if (userStore.hasTrustedDevice) {
      await userStore.tryTrustedDeviceLogin();
    }
  }

  if (to.meta.auth && !userStore.isAuthenticated) {
    if (userStore.hasTrustedDevice) {
      const ok = await userStore.tryTrustedDeviceLogin();
      if (ok) return next();
    }
    return next({
      path: '/login',
      query: {
        redirect: to.fullPath,
        ...(to.path === '/hop' || to.path === '/link-device' ? { hop: '1' } : {}),
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
