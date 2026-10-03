import { defineStore } from 'pinia';
import { supabase, isSupabaseConfigured, rpcErrorMessage } from '../api/supabase';
import { RPC } from '../api/queries';
import { assertDevicePasskey, getStoredCredentialId, hasLocalPasskey } from '../lib/webauthn';
import { lookupIpLocation } from '../api/geoip';
import { useUserStore } from './user';
import { useDevicesStore } from './devices';

export const useSsoStore = defineStore('sso', {
  state: () => ({
    request: null,
    loading: false,
    error: '',
    result: null,
  }),
  actions: {
    async loadRequest(requestId, mockHints = {}) {
      this.loading = true;
      this.error = '';
      this.result = null;
      try {
        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc(RPC.ssoGetRequest, {
            p_request_id: requestId,
          });
          if (error) throw error;
          if (!data) throw new Error('SSO request not found');
          this.request = data;
          return data;
        }

        // Mock: prefer hints passed from the demo site query string (cross-origin)
        this.request = {
          id: requestId,
          site_id: mockHints.siteId || import.meta.env.VITE_DEMO_SITE_ID || 'demo-app',
          redirect_uri:
            mockHints.redirectUri ||
            `${import.meta.env.VITE_DEMO_URL || 'http://localhost:5174'}/auth/callback`,
          state: mockHints.state || 'mock-state',
          status: 'pending',
          expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        };
        return this.request;
      } catch (error) {
        this.error = rpcErrorMessage(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },

    async approveWithTrustedDevice() {
      const userStore = useUserStore();
      const devicesStore = useDevicesStore();

      if (!this.request?.id) throw new Error('No SSO request loaded');
      if (!userStore.isAuthenticated) throw new Error('Sign in to AuthHop first');

      this.loading = true;
      this.error = '';
      try {
        await devicesStore.fetchDevices();
        if (!devicesStore.devices.length && !hasLocalPasskey()) {
          throw new Error(
            'This device is not trusted. Open Trusted Devices and choose “Add this as a trusted device”.'
          );
        }

        const allowIds = devicesStore.devices
          .map((d) => d.credential_id)
          .filter(Boolean);
        if (getStoredCredentialId() && !allowIds.includes(getStoredCredentialId())) {
          allowIds.push(getStoredCredentialId());
        }

        const { credentialId } = await assertDevicePasskey({ allowCredentialIds: allowIds });

        // Mock client IP for geo + history until a real edge IP is available
        const mockIp = '8.8.8.8';
        const geo = await lookupIpLocation(mockIp);

        if (isSupabaseConfigured && supabase) {
          const { data, error } = await supabase.rpc(RPC.ssoApprove, {
            p_token: userStore.token,
            p_request_id: this.request.id,
            p_credential_id: credentialId,
            p_ip: mockIp,
            p_location: geo.label,
          });
          if (error) throw error;
          this.result = data;
          return data;
        }

        // Mock approval: only if local device list contains this credential
        const trusted = devicesStore.devices.some((d) => d.credential_id === credentialId)
          || getStoredCredentialId() === credentialId;
        if (!trusted) {
          throw new Error(
            'This device is not trusted. Add it as a trusted device in AuthHop first.'
          );
        }

        const code = `mock-code-${Date.now()}`;
        const result = {
          code,
          state: this.request.state,
          redirect_uri: this.request.redirect_uri,
          site_id: this.request.site_id,
        };
        sessionStorage.setItem(
          `sso-code-${code}`,
          JSON.stringify({
            ...result,
            authhop_user: userStore.user,
          })
        );
        this.result = result;
        return result;
      } catch (error) {
        this.error = error.message || rpcErrorMessage(error);
        throw error;
      } finally {
        this.loading = false;
      }
    },
  },
});
