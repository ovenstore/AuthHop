# AuthHop Demo

Minimal Vue site with its **own** email/password accounts. AuthHop can hop an already-active
demo session from one trusted device onto another — it never creates demo users.

- Port: `http://localhost:5174`
- Shared DB: run `authhop_schema.sql`, `authhop_device_crypto.sql`, then `authhop_session_hop.sql`

## Run

```bash
cd ~/Code/AuthHop/AuthHop-demo
cp .env.example .env   # same Supabase keys as AuthHop-vue
npm install
npm run dev
```

Also run AuthHop on `:5173`.

## Flows

### Publish (source device)

1. Enroll the browser as a trusted device in AuthHop
2. Sign in to Demo with demo credentials
3. Click **Link AuthHop device** (or complete `/auth/link`)
4. Demo calls `external_session_publish` so AuthHop sees the active session

### Continue with AuthHop (target device)

1. Demo calls `hop_create_request` → `request_id`
2. Browser redirects to `AuthHop/hop?request_id=…`
3. User picks a hoppable account (auto if only one); requesting device must be trusted
4. Redirect back to `/auth/callback?code=…&state=…`
5. Demo calls `hop_exchange_code` → **new** `demo_sessions` row for the existing user

### Logout

`demo_logout` deletes the demo session and immediately revokes the published external session.
