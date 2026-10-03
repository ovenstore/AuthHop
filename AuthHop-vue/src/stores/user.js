import { defineStore } from 'pinia';
import { requireSupabase, rpcErrorMessage, isSupabaseConfigured } from '../api/supabase';
import { RPC } from '../api/queries';
import {
  clearLocalDevice,
  getLocalDeviceProof,
  hasLocalTrustedDevice,
} from '../lib/deviceCrypto';

const TOKEN_KEY = 'authhop-token';
const USER_KEY = 'authhop-user';

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

export const useUserStore = defineStore('user', {
  state: () => ({
    token: loadToken(),
    user: loadUser(),
    loading: false,
    error: '',
    hasTrustedDevice: hasLocalTrustedDevice(),
    dbConfigured: isSupabaseConfigured,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    displayName: (state) => state.user?.display_name || state.user?.email || 'User',
  },
  actions: {
    refreshFlags() {
      this.hasTrustedDevice = hasLocalTrustedDevice();
      this.dbConfigured = isSupabaseConfigured;
    },
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
        const { data, error } = await client.rpc(RPC.register, {
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

    async loginWithPassword({ email, password }) {
      this.loading = true;
      this.error = '';
      try {
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.login, {
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

    /**
     * Silent login using the local trusted-device secret (no biometrics).
     */
    async tryTrustedDeviceLogin() {
      this.refreshFlags();
      if (!this.hasTrustedDevice) return false;

      this.loading = true;
      this.error = '';
      try {
        const proof = await getLocalDeviceProof();
        if (!proof) {
          await clearLocalDevice();
          this.hasTrustedDevice = false;
          return false;
        }

        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.loginDevice, {
          p_credential_id: proof.credentialId,
          p_device_secret: proof.deviceSecret,
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
        const { data, error } = await client.rpc(RPC.me, { p_token: this.token });
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
          await client.rpc(RPC.logout, { p_token: this.token });
        }
      } catch {
        /* still clear local session */
      }
      this.clearAuth();
    },
  },
});
