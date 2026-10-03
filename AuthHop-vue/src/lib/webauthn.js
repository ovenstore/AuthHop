const CREDENTIAL_STORAGE_KEY = 'authhop-webauthn-credential-id';
const RP_NAME = 'AuthHop';

function rpId() {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname;
}

function bufferToBase64Url(buffer) {
  const bytes = new Uint8Array(buffer);
  let str = '';
  bytes.forEach((b) => {
    str += String.fromCharCode(b);
  });
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBuffer(base64url) {
  const padded = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const pad = padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const binary = atob(padded + pad);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

function randomChallenge(size = 32) {
  const bytes = new Uint8Array(size);
  crypto.getRandomValues(bytes);
  return bytes.buffer;
}

export function isWebAuthnSupported() {
  return typeof window !== 'undefined'
    && !!window.PublicKeyCredential
    && typeof navigator.credentials?.create === 'function'
    && typeof navigator.credentials?.get === 'function';
}

export function getStoredCredentialId() {
  return localStorage.getItem(CREDENTIAL_STORAGE_KEY) || '';
}

export function hasLocalPasskey() {
  return Boolean(getStoredCredentialId());
}

export function clearStoredCredentialId() {
  localStorage.removeItem(CREDENTIAL_STORAGE_KEY);
}

export function rememberCredentialId(credentialId) {
  localStorage.setItem(CREDENTIAL_STORAGE_KEY, credentialId);
}

/**
 * Create a WebAuthn credential on THIS device when trusting it.
 * Production: challenge should come from the server.
 */
export async function registerDevicePasskey({ userId, userName, displayName }) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: RP_NAME, id: rpId() },
      user: {
        id: new TextEncoder().encode(String(userId)),
        name: userName,
        displayName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'preferred',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  });

  if (!credential) {
    throw new Error('Passkey registration was cancelled');
  }

  const credentialId = bufferToBase64Url(credential.rawId);
  rememberCredentialId(credentialId);

  return {
    credentialId,
    publicKey: {
      type: credential.type,
      id: credentialId,
      transports: credential.response.getTransports?.() || [],
      clientDataJSON: bufferToBase64Url(credential.response.clientDataJSON),
      attestationObject: bufferToBase64Url(credential.response.attestationObject),
    },
  };
}

/**
 * Assert a passkey. Prefer the locally remembered credential id when present.
 */
export async function assertDevicePasskey({ allowCredentialIds = [] } = {}) {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn is not supported in this browser');
  }

  const ids = allowCredentialIds.length
    ? allowCredentialIds
    : [getStoredCredentialId()].filter(Boolean);

  const allowCredentials = ids.length
    ? ids.map((id) => ({ type: 'public-key', id: base64UrlToBuffer(id) }))
    : undefined;

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      rpId: rpId(),
      allowCredentials,
      userVerification: 'preferred',
      timeout: 60000,
    },
  });

  if (!assertion) {
    throw new Error('Passkey authentication was cancelled');
  }

  const credentialId = bufferToBase64Url(assertion.rawId);
  rememberCredentialId(credentialId);
  return { credentialId };
}
