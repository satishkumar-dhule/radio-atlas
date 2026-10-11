import React, { useState, useEffect, useRef } from 'react';
import { Station } from '../types/radio';
import { analytics } from '../services/analytics';

interface FloatingPlayerPillProps {
  activeStation: Station;
  currentFrequency: number;
  isPlaying: boolean;
  isMuted: boolean;
  volume: number;
  onTogglePlay: () => void;
  onToggleMute: () => void;
  onVolumeChange: (vol: number) => void;
  onScrubFrequency: (freq: number) => void;
  stations: Station[];
  allStations?: Station[];
  favorites?: string[];
  onSelectStation?: (st: Station) => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isRainActive: boolean;
  isVinylActive: boolean;
  onToggleRain: () => void;
  onToggleVinyl: () => void;
  sleepMinutesLeft: number | null;
  onSetSleepTimer: (minutes: number | null) => void;
  isLightMode: boolean;
  onOpenAudioSettings: () => void;
  onOpenBookmarks?: () => void;
}

export const FloatingPlayerPill: React.FC<FloatingPlayerPillProps> = ({
  activeStation,
  currentFrequency,
  isPlaying,
  isMuted,
  volume,
  onTogglePlay,
  onToggleMute,
  onVolumeChange,
  onScrubFrequency,
  stations,
  allStations = [],
  favorites = [],
  onSelectStation,
  isBookmarked,
  onToggleBookmark,
  isRainActive,
  isVinylActive,
  onToggleRain,
  onToggleVinyl,
  sleepMinutesLeft,
  onSetSleepTimer,
  isLightMode,
  onOpenAudioSettings,
  onOpenBookmarks,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showQuickSettings, setShowQuickSettings] = useState<boolean>(false);
  const [showPresetsBar, setShowPresetsBar] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);

  const isScanning = Math.abs(currentFrequency - activeStation.frequency) > 0.18;

  // Auto-close popovers on click outside
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setShowQuickSettings(false);
      }
      if (volumeRef.current && !volumeRef.current.contains(e.target as Node)) {
        setShowVolumeSlider(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#station=${activeStation.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    analytics.trackEvent('share_station', { station_id: activeStation.id, title: activeStation.title });
    setTimeout(() => setCopiedLink(false), 1800);
  };

  const bookmarkedStations = (allStations.length > 0 ? allStations : stations).filter((st) =>
    favorites.includes(st.id)
  );

  return (
    <div
      ref={containerRef}
      className="relative z-40 w-full pb-4 sm:pb-6 flex flex-col items-center justify-center px-4 pointer-events-none select-none"
    >
      {/* Expandable Integrated Presets Tray */}
      {showPresetsBar && (
        <div
          className={`mb-2 pointer-events-auto flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-2xl border shadow-2xl backdrop-blur-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 text-[10px] font-mono ${
            isLightMode
              ? 'bg-white/90 border-slate-200 text-slate-800 shadow-slate-200/60'
              : 'bg-[#090d16]/95 border-white/15 text-[#e2e6f0] shadow-black/80'
          }`}
        >
          <span className="opacity-50 uppercase text-[9px] font-semibold tracking-wider mr-1">
            Presets:
          </span>

          {Array.from({ length: 6 }).map((_, idx) => {
            const st = bookmarkedStations[idx];
            const isSlotActive = st && st.id === activeStation.id;

            if (st && onSelectStation) {
              return (
                <button
                  key={st.id}
                  onClick={() => onSelectStation(st)}
                  title={`P${idx + 1}: ${st.title} (${st.city} · ${st.frequencyDisplay})`}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-xl transition-all active:scale-95 ${
                    isSlotActive
                      ? 'bg-[#ffc174]/25 border border-[#ffc174]/80 text-[#ffc174] shadow-[0_0_8px_rgba(255,193,116,0.3)] font-semibold'
                      : 'bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 text-white/80'
                  }`}
                >
                  <span className="font-bold">P{idx + 1}</span>
                  <span className="truncate max-w-[60px] hidden sm:inline">{st.city}</span>
                  {isSlotActive && <span className="w-1.5 h-1.5 rounded-full bg-[#ffc174] animate-pulse" />}
                </button>
              );
            }

            return (
              <button
                key={`empty-${idx}`}
                onClick={() => onToggleBookmark()}
                title={`Bookmark current station into Preset P${idx + 1}`}
                className="px-2 py-1 rounded-xl opacity-40 hover:opacity-100 hover:bg-white/5 border border-dashed border-white/20 transition-all text-[9px]"
              >
                +P{idx + 1}
              </button>
            );
          })}

          {onOpenBookmarks && (
            <button
              onClick={onOpenBookmarks}
              title="Open Full Bookmarks Manager"
              className="ml-1 px-2 py-1 rounded-xl hover:bg-white/10 text-[#ffc174] transition-colors"
            >
              <span className="material-symbols-outlined text-[13px]">open_in_new</span>
            </button>
          )}

          <button
            onClick={() => setShowPresetsBar(false)}
            title="Close Presets Bar"
            className="p-1 rounded-lg hover:bg-white/10 opacity-60 hover:opacity-100 transition-colors ml-0.5"
          >
            <span className="material-symbols-outlined text-[13px]">close</span>
          </button>
        </div>
      )}

      {/* Main Slender Floating Console */}
      <div
        className={`pointer-events-auto w-full max-w-xl backdrop-blur-2xl border rounded-full px-3.5 sm:px-4 py-2 shadow-2xl flex flex-col gap-1.5 transition-all duration-300 ${
          isLightMode
            ? 'bg-white/90 border-slate-200/90 text-slate-800 shadow-slate-200/70'
            : 'bg-[#080b11]/90 border-white/10 text-[#e2e6f0] shadow-black/80 hover:border-white/20'
        }`}
      >
        {/* Slender Top Row */}
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Compact Play Button & Inline Airwave Typography */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onTogglePlay}
              className={`w-9 h-9 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0 active:scale-95 shadow-md ${
                isPlaying
                  ? 'bg-[#ffc174] text-[#080b11] shadow-[0_0_12px_rgba(255,193,116,0.4)]'
                  : isLightMode
                  ? 'bg-slate-100 hover:bg-[#ffc174] text-slate-800'
                  : 'bg-white/[0.08] hover:bg-[#ffc174] text-[#e2e6f0] hover:text-[#080b11]'
              }`}
              aria-label={isPlaying ? 'Pause broadcast' : 'Play broadcast'}
            >
              <span className="material-symbols-outlined text-[19px]">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Inline Station Details */}
            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-center gap-1.5 text-xs">
                <span className="font-mono font-medium text-[#ffc174] whitespace-nowrap">
                  {isScanning
                    ? `${currentFrequency.toFixed(2)} MHz`
                    : `${activeStation.frequencyDisplay} · ${activeStation.city}`}
                </span>
                <span className="opacity-30 hidden sm:inline">·</span>
                <span className="font-body opacity-85 truncate hidden sm:inline max-w-[150px]">
                  {activeStation.title}
                </span>

                <button
                  onClick={onToggleBookmark}
                  title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Station'}
                  className="p-0.5 text-slate-400 hover:text-[#ffc174] transition-colors"
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isBookmarked ? 'star' : 'star_outline'}
                  </span>
                </button>
              </div>

              <span className="font-body text-[11px] opacity-75 truncate max-w-[180px] sm:max-w-[280px]">
                {isScanning ? 'Tuning frequency carrier...' : activeStation.track || `${activeStation.city}, ${activeStation.country}`}
              </span>
            </div>
          </div>

          {/* Right: Zen Wave, Presets toggle, Tools & Volume */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 3-bar zen soundwave */}
            <div
              className={`hidden sm:flex items-center gap-0.5 h-3 px-1 ${
                isPlaying && !isMuted ? 'opacity-85' : 'opacity-20'
              } transition-opacity duration-300`}
            >
              <span
                className={`w-[1.5px] bg-[#4edea3] rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-3 animate-pulse' : 'h-1'
                }`}
              />
              <span
                className={`w-[1.5px] bg-[#4edea3]/80 rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-2 animate-pulse' : 'h-1'
                }`}
                style={{ animationDelay: '150ms' }}
              />
              <span
                className={`w-[1.5px] bg-[#4edea3] rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-3.5 animate-pulse' : 'h-1'
                }`}
                style={{ animationDelay: '300ms' }}
              />
            </div>

            {/* Presets Button */}
            <button
              onClick={() => setShowPresetsBar(!showPresetsBar)}
              title="Toggle Quick Presets Bar (P1-P6)"
              className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all text-[10px] font-mono active:scale-95 ${
                showPresetsBar
                  ? 'bg-[#ffc174]/20 border-[#ffc174]/60 text-[#ffc174]'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/70 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[13px]">bookmarks</span>
              <span className="hidden md:inline">Presets</span>
              {favorites.length > 0 && (
                <span className="text-[9px] px-1 rounded-full bg-[#ffc174]/20 text-[#ffc174]">
                  {favorites.length}
                </span>
              )}
            </button>

            {/* Quick Tools Popup Toggle (Rain, Sleep, Share) */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowQuickSettings(!showQuickSettings)}
                title="Audio layers, Sleep timer & Share"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs active:scale-95 ${
                  isRainActive || isVinylActive || sleepMinutesLeft || showQuickSettings
                    ? 'bg-[#ffc174]/20 text-[#ffc174]'
                    : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">more_horiz</span>
              </button>

              {showQuickSettings && (
                <div
                  className={`absolute bottom-10 right-0 p-2 rounded-2xl border backdrop-blur-2xl shadow-2xl flex flex-col gap-1 w-48 z-50 text-[11px] font-mono animate-in fade-in zoom-in-95 duration-100 ${
                    isLightMode
                      ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-200/60'
                      : 'bg-[#090d16]/95 border-white/15 text-[#e2e6f0] shadow-black/80'
                  }`}
                >
                  <div className="text-[9px] font-semibold tracking-wider uppercase opacity-50 px-2 py-0.5">
                    Sound Layers
                  </div>

                  <button
                    onClick={onToggleRain}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors ${
                      isRainActive
                        ? 'bg-[#4edea3]/20 text-[#059669] dark:text-[#4edea3] font-semibold'
                        : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">water_drop</span>
                      Night Rain
                    </span>
                    <span className="text-[10px]">{isRainActive ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={onToggleVinyl}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors ${
                      isVinylActive
                        ? 'bg-[#ffc174]/20 text-[#d97706] dark:text-[#ffc174] font-semibold'
                        : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">album</span>
                      Vinyl Warmth
                    </span>
                    <span className="text-[10px]">{isVinylActive ? 'ON' : 'OFF'}</span>
                  </button>

                  <div className="h-[1px] bg-white/10 my-0.5" />

                  <button
                    onClick={() => {
                      onOpenAudioSettings();
                      setShowQuickSettings(false);
                    }}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl opacity-75 hover:opacity-100 hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">tune</span>
                      DSP Hardware EQ
                    </span>
                    <span className="material-symbols-outlined text-[12px]">chevron_right</span>
                  </button>

                  <button
                    onClick={() => {
                      onSetSleepTimer(sleepMinutesLeft ? null : 30);
                    }}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-xl transition-colors ${
                      sleepMinutesLeft
                        ? 'bg-[#4edea3]/20 text-[#059669] dark:text-[#4edea3] font-semibold'
                        : 'opacity-70 hover:opacity-100 hover:bg-white/5'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">bedtime</span>
                      Sleep Timer
                    </span>
                    <span className="text-[10px]">{sleepMinutesLeft ? `${sleepMinutesLeft}m` : 'OFF'}</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-between px-2.5 py-1.5 rounded-xl opacity-75 hover:opacity-100 hover:bg-white/5 transition-colors"
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">share</span>
                      <span>{copiedLink ? 'Link Copied!' : 'Share Station'}</span>
                    </span>
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedLink ? 'check' : 'content_copy'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div className="relative flex items-center" ref={volumeRef}>
              {showVolumeSlider && (
                <div
                  className={`absolute bottom-9 right-0 p-2.5 rounded-2xl border backdrop-blur-2xl shadow-2xl flex items-center gap-2 w-32 z-50 animate-in fade-in zoom-in-95 duration-100 ${
                    isLightMode ? 'bg-white/95 border-slate-200' : 'bg-[#090d16]/95 border-white/15'
                  }`}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-black/10 dark:bg-white/20 rounded-full appearance-none cursor-pointer accent-[#ffc174]"
                  />
                </div>
              )}

              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors focus:outline-none"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                <span
                  className={`material-symbols-outlined text-[17px] ${
                    isMuted ? 'text-[#ffc174]' : ''
                  }`}
                >
                  {isMuted || volume === 0
                    ? 'volume_off'
                    : volume < 0.5
                    ? 'volume_down'
                    : 'volume_up'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Razor-Thin Hairline Micro-Scrubber Track */}
        <div className="relative w-full flex flex-col pt-0 group/scrub">
          <div className="relative w-full h-1 pointer-events-none mb-0.5">
            {stations.slice(0, 24).map((st) => {
              const minFreq = 80.0;
              const maxFreq = 108.0;
              const pct = ((st.frequency - minFreq) / (maxFreq - minFreq)) * 100;
              const isCurrent = Math.abs(currentFrequency - st.frequency) < 0.2;

              if (pct < 0 || pct > 100) return null;

              return (
                <div
                  key={st.id}
                  style={{ left: `${pct}%` }}
                  className={`absolute top-0 w-[1.5px] h-1 -translate-x-1/2 transition-colors ${
                    isCurrent
                      ? 'bg-[#ffc174] h-1.5 shadow-[0_0_4px_#ffc174]'
                      : isLightMode
                      ? 'bg-slate-300'
                      : 'bg-white/15'
                  }`}
                  title={`${st.title} (${st.frequencyDisplay})`}
                />
              );
            })}
          </div>

          <input
            type="range"
            min="80.00"
            max="108.00"
            step="0.05"
            value={currentFrequency}
            onChange={(e) => onScrubFrequency(parseFloat(e.target.value))}
            className={`w-full h-[2px] rounded-full appearance-none cursor-pointer accent-[#ffc174] focus:outline-none transition-all ${
              isLightMode
                ? 'bg-slate-200 group-hover/scrub:bg-slate-300'
                : 'bg-white/[0.08] group-hover/scrub:bg-white/[0.14]'
            }`}
            aria-label="Frequency tuning scrubber"
          />

          <div className="flex justify-between items-center text-[8px] font-mono opacity-40 px-0.5 pt-0.5">
            <span>80.0</span>
            <span>90.0</span>
            <span>100.0</span>
            <span>108.0 MHz</span>
          </div>
        </div>
      </div>
    </div>
  );
};
