import { defineStore } from 'pinia';
import { requireSupabase, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { getLocalDeviceProof } from '../lib/deviceCrypto';
import { useUserStore } from './user';

export const useDeviceLinkStore = defineStore('deviceLink', {
  state: () => ({
    loading: false,
    error: '',
    result: null,
  }),
  actions: {
    async createLink(siteId) {
      const userStore = useUserStore();
      if (!userStore.isAuthenticated) throw new Error('Sign in to AuthHop first');
      if (!siteId) throw new Error('Missing site_id');

      this.loading = true;
      this.error = '';
      this.result = null;
      try {
        const proof = await getLocalDeviceProof();
        if (!proof) {
          throw new Error(
            'This device is not trusted. Open Trusted Devices and choose “Add this as a trusted device”.'
          );
        }

        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.deviceLinkCreate, {
          p_token: userStore.token,
          p_credential_id: proof.credentialId,
          p_device_secret: proof.deviceSecret,
          p_site_id: siteId,
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
