import { defineStore } from 'pinia';
import { requireSupabase, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { useUserStore } from './user';

export const useSessionsStore = defineStore('sessions', {
  state: () => ({
    sessions: [],
    loading: false,
    error: '',
  }),
  actions: {
    async fetchSessions() {
      const userStore = useUserStore();
      this.loading = true;
      this.error = '';
      try {
        if (!userStore.token) throw new Error('Sign in first');
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.listExternalSessions, {
          p_token: userStore.token,
        });
        if (error) throw error;
        this.sessions = Array.isArray(data) ? data : [];
      } catch (error) {
        this.error = rpcErrorMessage(error);
        this.sessions = [];
      } finally {
        this.loading = false;
      }
    },
  },
});
