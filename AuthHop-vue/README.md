# AuthHop (Vue)

Trusted-device authentication portal. Sister app: `~/Code/AuthHop-demo`.
Shared schema: `~/Code/authhop_schema.sql`.

## Run

```bash
cd ~/Code/AuthHop-vue
cp .env.example .env   # fill Supabase keys when ready
npm install
npm run dev            # http://localhost:5173
```

## Flow

1. Create an AuthHop account (`/register`) or sign in (`/login`).
2. WebAuthn is attempted first when a passkey already exists on this browser.
3. On **Trusted Devices**, click **Add this as a trusted device** (enrolls WebAuthn on *this* browser only).
4. A relying party (demo site) redirects here to `/authorize?request_id=…`.
5. AuthHop requires a WebAuthn assertion on a trusted device, then redirects back with a one-time `code`.

## Connect the database

1. Create a Supabase project.
2. Paste and run `~/Code/authhop_schema.sql` in the SQL Editor.
3. Put the project URL + anon key in `.env` (same values in AuthHop-demo).
4. Restart both apps.

All data access uses RPC functions in that SQL file (`authhop_*`, `sso_*`) so both sites can share one database with separate `authhop_users` and `demo_users` tables.
