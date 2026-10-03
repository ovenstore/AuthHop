# AuthHop Demo

Minimal Vue site that can sign in with email/password **or** Authenticate with AuthHop.

- Port: `http://localhost:5174`
- Shared DB schema: `~/Code/authhop_schema.sql`
- Uses `demo_users` (AuthHop uses `authhop_users`)

## Run

```bash
cd ~/Code/AuthHop-demo
cp .env.example .env   # same Supabase keys as AuthHop-vue
npm install
npm run dev
```

Also run AuthHop on `:5173`.

## AuthHop button flow

1. Demo calls `sso_create_request` → gets `request_id`
2. Browser redirects to `AuthHop/authorize?request_id=…`
3. AuthHop requires WebAuthn on a **trusted device**
4. Redirect back to `/auth/callback?code=…&state=…`
5. Demo calls `sso_exchange_code` → demo session (and links/creates `demo_users` row)
