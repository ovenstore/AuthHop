import { defineStore } from 'pinia';
import { supabase, isSupabaseConfigured, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { lookupIpLocation, MOCK_AUTH_IPS } from '../api/geoip';
import { useUserStore } from './user';

const MOCK_SITES = ['demo-app', 'docs.example.com'];
const MOCK_DEVICES = ['MacBook Pro', 'iPhone 15'];

function buildMockEvents() {
  return MOCK_AUTH_IPS.slice(0, 5).map((ip, index) => ({
    id: `auth-${index + 1}`,
    site_id: MOCK_SITES[index % MOCK_SITES.length],
    device_id: null,
    device_name: MOCK_DEVICES[index % MOCK_DEVICES.length],
    ip_address: ip,
    location_label: 'Looking up…',
    status: 'success',
    created_at: new Date(Date.now() - index * 1000 * 60 * 60 * 6).toISOString(),
  }));
}

export const useAuthHistoryStore = defineStore('authHistory', {
  state: () => ({
    events: [],
    loading: false,
    error: '',
    usingMock: !isSupabaseConfigured,
  }),
  actions: {
    async fetchHistory() {
      const userStore = useUserStore();
      this.loading = true;
      this.error = '';
      try {
        if (isSupabaseConfigured && supabase && userStore.token) {
          const { data, error } = await supabase.rpc(RPC.listAuthEvents, {
            p_token: userStore.token,
          });
          if (error) throw error;

          this.events = (data || []).map((row) => ({
            ...row,
            device_name: row.device_name || '—',
            location_label: row.location_label || (row.ip_address ? 'Looking up…' : '—'),
          }));
          this.usingMock = false;
          await this.enrichMissingLocations();
          return;
        }

        this.events = buildMockEvents();
        this.usingMock = true;
        await this.enrichMissingLocations();
      } catch (error) {
        this.error = rpcErrorMessage(error);
        this.events = buildMockEvents();
        this.usingMock = true;
        await this.enrichMissingLocations();
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
