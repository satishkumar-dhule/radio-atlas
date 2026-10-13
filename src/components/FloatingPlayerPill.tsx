import React, { useState, useEffect, useRef } from 'react';
import { Station } from '../types/radio';
import { StationDynamicPalette } from '../utils/themeFormula';
import { analytics } from '../services/analytics';

interface FloatingPlayerPillProps {
  activeStation: Station;
  currentFrequency: number;
  isMuted: boolean;
  volume: number;
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
  palette: StationDynamicPalette;
}

export const FloatingPlayerPill: React.FC<FloatingPlayerPillProps> = ({
  activeStation,
  currentFrequency,
  isMuted,
  volume,
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
  palette,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showQuickSettings, setShowQuickSettings] = useState<boolean>(false);
  const [showPresetsBar, setShowPresetsBar] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const settingsRef = useRef<HTMLDivElement | null>(null);
  const volumeRef = useRef<HTMLDivElement | null>(null);

  const isScanning = Math.abs(currentFrequency - activeStation.frequency) > 0.18;

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
    setTimeout(() => setCopiedLink(false), 1500);
  };

  const bookmarkedStations = (allStations.length > 0 ? allStations : stations).filter((st) =>
    favorites.includes(st.id)
  );

  return (
    <div
      ref={containerRef}
      className="absolute bottom-0 left-0 right-0 z-40 pb-5 sm:pb-7 flex flex-col items-center justify-center px-4 pointer-events-none select-none"
    >
      {/* 1. Presets Drawer Row */}
      {showPresetsBar && (
        <div
          className={`mb-2 pointer-events-auto flex items-center gap-1.5 px-3 py-1.5 rounded-xl border shadow-xl backdrop-blur-2xl transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 text-xs font-mono ${
            isLightMode
              ? 'bg-white/95 border-slate-200 text-slate-800'
              : 'bg-[#090d16]/95 border-white/10 text-[#e2e6f0]'
          }`}
          style={{ borderColor: palette.borderColor }}
        >
          <span className="opacity-40 text-[11px] uppercase mr-1">Presets</span>
          {Array.from({ length: 6 }).map((_, idx) => {
            const st = bookmarkedStations[idx];
            const isSlotActive = st && st.id === activeStation.id;

            if (st && onSelectStation) {
              return (
                <button
                  key={st.id}
                  onClick={() => onSelectStation(st)}
                  title={`${st.title} (${st.city} · ${st.frequencyDisplay})`}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg transition-colors text-xs hover:bg-black/5 dark:hover:bg-white/10"
                  style={{
                    backgroundColor: isSlotActive ? palette.tagBg : undefined,
                    color: isSlotActive ? palette.accentHex : palette.textContrast,
                    fontWeight: isSlotActive ? 600 : 400,
                  }}
                >
                  <span className="font-semibold">{idx + 1}</span>
                  <span className="truncate max-w-[55px] hidden sm:inline">{st.city}</span>
                </button>
              );
            }

            return (
              <button
                key={`empty-${idx}`}
                onClick={onToggleBookmark}
                title={`Bookmark current station into slot ${idx + 1}`}
                className="px-2 py-1 rounded-lg opacity-60 hover:opacity-100 hover:bg-black/5 dark:hover:bg-white/5 border border-dashed border-current text-[11px]"
                style={{ color: palette.textMuted }}
              >
                +{idx + 1}
              </button>
            );
          })}

          {onOpenBookmarks && (
            <button
              onClick={onOpenBookmarks}
              title="Open all bookmarks"
              className="ml-1 p-1 rounded-lg hover:bg-white/10 transition-colors"
              style={{ color: palette.accentHex }}
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
            </button>
          )}

          <button
            onClick={() => setShowPresetsBar(false)}
            title="Close Presets"
            className="p-1 rounded-lg hover:bg-white/10 opacity-50 hover:opacity-100 transition-colors ml-0.5"
          >
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        </div>
      )}

      {/* 2. Main Console Dock (Always Playing: Mute/Unmute + Volume, No Play/Pause) */}
      <div
        className={`pointer-events-auto w-full max-w-xl backdrop-blur-2xl border rounded-2xl px-4 py-2.5 shadow-2xl flex flex-col gap-2 transition-all duration-300 ${
          isLightMode
            ? 'bg-white/95 text-slate-800'
            : 'bg-[#090d16]/95 text-[#e2e6f0]'
        }`}
        style={{
          borderColor: palette.borderColor,
          boxShadow: `0 16px 40px rgba(0, 0, 0, 0.7), 0 0 24px ${palette.accentMuted}`,
        }}
      >
        {/* Top Playback Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Live On-Air Signal Badge & Station Details */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Live Indicator Icon */}
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform"
              style={{
                backgroundColor: isMuted ? 'rgba(255,255,255,0.06)' : palette.tagBg,
                color: isMuted ? 'rgba(255,255,255,0.4)' : palette.accentHex,
              }}
              title={isMuted ? 'Muted' : 'Transmitting Live Airwave'}
            >
              <span
                className={`material-symbols-outlined text-[18px] ${
                  !isMuted ? 'animate-pulse' : ''
                }`}
              >
                {isMuted ? 'volume_off' : 'podcasts'}
              </span>
            </div>

            <div className="flex flex-col min-w-0 leading-tight">
              <div className="flex items-center gap-2 text-xs">
                <span
                  className="font-mono font-bold whitespace-nowrap"
                  style={{ color: palette.accentHex }}
                >
                  {isScanning ? `${currentFrequency.toFixed(1)} MHz` : activeStation.frequencyDisplay}
                </span>
                <span className="opacity-40">·</span>
                <span
                  className="font-semibold truncate"
                  style={{ color: palette.textContrast }}
                >
                  {activeStation.title}
                </span>

                <button
                  onClick={onToggleBookmark}
                  title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Station'}
                  className="p-0.5 opacity-60 hover:opacity-100 transition-colors"
                  style={{ color: isBookmarked ? palette.accentHex : palette.textContrast }}
                >
                  <span className="material-symbols-outlined text-[14px]">
                    {isBookmarked ? 'star' : 'star_outline'}
                  </span>
                </button>
              </div>

              <div
                className="flex items-center gap-2 text-[11px] truncate font-medium"
                style={{ color: palette.textMuted }}
              >
                <span>{activeStation.city}, {activeStation.country}</span>
                {activeStation.bitrate && (
                  <>
                    <span className="opacity-40">/</span>
                    <span className="hidden sm:inline">{activeStation.bitrate}</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right: Only Mute / Unmute & Direct Volume Slider & Atmosphere Controls */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* Presets Button */}
            <button
              onClick={() => setShowPresetsBar(!showPresetsBar)}
              title="Toggle Presets Drawer"
              className="px-2 py-1 rounded-lg text-xs font-mono transition-colors"
              style={{
                backgroundColor: showPresetsBar ? palette.tagBg : undefined,
                color: showPresetsBar ? palette.accentHex : palette.textContrast,
              }}
            >
              Presets
            </button>

            {/* Dedicated Primary MUTE / UNMUTE BUTTON (No Play/Pause) */}
            <button
              onClick={onToggleMute}
              title={isMuted ? 'Unmute Airwave' : 'Mute Airwave'}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all active:scale-95"
              style={{
                backgroundColor: isMuted ? 'rgba(239, 68, 68, 0.15)' : palette.tagBg,
                borderColor: isMuted ? 'rgba(239, 68, 68, 0.4)' : palette.borderColor,
                color: isMuted ? (isLightMode ? '#dc2626' : '#fca5a5') : palette.accentHex,
              }}
              aria-label={isMuted ? 'Unmute broadcast' : 'Mute broadcast'}
            >
              <span className="material-symbols-outlined text-[16px]">
                {isMuted ? 'volume_off' : volume < 0.5 ? 'volume_down' : 'volume_up'}
              </span>
              <span>{isMuted ? 'Muted' : 'Live'}</span>
            </button>

            {/* Volume Popover / Direct Control */}
            <div className="relative" ref={volumeRef}>
              <button
                onClick={() => setShowVolumeSlider(!showVolumeSlider)}
                title={`Adjust Volume (${Math.round(volume * 100)}%)`}
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                style={{ color: palette.textContrast }}
              >
                <span className="material-symbols-outlined text-[17px]">tune</span>
              </button>

              {showVolumeSlider && (
                <div
                  className={`absolute right-0 bottom-10 p-3 rounded-xl border shadow-xl backdrop-blur-2xl flex flex-col items-center gap-2 w-32 animate-in fade-in duration-150 ${
                    isLightMode
                      ? 'bg-white/95 border-slate-200 text-slate-800'
                      : 'bg-[#090d16]/95 border-white/10 text-[#e2e6f0]'
                  }`}
                  style={{ borderColor: palette.borderColor }}
                >
                  <div className="flex items-center justify-between w-full text-[10px] font-mono opacity-70">
                    <span>Volume</span>
                    <span style={{ color: palette.accentHex }}>
                      {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                    </span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.01"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => {
                      if (isMuted) onToggleMute();
                      onVolumeChange(parseFloat(e.target.value));
                    }}
                    style={{ accentColor: palette.accentHex }}
                    className="w-full h-1.5 rounded-lg cursor-pointer bg-slate-300 dark:bg-white/20"
                  />
                </div>
              )}
            </div>

            {/* Atmosphere Popover */}
            <div className="relative" ref={settingsRef}>
              <button
                onClick={() => setShowQuickSettings(!showQuickSettings)}
                title="Ambient Soundscape (Night Rain, Vinyl)"
                className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                style={{
                  backgroundColor: isRainActive || isVinylActive || showQuickSettings ? palette.tagBg : undefined,
                  color: isRainActive || isVinylActive || showQuickSettings ? palette.accentHex : palette.textContrast,
                }}
              >
                <span className="material-symbols-outlined text-[17px]">graphic_eq</span>
              </button>

              {showQuickSettings && (
                <div
                  className={`absolute right-0 bottom-10 p-3 rounded-xl border shadow-xl backdrop-blur-2xl flex flex-col gap-2 w-48 font-mono text-xs animate-in fade-in duration-150 ${
                    isLightMode
                      ? 'bg-white/95 border-slate-200 text-slate-800'
                      : 'bg-[#090d16]/95 border-white/10 text-[#e2e6f0]'
                  }`}
                  style={{ borderColor: palette.borderColor }}
                >
                  <span className="text-[10px] uppercase opacity-50 font-semibold">Soundscape</span>
                  <button
                    onClick={onToggleRain}
                    className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                      isRainActive ? 'bg-white/20 text-white' : 'hover:bg-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">rainy</span>
                      <span>Night Rain</span>
                    </span>
                    <span className="text-[10px]">{isRainActive ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={onToggleVinyl}
                    className={`flex items-center justify-between p-1.5 rounded-lg transition-colors ${
                      isVinylActive ? 'bg-white/20 text-white' : 'hover:bg-white/10 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[14px]">album</span>
                      <span>Vinyl Crackle</span>
                    </span>
                    <span className="text-[10px]">{isVinylActive ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={onOpenAudioSettings}
                    className="flex items-center gap-1.5 p-1.5 rounded-lg hover:bg-white/10 text-left opacity-70 hover:opacity-100 pt-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">equalizer</span>
                    <span>DSP Settings</span>
                  </button>
                </div>
              )}
            </div>

            {/* Share / Copy link */}
            <button
              onClick={handleCopyLink}
              title={copiedLink ? 'Link Copied!' : 'Share Station'}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
              style={{ color: palette.textContrast }}
            >
              <span className="material-symbols-outlined text-[17px]">
                {copiedLink ? 'check' : 'share'}
              </span>
            </button>
          </div>
        </div>

        {/* Bottom Micro Frequency Scrubber Dial */}
        <div className="flex items-center gap-2 pt-0.5">
          <span className="font-mono text-[10px] opacity-40">88.0</span>
          <div className="relative flex-1 flex items-center">
            <input
              type="range"
              min="88.0"
              max="108.0"
              step="0.1"
              value={currentFrequency}
              onChange={(e) => onScrubFrequency(parseFloat(e.target.value))}
              aria-label="Frequency tuning dial"
              style={{ accentColor: palette.accentHex }}
              className="w-full h-1 rounded-lg cursor-pointer bg-white/10 hover:bg-white/20 transition-colors"
            />
          </div>
          <span className="font-mono text-[10px] opacity-40">108.0</span>
        </div>
      </div>
    </div>
  );
};
