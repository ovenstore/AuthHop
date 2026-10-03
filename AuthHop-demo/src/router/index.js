import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import RegisterView from '../views/RegisterView.vue';
import HomeView from '../views/HomeView.vue';
import CallbackView from '../views/CallbackView.vue';
import { useDemoUserStore } from '../stores/user';

const routes = [
  { path: '/', redirect: '/home' },
  { path: '/login', component: LoginView, meta: { guest: true } },
  { path: '/register', component: RegisterView, meta: { guest: true } },
  { path: '/home', component: HomeView, meta: { auth: true } },
  { path: '/auth/callback', component: CallbackView },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

let ready = false;

router.beforeEach(async (to, from, next) => {
  const userStore = useDemoUserStore();
  if (!ready) {
    ready = true;
    if (userStore.token) await userStore.restoreSession();
  }

  if (to.meta.auth && !userStore.isAuthenticated) {
    return next({ path: '/login', query: { redirect: to.fullPath } });
  }
  if (to.meta.guest && userStore.isAuthenticated) {
    return next('/home');
  }
  next();
});

export default router;
