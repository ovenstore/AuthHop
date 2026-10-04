/**
 * Trusted-device crypto using Web Crypto (ECDSA P-256) + IndexedDB.
 * No passkeys / WebAuthn / biometrics — works in Chrome on every OS.
 *
 * Private key stays in IndexedDB (non-extractable).
 * A high-entropy device secret is also stored locally; only its hash is on the server.
 */

const DB_NAME = 'authhop-device-keys';
const STORE = 'keys';
const META_KEY = 'authhop-device-meta';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error || new Error('IndexedDB open failed'));
  });
}

async function idbSet(key, value) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function idbGet(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result ?? null);
    req.onerror = () => reject(req.error);
  });
}

async function idbDelete(key) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function randomHex(bytes = 32) {
  const buf = new Uint8Array(bytes);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => b.toString(16).padStart(2, '0')).join('');
}

function getMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || 'null');
  } catch {
    return null;
  }
}

function setMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta));
}

export function clearLocalDevice() {
  const meta = getMeta();
  localStorage.removeItem(META_KEY);
  if (meta?.credentialId) {
    return idbDelete(meta.credentialId).catch(() => {});
  }
  return Promise.resolve();
}

export function hasLocalTrustedDevice() {
  const meta = getMeta();
  return Boolean(meta?.credentialId && meta?.deviceSecret);
}

export function getLocalDeviceMeta() {
  return getMeta();
}

/**
 * Create a new trusted-device identity for this browser profile.
 */
export async function enrollLocalDevice() {
  if (!globalThis.crypto?.subtle) {
    throw new Error('Web Crypto is not available in this browser');
  }

  const credentialId = randomHex(16);
  const deviceSecret = randomHex(32);

  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign', 'verify']
  );

  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey);

  await idbSet(credentialId, {
    privateKey: keyPair.privateKey,
    publicKeyJwk,
    createdAt: new Date().toISOString(),
  });

  setMeta({ credentialId, deviceSecret });

  return {
    credentialId,
    deviceSecret,
    publicKey: {
      kty: publicKeyJwk.kty,
      crv: publicKeyJwk.crv,
      x: publicKeyJwk.x,
      y: publicKeyJwk.y,
      ext: true,
      key_ops: ['verify'],
    },
  };
}

/**
 * Prove this browser holds the enrolled device secret (no UI prompt).
 */
export async function getLocalDeviceProof() {
  const meta = getMeta();
  if (!meta?.credentialId || !meta?.deviceSecret) {
    return null;
  }
  const record = await idbGet(meta.credentialId);
  if (!record?.privateKey) {
    return null;
  }
  return {
    credentialId: meta.credentialId,
    deviceSecret: meta.deviceSecret,
  };
}
