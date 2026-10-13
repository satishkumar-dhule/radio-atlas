import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Station, RadioGardenPlace } from '../types/radio';
import { radioGardenService } from '../services/radioGardenService';
import { audioEngine } from '../services/audioEngine';
import { SkinThemeId } from '../types/wallpaper';
import { analytics } from '../services/analytics';

import { StationDynamicPalette } from '../utils/themeFormula';

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
  palette?: StationDynamicPalette;
  onMapClick?: () => void;
}

interface FanOutStationCluster {
  place: RadioGardenPlace;
  stations: Station[];
  lat: number;
  lng: number;
  isLoading: boolean;
}

// Haversine distance in km
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
  palette,
  onMapClick,
}) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const placesCanvasLayerRef = useRef<L.LayerGroup | null>(null);
  const activeBeaconLayerRef = useRef<L.LayerGroup | null>(null);
  const skywaveLayerRef = useRef<L.LayerGroup | null>(null);
  const canvasRendererRef = useRef<L.Canvas | null>(null);

  const [tileMode, setTileMode] = useState<MapTileMode>('cyber');
  const [fanOutCluster, setFanOutCluster] = useState<FanOutStationCluster | null>(null);

  // 100% Free & No API Key Required Tile Providers
  const TILE_PROVIDERS: Record<
    MapTileMode,
    {
      url: string;
      subdomains: string[];
      maxZoom: number;
      label: string;
    }
  > = useMemo(
    () => ({
      cyber: {
        url: isLightMode
          ? 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}'
          : 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}',
        subdomains: [],
        maxZoom: 16,
        label: 'Cyber Vector',
      },
      satellite: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        subdomains: [],
        maxZoom: 18,
        label: 'Satellite',
      },
      topo: {
        url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
        subdomains: [],
        maxZoom: 18,
        label: 'Topography',
      },
    }),
    [isLightMode]
  );

  const getSkinColor = useCallback(() => {
    if (palette?.accentHex) {
      return palette.accentHex;
    }
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
  }, [skinTheme, palette]);

  const tuneHandlerRef = useRef<(lat: number, lng: number, directPlace?: RadioGardenPlace) => void>(() => {});

  const handleMapPointTune = useCallback(
    async (lat: number, lng: number, directPlace?: RadioGardenPlace) => {
      if (onMapClick) {
        onMapClick();
      }

      let targetPlace: RadioGardenPlace | undefined = directPlace;
      let targetLat = lat;
      let targetLng = lng;
      let minDistance = 0;

      if (!targetPlace && allPlaces.length > 0) {
        let closestDist = Infinity;
        let closestPlace = allPlaces[0];

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

      analytics.trackMapInteraction('click_radar', {
        lat,
        lng,
        targetLat,
        targetLng,
        placeTitle: targetPlace.title,
        distanceKm: minDistance,
      });

      const existing =
        allStations.find((s) => s.placeId === targetPlace?.id || s.city.toLowerCase() === targetPlace?.title.toLowerCase()) ||
        stations.find((s) => s.city.toLowerCase() === targetPlace?.title.toLowerCase());

      if (existing) {
        onSelectStation(existing);
      } else {
        const freq = 88.0 + ((Math.abs(Math.round(targetLng * 10)) % 180) / 10);
        const instantStation: Station = {
          id: `place_${targetPlace.id}`,
          title: `${targetPlace.title} Radio`,
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

      setFanOutCluster({
        place: targetPlace,
        stations: existing ? [existing] : [],
        lat: targetLat,
        lng: targetLng,
        isLoading: true,
      });

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

  // Leaflet Map Initialization
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

    const provider = TILE_PROVIDERS[tileMode];
    const tileLayer = L.tileLayer(provider.url, {
      maxZoom: provider.maxZoom,
      subdomains: provider.subdomains.length > 0 ? provider.subdomains : 'abc',
      noWrap: false,
      crossOrigin: true,
    }).addTo(map);

    tileLayerRef.current = tileLayer;

    placesCanvasLayerRef.current = L.layerGroup().addTo(map);
    activeBeaconLayerRef.current = L.layerGroup().addTo(map);
    skywaveLayerRef.current = L.layerGroup().addTo(map);

    map.on('click', (e: L.LeafletMouseEvent) => {
      tuneHandlerRef.current(e.latlng.lat, e.latlng.lng);
    });

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Layer
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

  // Render all places onto Canvas
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

      let radius = 2.4;
      let opacity = 0.5;
      let weight = 0.8;
      let fillOpacity = 0.4;

      if (count >= 15) {
        radius = 5.5;
        opacity = 0.9;
        weight = 1.4;
        fillOpacity = 0.8;
      } else if (count >= 5) {
        radius = 4.0;
        opacity = 0.75;
        weight = 1.1;
        fillOpacity = 0.6;
      } else if (count >= 2) {
        radius = 3.0;
        opacity = 0.6;
        weight = 0.9;
        fillOpacity = 0.45;
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

      circleMarker.bindTooltip(
        `<div style="font-family: inherit; font-size: 11px; padding: 2px 4px;">
          <div style="font-weight: 600; color: #fff;">${place.title}, ${place.country}</div>
          <div style="color: ${skinColor}; font-size: 10px;">${count} station${count > 1 ? 's' : ''}</div>
        </div>`,
        {
          direction: 'top',
          offset: [0, -4],
          className: 'custom-leaflet-tooltip',
          opacity: 0.95,
        }
      );

      circleMarker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        tuneHandlerRef.current(pLat, pLng, place);
      });

      placesCanvasLayerRef.current?.addLayer(circleMarker);
    });
  }, [allPlaces, getSkinColor]);

  // Auto-focus camera on tuned station smoothly
  useEffect(() => {
    if (!mapInstanceRef.current || !activeStation.coordinates) return;
    const lat = activeStation.coordinates.lat;
    const lng = activeStation.coordinates.lng;

    // Smoothly fly to the newly tuned station
    mapInstanceRef.current.flyTo([lat, lng], Math.max(5.5, mapInstanceRef.current.getZoom()), {
      duration: 1.2,
      easeLinearity: 0.25,
    });
  }, [activeStation.id]);

  // Real-Time Audio Sound Wave Beats & Radiating Transmission Waves
  useEffect(() => {
    if (!mapInstanceRef.current || !activeBeaconLayerRef.current) return;
    activeBeaconLayerRef.current.clearLayers();

    const skinColor = getSkinColor();
    const lat = activeStation.coordinates?.lat ?? 25;
    const lng = activeStation.coordinates?.lng ?? 0;

    // 1. Dynamic Interactive DivIcon with realistic multi-layer RF transmission antenna and radiating wave propagation
    const transmissionIcon = L.divIcon({
      className: 'transmission-marker-container',
      html: `
        <div id="radio-pulse-root" style="position: relative; width: 120px; height: 120px; transform: translate(-60px, -60px); pointer-events: none;">
          <!-- Radiating RF Wave 1 -->
          <div id="rf-wave-1" class="rf-pulse-1" style="position: absolute; inset: 0; border-radius: 9999px; border: 2px solid ${skinColor}; background: radial-gradient(circle, ${skinColor}35 0%, transparent 70%);"></div>
          <!-- Radiating RF Wave 2 -->
          <div id="rf-wave-2" class="rf-pulse-2" style="position: absolute; inset: 12px; border-radius: 9999px; border: 1.8px solid ${skinColor}; background: radial-gradient(circle, ${skinColor}30 0%, transparent 65%);"></div>
          <!-- Radiating RF Wave 3 -->
          <div id="rf-wave-3" class="rf-pulse-3" style="position: absolute; inset: 24px; border-radius: 9999px; border: 1.5px solid ${skinColor}; background: radial-gradient(circle, ${skinColor}25 0%, transparent 60%);"></div>
          <!-- Radiating RF Wave 4 -->
          <div id="rf-wave-4" class="rf-pulse-4" style="position: absolute; inset: 36px; border-radius: 9999px; border: 1.2px solid ${skinColor};"></div>

          <!-- Crosshair Broadcast Calibrator -->
          <svg width="120" height="120" class="absolute inset-0 pointer-events-none opacity-40">
            <line x1="60" y1="20" x2="60" y2="44" stroke="${skinColor}" stroke-width="1.2" stroke-dasharray="2,3" />
            <line x1="60" y1="76" x2="60" y2="100" stroke="${skinColor}" stroke-width="1.2" stroke-dasharray="2,3" />
            <line x1="20" y1="60" x2="44" y2="60" stroke="${skinColor}" stroke-width="1.2" stroke-dasharray="2,3" />
            <line x1="76" y1="60" x2="100" y2="60" stroke="${skinColor}" stroke-width="1.2" stroke-dasharray="2,3" />
          </svg>

          <!-- Center Glowing Transmitter Tower & Radio Core -->
          <div id="radio-core-elem" class="radio-core" style="position: absolute; inset: 50px; border-radius: 9999px; background: #ffffff; border: 2.5px solid ${skinColor}; box-shadow: 0 0 20px ${skinColor}, 0 0 40px ${skinColor}80; transition: transform 0.05s ease-out;">
            <div style="position: absolute; inset: 3px; border-radius: 9999px; background: ${skinColor};"></div>
          </div>
        </div>
      `,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });

    const transmissionMarker = L.marker([lat, lng], {
      icon: transmissionIcon,
      interactive: false,
      zIndexOffset: 1000,
    });

    activeBeaconLayerRef.current.addLayer(transmissionMarker);

    // 2. Physical RF propagation wave circle on cartography surface
    const baseRadius = 60000;
    const broadcastCircle = L.circle([lat, lng], {
      radius: baseRadius,
      color: skinColor,
      weight: 1.5,
      opacity: 0.6,
      fillColor: skinColor,
      fillOpacity: 0.08,
      interactive: false,
    });

    activeBeaconLayerRef.current.addLayer(broadcastCircle);

    // 3. High-Performance Audio Beat Loop (Modulates waves with sound wave beats)
    let animId: number;
    const tickAudioBeat = () => {
      animId = requestAnimationFrame(tickAudioBeat);
      const energy = audioEngine.getAudioEnergy();
      const beatScale = 1.0 + energy.beat * 0.75;
      const coreScale = 1.0 + energy.bass * 0.6;

      const coreElem = document.getElementById('radio-core-elem');
      if (coreElem) {
        coreElem.style.transform = `scale(${coreScale.toFixed(2)})`;
        coreElem.style.boxShadow = `0 0 ${(14 + energy.bass * 20).toFixed(0)}px ${skinColor}`;
      }

      // Modulate broadcast coverage circle with bass beats
      const dynamicRadius = baseRadius + energy.bass * 45000;
      broadcastCircle.setRadius(dynamicRadius);
      broadcastCircle.setStyle({
        opacity: 0.3 + energy.rms * 0.5,
        fillOpacity: 0.03 + energy.beat * 0.08,
      });
    };

    animId = requestAnimationFrame(tickAudioBeat);

    if (skywaveLayerRef.current) {
      skywaveLayerRef.current.clearLayers();
      const receiverLat = 35.68;
      const receiverLng = 139.69;

      const midLat = (lat + receiverLat) / 2 + 10;
      const midLng = (lng + receiverLng) / 2;

      const curvePoints: [number, number][] = [
        [lat, lng],
        [midLat, midLng],
        [receiverLat, receiverLng],
      ];

      const skywaveLine = L.polyline(curvePoints, {
        color: skinColor,
        weight: 1.2,
        opacity: isPlaying ? 0.4 : 0.15,
        dashArray: '3, 6',
      });

      skywaveLayerRef.current.addLayer(skywaveLine);
    }

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [activeStation, isPlaying, getSkinColor]);

  const handleFocusStation = () => {
    if (!mapInstanceRef.current) return;
    const lat = activeStation.coordinates?.lat ?? 20;
    const lng = activeStation.coordinates?.lng ?? 0;
    mapInstanceRef.current.flyTo([lat, lng], Math.max(6, mapInstanceRef.current.getZoom()), {
      duration: 1.0,
    });
  };

  const handleResetWorldView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo([20, 0], 2.5, { duration: 0.8 });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setFanOutCluster(null);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full z-0 overflow-hidden select-none">
      {/* 1. Map Canvas Viewport */}
      <div
        ref={mapContainerRef}
        className="w-full h-full z-0 cursor-crosshair active:cursor-grabbing outline-none"
      />

      {/* 2. Scene Mode Segmented Control (Minimal, unboxed) */}
      <div className="absolute top-4 left-4 sm:top-6 sm:left-8 z-20 flex items-center gap-1 p-1 rounded-xl border backdrop-blur-2xl text-xs font-mono bg-[#080b11]/80 border-white/10 text-white/80">
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
              className={`px-2.5 py-1 rounded-lg transition-colors capitalize ${
                isSelected
                  ? 'bg-white/20 text-white font-medium'
                  : 'hover:bg-white/10 text-white/70 hover:text-white'
              }`}
            >
              {mode}
            </button>
          );
        })}
      </div>

      {/* 3. Channel Navigator Drawer (Non-overlapping left sheet) */}
      {fanOutCluster && (
        <div className="absolute top-16 sm:top-20 left-4 sm:left-8 bottom-24 sm:bottom-28 z-30 w-[88vw] max-w-sm rounded-2xl border shadow-2xl backdrop-blur-2xl bg-[#090d16]/95 border-white/10 text-[#e2e6f0] p-4 font-mono flex flex-col animate-in fade-in slide-in-from-left-4 duration-200">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3 flex-shrink-0">
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-sm text-white truncate">
                {fanOutCluster.place.title}
              </span>
              <span className="text-[11px] opacity-60">
                {fanOutCluster.place.country} · {fanOutCluster.stations.length} on air
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleFocusStation}
                title="Focus coordinates"
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">my_location</span>
              </button>
              <button
                onClick={() => setFanOutCluster(null)}
                title="Close"
                className="p-1 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition-colors"
              >
                <span className="material-symbols-outlined text-[16px]">close</span>
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 pr-1">
            {fanOutCluster.isLoading ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-xs opacity-70">
                <span className="material-symbols-outlined text-[20px] animate-spin" style={{ color: getSkinColor() }}>
                  progress_activity
                </span>
                <span>Connecting live stream...</span>
              </div>
            ) : fanOutCluster.stations.length === 0 ? (
              <div className="text-center py-8 text-xs opacity-50">
                No active stations found for this location.
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
                    className={`flex items-center justify-between p-2 rounded-xl text-left transition-colors ${
                      isSelected
                        ? 'bg-white/20 text-white font-medium'
                        : 'hover:bg-white/5 text-white/80 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ backgroundColor: isSelected ? getSkinColor() : 'rgba(255,255,255,0.3)' }}
                      />
                      <div className="flex flex-col min-w-0">
                        <span className="text-xs truncate">{st.title}</span>
                        <span className="text-[10px] opacity-60">{st.frequencyDisplay}</span>
                      </div>
                    </div>

                    {isSelected && isPlaying && (
                      <span className="material-symbols-outlined text-[15px]" style={{ color: getSkinColor() }}>
                        equalizer
                      </span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* 4. Docked Navigation Toolbar */}
      <div className="absolute bottom-6 right-4 sm:bottom-8 sm:right-8 z-20 flex flex-col gap-1 p-1 rounded-xl border backdrop-blur-2xl bg-[#080b11]/80 border-white/10 text-white/80">
        <button
          onClick={handleFocusStation}
          title="Focus playing station"
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]" style={{ color: getSkinColor() }}>
            my_location
          </span>
        </button>
        <button
          onClick={handleResetWorldView}
          title="Reset globe view"
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">public</span>
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomIn()}
          title="Zoom in"
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
        </button>
        <button
          onClick={() => mapInstanceRef.current?.zoomOut()}
          title="Zoom out"
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">remove</span>
        </button>
      </div>
    </div>
  );
};
