import { defineStore } from 'pinia';
import { requireSupabase, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { enrollLocalDevice, clearLocalDevice, getLocalDeviceMeta } from '../lib/deviceCrypto';
import { useUserStore } from './user';

export const useDevicesStore = defineStore('devices', {
  state: () => ({
    devices: [],
    loading: false,
    error: '',
  }),
  actions: {
    async fetchDevices() {
      const userStore = useUserStore();
      this.loading = true;
      this.error = '';
      try {
        if (!userStore.token) throw new Error('Sign in first');
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.listDevices, {
          p_token: userStore.token,
        });
        if (error) throw error;
        this.devices = data || [];
      } catch (error) {
        this.error = rpcErrorMessage(error);
        this.devices = [];
      } finally {
        this.loading = false;
      }
    },

    /**
     * Enroll THIS browser: Web Crypto key + device secret → Supabase.
     * No passkey / fingerprint prompt.
     */
    async addThisAsTrustedDevice(deviceName) {
      const userStore = useUserStore();
      if (!userStore.user || !userStore.token) throw new Error('Sign in first');

      const name = deviceName.trim();
      if (!name) throw new Error('Device name is required');

      this.loading = true;
      this.error = '';
      try {
        const enrolled = await enrollLocalDevice();
        const client = requireSupabase();
        const { data, error } = await client.rpc(RPC.addTrustedDevice, {
          p_token: userStore.token,
          p_device_name: name,
          p_credential_id: enrolled.credentialId,
          p_public_key: enrolled.publicKey,
          p_device_secret: enrolled.deviceSecret,
        });
        if (error) {
          await clearLocalDevice();
          throw error;
        }
        this.devices = [data, ...this.devices];
        userStore.refreshFlags();
        return data;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },

    async removeDevice(deviceId, confirmationName) {
      const userStore = useUserStore();
      const device = this.devices.find((d) => d.id === deviceId);
      if (!device) throw new Error('Device not found');
      if (confirmationName.trim() !== device.device_name) {
        throw new Error('Device name does not match. Removal cancelled.');
      }

      this.loading = true;
      this.error = '';
      try {
        const client = requireSupabase();
        const { error } = await client.rpc(RPC.revokeTrustedDevice, {
          p_token: userStore.token,
          p_device_id: deviceId,
          p_confirm_name: confirmationName.trim(),
        });
        if (error) throw error;

        const meta = getLocalDeviceMeta();
        if (meta?.credentialId && meta.credentialId === device.credential_id) {
          await clearLocalDevice();
          userStore.refreshFlags();
        }

        this.devices = this.devices.filter((d) => d.id !== deviceId);
      } catch (error) {
        this.error = rpcErrorMessage(error);
        throw new Error(this.error);
      } finally {
        this.loading = false;
      }
    },
  },
});
