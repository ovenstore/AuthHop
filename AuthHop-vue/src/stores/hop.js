import { defineStore } from 'pinia';
import { requireSupabase, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { getLocalDeviceProof } from '../lib/deviceCrypto';
import { lookupIpLocation } from '../api/geoip';
import { useUserStore } from './user';

export const useHopStore = defineStore('hop', {
  state: () => ({
    request: null,
    accounts: [],
    loading: false,
    error: '',
    result: null,
  }),
  actions: {
    async loadRequest(requestId) {
      this.loading = true;
      this.error = '';
      this.result = null;
      this.accounts = [];
      try {
        if (!requestId) throw new Error('Missing request_id');
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.hopGetRequest, {
          p_request_id: requestId,
        });
        if (error) throw error;
        if (!data) throw new Error('Hop request not found');
        this.request = data;
        return data;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async loadAvailableAccounts() {
      const userStore = useUserStore();
      if (!this.request?.site_id) throw new Error('No hop request loaded');
      if (!userStore.isAuthenticated) throw new Error('Sign in to AuthHop first');

      this.loading = true;
      this.error = '';
      try {
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.hopListAccounts, {
          p_token: userStore.token,
          p_site_id: this.request.site_id,
        });
        if (error) throw error;
        this.accounts = Array.isArray(data) ? data : [];
        return this.accounts;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        this.accounts = [];
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async approveAccount(externalUserId) {
      const userStore = useUserStore();

      if (!this.request?.id) throw new Error('No hop request loaded');
      if (!userStore.isAuthenticated) throw new Error('Sign in to AuthHop first');
      if (!externalUserId) throw new Error('Select an account');

      this.loading = true;
      this.error = '';
      try {
        const proof = await getLocalDeviceProof();
        if (!proof) {
          throw new Error(
            'This device is not trusted. Open Trusted Devices and choose “Add this as a trusted device”.'
          );
        }

        const sampleIp = '8.8.8.8';
        const geo = await lookupIpLocation(sampleIp);

        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.hopApprove, {
          p_token: userStore.token,
          p_request_id: this.request.id,
          p_external_user_id: externalUserId,
          p_credential_id: proof.credentialId,
          p_device_secret: proof.deviceSecret,
          p_ip: sampleIp,
          p_location: geo.label,
        });
        if (error) throw error;
        this.result = data;
        return data;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
