/**
 * SQL / RPC map for AuthHop.
 * Schema: ~/Code/authhop_schema.sql
 *
 * All access goes through SECURITY DEFINER RPCs with a session token.
 */

export const RPC = {
  register: 'authhop_register',
  login: 'authhop_login',
  me: 'authhop_me',
  logout: 'authhop_logout',
  listDevices: 'authhop_list_devices',
  addTrustedDevice: 'authhop_add_trusted_device',
  revokeTrustedDevice: 'authhop_revoke_trusted_device',
  listAuthEvents: 'authhop_list_auth_events',
  ssoGetRequest: 'sso_get_request',
  ssoApprove: 'sso_approve',
};

export const QUERIES_REFERENCE = `
-- See ~/Code/authhop_schema.sql for full definitions.

-- Register
select public.authhop_register('you@email.com', 'password', 'You');

-- Login
select public.authhop_login('you@email.com', 'password');

-- List devices
select * from public.authhop_list_devices('<session-token>');

-- Add this device (after WebAuthn create)
select * from public.authhop_add_trusted_device(
  '<session-token>', 'My Laptop', '<credential-id>', '{}'::jsonb
);

-- Revoke (name must match)
select * from public.authhop_revoke_trusted_device(
  '<session-token>', '<device-uuid>', 'My Laptop'
);

-- Recent authentications
select * from public.authhop_list_auth_events('<session-token>');

-- Approve SSO for a relying party after WebAuthn get()
select public.sso_approve(
  '<session-token>', '<request-uuid>', '<credential-id>', '8.8.8.8', 'Mountain View, CA, US'
);
`;
