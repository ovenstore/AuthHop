/**
 * RPC map for AuthHop. Schema: ~/Code/authhop_schema.sql
 * Device crypto patch: ~/Code/authhop_device_crypto.sql
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
  ssoGetRequest: 'sso_get_request',
  ssoApprove: 'sso_approve',
};
