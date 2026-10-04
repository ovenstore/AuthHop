/**
 * RPC map for AuthHop.
 * Schema: ~/Code/authhop_schema.sql
 * Device crypto: ~/Code/authhop_device_crypto.sql
 * Session hop: ~/Code/authhop_session_hop.sql
 */

export const RPC = {
  register: 'authhop_register',
  login: 'authhop_login',
  loginDevice: 'authhop_login_device',
  me: 'authhop_me',
  logout: 'authhop_logout',
  listDevices: 'authhop_list_devices',
  addTrustedDevice: 'authhop_add_trusted_device',
  revokeTrustedDevice: 'authhop_revoke_trusted_device',
  listAuthEvents: 'authhop_list_auth_events',
  listExternalSessions: 'authhop_list_external_sessions',
  deviceLinkCreate: 'device_link_create',
  hopGetRequest: 'hop_get_request',
  hopListAccounts: 'hop_list_available_accounts',
  hopApprove: 'hop_approve',
};
