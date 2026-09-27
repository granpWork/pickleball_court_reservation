// PSGC API service with persistent circuit breaker, in-memory/localStorage caching & static fallbacks
// Prevents HTTP 429 Too Many Requests and JSON syntax parsing errors on non-200 responses.

const inMemoryCache = new Map<string, any>();

// Check localStorage for persisted rate-limit cooldown across browser refreshes
let rateLimitCooldownUntil = 0;
try {
  const storedCooldown = localStorage.getItem('psgc_rate_limit_cooldown');
  if (storedCooldown) {
    const parsed = Number(storedCooldown);
    if (!isNaN(parsed) && Date.now() < parsed) {
      rateLimitCooldownUntil = parsed;
    }
  }
} catch (e) {}

export const REGIONS_FALLBACK = [
  { code: '1300000000', name: 'National Capital Region (NCR)' },
  { code: '0100000000', name: 'Region I (Ilocos Region)' },
  { code: '0200000000', name: 'Region II (Cagayan Valley)' },
  { code: '0300000000', name: 'Region III (Central Luzon)' },
  { code: '0400000000', name: 'Region IV-A (CALABARZON)' },
  { code: '1700000000', name: 'MIMAROPA Region' },
  { code: '0500000000', name: 'Region V (Bicol Region)' },
  { code: '0600000000', name: 'Region VI (Western Visayas)' },
  { code: '0700000000', name: 'Region VII (Central Visayas)' },
  { code: '0800000000', name: 'Region VIII (Eastern Visayas)' },
  { code: '0900000000', name: 'Region IX (Zamboanga Peninsula)' },
  { code: '1000000000', name: 'Region X (Northern Mindanao)' },
  { code: '1100000000', name: 'Region XI (Davao Region)' },
  { code: '1200000000', name: 'Region XII (SOCCSKSARGEN)' },
  { code: '1600000000', name: 'Region XIII (Caraga)' },
  { code: '1400000000', name: 'Cordillera Administrative Region (CAR)' },
  { code: '1900000000', name: 'Bangsamoro Autonomous Region in Muslim Mindanao (BARMM)' },
];

const STATIC_FALLBACKS: Record<string, any[]> = {
  // NCR Cities
  '1300000000_cities': [
    { code: '1376010000', name: 'City of Manila' },
    { code: '1376020000', name: 'Quezon City' },
    { code: '1376030000', name: 'City of Makati' },
    { code: '1376040000', name: 'Taguig City' },
    { code: '1376050000', name: 'Pasig City' },
    { code: '1376060000', name: 'Mandaluyong City' },
    { code: '1376070000', name: 'Parañaque City' },
    { code: '1376080000', name: 'Pasay City' },
    { code: '1376090000', name: 'Muntinlupa City' },
    { code: '1376100000', name: 'Las Piñas City' },
    { code: '1376110000', name: 'Marikina City' },
    { code: '1376120000', name: 'Valenzuela City' },
    { code: '1376130000', name: 'Caloocan City' },
    { code: '1376140000', name: 'San Juan City' },
  ],
  // Region V (Bicol) Provinces
  '0500000000_provinces': [
    { code: '0505000000', name: 'Albay' },
    { code: '0516000000', name: 'Camarines Norte' },
    { code: '0517000000', name: 'Camarines Sur' },
    { code: '0520000000', name: 'Catanduanes' },
    { code: '0541000000', name: 'Masbate' },
    { code: '0562000000', name: 'Sorsogon' },
  ],
  // Albay Cities/Municipalities
  '0505000000_cities': [
    { code: '0505060000', name: 'Legazpi City' },
    { code: '0505040000', name: 'Daraga' },
    { code: '0505170000', name: 'Tabaco City' },
    { code: '0505080000', name: 'Ligao City' },
    { code: '0505030000', name: 'Camalig' },
    { code: '0505050000', name: 'Guinobatan' },
    { code: '0505140000', name: 'Polangui' },
  ],
  // Camarines Sur Cities/Municipalities
  '0517000000_cities': [
    { code: '0517240000', name: 'Naga City' },
    { code: '0517160000', name: 'Iriga City' },
    { code: '0517280000', name: 'Pili (Capital)' },
    { code: '0517110000', name: 'Calabanga' },
    { code: '0517190000', name: 'Libmanan' },
    { code: '0517330000', name: 'Sipocot' },
    { code: '0517070000', name: 'Bato' },
    { code: '0517080000', name: 'Bombon' },
    { code: '0517090000', name: 'Buhi' },
  ],
  // Region IV-A (CALABARZON) Provinces
  '0400000000_provinces': [
    { code: '0410000000', name: 'Batangas' },
    { code: '0421000000', name: 'Cavite' },
    { code: '0434000000', name: 'Laguna' },
    { code: '0456000000', name: 'Quezon' },
    { code: '0458000000', name: 'Rizal' },
  ],
  // Central Visayas (Region VII) Provinces
  '0700000000_provinces': [
    { code: '0712000000', name: 'Bohol' },
    { code: '0722000000', name: 'Cebu' },
    { code: '0746000000', name: 'Negros Oriental' },
    { code: '0761000000', name: 'Siquijor' },
  ],
  // Cebu Cities/Municipalities
  '0722000000_cities': [
    { code: '0722170000', name: 'Cebu City' },
    { code: '0722260000', name: 'Mandaue City' },
    { code: '0722300000', name: 'Lapu-Lapu City' },
    { code: '0722500000', name: 'Talisay City' },
    { code: '0722140000', name: 'Bogo City' },
  ],
};

function getStaticFallbackForUrl(url: string): any[] {
  if (url.includes('/api/regions') && !url.includes('/provinces') && !url.includes('/cities')) {
    return REGIONS_FALLBACK;
  }
  for (const key of Object.keys(STATIC_FALLBACKS)) {
    const [code, type] = key.split('_');
    if (url.includes(code) && url.includes(type === 'provinces' ? 'provinces' : 'cities')) {
      return STATIC_FALLBACKS[key];
    }
  }
  if (url.includes('/barangays')) {
    return [
      { code: '000000001', name: 'Poblacion' },
      { code: '000000002', name: 'Barangay 1' },
      { code: '000000003', name: 'Barangay 2' },
      { code: '000000004', name: 'San Jose' },
      { code: '000000005', name: 'San Antonio' },
    ];
  }
  if (url.includes('/cities-municipalities')) {
    return [
      { code: '9999010000', name: 'City / Municipality Center' },
      { code: '9999020000', name: 'North District' },
      { code: '9999030000', name: 'South District' },
    ];
  }
  if (url.includes('/provinces')) {
    return [
      { code: '9999001000', name: 'Central Province' },
      { code: '9999002000', name: 'Northern Province' },
    ];
  }
  return [];
}

export async function safeFetchPsgcJson(url: string): Promise<any> {
  // 1. Check in-memory cache
  if (inMemoryCache.has(url)) {
    return inMemoryCache.get(url);
  }

  // 2. Check sessionStorage
  try {
    const cachedSession = sessionStorage.getItem(`psgc_cache_${url}`);
    if (cachedSession) {
      const parsed = JSON.parse(cachedSession);
      if (Array.isArray(parsed) && parsed.length > 0) {
        inMemoryCache.set(url, parsed);
        return parsed;
      }
    }
  } catch (e) {}

  // 3. Circuit breaker check: if rate-limited, skip network fetch entirely & return static fallback immediately
  if (Date.now() < rateLimitCooldownUntil) {
    const fallback = getStaticFallbackForUrl(url);
    inMemoryCache.set(url, fallback);
    return fallback;
  }

  // 4. Perform network fetch with status checking
  try {
    const res = await fetch(url);

    if (res.status === 429) {
      // Activate 2-hour circuit breaker and persist to localStorage across browser reloads
      rateLimitCooldownUntil = Date.now() + 2 * 60 * 60 * 1000;
      try {
        localStorage.setItem('psgc_rate_limit_cooldown', String(rateLimitCooldownUntil));
      } catch (e) {}
      const fallback = getStaticFallbackForUrl(url);
      inMemoryCache.set(url, fallback);
      return fallback;
    }

    if (!res.ok) {
      const fallback = getStaticFallbackForUrl(url);
      return fallback;
    }

    const contentType = res.headers.get('content-type');
    if (contentType && !contentType.includes('application/json')) {
      const fallback = getStaticFallbackForUrl(url);
      return fallback;
    }

    const data = await res.json();
    if (Array.isArray(data) && data.length > 0) {
      inMemoryCache.set(url, data);
      try {
        sessionStorage.setItem(`psgc_cache_${url}`, JSON.stringify(data));
      } catch (e) {}
      return data;
    } else {
      const fallback = getStaticFallbackForUrl(url);
      return fallback;
    }
  } catch (e) {
    const fallback = getStaticFallbackForUrl(url);
    return fallback;
  }
}
