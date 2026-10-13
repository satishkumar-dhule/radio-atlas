import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  RADIO_GARDEN_STATIONS,
  FEATURED_STATIONS,
  RADIO_GARDEN_ALL_PLACES,
} from './data/stations';
import { Station } from './types/radio';
import { audioEngine, EqPreset } from './services/audioEngine';
import { ambientFx } from './services/ambientFx';
import { generateStationTheme } from './utils/themeFormula';

import { WorldMap } from './components/WorldMap';
import { FloatingPlayerPill } from './components/FloatingPlayerPill';
import { ScreensaverView } from './components/ScreensaverView';
import { QuickSearchModal } from './components/QuickSearchModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { analytics } from './services/analytics';

export default function App() {
  const [allStations] = useState<Station[]>(RADIO_GARDEN_STATIONS);
  const [featuredStations, setFeaturedStations] = useState<Station[]>(FEATURED_STATIONS);

  // Read initial station from URL hash or default
  const getInitialStation = () => {
    try {
      const hash = window.location.hash;
      if (hash.includes('station=')) {
        const id = hash.replace('#station=', '');
        const matched = RADIO_GARDEN_STATIONS.find((s) => s.id === id);
        if (matched) return matched;
      }
    } catch {}
    return FEATURED_STATIONS[0] || RADIO_GARDEN_STATIONS[0];
  };

  const [activeStation, setActiveStation] = useState<Station>(getInitialStation);
  const [currentFrequency, setCurrentFrequency] = useState<number>(activeStation.frequency);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);

  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('radio_atlas_theme') === 'light';
    } catch {
      return false;
    }
  });

  // UNLIMITED PRECISE DYNAMIC HIGH-CONTRAST PALETTE FORMULA PER STATION
  const stationPalette = useMemo(() => {
    const lat = activeStation.coordinates?.lat ?? 0;
    const lng = activeStation.coordinates?.lng ?? 0;
    return generateStationTheme(
      activeStation.id,
      activeStation.city,
      lat,
      lng,
      activeStation.frequency,
      isLightMode
    );
  }, [activeStation, isLightMode]);

  // Streamlined Modals: search, presets, audio, screensaver
  type ActiveModalId = null | 'search' | 'bookmarks' | 'audio_settings' | 'screensaver';
  const [activeModal, setActiveModal] = useState<ActiveModalId>(null);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  const toggleModal = useCallback((id: ActiveModalId) => {
    setActiveModal((prev) => (prev === id ? null : id));
  }, []);

  const closeAllOverlays = useCallback(() => {
    setActiveModal(null);
  }, []);

  // Continuous background playback (radio plays automatically on load and user gesture)
  useEffect(() => {
    const startAudio = () => {
      audioEngine.play(activeStation, currentFrequency).catch(() => {});
    };

    startAudio();

    const unlockAudio = () => {
      startAudio();
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };

    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });

    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  // Global keyboard shortcuts: Space (mute/unmute), Cmd+K (search), Esc (close), Z (zen)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if (e.key === 'Escape') {
        closeAllOverlays();
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleModal('search');
      } else if (e.key === ' ' && !e.repeat) {
        e.preventDefault();
        handleToggleMute();
      } else if (e.key === 'z' || e.key === 'Z') {
        e.preventDefault();
        setIsZenMode((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAllOverlays, toggleModal, isMuted]);

  // Audio DSP & Ambient Soundscape
  const [activeEqPreset, setActiveEqPreset] = useState<EqPreset>('tube');
  const [isRainActive, setIsRainActive] = useState<boolean>(false);
  const [isVinylActive, setIsVinylActive] = useState<boolean>(false);
  const [isCosmicActive, setIsCosmicActive] = useState<boolean>(false);

  // Favorites
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('radio_atlas_favs');
      return saved ? JSON.parse(saved) : [FEATURED_STATIONS[0]?.id || ''];
    } catch {
      return [];
    }
  });

  const toggleFavorite = (stationId: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(stationId)
        ? prev.filter((id) => id !== stationId)
        : [...prev, stationId];
      try {
        localStorage.setItem('radio_atlas_favs', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Change to specific station (always starts playing immediately)
  const handleSelectStation = useCallback(
    (station: Station) => {
      setActiveStation(station);
      setCurrentFrequency(station.frequency);

      try {
        window.history.replaceState(null, '', `#station=${station.id}`);
      } catch {}

      setFeaturedStations((prev) => {
        if (!prev.some((s) => s.id === station.id)) {
          return [station, ...prev.slice(0, 24)];
        }
        return prev;
      });

      // Always play new station
      audioEngine.play(station, station.frequency).catch(() => {});

      setActiveModal(null);
      analytics.trackStationTune(station, 'preset');
    },
    []
  );

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMute(nextMuted);
    analytics.trackPlayback(nextMuted ? 'pause' : 'play', {
      station_id: activeStation.id,
      title: activeStation.title,
    });
  };

  const handleVolumeChange = (vol: number) => {
    setVolume(vol);
    if (isMuted && vol > 0) {
      setIsMuted(false);
      audioEngine.setMute(false);
    }
    audioEngine.setVolume(vol);
  };

  const handleScrubFrequency = (freq: number) => {
    setCurrentFrequency(freq);
    audioEngine.tuneFrequency(freq, activeStation.frequency, activeStation);
  };

  const handleDrift = () => {
    const pool = allStations.length > 0 ? allStations : featuredStations;
    const available = pool.filter((s) => s.id !== activeStation.id);
    if (available.length === 0) return;
    const randomStation = available[Math.floor(Math.random() * available.length)];
    handleSelectStation(randomStation);
  };

  const handleSelectEqPreset = (preset: EqPreset) => {
    setActiveEqPreset(preset);
    audioEngine.setEqPreset(preset);
    analytics.trackDspPreset(preset, false);
  };

  const handleToggleRain = () => {
    const ctx = audioEngine.getAudioContext() || undefined;
    const active = ambientFx.toggleRain(ctx);
    setIsRainActive(active);
  };

  const handleToggleVinyl = () => {
    const ctx = audioEngine.getAudioContext() || undefined;
    const active = ambientFx.toggleVinyl(ctx);
    setIsVinylActive(active);
  };

  const handleToggleCosmic = () => {
    const ctx = audioEngine.getAudioContext() || undefined;
    const active = ambientFx.toggleCosmic(ctx);
    setIsCosmicActive(active);
  };

  const toggleTheme = () => {
    const next = !isLightMode;
    setIsLightMode(next);
    try {
      localStorage.setItem('radio_atlas_theme', next ? 'light' : 'dark');
    } catch {}
    if (next) {
      document.documentElement.classList.remove('dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  };

  // Sleep Timer
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);

  useEffect(() => {
    if (!sleepMinutesLeft) return;
    const interval = setInterval(() => {
      setSleepMinutesLeft((prev) => {
        if (!prev || prev <= 1) {
          setIsMuted(true);
          audioEngine.setMute(true);
          return null;
        }
        return prev - 1;
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [sleepMinutesLeft]);

  return (
    <div
      className={`relative w-screen h-screen overflow-hidden flex flex-col select-none transition-colors duration-500 ${
        isLightMode ? 'bg-[#f4f6fa] text-slate-800' : 'bg-[#080b11] text-[#e2e6f0]'
      }`}
      style={{
        backgroundColor: isLightMode ? '#f8fafc' : '#080b11',
      }}
    >
      {/* 1. STATE-OF-THE-ART MINIMALIST FLOATING HEADER (Dynamically Contrasted) */}
      {!isZenMode && (
        <header className="absolute top-0 left-0 right-0 z-30 px-5 sm:px-8 py-4 flex items-center justify-between pointer-events-none">
          {/* Brand & Active Station */}
          <div
            className="flex items-center gap-3.5 pointer-events-auto backdrop-blur-xl border px-3.5 py-1.5 rounded-xl shadow-lg transition-all duration-500"
            style={{
              backgroundColor: isLightMode ? 'rgba(255,255,255,0.92)' : 'rgba(9, 13, 22, 0.88)',
              borderColor: stationPalette.borderColor,
              boxShadow: `0 4px 20px rgba(0,0,0,0.5), 0 0 16px ${stationPalette.accentMuted}`,
            }}
          >
            <span
              className="w-2.5 h-2.5 rounded-full transition-transform duration-300 animate-pulse"
              style={{
                backgroundColor: isMuted ? 'rgba(255,255,255,0.4)' : stationPalette.accentHex,
                boxShadow: isMuted ? 'none' : `0 0 10px ${stationPalette.accentHex}`,
              }}
            />
            <span
              className="text-xs sm:text-sm font-semibold tracking-wider uppercase"
              style={{ color: stationPalette.textContrast }}
            >
              Radio Atlas
            </span>
            <span
              className="opacity-30 font-mono text-xs hidden sm:inline"
              style={{ color: stationPalette.textContrast }}
            >
              /
            </span>
            <span
              className="text-xs font-mono font-semibold hidden sm:inline truncate max-w-[220px]"
              style={{ color: stationPalette.accentHex }}
            >
              {activeStation.city}, {activeStation.country}
            </span>
          </div>

          {/* Quick Actions */}
          <div
            className="flex items-center gap-2 pointer-events-auto backdrop-blur-xl border p-1 rounded-xl shadow-lg text-xs font-mono transition-all duration-500"
            style={{
              backgroundColor: isLightMode ? 'rgba(255,255,255,0.95)' : 'rgba(9, 13, 22, 0.90)',
              borderColor: stationPalette.borderColor,
              color: stationPalette.textContrast,
            }}
          >
            {/* Search */}
            <button
              onClick={() => toggleModal('search')}
              title="Search worldwide stations (⌘K)"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: stationPalette.textContrast }}
            >
              <span className="material-symbols-outlined text-[15px]">search</span>
              <span className="hidden md:inline">Search</span>
              <kbd
                className="hidden lg:inline text-[9px] px-1 py-0.5 rounded border border-current opacity-60"
              >
                ⌘K
              </kbd>
            </button>

            {/* Drift / Random */}
            <button
              onClick={handleDrift}
              title="Drift to random airwave"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors group"
              style={{ color: stationPalette.textContrast }}
            >
              <span className="material-symbols-outlined text-[15px] group-hover:rotate-90 transition-transform">
                shuffle
              </span>
              <span className="hidden sm:inline">Drift</span>
            </button>

            {/* Presets */}
            <button
              onClick={() => toggleModal('bookmarks')}
              title="Saved Presets"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: stationPalette.textContrast }}
            >
              <span
                className="material-symbols-outlined text-[15px]"
                style={{ color: stationPalette.accentHex }}
              >
                star
              </span>
              <span className="hidden sm:inline">Presets</span>
              {favorites.length > 0 && (
                <span className="text-[10px] opacity-70">({favorites.length})</span>
              )}
            </button>

            {/* Screensaver with Analogue Clocks */}
            <button
              onClick={() => toggleModal('screensaver')}
              title="Ambient Screensaver View with Analogue Clocks"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: stationPalette.textContrast }}
            >
              <span className="material-symbols-outlined text-[15px]">schedule</span>
              <span className="hidden md:inline">Clock</span>
            </button>

            {/* Dark / Light Toggle */}
            <button
              onClick={toggleTheme}
              title="Toggle theme"
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: stationPalette.textContrast }}
            >
              <span className="material-symbols-outlined text-[15px]">
                {isLightMode ? 'dark_mode' : 'light_mode'}
              </span>
            </button>

            {/* Zen Mode */}
            <button
              onClick={() => setIsZenMode(true)}
              title="Enter Zen Mode (Z)"
              className="p-1.5 rounded-lg hover:bg-white/10 text-white/80 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined text-[15px]">fullscreen</span>
            </button>
          </div>
        </header>
      )}

      {/* Zen Mode Exit Button */}
      {isZenMode && (
        <div className="absolute top-4 right-6 z-40">
          <button
            onClick={() => setIsZenMode(false)}
            title="Exit Zen Mode (Z / Esc)"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/60 hover:bg-black/80 border border-white/10 text-xs font-mono text-white transition-all backdrop-blur-md"
          >
            <span className="material-symbols-outlined text-[15px]">fullscreen_exit</span>
            <span>Exit Zen</span>
          </button>
        </div>
      )}

      {/* 2. FULLSCREEN INTERACTIVE CARTOGRAPHY MAP (Animated with live audio beats) */}
      <WorldMap
        stations={featuredStations}
        allStations={allStations}
        allPlaces={RADIO_GARDEN_ALL_PLACES}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        isPlaying={!isMuted}
        isLightMode={isLightMode}
        palette={stationPalette}
        onMapClick={closeAllOverlays}
      />

      {/* 3. DOCKED BOTTOM FLOATING PLAYER (Continuous Play, Only Mute/Unmute & Volume) */}
      {!isZenMode && (
        <FloatingPlayerPill
          activeStation={activeStation}
          currentFrequency={currentFrequency}
          isMuted={isMuted}
          volume={volume}
          onToggleMute={handleToggleMute}
          onVolumeChange={handleVolumeChange}
          onScrubFrequency={handleScrubFrequency}
          stations={featuredStations}
          allStations={allStations}
          favorites={favorites}
          onSelectStation={handleSelectStation}
          isBookmarked={favorites.includes(activeStation.id)}
          onToggleBookmark={() => toggleFavorite(activeStation.id)}
          isRainActive={isRainActive}
          isVinylActive={isVinylActive}
          onToggleRain={handleToggleRain}
          onToggleVinyl={handleToggleVinyl}
          sleepMinutesLeft={sleepMinutesLeft}
          onSetSleepTimer={(mins) => setSleepMinutesLeft(mins)}
          isLightMode={isLightMode}
          onOpenAudioSettings={() => toggleModal('audio_settings')}
          onOpenBookmarks={() => toggleModal('bookmarks')}
          palette={stationPalette}
        />
      )}

      {/* 4. SCREENSAVER VIEW WITH DUAL ANALOGUE CLOCKS & APPLE WATCH ACTIVITY BADGES */}
      <ScreensaverView
        isOpen={activeModal === 'screensaver'}
        onClose={() => setActiveModal(null)}
        activeStation={activeStation}
        stations={featuredStations}
        onSelectStation={handleSelectStation}
        isLightMode={isLightMode}
        palette={stationPalette}
      />

      {/* Quick Search Palette (Cmd+K) */}
      <QuickSearchModal
        isOpen={activeModal === 'search'}
        onClose={() => setActiveModal(null)}
        stations={allStations}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* Presets / Bookmarks Drawer */}
      <BookmarksDrawer
        isOpen={activeModal === 'bookmarks'}
        onClose={() => setActiveModal(null)}
        stations={allStations}
        favorites={favorites}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        onToggleFavorite={toggleFavorite}
      />

      {/* Acoustic Hardware Equalizer & Sleep Timer */}
      <AudioSettingsModal
        isOpen={activeModal === 'audio_settings'}
        onClose={() => setActiveModal(null)}
        activeEqPreset={activeEqPreset}
        onSelectEqPreset={handleSelectEqPreset}
        isRainActive={isRainActive}
        isVinylActive={isVinylActive}
        isCosmicActive={isCosmicActive}
        onToggleRain={handleToggleRain}
        onToggleVinyl={handleToggleVinyl}
        onToggleCosmic={handleToggleCosmic}
        sleepMinutesLeft={sleepMinutesLeft}
        onSetSleepTimer={(mins) => setSleepMinutesLeft(mins)}
      />
    </div>
  );
}
