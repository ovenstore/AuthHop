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
const LINK_KEY = 'demo-authhop-link';
const LINK_STATE_KEY = 'demo-authhop-link-state';
const HOP_STATE_KEY = 'demo-hop-state';

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
function loadLinkToken() {
  return localStorage.getItem(LINK_KEY) || '';
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
    linkToken: loadLinkToken(),
    publishedSession: null,
    loading: false,
    error: '',
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    displayName: (state) => state.user?.display_name || state.user?.email || 'User',
    isLinkedToAuthHop: (state) => !!state.linkToken,
  },
  actions: {
    setSession(token, user) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    setLinkToken(linkToken) {
      this.linkToken = linkToken || '';
      if (linkToken) localStorage.setItem(LINK_KEY, linkToken);
      else localStorage.removeItem(LINK_KEY);
    },
    clearAuth() {
      this.token = '';
      this.user = null;
      this.publishedSession = null;
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
        await this.publishSessionIfLinked();
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
        await this.publishSessionIfLinked();
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
        await this.publishSessionIfLinked();
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
          // demo_logout also revokes any published external_session for this token
          await client.rpc('demo_logout', { p_token: this.token });
        }
      } catch {
        /* still clear local */
      }
      this.clearAuth();
    },

    /**
     * If this browser has an AuthHop device-link token, publish the current Demo session.
     */
    async publishSessionIfLinked() {
      if (!this.token || !this.linkToken) {
        this.publishedSession = null;
        return null;
      }
      try {
        const client = requireSupabase();
        const { data, error } = await client.rpc('external_session_publish', {
          p_link_token: this.linkToken,
          p_site_id: DEMO_SITE_ID,
          p_demo_token: this.token,
        });
        if (error) {
          // Stale link — clear so the user can re-link
          if (/not linked|revoked/i.test(error.message || '')) {
            this.setLinkToken('');
          }
          this.publishedSession = null;
          return null;
        }
        this.publishedSession = data;
        return data;
      } catch {
        this.publishedSession = null;
        return null;
      }
    },

    startDeviceLink() {
      const state = randomState();
      sessionStorage.setItem(LINK_STATE_KEY, state);
      const returnUri = `${DEMO_URL}/auth/link`;
      window.location.assign(
        `${AUTHHOP_URL}/link-device?site_id=${encodeURIComponent(DEMO_SITE_ID)}` +
          `&return_uri=${encodeURIComponent(returnUri)}` +
          `&state=${encodeURIComponent(state)}`
      );
    },

    async completeDeviceLink({ linkToken, state, error: linkError }) {
      this.loading = true;
      this.error = '';
      try {
        if (linkError) {
          throw new Error(linkError === 'access_denied' ? 'AuthHop device link was cancelled' : linkError);
        }
        const expected = sessionStorage.getItem(LINK_STATE_KEY);
        if (!state || state !== expected) {
          throw new Error('Invalid device-link state');
        }
        if (!linkToken) throw new Error('Missing link token');

        this.setLinkToken(linkToken);
        sessionStorage.removeItem(LINK_STATE_KEY);

        if (this.token) {
          await this.publishSessionIfLinked();
        }
        return true;
      } catch (error) {
        this.error = error.message || rpcErrorMessage(error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    async startAuthHopContinue() {
      this.loading = true;
      this.error = '';
      try {
        const client = requireSupabase();
        const state = randomState();
        const redirectUri = `${DEMO_URL}/auth/callback`;
        const { data, error } = await client.rpc('hop_create_request', {
          p_site_id: DEMO_SITE_ID,
          p_redirect_uri: redirectUri,
          p_state: state,
        });
        if (error) throw error;
        sessionStorage.setItem(HOP_STATE_KEY, state);
        window.location.assign(
          `${AUTHHOP_URL}/hop?request_id=${encodeURIComponent(data.id)}`
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
          throw new Error(
            oauthError === 'access_denied' ? 'AuthHop continue was cancelled' : oauthError
          );
        }
        const expected = sessionStorage.getItem(HOP_STATE_KEY);
        if (!state || state !== expected) {
          throw new Error('Invalid hop state');
        }

        const client = requireSupabase();
        const { data, error } = await client.rpc('hop_exchange_code', {
          p_code: code,
          p_state: state,
          p_site_id: DEMO_SITE_ID,
        });
        if (error) throw error;
        this.setSession(data.token, data.user);
        sessionStorage.removeItem(HOP_STATE_KEY);
        await this.publishSessionIfLinked();
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
