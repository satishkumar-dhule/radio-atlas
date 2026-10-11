import React, { useState, useEffect, useCallback } from 'react';
import {
  RADIO_GARDEN_STATIONS,
  FEATURED_STATIONS,
  RADIO_GARDEN_PLACES,
} from './data/stations';
import { Station } from './types/radio';
import { audioEngine } from './services/audioEngine';
import { ambientFx } from './services/ambientFx';
import { TopBar } from './components/TopBar';
import { WorldMap } from './components/WorldMap';
import { FloatingPlayerPill } from './components/FloatingPlayerPill';
import { OscilloscopeModal } from './components/OscilloscopeModal';
import { StationDirectoryDrawer } from './components/StationDirectoryDrawer';
import { QuickSearchModal } from './components/QuickSearchModal';
import { BookmarksDrawer } from './components/BookmarksDrawer';

export default function App() {
  const [allStations] = useState<Station[]>(RADIO_GARDEN_STATIONS);
  const [featuredStations, setFeaturedStations] = useState<Station[]>(FEATURED_STATIONS);
  const [activeStation, setActiveStation] = useState<Station>(
    FEATURED_STATIONS[0] || RADIO_GARDEN_STATIONS[0]
  );
  const [currentFrequency, setCurrentFrequency] = useState<number>(
    FEATURED_STATIONS[0]?.frequency || 83.40
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [volume, setVolume] = useState<number>(0.75);

  // Modals & Drawers state
  const [isOscilloscopeOpen, setIsOscilloscopeOpen] = useState<boolean>(false);
  const [isDirectoryOpen, setIsDirectoryOpen] = useState<boolean>(false);
  const [isQuickSearchOpen, setIsQuickSearchOpen] = useState<boolean>(false);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState<boolean>(false);

  // Atmosphere FX state
  const [isRainActive, setIsRainActive] = useState<boolean>(false);
  const [isVinylActive, setIsVinylActive] = useState<boolean>(false);

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

  const toggleFavorite = (id: string) => {
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('radio_atlas_favorites', JSON.stringify(updated));
      } catch {
        // ignore
      }
      return updated;
    });
  };

  // Change to specific station
  const handleSelectStation = useCallback(
    (station: Station) => {
      setActiveStation(station);
      setCurrentFrequency(station.frequency);

      // Ensure the selected station is visible in featured map stations
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

  // Toggle mute
  const handleToggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    audioEngine.setMute(nextMuted);
  };

  // Volume change
  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      audioEngine.setMute(false);
    }
    audioEngine.setVolume(newVol);
  };

  // Continuous frequency scrubbing
  const handleScrubFrequency = (freq: number) => {
    setCurrentFrequency(freq);

    // Look for matching station nearby in our Radio Garden database
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

  // Drift mode: pick a random station from all Radio Garden stations
  const handleDrift = () => {
    const others = allStations.filter((st) => st.id !== activeStation.id);
    const randomStation = others[Math.floor(Math.random() * others.length)] || allStations[0];
    handleSelectStation(randomStation);

    if (!isPlaying) {
      audioEngine.play(randomStation, randomStation.frequency);
      setIsPlaying(true);
    }
  };

  // Atmosphere FX toggles
  const handleToggleRain = () => {
    if (!isPlaying) {
      audioEngine.init();
    }
    const next = ambientFx.toggleRain();
    setIsRainActive(next);
  };

  const handleToggleVinyl = () => {
    if (!isPlaying) {
      audioEngine.init();
    }
    const next = ambientFx.toggleVinyl();
    setIsVinylActive(next);
  };

  // Sleep timer interval
  useEffect(() => {
    if (!sleepMinutesLeft) return;

    const interval = setInterval(() => {
      setSleepMinutesLeft((prev) => {
        if (!prev || prev <= 1) {
          // Timer expired: stop broadcast
          audioEngine.pause();
          setIsPlaying(false);
          return null;
        }
        return prev - 1;
      });
    }, 60000); // every minute

    return () => clearInterval(interval);
  }, [sleepMinutesLeft]);

  // Global Keyboard Shortcuts (Cmd+K for search, 1-6 for presets, Space for play)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }

      // Cmd+K or Ctrl+K or '/' -> Quick Search
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
      } else if (e.key === 'm' || e.key === 'M') {
        handleToggleMute();
      } else if (e.key === 'o' || e.key === 'O') {
        setIsOscilloscopeOpen((prev) => !prev);
      } else if (['1', '2', '3', '4', '5', '6'].includes(e.key)) {
        // Quick preset tuning
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
    <div className="bg-[#080b11] text-[#e2e6f0] font-body select-none w-screen h-screen relative flex flex-col justify-between overflow-hidden antialiased">
      {/* ETHEREAL ATMOSPHERIC BACKDROP & SUBTLE NIGHT HAZE */}
      <div className="absolute inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(255,193,116,0.038),transparent_75%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_78%_38%,rgba(78,222,163,0.028),transparent_65%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_25%_65%,rgba(142,213,255,0.02),transparent_70%)]" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#080b11]/80 via-transparent to-[#080b11]/90" />
      </div>

      {/* TOP BAR WITH QUICK SEARCH, PRESETS, SCOPE, DRIFT */}
      <TopBar
        activeStation={activeStation}
        onDrift={handleDrift}
        onOpenDirectory={() => setIsDirectoryOpen(true)}
        onOpenQuickSearch={() => setIsQuickSearchOpen(true)}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        bookmarksCount={favorites.length}
        onToggleOscilloscope={() => setIsOscilloscopeOpen((prev) => !prev)}
        isOscilloscopeOpen={isOscilloscopeOpen}
        isPlaying={isPlaying}
      />

      {/* ZOOMABLE NOCTURNAL WORLD MAP */}
      <WorldMap
        stations={featuredStations}
        allPlaces={RADIO_GARDEN_PLACES}
        activeStation={activeStation}
        onSelectStation={handleSelectStation}
        isPlaying={isPlaying}
      />

      {/* FLOATING ZEN PLAYER PILL WITH QUICK BOOKMARK & SLEEP TIMER */}
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
