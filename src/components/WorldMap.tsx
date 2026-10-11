import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, RadioGardenPlace } from '../types/radio';
import { radioGardenService } from '../services/radioGardenService';
import { SkinThemeId } from '../types/wallpaper';
import { analytics } from '../services/analytics';

export type MapTileMode = 'cyber' | 'satellite' | 'topo';

interface WorldMapProps {
  stations: Station[];
  allStations?: Station[];
  allPlaces?: RadioGardenPlace[];
  activeStation: Station;
  onSelectStation: (station: Station) => void;
  isPlaying: boolean;
  isLightMode: boolean;
  skinTheme?: SkinThemeId;
  onMapClick?: () => void;
}

interface ClickRadarPing {
  id: number;
  lat: number;
  lng: number;
  targetLat: number;
  targetLng: number;
  placeTitle: string;
  distanceKm: number;
}

interface FanOutStationCluster {
  place: RadioGardenPlace;
  stations: Station[];
  lat: number;
  lng: number;
  isLoading: boolean;
}

// Great-circle haversine distance in km
function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const WorldMap: React.FC<WorldMapProps> = ({
  stations,
  allStations = [],
  allPlaces = [],
  activeStation,
  onSelectStation,
  isPlaying,
  isLightMode,
  skinTheme = 'amber',
  onMapClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const placesCanvasLayerRef = useRef<L.LayerGroup | null>(null);
  const activeBeaconLayerRef = useRef<L.LayerGroup | null>(null);
  const skywaveLayerRef = useRef<L.LayerGroup | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);

  // Default to 'cyber' or user preference
  const [tileMode, setTileMode] = useState<MapTileMode>('cyber');
  const [activeRadarPing, setActiveRadarPing] = useState<ClickRadarPing | null>(null);
  const [fanOutCluster, setFanOutCluster] = useState<FanOutStationCluster | null>(null);

  // 100% Free & No API Key Required Tile Providers with accurate subdomains
  const TILE_PROVIDERS: Record<
    MapTileMode,
    {
      url: string;
      subdomains: string[];
      maxZoom: number;
      label: string;
      shortLabel: string;
      icon: string;
      description: string;
    }
  > = useMemo(
    () => ({
      cyber: {
        url: isLightMode
          ? 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png'
          : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
        subdomains: ['a', 'b', 'c', 'd'],
        maxZoom: 19,
        label: 'Cyber Matrix',
        shortLabel: 'Cyber',
        icon: 'radar',
        description: 'High-contrast nocturnal vector cartography (Free · No Key)',
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        subdomains: [],
        maxZoom: 18,
        label: 'Natural Satellite',
        shortLabel: 'Natural',
        icon: 'public',
        description: 'True photorealistic natural satellite imagery (Free · No Key)',
      },
      topo: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        subdomains: [],
        maxZoom: 18,
        label: 'Natural Topo',
        shortLabel: 'Topo',
        icon: 'terrain',
        description: 'Crisp terrain elevation contours and mountain ranges (Free · No Key)',
      },
    }),
    [isLightMode]
  );

  // Accent color hex based on active skin
  const getSkinColor = useCallback(() => {
    switch (skinTheme) {
      case 'emerald':
        return '#4edea3';
      case 'cyan':
        return '#38bdf8';
      case 'magenta':
        return '#f43f5e';
      case 'solar':
        return '#fb923c';
      case 'amber':
      default:
        return '#ffc174';
    }
  }, [skinTheme]);

  const tuneHandlerRef = useRef<(lat: number, lng: number, directPlace?: RadioGardenPlace) => void>(() => {});

  // Handle tuning into a place / coordinates
  const handleMapPointTune = useCallback(
    async (lat: number, lng: number, directPlace?: RadioGardenPlace) => {
      // Notify parent to close any open header modals / menus
      if (onMapClick) {
        onMapClick();
      }

      // Find direct place or nearest among all 12,845 places
      let targetPlace: RadioGardenPlace | undefined = directPlace;
      let targetLat = lat;
      let targetLng = lng;
      let minDistance = 0;

      if (!targetPlace && allPlaces.length > 0) {
        let closestDist = Infinity;
        let closestPlace = allPlaces[0];

        // Search nearest place with bounding box pre-filter
        for (let i = 0; i < allPlaces.length; i++) {
          const p = allPlaces[i];
          const pLat = p.geo[1];
          const pLng = p.geo[0];
          if (Math.abs(pLat - lat) < 10 && Math.abs(pLng - lng) < 10) {
            const dist = haversineDistanceKm(lat, lng, pLat, pLng);
            if (dist < closestDist) {
              closestDist = dist;
              closestPlace = p;
            }
          }
        }

        if (closestDist === Infinity) {
          for (let i = 0; i < allPlaces.length; i++) {
            const p = allPlaces[i];
            const dist = haversineDistanceKm(lat, lng, p.geo[1], p.geo[0]);
            if (dist < closestDist) {
              closestDist = dist;
              closestPlace = p;
            }
          }
        }

        targetPlace = closestPlace;
        targetLat = targetPlace.geo[1];
        targetLng = targetPlace.geo[0];
        minDistance = closestDist;
      } else if (targetPlace) {
        targetLat = targetPlace.geo[1];
        targetLng = targetPlace.geo[0];
        minDistance = haversineDistanceKm(lat, lng, targetLat, targetLng);
      }

      if (!targetPlace) return;

      const pingId = Date.now();
      setActiveRadarPing({
        id: pingId,
        lat,
        lng,
        targetLat,
        targetLng,
        placeTitle: targetPlace.title,
        distanceKm: minDistance,
      });

      // Track click-to-tune analytics
      analytics.trackMapInteraction('click_radar', {
        lat,
        lng,
        targetLat,
        targetLng,
        placeTitle: targetPlace.title,
        distanceKm: minDistance,
      });

      // Auto-hide ping HUD toast after 4s
      setTimeout(() => {
        setActiveRadarPing((current) => (current?.id === pingId ? null : current));
      }, 4000);

      // Check if place has matching station in current pool
      const existing =
        allStations.find((s) => s.placeId === targetPlace?.id || s.city.toLowerCase() === targetPlace?.title.toLowerCase()) ||
        stations.find((s) => s.city.toLowerCase() === targetPlace?.title.toLowerCase());

      if (existing) {
        onSelectStation(existing);
      } else {
        // Immediate play: synthesize station object right away so audio plays instantly
        const freq = 88.0 + ((Math.abs(Math.round(targetLng * 10)) % 180) / 10);
        const instantStation: Station = {
          id: `place_${targetPlace.id}`,
          title: `${targetPlace.title} FM`,
          city: targetPlace.title,
          country: targetPlace.country,
          placeId: targetPlace.id,
          region: radioGardenService.inferRegion(targetPlace.country),
          geo: targetPlace.geo,
          coordinates: {
            lat: targetLat,
            lng: targetLng,
            display: `${targetPlace.title} • ${Math.abs(targetLat).toFixed(2)}° ${targetLat >= 0 ? 'N' : 'S'}, ${Math.abs(targetLng).toFixed(2)}° ${targetLng >= 0 ? 'E' : 'W'}`,
          },
          mapPosition: { x: 50, y: 50 },
          frequency: Math.round(freq * 10) / 10,
          frequencyDisplay: `${freq.toFixed(1)} MHz`,
          callsign: `${targetPlace.title} FM`,
          track: `${targetPlace.title} Airwaves`,
          streamUrl: `/api/radio-garden/stream/place_${targetPlace.id}`,
          directStreamUrl: '',
          accentColor: 'primary',
          bitrate: '128-320 kbps MP3/AAC',
          source: 'radio.garden',
        };
        onSelectStation(instantStation);
      }

      // Open Channel Navigator Drawer with loading indicator
      setFanOutCluster({
        place: targetPlace,
        stations: existing ? [existing] : [],
        lat: targetLat,
        lng: targetLng,
        isLoading: true,
      });

      // Fetch all live channels for this place
      try {
        const fetched = await radioGardenService.fetchChannelsForPlace(targetPlace);
        if (fetched.length > 0) {
          onSelectStation(fetched[0]);
          setFanOutCluster({
            place: targetPlace,
            stations: fetched,
            lat: targetLat,
            lng: targetLng,
            isLoading: false,
          });
        } else {
          setFanOutCluster((prev) => (prev ? { ...prev, isLoading: false } : null));
        }
      } catch {
        setFanOutCluster((prev) => (prev ? { ...prev, isLoading: false } : null));
      }
    },
    [allPlaces, allStations, stations, onSelectStation, onMapClick]
  );

  useEffect(() => {
    tuneHandlerRef.current = handleMapPointTune;
  }, [handleMapPointTune]);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const initialLat = activeStation.coordinates?.lat ?? 25;
    const initialLng = activeStation.coordinates?.lng ?? 0;

    const map = L.map(mapContainerRef.current, {
      center: [initialLat, initialLng],
      zoom: 3,
      minZoom: 2,
      maxZoom: 18,
      zoomControl: false,
      attributionControl: false,
      worldCopyJump: true,
      preferCanvas: true,
    });

    canvasRendererRef.current = L.canvas({ padding: 0.5 });

    // Initial Tile Layer
    const provider = TILE_PROVIDERS[tileMode];
    const tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains.length > 0 ? provider.subdomains : 'abc',
      noWrap: false,
      crossOrigin: true,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    // High performance Layer Groups
    placesCanvasLayerRef.current = L.layerGroup().addTo(map);
    activeBeaconLayerRef.current = L.layerGroup().addTo(map);
    skywaveLayerRef.current = L.layerGroup().addTo(map);

    // Map click: tune nearest place and close any open modals
    map.on('click', (e: L.LeafletMouseEvent) => {
      tuneHandlerRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer when tileMode or theme changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const provider = TILE_PROVIDERS[tileMode];

    if (tileLayerRef.current) {
      mapInstanceRef.current.removeLayer(tileLayerRef.current);
    }

    const newTileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains.length > 0 ? provider.subdomains : 'abc',
      noWrap: false,
      crossOrigin: true,
    }).addTo(mapInstanceRef.current);

    tileLayerRef.current = newTileLayer;
  }, [tileMode, isLightMode, TILE_PROVIDERS]);

  // RENDER ALL 12,845 RADIO GARDEN PLACES (Every single transmitter worldwide!)
  useEffect(() => {
    if (!mapInstanceRef.current || !placesCanvasLayerRef.current || !canvasRendererRef.current) return;
    placesCanvasLayerRef.current.clearLayers();

    if (allPlaces.length === 0) return;

    const renderer = canvasRendererRef.current;
    const skinColor = getSkinColor();

    allPlaces.forEach((place) => {
      const pLat = place.geo[1];
      const pLng = place.geo[0];
      const count = place.stationCount || 1;

      // Radius scales gracefully with channel density
      let radius = 2.5;
      let opacity = 0.55;
      let weight = 0.8;
      let fillOpacity = 0.45;

      if (count >= 15) {
        radius = 6.0;
        opacity = 0.95;
        weight = 1.6;
        fillOpacity = 0.85;
      } else if (count >= 5) {
        radius = 4.2;
        opacity = 0.8;
        weight = 1.2;
        fillOpacity = 0.65;
      } else if (count >= 2) {
        radius = 3.2;
        opacity = 0.65;
        weight = 1.0;
        fillOpacity = 0.5;
      }

      const circleMarker = L.circleMarker([pLat, pLng], {
        renderer,
        radius,
        color: skinColor,
        weight,
        opacity,
        fillColor: skinColor,
        fillOpacity,
      });

      // Clean, rich hover tooltip
      circleMarker.bindTooltip(
        `<div style="font-family: monospace; font-size: 11px; padding: 3px 6px; line-height: 1.3;">
          <strong style="color: #ffffff;">${place.title}</strong>, ${place.country}<br/>
          <span style="color: ${skinColor}; font-weight: 600;">📡 ${count} channel${count > 1 ? 's' : ''} live</span>
          <span style="opacity: 0.5; font-size: 9px; display: block; margin-top: 1px;">Click to tune & browse all</span>
        </div>`,
        {
          direction: 'top',
          offset: [0, -6],
          className: 'custom-leaflet-tooltip',
          opacity: 0.96,
        }
      );

      // Marker click: tune and open Channel Navigator!
      circleMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        tuneHandlerRef.current(pLat, pLng, place);
      });

      placesCanvasLayerRef.current?.addLayer(circleMarker);
    });
  }, [allPlaces, getSkinColor]);

  // REDRAW ACTIVE TRANSMITTER BEACON & SKYWAVE ARC
  useEffect(() => {
    if (!mapInstanceRef.current || !activeBeaconLayerRef.current) return;
    activeBeaconLayerRef.current.clearLayers();

    const skinColor = getSkinColor();
    const lat = activeStation.coordinates?.lat ?? 25;
    const lng = activeStation.coordinates?.lng ?? 0;

    // Glowing pulsing active beacon
    const activeOuterRing = L.circleMarker([lat, lng], {
      radius: 14,
      color: skinColor,
      weight: 1.8,
      opacity: 0.9,
      fillColor: skinColor,
      fillOpacity: 0.2,
      className: 'active-beacon-pulse',
    });

    const activeInnerDot = L.circleMarker([lat, lng], {
      radius: 5,
      color: '#ffffff',
      weight: 2,
      opacity: 1,
      fillColor: skinColor,
      fillOpacity: 1,
    });

    activeBeaconLayerRef.current.addLayer(activeOuterRing);
    activeBeaconLayerRef.current.addLayer(activeInnerDot);

    // Subtle skywave geodesic carrier wave connecting to Tokyo prime receiver
    if (skywaveLayerRef.current) {
      skywaveLayerRef.current.clearLayers();
      const receiverLat = 35.68;
      const receiverLng = 139.69;

      // Arc calculation
      const midLat = (lat + receiverLat) / 2 + 12;
      const midLng = (lng + receiverLng) / 2;

      const curvePoints: [number, number][] = [
        [lat, lng],
        [midLat, midLng],
        [receiverLat, receiverLng],
      ];

      const skywaveLine = L.polyline(curvePoints, {
        color: skinColor,
        weight: 1.2,
        opacity: isPlaying ? 0.45 : 0.2,
        dashArray: '4, 8',
      });

      skywaveLayerRef.current.addLayer(skywaveLine);
    }
  }, [activeStation, isPlaying, getSkinColor]);

  // Map Controls
  const handleFocusStation = () => {
    if (!mapInstanceRef.current) return;
    const lat = activeStation.coordinates?.lat ?? 20;
    const lng = activeStation.coordinates?.lng ?? 0;
    mapInstanceRef.current.flyTo([lat, lng], Math.max(6, mapInstanceRef.current.getZoom()), {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  };

  const handleResetWorldView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([20, 0], 2.5, { duration: 1.0 });
  };

  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Close drawer on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFanOutCluster(null);
        setActiveRadarPing(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="relative flex-1 w-full h-full z-10 overflow-hidden select-none">
      {/* 1. Leaflet Interactive Map Viewport */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 cursor-crosshair active:cursor-grabbing outline-none"
      />

      {/* 2. RADICAL MAP SCENE SWITCHER: 1-Click Cyber vs Natural Satellite vs Topo (100% Free · No API Key) */}
      <div className="absolute top-3.5 left-4 sm:top-5 sm:left-6 z-20 flex items-center gap-1 p-1 rounded-2xl border shadow-2xl backdrop-blur-2xl bg-[#080b11]/85 border-white/15 text-xs font-mono">
        {(['cyber', 'satellite', 'topo'] as MapTileMode[]).map((mode) => {
          const isSelected = tileMode === mode;
          const prov = TILE_PROVIDERS[mode];
          return (
            <button
              key={mode}
              onClick={() => {
                setTileMode(mode);
                analytics.trackMapInteraction('tile_switch', { tileMode: mode, label: prov.label });
              }}
              title={`${prov.label} — ${prov.description}`}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all duration-200 active:scale-95 ${
                isSelected
                  ? 'bg-white/20 text-white shadow-md font-semibold'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              }`}
            >
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ color: isSelected ? getSkinColor() : undefined }}
              >
                {prov.icon}
              </span>
              <span>{prov.shortLabel}</span>
            </button>
          );
        })}

        <div className="w-[1px] h-4 bg-white/15 mx-1 hidden sm:block" />

        {/* Global Radio Node Counter */}
        <div className="hidden sm:flex items-center gap-1 px-2 text-[10px] text-white/50 tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getSkinColor() }} />
          <span>12,845 HUBS LIVE</span>
        </div>
      </div>

      {/* 3. Top Radar Feedback Toast */}
      {activeRadarPing && (
        <div className="absolute top-16 left-4 sm:left-6 z-20 flex items-center gap-2.5 px-3.5 py-2 rounded-2xl border shadow-2xl backdrop-blur-2xl animate-in fade-in slide-in-from-top-2 duration-300 bg-[#080b11]/92 border-white/20 text-white text-xs font-mono pointer-events-none">
          <span className="w-2.5 h-2.5 rounded-full animate-ping" style={{ backgroundColor: getSkinColor() }} />
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5 font-semibold">
              <span className="material-symbols-outlined text-[14px]" style={{ color: getSkinColor() }}>
                radar
              </span>
              <span>TUNED: {activeRadarPing.placeTitle}</span>
            </div>
            <span className="text-[10px] opacity-70">
              Broadcast locked • {activeRadarPing.distanceKm} km from scan point
            </span>
          </div>
        </div>
      )}

      {/* 4. SUPER CHANNEL NAVIGATOR (Non-overlapping Side Drawer) */}
      {fanOutCluster && (
        <div className="absolute top-16 sm:top-20 left-4 sm:left-6 bottom-24 sm:bottom-28 z-30 w-[88vw] max-w-sm rounded-3xl border shadow-2xl backdrop-blur-2xl bg-[#090d16]/95 border-white/15 text-[#e2e6f0] p-4 font-mono flex flex-col animate-in fade-in slide-in-from-left-4 duration-200">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 flex-shrink-0">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="material-symbols-outlined text-[20px]" style={{ color: getSkinColor() }}>
                hub
              </span>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-white truncate">
                    {fanOutCluster.place.title}
                  </span>
                  <span className="text-[10px] opacity-60">({fanOutCluster.place.country})</span>
                </div>
                <span className="text-[10px] opacity-70">
                  {fanOutCluster.isLoading
                    ? 'Scanning global carrier frequencies...'
                    : `${fanOutCluster.stations.length} channel${fanOutCluster.stations.length > 1 ? 's' : ''} on airwaves`}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => handleFocusStation()}
                title="Focus Location on Globe"
                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">my_location</span>
              </button>
              <button
                onClick={() => setFanOutCluster(null)}
                title="Close Channel Navigator (Esc)"
                className="p-1.5 rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          {/* Scrollable Channels List */}
          <div className="flex-1 overflow-y-auto flex flex-col gap-2 pr-1 scrollbar-thin scrollbar-thumb-white/20">
            {fanOutCluster.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-xs opacity-75">
                <span className="material-symbols-outlined text-[22px] animate-spin" style={{ color: getSkinColor() }}>
                  progress_activity
                </span>
                <span>Locking broadcast signal...</span>
              </div>
            ) : fanOutCluster.stations.length === 0 ? (
              <div className="text-center py-8 text-xs opacity-60">
                No active audio carriers registered for this coordinate.
              </div>
            ) : (
              fanOutCluster.stations.map((st) => {
                const isSelected = st.id === activeStation.id;
                return (
                  <button
                    key={st.id}
                    onClick={() => {
                      onSelectStation(st);
                      analytics.trackStationTune(st, 'fan_out');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-2xl border text-left transition-all active:scale-[0.98] ${
                      isSelected
                        ? 'bg-white/15 border-white/30 text-white shadow-lg'
                        : 'bg-white/[0.04] border-white/5 hover:bg-white/[0.09] text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${isSelected && isPlaying ? 'animate-ping' : ''}`}
                        style={{ backgroundColor: isSelected ? getSkinColor() : 'rgba(255,255,255,0.4)' }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-xs truncate text-white">{st.title}</span>
                        <div className="flex items-center gap-2 text-[10px] opacity-70">
                          <span style={{ color: getSkinColor() }}>{st.frequencyDisplay}</span>
                          <span>·</span>
                          <span className="truncate">{st.bitrate || '128k MP3'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0 pl-2">
                      {isSelected && isPlaying && (
                        <span className="material-symbols-outlined text-[17px] animate-pulse" style={{ color: getSkinColor() }}>
                          equalizer
                        </span>
                      )}
                      <span
                        className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium ${
                          isSelected ? 'bg-white/20 text-white font-semibold' : 'bg-white/5 opacity-75'
                        }`}
                      >
                        {isSelected ? 'Tuned' : 'Listen'}
                      </span>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 5. Minimal Non-Overlapping Globe Navigation Toolbar (Docked Bottom-Right) */}
      <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-6 z-20 flex flex-col items-center gap-1.5 p-1 rounded-2xl border shadow-2xl backdrop-blur-2xl bg-[#080b11]/85 border-white/15 text-[#e2e6f0]">
        {/* Focus Active Station */}
        <button
          onClick={handleFocusStation}
          title="Fly to Playing Station"
          className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 text-white/80 hover:text-white"
        >
          <span className="material-symbols-outlined text-[16px]" style={{ color: getSkinColor() }}>
            my_location
          </span>
        </button>

        {/* Reset World Globe */}
        <button
          onClick={handleResetWorldView}
          title="Reset World Globe"
          className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 text-white/80 hover:text-white"
        >
          <span className="material-symbols-outlined text-[16px]">public</span>
        </button>

        <div className="w-4 h-[1px] bg-white/15 my-0.5" />

        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Zoom In (+)"
          className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-sm font-semibold transition-colors active:scale-95 text-white/80 hover:text-white"
        >
          +
        </button>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Zoom Out (-)"
          className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-sm font-semibold transition-colors active:scale-95 text-white/80 hover:text-white"
        >
          -
        </button>
      </div>
    </div>
  );
};
