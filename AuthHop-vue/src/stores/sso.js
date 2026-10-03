import { defineStore } from 'pinia';
import { requireSupabase, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { getLocalDeviceProof } from '../lib/deviceCrypto';
import { lookupIpLocation } from '../api/geoip';
import { useUserStore } from './user';

export const useSsoStore = defineStore('sso', {
  state: () => ({
    request: null,
    loading: false,
    error: '',
    result: null,
  }),
  actions: {
    async loadRequest(requestId) {
      this.loading = true;
      this.error = '';
      this.result = null;
      try {
        if (!requestId) throw new Error('Missing request_id');
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.ssoGetRequest, {
          p_request_id: requestId,
        });
        if (error) throw error;
        if (!data) throw new Error('SSO request not found');
        this.request = data;
        return data;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async approveWithTrustedDevice() {
      const userStore = useUserStore();

      if (!this.request?.id) throw new Error('No SSO request loaded');
      if (!userStore.isAuthenticated) throw new Error('Sign in to AuthHop first');

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
        const { data, error } = await client.rpc(RPC.ssoApprove, {
          p_token: userStore.token,
          p_request_id: this.request.id,
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
