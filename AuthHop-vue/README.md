# AuthHop (Vue)

Session-hop portal across trusted devices. Sister app: `../AuthHop-demo`.
Shared schema docs: `../../AUTHHOP.md`.

## Run

```bash
cd AuthHop-vue
cp .env.example .env   # required — no mock mode
npm install
npm run dev            # http://localhost:5173
```

Run these in Supabase (after the base schema):

1. `../../authhop_device_crypto.sql`
2. `../../authhop_session_hop.sql`

## Notes

- Device trust uses Web Crypto keys in IndexedDB (no passkeys / biometrics).
- AuthHop does not create demo accounts; it only hops existing demo sessions between trusted devices.
- Missing DB config throws an error instead of falling back to mocks.
