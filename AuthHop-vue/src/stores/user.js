import { defineStore } from 'pinia';
import { supabase, isSupabaseConfigured, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import {
  assertDevicePasskey,
  hasLocalPasskey,
  isWebAuthnSupported,
  clearStoredCredentialId,
} from '../lib/webauthn';

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
    webauthnSupported: isWebAuthnSupported(),
    hasLocalPasskey: hasLocalPasskey(),
    usingSupabase: isSupabaseConfigured,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token && !!state.user,
    displayName: (state) => state.user?.display_name || state.user?.email || 'User',
  },
  actions: {
    refreshFlags() {
      this.webauthnSupported = isWebAuthnSupported();
      this.hasLocalPasskey = hasLocalPasskey();
      this.usingSupabase = isSupabaseConfigured;
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
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc(RPC.register, {
            p_email: email,
            p_password: password,
            p_display_name: displayName || null,
          });
          if (error) throw error;
          this.setSession(data.token, data.user);
          return true;
        }

        // Mock mode
        const user = {
          id: `mock-${Date.now()}`,
          email,
          display_name: displayName || email.split('@')[0],
        };
        this.setSession(`mock-token-${user.id}`, user);
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
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc(RPC.login, {
            p_email: email,
            p_password: password,
          });
          if (error) throw error;
          this.setSession(data.token, data.user);
          return true;
        }

        const user = {
          id: 'mock-local-user',
          email,
          display_name: email.split('@')[0],
        };
        this.setSession('mock-token-local', user);
        return true;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        return false;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Try WebAuthn first. Only succeeds if a local passkey exists AND we already
     * have (or can restore) a session. For cold start without a session token,
     * WebAuthn proves device possession then we keep using the stored session
     * if present; otherwise the UI falls back to login/register.
     */
    async tryWebAuthnUnlock() {
      this.refreshFlags();
      if (!this.webauthnSupported || !this.hasLocalPasskey) {
        return false;
      }

      this.loading = true;
      this.error = '';
      try {
        await assertDevicePasskey();

        if (this.token && this.user) {
          if (isSupabaseConfigured && supabase) {
            const { data, error } = await supabase.rpc(RPC.me, { p_token: this.token });
            if (error || !data) {
              this.clearAuth();
              return false;
            }
            this.user = data;
            localStorage.setItem(USER_KEY, JSON.stringify(data));
          }
          return true;
        }

        // Passkey OK but no session — need password login once, then trust device
        this.error = 'Passkey verified on this device. Sign in once to restore your session.';
        return false;
      } catch (error) {
        this.error = error.message || 'Passkey authentication failed';
        return false;
      } finally {
        this.loading = false;
      }
    },

    async restoreSession() {
      if (!this.token) return false;
      if (!isSupabaseConfigured || !supabase) return !!this.user;

      try {
        const { data, error } = await supabase.rpc(RPC.me, { p_token: this.token });
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
        await supabase.rpc(RPC.logout, { p_token: this.token });
      }
      this.clearAuth();
    },

    forgetLocalPasskey() {
      clearStoredCredentialId();
      this.hasLocalPasskey = false;
    },
  },
});
