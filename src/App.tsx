import React, { useState, useEffect, useCallback } from 'react';
import {
  RADIO_GARDEN_STATIONS,
  FEATURED_STATIONS,
  RADIO_GARDEN_PLACES,
} from './data/stations';
import { Station } from './types/radio';
import { audioEngine, EqPreset } from './services/audioEngine';
import { ambientFx } from './services/ambientFx';
import { WallpaperId } from './types/wallpaper';

import { TopBar } from './components/TopBar';
import { WorldMap } from './components/WorldMap';
import { FloatingPlayerPill } from './components/FloatingPlayerPill';
import { WallpaperBackdrop } from './components/WallpaperBackdrop';
import { WallpaperModal } from './components/WallpaperModal';
import { DXLogbookModal } from './components/DXLogbookModal';
import { AudioSettingsModal } from './components/AudioSettingsModal';
import { OscilloscopeModal } from './components/OscilloscopeModal';
import { StationDirectoryDrawer } from './components/StationDirectoryDrawer';
import { QuickSearchModal } from './components/QuickSearchModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';

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

  // Modals & Panels state
  const [isOscilloscopeOpen, setIsOscilloscopeOpen] = useState<boolean>(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState<boolean>(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);
  const [isWallpapersOpen, setIsWallpapersOpen] = useState<boolean>(false);
  const [isDxLogbookOpen, setIsDxLogbookOpen] = useState<boolean>(false);
  const [isAudioSettingsOpen, setIsAudioSettingsOpen] = useState<boolean>(false);
  const [isZenMode, setIsZenMode] = useState<boolean>(false);

  // DSP & Atmosphere state
  const [activeEqPreset, setActiveEqPreset] = useState<EqPreset>('tube');
  const [isRainActive, setIsRainActive] = useState<boolean>(false);
  const [isVinylActive, setIsVinylActive] = useState<boolean>(false);
  const [isCosmicActive, setIsCosmicActive] = useState<boolean>(false);

  // Sleep timer state
  const [sleepMinutesLeft, setSleepMinutesLeft] = useState<number | null>(null);

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

      if (isPlaying) {
        audioEngine.tuneFrequency(station.frequency, station.frequency, station);
      }
    },
    [isPlaying]
  );

  // Toggle play/pause
  const handleTogglePlay = async () => {
    if (isPlaying) {
      audioEngine.pause();
      setIsPlaying(false);
    } else {
      await audioEngine.play(activeStation, currentFrequency);
      setIsPlaying(true);
    }
  };

  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMute(nextMuted);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
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

  const handleSelectEqPreset = (preset: EqPreset) => {
    setActiveEqPreset(preset);
    audioEngine.setEqPreset(preset);
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
        setIsQuickSearchOpen((prev) => !prev);
      } else if (e.key === '/') {
        e.preventDefault();
        setIsQuickSearchOpen(true);
      } else if (e.code === 'Space') {
        e.preventDefault();
        handleTogglePlay();
      } else if (e.key === 'd' || e.key === 'D') {
        handleDrift();
      } else if (e.key === 'b' || e.key === 'B') {
        setIsBookmarksOpen((prev) => !prev);
      } else if (e.key === 'l' || e.key === 'L') {
        setIsDxLogbookOpen((prev) => !prev);
      } else if (e.key === 'z' || e.key === 'Z') {
        setIsZenMode((prev) => !prev);
      } else if (e.key === 't' || e.key === 'T') {
        toggleTheme();
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'o' || e.key === 'O') {
        setIsOscilloscopeOpen((prev) => !prev);
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
      {/* PROCEDURAL WALLPAPER BACKDROP */}
      <WallpaperBackdrop
        wallpaper={currentWallpaper}
        isLightMode={isLightMode}
      />

      {/* TOP BAR */}
      <TopBar
        activeStation={activeStation}
        onDrift={handleDrift}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenWallpapers={() => setIsWallpapersOpen(true)}
        onOpenDxLogbook={() => setIsDxLogbookOpen(true)}
        onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        bookmarksCount={favorites.length}
        onToggleOscilloscope={() => setIsOscilloscopeOpen((prev) => !prev)}
        isOscilloscopeOpen={isOscilloscopeOpen}
        isPlaying={isPlaying}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
        isZenMode={isZenMode}
        onToggleZenMode={() => setIsZenMode((prev) => !prev)}
      />

      {/* ZOOMABLE CARTOGRAPHY WORLD MAP WITH SKYWAVE BEAMS */}
      <WorldMap
        stations={featuredStations}
        allPlaces={RADIO_GARDEN_PLACES}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        isPlaying={isPlaying}
        isLightMode={isLightMode}
      />

      {/* ZEN FLOATING PLAYER PILL */}
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
          isBookmarked={favorites.includes(activeStation.id)}
          onToggleBookmark={() => toggleFavorite(activeStation.id)}
          isRainActive={isRainActive}
          isVinylActive={isVinylActive}
          onToggleRain={handleToggleRain}
          onToggleVinyl={handleToggleVinyl}
          sleepMinutesLeft={sleepMinutesLeft}
          onSetSleepTimer={(mins) => setSleepMinutesLeft(mins)}
          isLightMode={isLightMode}
          onOpenAudioSettings={() => setIsAudioSettingsOpen(true)}
        />
      )}

      {/* WALLPAPERS & THEMES MODAL */}
      <WallpaperModal
        isOpen={isWallpapersOpen}
        onClose={() => setIsWallpapersOpen(false)}
        currentWallpaper={currentWallpaper}
        onSelectWallpaper={handleSelectWallpaper}
        isLightMode={isLightMode}
        onToggleTheme={toggleTheme}
      />

      {/* DX LOGBOOK MODAL */}
      <DXLogbookModal
        isOpen={isDxLogbookOpen}
        onClose={() => setIsDxLogbookOpen(false)}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        stations={allStations}
      />

      {/* DSP AUDIO HARDWARE SETTINGS MODAL */}
      <AudioSettingsModal
        isOpen={isAudioSettingsOpen}
        onClose={() => setIsAudioSettingsOpen(false)}
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
        isOpen={isQuickSearchOpen}
        onClose={() => setIsQuickSearchOpen(false)}
        stations={allStations}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      {/* PRESETS & BOOKMARKS DRAWER */}
      <BookmarksDrawer
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        stations={allStations}
        favorites={favorites}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        onToggleFavorite={toggleFavorite}
      />

      {/* CRT SIGNAL OSCILLOSCOPE MODAL */}
      <OscilloscopeModal
        isOpen={isOscilloscopeOpen}
        onClose={() => setIsOscilloscopeOpen(false)}
        activeStation={activeStation}
        currentFrequency={currentFrequency}
        isPlaying={isPlaying}
      />

      {/* RADIO GARDEN DIRECTORY DRAWER */}
      <StationDirectoryDrawer
        isOpen={isDirectoryOpen}
        onClose={() => setIsDirectoryOpen(false)}
        stations={allStations}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />
    </div>
  );
}
