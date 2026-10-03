# AuthHop (Vue)

Trusted-device authentication portal. Sister app: `../AuthHop-demo`.
Shared schema docs: `../../AUTHHOP.md`.

## Run

```bash
cd AuthHop-vue
cp .env.example .env   # required — no mock mode
npm install
npm run dev            # http://localhost:5173
```

Also run `../../authhop_device_crypto.sql` in Supabase (after the base schema) so trusted-device auto-login works.

## Notes

- Device trust uses Web Crypto keys in IndexedDB (no passkeys / biometrics).
- Missing DB config throws an error instead of falling back to mocks.
