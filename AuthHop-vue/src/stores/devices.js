import { defineStore } from 'pinia';
import { supabase, isSupabaseConfigured, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { registerDevicePasskey } from '../lib/webauthn';
import { useUserStore } from './user';

const LOCAL_DEVICES_KEY = 'authhop-local-devices';

function loadLocalDevices() {
  try {
    const raw = localStorage.getItem(LOCAL_DEVICES_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return [];
}

function saveLocalDevices(devices) {
  localStorage.setItem(LOCAL_DEVICES_KEY, JSON.stringify(devices));
}

export const useDevicesStore = defineStore('devices', {
  state: () => ({
    devices: [],
    loading: false,
    error: '',
    usingMock: !isSupabaseConfigured,
  }),
  actions: {
    async fetchDevices() {
      const userStore = useUserStore();
      this.loading = true;
      this.error = '';
      try {
        if (isSupabaseConfigured && supabase && userStore.token) {
          const { data, error } = await supabase.rpc(RPC.listDevices, {
            p_token: userStore.token,
          });
          if (error) throw error;
          this.devices = data || [];
          this.usingMock = false;
          return;
        }

        this.devices = loadLocalDevices().filter((d) => !d.revoked_at);
        this.usingMock = true;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        this.devices = loadLocalDevices().filter((d) => !d.revoked_at);
        this.usingMock = true;
      } finally {
        this.loading = false;
      }
    },

    /**
     * Enroll THIS browser/device only: WebAuthn create → store credential.
     */
    async addThisAsTrustedDevice(deviceName) {
      const userStore = useUserStore();
      if (!userStore.user) throw new Error('Sign in first');

      const name = deviceName.trim();
      if (!name) throw new Error('Device name is required');

      this.loading = true;
      this.error = '';
      try {
        const passkey = await registerDevicePasskey({
          userId: userStore.user.id,
          userName: userStore.user.email,
          displayName: userStore.displayName,
        });
        userStore.refreshFlags();

        if (isSupabaseConfigured && supabase && userStore.token) {
          const { data, error } = await supabase.rpc(RPC.addTrustedDevice, {
            p_token: userStore.token,
            p_device_name: name,
            p_credential_id: passkey.credentialId,
            p_public_key: passkey.publicKey,
          });
          if (error) throw error;
          this.devices = [data, ...this.devices];
          this.usingMock = false;
          return data;
        }

        const device = {
          id: `dev-${Date.now()}`,
          device_name: name,
          credential_id: passkey.credentialId,
          public_key: passkey.publicKey,
          created_at: new Date().toISOString(),
          last_seen_at: new Date().toISOString(),
          revoked_at: null,
        };
        const all = loadLocalDevices();
        all.unshift(device);
        saveLocalDevices(all);
        this.devices = all.filter((d) => !d.revoked_at);
        this.usingMock = true;
        return device;
      } catch (error) {
        this.error = error.message || rpcErrorMessage(error);
        throw error;
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
        if (isSupabaseConfigured && supabase && userStore.token) {
          const { error } = await supabase.rpc(RPC.revokeTrustedDevice, {
            p_token: userStore.token,
            p_device_id: deviceId,
            p_confirm_name: confirmationName.trim(),
          });
          if (error) throw error;
          this.devices = this.devices.filter((d) => d.id !== deviceId);
          return;
        }

        const all = loadLocalDevices().map((d) =>
          d.id === deviceId ? { ...d, revoked_at: new Date().toISOString() } : d
        );
        saveLocalDevices(all);
        this.devices = all.filter((d) => !d.revoked_at);
      } catch (error) {
        this.error = error.message || rpcErrorMessage(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
