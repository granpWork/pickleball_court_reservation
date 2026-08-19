import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  MapPin,
  Search,
  Crosshair,
  Compass,
  ExternalLink,
  Loader2,
  Check,
  Layers,
} from 'lucide-react';

interface InteractiveMapPickerProps {
  latitude: number | null;
  longitude: number | null;
  courtAddress?: string;
  mapUrl?: string;
  onChange: (lat: number, lng: number, mapUrl: string) => void;
}

// Custom branded draggable map pin marker
const createBrandedPinIcon = () => {
  return L.divIcon({
    className: 'picklepoint-map-marker',
    html: `
      <div style="position: relative; display: flex; flex-direction: column; align-items: center; cursor: grab;">
        <div style="
          background: linear-gradient(135deg, #a6e224 0%, #10b981 100%);
          width: 38px;
          height: 38px;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          border: 3px solid #0f172a;
          box-shadow: 0 4px 18px rgba(166, 226, 36, 0.6), 0 0 10px rgba(16, 185, 129, 0.4);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: transform 0.2s ease;
        ">
          <div style="
            transform: rotate(45deg);
            width: 14px;
            height: 14px;
            background: #0f172a;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            <div style="width: 6px; height: 6px; background: #a6e224; border-radius: 50%;"></div>
          </div>
        </div>
        <div style="
          width: 16px;
          height: 5px;
          background: rgba(0,0,0,0.5);
          border-radius: 50%;
          margin-top: -3px;
          filter: blur(1.5px);
        "></div>
      </div>
    `,
    iconSize: [38, 44],
    iconAnchor: [19, 44],
    popupAnchor: [0, -44],
  });
};

const DEFAULT_CENTER: [number, number] = [13.6218, 123.1948]; // Naga City / Bicol default
const DEFAULT_ZOOM = 15;

export const InteractiveMapPicker: React.FC<InteractiveMapPickerProps> = ({
  latitude,
  longitude,
  courtAddress = '',
  mapUrl = '',
  onChange,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLocatingAddress, setIsLocatingAddress] = useState(false);
  const [isGettingGps, setIsGettingGps] = useState(false);
  const [copiedCoords, setCopiedCoords] = useState(false);
  const [currentLat, setCurrentLat] = useState<number | null>(latitude);
  const [currentLng, setCurrentLng] = useState<number | null>(longitude);
  const [tileMode, setTileMode] = useState<'streets' | 'satellite'>('streets');

  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Sync internal state when external props change
  useEffect(() => {
    if (latitude !== null && longitude !== null) {
      setCurrentLat(latitude);
      setCurrentLng(longitude);
      if (markerRef.current) {
        markerRef.current.setLatLng([latitude, longitude]);
      }
    }
  }, [latitude, longitude]);

  // Generate official Google Maps URL from coords
  const buildGoogleMapsUrl = (lat: number, lng: number) => {
    return `https://www.google.com/maps?q=${lat.toFixed(6)},${lng.toFixed(6)}`;
  };

  // Update pin and notify parent
  const handleSetPosition = useCallback((lat: number, lng: number, zoomTo = false) => {
    const roundedLat = parseFloat(lat.toFixed(6));
    const roundedLng = parseFloat(lng.toFixed(6));
    setCurrentLat(roundedLat);
    setCurrentLng(roundedLng);

    const generatedMapUrl = buildGoogleMapsUrl(roundedLat, roundedLng);
    onChange(roundedLat, roundedLng, generatedMapUrl);

    if (markerRef.current) {
      markerRef.current.setLatLng([roundedLat, roundedLng]);
    } else if (mapInstanceRef.current) {
      const pinIcon = createBrandedPinIcon();
      const marker = L.marker([roundedLat, roundedLng], {
        icon: pinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(mapInstanceRef.current);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        handleSetPosition(pos.lat, pos.lng);
      });

      markerRef.current = marker;
    }

    if (zoomTo && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([roundedLat, roundedLng], 17, {
        duration: 1.2,
      });
    }
  }, [onChange]);

  // Switch Map Tile Layer
  const setMapTiles = useCallback((mode: 'streets' | 'satellite') => {
    if (!mapInstanceRef.current) return;
    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    let url = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
    let attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

    if (mode === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      attribution = 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and the GIS User Community';
    }

    const newLayer = L.tileLayer(url, {
      maxZoom: 19,
      attribution,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newLayer;
    setTileMode(mode);
  }, []);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const initialCenter: [number, number] =
      latitude !== null && longitude !== null
        ? [latitude, longitude]
        : DEFAULT_CENTER;

    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: latitude !== null && longitude !== null ? 16 : DEFAULT_ZOOM,
      zoomControl: true,
    });

    const baseTile = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);

    tileLayerRef.current = baseTile;
    mapInstanceRef.current = map;

    // Place initial pin if coords exist
    if (latitude !== null && longitude !== null) {
      const pinIcon = createBrandedPinIcon();
      const marker = L.marker([latitude, longitude], {
        icon: pinIcon,
        draggable: true,
        autoPan: true,
      }).addTo(map);

      marker.on('dragend', () => {
        const pos = marker.getLatLng();
        handleSetPosition(pos.lat, pos.lng);
      });

      markerRef.current = marker;
    }

    // Click map to drop/move pin
    map.on('click', (e: L.LeafletMouseEvent) => {
      handleSetPosition(e.latlng.lat, e.latlng.lng);
    });

    // Invalidate size after container renders
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);

    return () => {
      clearTimeout(timer);
      map.remove();
      mapInstanceRef.current = null;
      markerRef.current = null;
    };
  }, [handleSetPosition, latitude, longitude]);

  // Geocode Search by Name / Landmark / Address
  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = searchQuery.trim();
    if (!query) return;

    setIsSearching(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        query + ', Philippines'
      )}&limit=1`;
      const res = await fetch(url, {
        headers: { 'Accept-Language': 'en' },
      });
      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        handleSetPosition(lat, lon, true);
      } else {
        alert(`Location "${query}" not found. Try searching a nearby city, barangay, or landmark.`);
      }
    } catch (err) {
      console.error('Map search failed:', err);
    } finally {
      setIsSearching(false);
    }
  };

  // Geocode by Court Address (Autofilled from PSGC form)
  const handleLocateCourtAddress = async () => {
    const addressToGeocode = courtAddress.trim();
    if (!addressToGeocode) {
      alert('Please fill in Region, Municipality/City, or Street Address above first.');
      return;
    }

    setIsLocatingAddress(true);
    try {
      // Try full address
      let url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
        addressToGeocode
      )}&limit=1`;
      let res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
      let data = await res.json();

      // If full address too specific, try city + province + Philippines
      if (!Array.isArray(data) || data.length === 0) {
        const parts = addressToGeocode.split(',').map((s) => s.trim()).filter(Boolean);
        const cityProv = parts.slice(Math.max(parts.length - 3, 0)).join(', ');
        url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          cityProv
        )}&limit=1`;
        res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
        data = await res.json();
      }

      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat);
        const lon = parseFloat(data[0].lon);
        handleSetPosition(lat, lon, true);
      } else {
        alert('Could not automatically geocode address. Please click on the map to place the pin manually.');
      }
    } catch (err) {
      console.error('Locating address failed:', err);
    } finally {
      setIsLocatingAddress(false);
    }
  };

  // Geolocation (My current GPS location)
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }

    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setIsGettingGps(false);
        handleSetPosition(pos.coords.latitude, pos.coords.longitude, true);
      },
      (err) => {
        setIsGettingGps(false);
        console.warn('GPS location error:', err);
        alert('Could not access your location. Please check browser permissions.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleCopyCoordinates = () => {
    if (currentLat !== null && currentLng !== null) {
      navigator.clipboard.writeText(`${currentLat}, ${currentLng}`);
      setCopiedCoords(true);
      setTimeout(() => setCopiedCoords(false), 2500);
    }
  };

  const hasPin = currentLat !== null && currentLng !== null;

  return (
    <div className="space-y-3">
      {/* Controls & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
        {/* Search Input */}
        <form onSubmit={handleSearch} className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search venue, city, or landmark (e.g., SM City Naga)..."
            className="w-full bg-slate-900/90 border border-slate-700 text-slate-200 rounded-xl pl-9 pr-20 py-2 text-xs focus:outline-none focus:border-brand-lime transition-all"
          />
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <button
            type="submit"
            disabled={isSearching || !searchQuery.trim()}
            className="absolute right-1.5 top-1/2 -translate-y-1/2 px-2.5 py-1 bg-brand-lime/10 hover:bg-brand-lime/20 border border-brand-lime/30 text-brand-lime text-[10px] font-bold rounded-lg transition-all disabled:opacity-50 flex items-center gap-1"
          >
            {isSearching ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-1.5 self-end sm:self-auto">
          {/* Locate Address */}
          <button
            type="button"
            onClick={handleLocateCourtAddress}
            disabled={isLocatingAddress}
            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Auto-locate court address on map"
          >
            {isLocatingAddress ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-lime" />
            ) : (
              <Compass className="w-3.5 h-3.5 text-brand-lime" />
            )}
            <span className="hidden md:inline">Locate Address</span>
          </button>

          {/* GPS Current Location */}
          <button
            type="button"
            onClick={handleUseMyLocation}
            disabled={isGettingGps}
            className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-[11px] font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
            title="Use device GPS location"
          >
            {isGettingGps ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-emerald" />
            ) : (
              <Crosshair className="w-3.5 h-3.5 text-brand-emerald" />
            )}
            <span className="hidden md:inline">My GPS</span>
          </button>

          {/* Satellite Toggle */}
          <button
            type="button"
            onClick={() => setMapTiles(tileMode === 'streets' ? 'satellite' : 'streets')}
            className={`px-2.5 py-2 rounded-xl text-[11px] font-bold border transition-all flex items-center gap-1.5 ${
              tileMode === 'satellite'
                ? 'bg-brand-lime/20 border-brand-lime text-brand-lime'
                : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
            }`}
            title="Toggle Satellite / Streets view"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{tileMode === 'satellite' ? 'Satellite' : 'Map'}</span>
          </button>
        </div>
      </div>

      {/* Interactive Map Canvas */}
      <div className="relative w-full rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl">
        <div
          ref={mapContainerRef}
          className="w-full h-72 sm:h-80 md:h-96 z-0"
          style={{ minHeight: '280px' }}
        />

        {/* Map Overlay Badge / Instructions */}
        <div className="absolute top-3 left-3 z-[400] pointer-events-none">
          <div className="px-3 py-1.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-slate-700/80 shadow-lg text-[11px] font-medium text-slate-200 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-brand-lime animate-ping"></span>
            <span>Click map or drag the pin to set exact court location</span>
          </div>
        </div>

        {/* Pin Location Status Bar */}
        <div className="p-3 bg-slate-950/95 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-brand-lime/10 border border-brand-lime/30 flex items-center justify-center text-brand-lime flex-shrink-0">
              <MapPin className="w-3.5 h-3.5" />
            </div>

            {hasPin ? (
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="font-bold text-white">Pinned Coordinates:</span>
                <span className="font-mono text-brand-lime font-bold bg-brand-lime/10 px-2 py-0.5 rounded-md border border-brand-lime/20">
                  {currentLat?.toFixed(6)}, {currentLng?.toFixed(6)}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCoordinates}
                  className="text-[10px] text-slate-400 hover:text-white px-2 py-0.5 bg-slate-800 rounded border border-slate-700 flex items-center gap-1 transition-all"
                >
                  {copiedCoords ? <Check className="w-3 h-3 text-brand-lime" /> : null}
                  {copiedCoords ? 'Copied' : 'Copy'}
                </button>
              </div>
            ) : (
              <span className="text-slate-400 italic">No pin placed yet. Click anywhere on the map above.</span>
            )}
          </div>

          {/* Action to test in Google Maps */}
          {hasPin && (
            <a
              href={mapUrl || buildGoogleMapsUrl(currentLat!, currentLng!)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-[11px] font-bold text-brand-lime hover:text-[#a6e224] bg-brand-lime/10 hover:bg-brand-lime/20 border border-brand-lime/30 px-2.5 py-1 rounded-lg transition-all"
            >
              <span>Verify in Google Maps</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

export default InteractiveMapPicker;
