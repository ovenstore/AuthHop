import { defineStore } from 'pinia';
import {
  supabase,
  isSupabaseConfigured,
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
    usingSupabase: isSupabaseConfigured,
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
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc('demo_register', {
            p_email: email,
            p_password: password,
            p_display_name: displayName || null,
          });
          if (error) throw error;
          this.setSession(data.token, data.user);
          return true;
        }
        const user = {
          id: `demo-${Date.now()}`,
          email,
          display_name: displayName || email.split('@')[0],
          authhop_user_id: null,
        };
        this.setSession(`demo-token-${user.id}`, user);
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
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc('demo_login', {
            p_email: email,
            p_password: password,
          });
          if (error) throw error;
          this.setSession(data.token, data.user);
          return true;
        }
        const user = {
          id: 'demo-local',
          email,
          display_name: email.split('@')[0],
          authhop_user_id: null,
        };
        this.setSession('demo-token-local', user);
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
      if (!isSupabaseConfigured || !supabase) return !!this.user;
      try {
        const { data, error } = await supabase.rpc('demo_me', { p_token: this.token });
        if (error || !data) {
          this.clearAuth();
          return false;
        }
        this.user = data;
        localStorage.setItem(USER_KEY, JSON.stringify(data));
        return true;
      } catch {
        this.clearAuth();
        return false;
      }
    },

    async logout() {
      if (isSupabaseConfigured && supabase && this.token) {
        await supabase.rpc('demo_logout', { p_token: this.token });
      }
      this.clearAuth();
    },

    /**
     * Start AuthHop SSO: create sso_requests row, redirect to AuthHop /authorize.
     */
    async startAuthHopLogin() {
      this.loading = true;
      this.error = '';
      try {
        const state = randomState();
        const redirectUri = `${DEMO_URL}/auth/callback`;

        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc('sso_create_request', {
            p_site_id: DEMO_SITE_ID,
            p_redirect_uri: redirectUri,
            p_state: state,
          });
          if (error) throw error;
          sessionStorage.setItem('demo-sso-state', state);
          window.location.assign(
            `${AUTHHOP_URL}/authorize?request_id=${encodeURIComponent(data.id)}`
          );
          return;
        }

        // Mock mode: invent a request id and stash details for AuthHop + callback
        const requestId = `mock-req-${Date.now()}`;
        const payload = {
          id: requestId,
          site_id: DEMO_SITE_ID,
          redirect_uri: redirectUri,
          state,
          status: 'pending',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };
        sessionStorage.setItem('demo-sso-state', state);
        sessionStorage.setItem(`sso-mock-${requestId}`, JSON.stringify(payload));
        // Also write under AuthHop origin via query — AuthHop reads sessionStorage on its origin,
        // so pass the mock payload through the query string for cross-origin mock flow.
        const q = new URLSearchParams({
          request_id: requestId,
          mock_site_id: payload.site_id,
          mock_redirect_uri: payload.redirect_uri,
          mock_state: payload.state,
        });
        window.location.assign(`${AUTHHOP_URL}/authorize?${q.toString()}`);
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

        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc('sso_exchange_code', {
            p_code: code,
            p_state: state,
            p_site_id: DEMO_SITE_ID,
          });
          if (error) throw error;
          this.setSession(data.token, data.user);
          sessionStorage.removeItem('demo-sso-state');
          return true;
        }

        // Mock exchange: AuthHop stored the code details in its sessionStorage —
        // cross-origin we cannot read that. Use code prefix + state to build a session.
        if (!code?.startsWith('mock-code-')) {
          throw new Error('Missing AuthHop code (is AuthHop running in mock mode?)');
        }
        const user = {
          id: `demo-via-authhop-${Date.now()}`,
          email: 'authhop-user@demo.local',
          display_name: 'AuthHop User',
          authhop_user_id: 'linked-mock-authhop',
        };
        this.setSession(`demo-token-${user.id}`, user);
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
