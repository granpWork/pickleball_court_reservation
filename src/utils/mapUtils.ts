/**
 * Google Maps URL and Pin parsing utilities.
 */

export interface ParsedMapInfo {
  embedUrl: string;
  directUrl: string;
  coordinates: { lat: number; lng: number } | null;
  placeName?: string;
  pinType: 'coordinates' | 'place' | 'embed_code' | 'shortlink' | 'address_fallback' | 'invalid' | 'none';
  badgeLabel: string;
  statusText: string;
  isValid: boolean;
  isShortLink: boolean;
}

/**
 * Parses any Google Maps URL, embed iframe snippet, place link, coordinate pair,
 * or falls back to an address string to generate a previewable Google Map Embed URL with a pin marker.
 */
export function parseGoogleMapsUrl(rawUrl: string, fallbackAddress?: string): ParsedMapInfo {
  const trimmed = (rawUrl || '').trim();
  const addressFallback = (fallbackAddress || '').trim();

  // Helper to build coordinate embed
  const makeCoordEmbed = (lat: number, lng: number, placeName?: string): ParsedMapInfo => {
    const query = placeName ? `${encodeURIComponent(placeName)}@${lat},${lng}` : `${lat},${lng}`;
    return {
      embedUrl: `https://maps.google.com/maps?q=${query}&ll=${lat},${lng}&z=16&output=embed`,
      directUrl: `https://www.google.com/maps?q=${lat},${lng}`,
      coordinates: { lat, lng },
      placeName,
      pinType: 'coordinates',
      badgeLabel: `📍 Pin (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
      statusText: `Exact pin location identified at coordinates [${lat.toFixed(5)}, ${lng.toFixed(5)}]`,
      isValid: true,
      isShortLink: false,
    };
  };

  // 1. If empty, check fallback address
  if (!trimmed) {
    if (addressFallback) {
      return {
        embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(addressFallback)}&z=16&output=embed`,
        directUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressFallback)}`,
        coordinates: null,
        pinType: 'address_fallback',
        badgeLabel: '📌 Address Pin Preview',
        statusText: `Displaying location based on court address`,
        isValid: true,
        isShortLink: false,
      };
    }
    return {
      embedUrl: '',
      directUrl: '',
      coordinates: null,
      pinType: 'none',
      badgeLabel: '',
      statusText: 'No map URL or address entered',
      isValid: false,
      isShortLink: false,
    };
  }

  // 2. Full iframe HTML copy-paste: extract src attribute
  if (trimmed.toLowerCase().includes('<iframe')) {
    const match = trimmed.match(/src=["']([^"']+)["']/i);
    if (match && match[1]) {
      const srcUrl = match[1];
      // Check if coordinates exist inside the src
      const coordMatch = srcUrl.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/); // pb parameter format (lng!3dlat)
      let coords: { lat: number; lng: number } | null = null;
      if (coordMatch && coordMatch[1] && coordMatch[2]) {
        coords = { lat: parseFloat(coordMatch[2]), lng: parseFloat(coordMatch[1]) };
      }
      return {
        embedUrl: srcUrl,
        directUrl: srcUrl,
        coordinates: coords,
        pinType: 'embed_code',
        badgeLabel: coords ? `🗺️ Embed (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°)` : '🗺️ Google Maps Embed',
        statusText: 'Using official Google Maps Embed code',
        isValid: true,
        isShortLink: false,
      };
    }
  }

  // 3. Direct embed URL with /maps/embed or pb=
  if (trimmed.includes('/maps/embed') || trimmed.includes('output=embed') || trimmed.includes('pb=!1m')) {
    const coordMatch = trimmed.match(/!2d(-?\d+\.\d+)!3d(-?\d+\.\d+)/);
    let coords: { lat: number; lng: number } | null = null;
    if (coordMatch && coordMatch[1] && coordMatch[2]) {
      coords = { lat: parseFloat(coordMatch[2]), lng: parseFloat(coordMatch[1]) };
    }
    return {
      embedUrl: trimmed,
      directUrl: trimmed,
      coordinates: coords,
      pinType: 'embed_code',
      badgeLabel: coords ? `🗺️ Embed (${coords.lat.toFixed(4)}°, ${coords.lng.toFixed(4)}°)` : '🗺️ Google Maps Embed',
      statusText: 'Valid Google Maps Embed URL',
      isValid: true,
      isShortLink: false,
    };
  }

  // 4. Raw Coordinates pasted directly (e.g. "13.6896544, 123.0441148" or "13.6896544,123.0441148")
  const rawCoordMatch = trimmed.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
  if (rawCoordMatch && rawCoordMatch[1] && rawCoordMatch[2]) {
    const lat = parseFloat(rawCoordMatch[1]);
    const lng = parseFloat(rawCoordMatch[2]);
    if (!isNaN(lat) && !isNaN(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
      return makeCoordEmbed(lat, lng);
    }
  }

  // 5. Shortened links: maps.app.goo.gl or goo.gl/maps
  const isShortLink = trimmed.includes('maps.app.goo.gl') || trimmed.includes('goo.gl/maps');
  if (isShortLink) {
    const fallback = addressFallback || 'Pickleball Court';
    return {
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(fallback)}&z=16&output=embed`,
      directUrl: trimmed,
      coordinates: null,
      pinType: 'shortlink',
      badgeLabel: '⚡ Short link (Address Pin Preview)',
      statusText: 'Shortened link detected. Previewing pin via court address. You can also paste the full address bar URL for exact coordinates.',
      isValid: true,
      isShortLink: true,
    };
  }

  // 6. Google Maps URL with @lat,lng coordinates (e.g. /@13.621773,123.194806,17z)
  const atCoordsMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atCoordsMatch && atCoordsMatch[1] && atCoordsMatch[2]) {
    const lat = parseFloat(atCoordsMatch[1]);
    const lng = parseFloat(atCoordsMatch[2]);
    let placeName: string | undefined = undefined;
    const placeMatch = trimmed.match(/place\/([^/@\s?]+)/);
    if (placeMatch && placeMatch[1]) {
      try {
        placeName = decodeURIComponent(placeMatch[1].replace(/\+/g, ' '));
      } catch {
        placeName = placeMatch[1];
      }
    }
    return makeCoordEmbed(lat, lng, placeName);
  }

  // 7. Google Maps URL with coordinates in query params or path (e.g. place/13.621773,123.194806 or ?q=13.621773,123.194806)
  const pathCoordsMatch = trimmed.match(/(?:place|q|ll|query|destination|daddr)[/=:](-?\d+\.\d+),(-?\d+\.\d+)/i);
  if (pathCoordsMatch && pathCoordsMatch[1] && pathCoordsMatch[2]) {
    const lat = parseFloat(pathCoordsMatch[1]);
    const lng = parseFloat(pathCoordsMatch[2]);
    return makeCoordEmbed(lat, lng);
  }

  // 8. Place name only in URL (e.g. /place/PicklePoint+Naga/ or ?q=SM+City+Naga)
  const placeOnlyMatch = trimmed.match(/place\/([^/@\s?]+)/);
  if (placeOnlyMatch && placeOnlyMatch[1]) {
    let placeName = placeOnlyMatch[1];
    try {
      placeName = decodeURIComponent(placeName.replace(/\+/g, ' '));
    } catch {
      // ignore
    }
    const query = [placeName, addressFallback].filter(Boolean).join(', ');
    return {
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`,
      directUrl: trimmed,
      coordinates: null,
      placeName,
      pinType: 'place',
      badgeLabel: `🏢 Place Pin: ${placeName}`,
      statusText: `Pin dropped at place "${placeName}"`,
      isValid: true,
      isShortLink: false,
    };
  }

  // 9. Query parameter search (e.g. ?q=Some+Address)
  const queryParamMatch = trimmed.match(/[?&](?:q|query)=([^&]+)/i);
  if (queryParamMatch && queryParamMatch[1]) {
    let queryVal = queryParamMatch[1];
    try {
      queryVal = decodeURIComponent(queryVal.replace(/\+/g, ' '));
    } catch {
      // ignore
    }
    return {
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(queryVal)}&z=16&output=embed`,
      directUrl: trimmed,
      coordinates: null,
      placeName: queryVal,
      pinType: 'place',
      badgeLabel: `📍 Pin: ${queryVal}`,
      statusText: `Pin dropped at query "${queryVal}"`,
      isValid: true,
      isShortLink: false,
    };
  }

  // 10. General HTTP URL fallback or address fallback
  if (trimmed.startsWith('http')) {
    const query = addressFallback || trimmed;
    return {
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`,
      directUrl: trimmed,
      coordinates: null,
      pinType: 'place',
      badgeLabel: '📍 Map Location Preview',
      statusText: 'Map preview generated for location URL',
      isValid: true,
      isShortLink: false,
    };
  }

  // 11. Final fallback to address if provided
  if (addressFallback) {
    return {
      embedUrl: `https://maps.google.com/maps?q=${encodeURIComponent(addressFallback)}&z=16&output=embed`,
      directUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressFallback)}`,
      coordinates: null,
      pinType: 'address_fallback',
      badgeLabel: '📌 Address Pin Preview',
      statusText: `Displaying location based on court address`,
      isValid: true,
      isShortLink: false,
    };
  }

  return {
    embedUrl: '',
    directUrl: trimmed,
    coordinates: null,
    pinType: 'invalid',
    badgeLabel: '⚠️ Invalid Link',
    statusText: 'Unable to resolve map pin from the provided URL. Please paste a valid Google Maps URL or embed code.',
    isValid: false,
    isShortLink: false,
  };
}
