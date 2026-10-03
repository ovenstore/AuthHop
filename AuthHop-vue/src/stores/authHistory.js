import { defineStore } from 'pinia';
import { requireSupabase, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { lookupIpLocation } from '../api/geoip';
import { useUserStore } from './user';

export const useAuthHistoryStore = defineStore('authHistory', {
  state: () => ({
    events: [],
    loading: false,
    error: '',
  }),
  actions: {
    async fetchHistory() {
      const userStore = useUserStore();
      this.loading = true;
      this.error = '';
      try {
        if (!userStore.token) throw new Error('Sign in first');
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.listAuthEvents, {
          p_token: userStore.token,
        });
        if (error) throw error;

        this.events = (data || []).map((row) => ({
          ...row,
          location_label: row.location_label || (row.ip_address ? 'Looking up…' : '—'),
        }));
        await this.enrichMissingLocations();
      } catch (error) {
        this.error = rpcErrorMessage(error);
        this.events = [];
      } finally {
        this.loading = false;
      }
    },

    async enrichMissingLocations() {
      await Promise.all(
        this.events.map(async (event, index) => {
          if (!event.ip_address) return;
          if (
            event.location_label &&
            event.location_label !== 'Looking up…' &&
            event.location_label !== 'Unknown'
          ) {
            return;
          }
          const geo = await lookupIpLocation(String(event.ip_address));
          this.events[index] = { ...this.events[index], location_label: geo.label };
        })
      );
    },
  },
});
