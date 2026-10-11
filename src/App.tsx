import React, { useState, useEffect, useCallback } from 'react';
import {
  RADIO_GARDEN_STATIONS,
  FEATURED_STATIONS,
  RADIO_GARDEN_PLACES,
  RADIO_GARDEN_ALL_PLACES,
} from './data/stations';
import { Station } from './types/radio';
import { audioEngine, EqPreset } from './services/audioEngine';
import { ambientFx } from './services/ambientFx';
import { geminiDspService, DspMasterProfile } from './services/geminiDspService';
import { WallpaperId, SkinThemeId } from './types/wallpaper';

import { TopBar } from './components/TopBar';
import { WorldMap } from './components/WorldMap';
import { FloatingPlayerPill } from './components/FloatingPlayerPill';
import { WallpaperBackdrop } from './components/WallpaperBackdrop';
import { WallpaperModal } from './components/WallpaperModal';
import { ScreensaverView } from './components/ScreensaverView';
import { DXLogbookModal, DxLogEntry } from './components/DXLogbookModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { OscilloscopeModal } from './components/OscilloscopeModal';
import { StationDirectoryDrawer } from './components/StationDirectoryDrawer';
import { QuickSearchModal } from './components/QuickSearchModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';
import { AnalyticsModal } from './components/AnalyticsModal';
import { analytics } from './services/analytics';
import { getStationAtmosphere } from './utils/stationAtmosphere';

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
    } catch {
      // ignore
    }
    return FEATURED_STATIONS[0] || RADIO_GARDEN_STATIONS[0];
  };

  const [activeStation, setActiveStation] = useState<Station>(getInitialStation);
  const [currentFrequency, setCurrentFrequency] = useState<number>(activeStation.frequency);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);

  // Theme & Wallpaper state
  const [isLightMode, setIsLightMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('radio_atlas_theme') === 'light';
    } catch {
      return false;
    }
  });

  const [currentWallpaper, setCurrentWallpaper] = useState<WallpaperId>(() => {
    try {
      const saved = localStorage.getItem('radio_atlas_wallpaper') as WallpaperId;
      return saved || 'obsidian';
    } catch {
      return 'obsidian';
    }
  });

  const [currentSkin, setCurrentSkin] = useState<SkinThemeId>(() => {
    try {
      const saved = localStorage.getItem('radio_atlas_skin') as SkinThemeId;
      return saved || 'amber';
    } catch {
      return 'amber';
    }
  });

  const handleSelectSkin = (skin: SkinThemeId) => {
    setCurrentSkin(skin);
    try {
      localStorage.setItem('radio_atlas_skin', skin);
    } catch {}
    analytics.trackSkinOrWallpaper(currentWallpaper, skin);
  };

  // Centralized Active Modal & Dock Management (Mutual Exclusive Architecture)
  type ActiveModalId =
    | null
    | 'directory'
    | 'search'
    | 'bookmarks'
    | 'wallpapers'
    | 'logbook'
    | 'audio_settings'
    | 'analytics'
    | 'screensaver'
    | 'oscilloscope';

  const [activeModal, setActiveModal] = useState<ActiveModalId>(null);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  const toggleModal = useCallback((id: ActiveModalId) => {
    setActiveModal((prev) => (prev === id ? null : id));
  }, []);

  const closeAllOverlays = useCallback(() => {
    setActiveModal(null);
  }, []);

  // Close overlays on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeAllOverlays();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeAllOverlays]);

  // DSP & Atmosphere state
  const [activeEqPreset, setActiveEqPreset] = useState<EqPreset>('tube');
  const [isRainActive, setIsRainActive] = useState<boolean>(false);
  const [isVinylActive, setIsVinylActive] = useState<boolean>(false);
  const [isCosmicActive, setIsCosmicActive] = useState<boolean>(false);
  const [isPhotoEnabled, setIsPhotoEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('radio_atlas_photo');
      return saved !== 'false';
    } catch {
      return true;
    }
  });

  const handleTogglePhoto = () => {
    setIsPhotoEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('radio_atlas_photo', String(next));
      } catch {}
      return next;
    });
  };

  // Gemini AI DSP Auto-Master state
  const [isAiDspEnabled, setIsAiDspEnabled] = useState<boolean>(() => geminiDspService.isEnabled());
  const [dspProfile, setDspProfile] = useState<DspMasterProfile | null>(null);
  const [showAiDspToast, setShowAiDspToast] = useState<boolean>(false);

  const handleTriggerAiDsp = useCallback((targetStation?: Station) => {
    const st = targetStation || activeStation;
    geminiDspService.autoMasterStation(st).then((prof) => {
      setDspProfile(prof);
      setActiveEqPreset(prof.eqPreset);
      setShowAiDspToast(true);
      setTimeout(() => setShowAiDspToast(false), 4500);
    });
  }, [activeStation]);

  const handleToggleAiDsp = () => {
    setIsAiDspEnabled((prev) => {
      const next = !prev;
      geminiDspService.setEnabled(next);
      if (next) {
        handleTriggerAiDsp();
      }
      return next;
    });
  };

  // Sleep timer state
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);

  // DX Quick Log feedback state
  const [hasJustLogged, setHasJustLogged] = useState<boolean>(false);

  // Bookmarks / Presets
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('radio_atlas_favorites');
      return saved ? JSON.parse(saved) : [FEATURED_STATIONS[0]?.id || ''];
    } catch {
      return [];
    }
  });

  // Sync theme class on <html> element
  useEffect(() => {
    if (isLightMode) {
      document.documentElement.classList.remove('dark');
      try {
        localStorage.setItem('radio_atlas_theme', 'light');
      } catch {}
    } else {
      document.documentElement.classList.add('dark');
      try {
        localStorage.setItem('radio_atlas_theme', 'dark');
      } catch {}
    }
  }, [isLightMode]);

  // Sync wallpaper in localStorage
  useEffect(() => {
    try {
      localStorage.setItem('radio_atlas_wallpaper', currentWallpaper);
    } catch {}
  }, [currentWallpaper]);

  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      if (next && (currentWallpaper === 'obsidian' || currentWallpaper === 'constellations')) {
        setCurrentWallpaper('blueprint');
      } else if (!next && (currentWallpaper === 'blueprint' || currentWallpaper === 'solar_dawn')) {
        setCurrentWallpaper('obsidian');
      }
      return next;
    });
  };

  const handleSelectWallpaper = (id: WallpaperId) => {
    setCurrentWallpaper(id);
    if (id === 'blueprint' || id === 'solar_dawn') {
      setIsLightMode(true);
    } else {
      setIsLightMode(false);
    }
  };

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('radio_atlas_favorites', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Change to specific station
  const handleSelectStation = useCallback(
    (station: Station) => {
      setActiveStation(station);
      setCurrentFrequency(station.frequency);

      // Update URL hash for permalink sharing
      try {
        window.history.replaceState(null, '', `#station=${station.id}`);
      } catch {}

      // Ensure station is in featured list
      setFeaturedStations((prev) => {
        if (!prev.some((s) => s.id === station.id)) {
          return [station, ...prev.slice(0, 24)];
        }
        return prev;
      });

      // Clicking on station point should immediately play the station live
      audioEngine.play(station, station.frequency).then(() => {
        setIsPlaying(true);
      }).catch((e) => {
        console.warn('Playback error:', e);
      });

      if (isAiDspEnabled) {
        handleTriggerAiDsp(station);
      }

      // Close open modals so user immediately returns to map/music
      setActiveModal(null);

      analytics.trackStationTune(station, 'preset');
    },
    [isAiDspEnabled, handleTriggerAiDsp]
  );

  // Toggle play/pause
  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
      analytics.trackPlayback('pause', { station_id: activeStation.id, title: activeStation.title });
    } else {
      await audioEngine.play(activeStation, currentFrequency);
      setIsPlaying(true);
      analytics.trackPlayback('play', { station_id: activeStation.id, title: activeStation.title });
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMute(nextMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    analytics.trackPlayback('volume_change', { volume: newVol });
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      audioEngine.setMute(false);
    }
    audioEngine.setVolume(newVol);
  };

  const handleScrubFrequency = (freq: number) => {
    setCurrentFrequency(freq);

    const nearest = allStations.find((st) => Math.abs(st.frequency - freq) <= 0.25);
    if (nearest && nearest.id !== activeStation.id) {
      setActiveStation(nearest);
      setFeaturedStations((prev) => {
        if (!prev.some((s) => s.id === nearest.id)) {
          return [nearest, ...prev.slice(0, 24)];
        }
        return prev;
      });
    }

    if (isPlaying) {
      audioEngine.tuneFrequency(
        freq,
        nearest ? nearest.frequency : activeStation.frequency,
        nearest || activeStation
      );
    }
  };

  const handleDrift = () => {
    const others = allStations.filter((st) => st.id !== activeStation.id);
    const randomStation = others[Math.floor(Math.random() * others.length)] || allStations[0];
    handleSelectStation(randomStation);

    if (!isPlaying) {
      audioEngine.play(randomStation, randomStation.frequency);
      setIsPlaying(true);
    }
  };

  // Atmosphere Soundscapes
  const handleToggleRain = () => {
    const ctx = audioEngine.getAudioContext();
    if (ctx) {
      const next = ambientFx.toggleRain(ctx);
      setIsRainActive(next);
    }
  };

  const handleToggleVinyl = () => {
    const ctx = audioEngine.getAudioContext();
    if (ctx) {
      const next = ambientFx.toggleVinyl(ctx);
      setIsVinylActive(next);
    }
  };

  const handleToggleCosmic = () => {
    const ctx = audioEngine.getAudioContext();
    if (ctx) {
      const next = ambientFx.toggleCosmic(ctx);
      setIsCosmicActive(next);
    }
  };

  // Cycle DSP EQ preset
  const handleCycleEqPreset = () => {
    const order: EqPreset[] = ['tube', 'lofi', 'deepbass', 'clean'];
    const nextIdx = (order.indexOf(activeEqPreset) + 1) % order.length;
    const nextPreset = order[nextIdx];
    setActiveEqPreset(nextPreset);
    audioEngine.setEqPreset(nextPreset);
  };

  const handleSelectEqPreset = (preset: EqPreset) => {
    setActiveEqPreset(preset);
    audioEngine.setEqPreset(preset);
  };

  // Quick 1-click DX Log
  const handleQuickLogDx = () => {
    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');

    try {
      const saved = localStorage.getItem('radio_atlas_dx_logs');
      const existing: DxLogEntry[] = saved ? JSON.parse(saved) : [];

      const newEntry: DxLogEntry = {
        id: Date.now().toString(),
        stationId: activeStation.id,
        stationTitle: activeStation.title,
        city: activeStation.city,
        country: activeStation.country,
        frequencyDisplay: activeStation.frequencyDisplay,
        timestamp: now.toISOString(),
        utcTime: `${hrs}:${mins} UTC`,
        distanceKm: Math.round(
          Math.hypot(
            (activeStation.coordinates?.lat ?? 0) - 35.68,
            (activeStation.coordinates?.lng ?? 0) - 139.69
          ) * 111
        ),
        snr: `${(44 + Math.random() * 6).toFixed(1)} dB`,
        notes: `Quick intercepted carrier at ${activeStation.frequencyDisplay}.`,
      };

      localStorage.setItem('radio_atlas_dx_logs', JSON.stringify([newEntry, ...existing]));
      setHasJustLogged(true);
      setTimeout(() => setHasJustLogged(false), 2000);
    } catch {}
  };

  // Sleep timer interval
  useEffect(() => {
    if (!sleepMinutesLeft) return;

    const interval = setInterval(() => {
      setSleepMinutesLeft((prev) => {
        if (!prev || prev <= 1) {
          audioEngine.pause();
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [sleepMinutesLeft]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        toggleModal('search');
      } else if (e.key === '/') {
        e.preventDefault();
        toggleModal('search');
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'd' || e.key === 'D') {
        handleDrift();
      } else if (e.key === 'b' || e.key === 'B') {
        toggleModal('bookmarks');
      } else if (e.key === 'l' || e.key === 'L') {
        toggleModal('logbook');
      } else if (e.key === 'z' || e.key === 'Z') {
        setIsZenMode((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'o' || e.key === 'O') {
        toggleModal('oscilloscope');
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        const presetIndex = parseInt(e.key, 10) - 1;
        const bookmarked = allStations.filter((s) => favorites.includes(s.id));
        if (bookmarked[presetIndex]) {
          handleSelectStation(bookmarked[presetIndex]);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        const nextFreq = Math.min(108.0, Math.round((currentFrequency + 0.1) * 100) / 100);
        handleScrubFrequency(nextFreq);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        const prevFreq = Math.max(80.0, Math.round((currentFrequency - 0.1) * 100) / 100);
        handleScrubFrequency(prevFreq);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, currentFrequency, activeStation, allStations, favorites, handleSelectStation]);

  return (
    <div
      className={`font-body select-none w-screen h-screen relative flex flex-col justify-between overflow-hidden antialiased transition-colors duration-500 ${
        isLightMode ? 'bg-[#f4f5f8] text-slate-800' : 'bg-[#080b11] text-[#e2e6f0]'
      }`}
    >
      {/* CHANNEL-REACTIVE ATMOSPHERIC BACKDROP (Changes color & photo on every channel change!) */}
      <WallpaperBackdrop
        wallpaper={currentWallpaper}
        isLightMode={isLightMode}
        activeStation={activeStation}
        isPhotoEnabled={isPhotoEnabled}
      />

      {/* MINIMAL TOP BAR */}
      <TopBar
        activeStation={activeStation}
        onDrift={handleDrift}
        onOpenDirectory={() => toggleModal('directory')}
        onOpenQuickSearch={() => toggleModal('search')}
        onOpenBookmarks={() => toggleModal('bookmarks')}
        onOpenWallpapers={() => toggleModal('wallpapers')}
        onOpenDxLogbook={() => toggleModal('logbook')}
        onOpenAudioSettings={() => toggleModal('audio_settings')}
        bookmarksCount={favorites.length}
        onToggleOscilloscope={() => toggleModal('oscilloscope')}
        isOscilloscopeOpen={activeModal === 'oscilloscope'}
        isPlaying={isPlaying}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        isZenMode={isZenMode}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
        onOpenAnalytics={() => toggleModal('analytics')}
        onOpenScreensaver={() => toggleModal('screensaver')}
        activeModal={activeModal}
      />

      {/* GEMINI AI DSP AUTO-MASTER HUD TOAST */}
      {showAiDspToast && dspProfile && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-40 flex items-center gap-2 px-3.5 py-1.5 rounded-full border shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-2 duration-300 bg-purple-950/85 border-purple-500/40 text-purple-200 text-xs font-mono select-none pointer-events-none">
          <span className="material-symbols-outlined text-[15px] text-[#ffc174] animate-pulse">
            psychology
          </span>
          <span className="font-semibold text-[#ffc174] uppercase text-[10px]">
            AI Master: {dspProfile.eqPreset}
          </span>
          <span className="opacity-40">·</span>
          <span className="truncate max-w-[280px] sm:max-w-md text-[10px] opacity-90">
            {dspProfile.rationale}
          </span>
        </div>
      )}

      {/* ZOOMABLE CARTOGRAPHY WORLD MAP (All 12,845 Places, Zero-Key Cyber & Natural Tiles) */}
      <WorldMap
        stations={featuredStations}
        allStations={allStations}
        allPlaces={RADIO_GARDEN_ALL_PLACES}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        isPlaying={isPlaying}
        isLightMode={isLightMode}
        skinTheme={currentSkin}
        onMapClick={closeAllOverlays}
      />

      {/* BOTTOM FLOATING PLAYER PILL WITH INTEGRATED PRESETS */}
      {!isZenMode && (
        <FloatingPlayerPill
          activeStation={activeStation}
          currentFrequency={currentFrequency}
          isPlaying={isPlaying}
          isMuted={isMuted}
          volume={volume}
          onTogglePlay={handleTogglePlay}
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
        />
      )}

      {/* WALLPAPERS & SKINS MODAL */}
      <WallpaperModal
        isOpen={activeModal === 'wallpapers'}
        onClose={() => setActiveModal(null)}
        currentWallpaper={currentWallpaper}
        onSelectWallpaper={handleSelectWallpaper}
        currentSkin={currentSkin}
        onSelectSkin={handleSelectSkin}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        onLaunchScreensaver={() => toggleModal('screensaver')}
      />

      {/* POLISHED DESKTOP WALLPAPER / SCREENSAVER VIEW */}
      <ScreensaverView
        isOpen={activeModal === 'screensaver'}
        onClose={() => setActiveModal(null)}
        activeStation={activeStation}
        isPlaying={isPlaying}
        isLightMode={isLightMode}
        skinTheme={currentSkin}
      />

      {/* DX LOGBOOK MODAL */}
      <DXLogbookModal
        isOpen={activeModal === 'logbook'}
        onClose={() => setActiveModal(null)}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        stations={allStations}
      />

      {/* DSP AUDIO HARDWARE SETTINGS MODAL */}
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

      {/* QUICK SEARCH PALETTE (CMD+K / /) */}
      <QuickSearchModal
        isOpen={activeModal === 'search'}
        onClose={() => setActiveModal(null)}
        stations={allStations}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* PRESETS & BOOKMARKS DRAWER */}
      <BookmarksDrawer
        isOpen={activeModal === 'bookmarks'}
        onClose={() => setActiveModal(null)}
        stations={allStations}
        favorites={favorites}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        onToggleFavorite={toggleFavorite}
      />

      {/* CRT SIGNAL OSCILLOSCOPE MODAL */}
      <OscilloscopeModal
        isOpen={activeModal === 'oscilloscope'}
        onClose={() => setActiveModal(null)}
        activeStation={activeStation}
        currentFrequency={currentFrequency}
        isPlaying={isPlaying}
      />

      {/* RADIO GARDEN DIRECTORY DRAWER */}
      <StationDirectoryDrawer
        isOpen={activeModal === 'directory'}
        onClose={() => setActiveModal(null)}
        stations={allStations}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* GOOGLE ANALYTICS 4 LIVE TELEMETRY MODAL */}
      <AnalyticsModal
        isOpen={activeModal === 'analytics'}
        onClose={() => setActiveModal(null)}
        isLightMode={isLightMode}
      />
    </div>
  );
}
