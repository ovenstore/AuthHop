import { defineStore } from 'pinia';
import {
  requireSupabase,
  rpcErrorMessage,
  AUTHHOP_URL,
  DEMO_URL,
  DEMO_SITE_ID,
} from '../api/supabase';

const TOKEN_KEY = 'demo-token';
const USER_KEY = 'demo-user';

function loadToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}
function loadUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null');
  } catch {
    return null;
  }
}

function randomState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export const useDemoUserStore = defineStore('demoUser', {
  state: () => ({
    token: loadToken(),
    user: loadUser(),
    loading: false,
    error: '',
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    displayName: (state) => state.user?.display_name || state.user?.email || 'User',
    linkedToAuthHop: (state) => !!state.user?.authhop_user_id,
  },
  actions: {
    setSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    clearAuth() {
      this.token = '';
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },

    async register({ email, password, displayName }) {
      this.loading = true;
      this.error = '';
      try {
        const client = requireSupabase();
        const { data, error } = await client.rpc('demo_register', {
          p_email: email,
          p_password: password,
          p_display_name: displayName || null,
        });
        if (error) throw error;
        this.setSession(data.token, data.user);
        return true;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    async login({ email, password }) {
      this.loading = true;
      this.error = '';
      try {
        const client = requireSupabase();
        const { data, error } = await client.rpc('demo_login', {
          p_email: email,
          p_password: password,
        });
        if (error) throw error;
        this.setSession(data.token, data.user);
        return true;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    async restoreSession() {
      if (!this.token) return false;
      try {
        const client = requireSupabase();
        const { data, error } = await client.rpc('demo_me', { p_token: this.token });
        if (error || !data) {
          this.clearAuth();
          return false;
        }
        this.user = data;
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        return true;
      } catch (error) {
        this.clearAuth();
        this.error = rpcErrorMessage(error);
        return false;
      }
    },

    async logout() {
      try {
        if (this.token) {
          const client = requireSupabase();
          await client.rpc('demo_logout', { p_token: this.token });
        }
      } catch {
        /* still clear local */
      }
      this.clearAuth();
    },

    async startAuthHopLogin() {
      this.loading = true;
      this.error = '';
      try {
        const client = requireSupabase();
        const state = randomState();
        const redirectUri = `${DEMO_URL}/auth/callback`;
        const { data, error } = await client.rpc('sso_create_request', {
          p_site_id: DEMO_SITE_ID,
          p_redirect_uri: redirectUri,
          p_state: state,
        });
        if (error) throw error;
        sessionStorage.setItem('demo-sso-state', state);
        window.location.assign(
          `${AUTHHOP_URL}/authorize?request_id=${encodeURIComponent(data.id)}`
        );
      } catch (error) {
        this.error = rpcErrorMessage(error);
        this.loading = false;
      }
    },

    async completeAuthHopCallback({ code, state, error: oauthError }) {
      this.loading = true;
      this.error = '';
      try {
        if (oauthError) {
          throw new Error(oauthError === 'access_denied' ? 'AuthHop sign-in was denied' : oauthError);
        }
        const expected = sessionStorage.getItem('demo-sso-state');
        if (!state || state !== expected) {
          throw new Error('Invalid OAuth state');
        }

        const client = requireSupabase();
        const { data, error } = await client.rpc('sso_exchange_code', {
          p_code: code,
          p_state: state,
          p_site_id: DEMO_SITE_ID,
        });
        if (error) throw error;
        this.setSession(data.token, data.user);
        sessionStorage.removeItem('demo-sso-state');
        return true;
      } catch (error) {
        this.error = error.message || rpcErrorMessage(error);
        return false;
      } finally {
        this.loading = false;
      }
    },
  },
});
