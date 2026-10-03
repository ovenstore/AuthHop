/**
 * Resolve a human-readable location from an IP address.
 * Uses ipwho.is (free, CORS-friendly). Falls back to a short label on failure.
 */
export async function lookupIpLocation(ip) {
  try {
    const response = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`);
    if (!response.ok) {
      throw new Error(`Geo lookup failed (${response.status})`);
    }
    const data = await response.json();
    if (!data.success) {
      throw new Error(data.message || 'Geo lookup unsuccessful');
    }
    const city = data.city || '';
    const region = data.region || data.region_code || '';
    const country = data.country || data.country_code || '';
    const parts = [city, region, country].filter(Boolean);
    return {
      label: parts.join(', ') || 'Unknown location',
      city,
      region,
      country,
      latitude: data.latitude ?? null,
      longitude: data.longitude ?? null,
      raw: data,
    };
  } catch (error) {
    return {
      label: 'Location unavailable',
      city: '',
      region: '',
      country: '',
      latitude: null,
      longitude: null,
      error: error.message,
    };
  }
}

/** Well-known public IPs used as mock auth sources until the DB is wired. */
export const MOCK_AUTH_IPS = [
  '8.8.8.8',
  '1.1.1.1',
  '208.67.222.222',
  '9.9.9.9',
  '64.233.160.0',
  '151.101.1.67',
];
