import React, { useState, useEffect, useRef } from 'react';
import { Station } from '../types/radio';

interface TopBarProps {
  activeStation: Station;
  onDrift: () => void;
  onOpenDirectory: () => void;
  onOpenQuickSearch: () => void;
  onOpenBookmarks: () => void;
  onOpenWallpapers: () => void;
  onOpenDxLogbook: () => void;
  onOpenAudioSettings: () => void;
  bookmarksCount: number;
  onToggleOscilloscope: () => void;
  isOscilloscopeOpen: boolean;
  isPlaying: boolean;
  isLightMode: boolean;
  onToggleTheme: () => void;
  isZenMode: boolean;
  onToggleZenMode: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeStation,
  onDrift,
  onOpenDirectory,
  onOpenQuickSearch,
  onOpenBookmarks,
  onOpenWallpapers,
  onOpenDxLogbook,
  onOpenAudioSettings,
  bookmarksCount,
  onToggleOscilloscope,
  isOscilloscopeOpen,
  isPlaying,
  isLightMode,
  onToggleTheme,
  isZenMode,
  onToggleZenMode,
}) => {
  const [utcTime, setUtcTime] = useState<string>('00:00 UTC');
  const [isDrifting, setIsDrifting] = useState<boolean>(false);
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      setUtcTime(`${hrs}:${mins} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Close tools menu on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    if (isMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMenuOpen]);

  const handleDriftClick = () => {
    setIsDrifting(true);
    onDrift();
    setTimeout(() => setIsDrifting(false), 700);
  };

  if (isZenMode) {
    return (
      <div className="absolute top-4 right-6 z-40">
        <button
          onClick={onToggleZenMode}
          title="Exit Zen Mode (Z)"
          className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/40 hover:bg-black/60 border border-white/10 text-[11px] font-mono text-white/80 hover:text-white backdrop-blur-md transition-all shadow-sm"
        >
          <span className="material-symbols-outlined text-[14px]">fullscreen_exit</span>
          <span>Exit Zen</span>
        </button>
      </div>
    );
  }

  return (
    <header
      className={`relative z-30 w-full px-6 sm:px-8 py-3 sm:py-3.5 flex items-center justify-between transition-colors duration-300 ${
        isLightMode ? 'text-slate-800' : 'text-[#e2e6f0]'
      }`}
    >
      {/* Brand / Minimal Wordmark */}
      <div className="flex items-center gap-2.5 group cursor-default">
        <span className="w-1.5 h-1.5 rounded-full bg-[#ffc174] shadow-[0_0_8px_#ffc174] transition-transform duration-500 group-hover:scale-125" />
        <span className="font-body text-[13px] sm:text-[14px] font-medium tracking-[0.22em] uppercase opacity-95">
          Radio Atlas
        </span>
        <span className="hidden sm:inline-block font-mono text-[9px] opacity-40 tracking-wider pl-2 border-l border-current/20 uppercase">
          Night Airwaves
        </span>
      </div>

      {/* Center Coordinates — Slender & Tabular */}
      <div className="hidden md:flex items-center gap-2 font-mono text-[11px] opacity-65 tracking-wide transition-opacity duration-500">
        <span
          className={`w-1 h-1 rounded-full ${
            isPlaying ? 'bg-[#4edea3] shadow-[0_0_6px_#4edea3]' : 'bg-slate-400'
          }`}
        />
        <span>{activeStation.coordinates.display}</span>
        <span className="opacity-25">·</span>
        <span className="text-[#ffc174] font-medium">{activeStation.frequencyDisplay}</span>
      </div>

      {/* Slender Right Controls: Search, Drift, Overflow Tools Menu, Clock */}
      <div className="flex items-center gap-2 sm:gap-2.5">
        {/* Quick Search */}
        <button
          onClick={onOpenQuickSearch}
          title="Quick Search (Cmd+K)"
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all text-[11px] font-mono ${
            isLightMode
              ? 'bg-white/60 hover:bg-white border-slate-200/80 text-slate-700'
              : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-[#a5b0c4] hover:text-[#e2e6f0]'
          }`}
        >
          <span className="material-symbols-outlined text-[13px] text-[#ffc174]">search</span>
          <span className="hidden sm:inline uppercase text-[10px]">Search</span>
          <kbd className="hidden md:inline text-[9px] px-1 rounded bg-black/5 dark:bg-white/10 opacity-60">⌘K</kbd>
        </button>

        {/* Drift Button */}
        <button
          onClick={handleDriftClick}
          title="Drift to random airwave"
          className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 hover:border-[#ffc174]/40 transition-all text-[11px] text-[#ffc174] font-body tracking-wider group active:scale-95"
        >
          <span
            className={`material-symbols-outlined text-[13px] transition-transform duration-700 ${
              isDrifting ? 'rotate-180' : 'group-hover:rotate-45'
            }`}
          >
            shuffle
          </span>
          <span className="tracking-wide text-[10px] uppercase font-mono">Drift</span>
        </button>

        {/* Lightweight Tools Overflow Menu */}
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            title="Radio Tools & Settings"
            className={`flex items-center gap-1 px-2 py-1 rounded-full border transition-all text-[11px] font-mono ${
              isLightMode
                ? 'bg-white/60 hover:bg-white border-slate-200/80 text-slate-700'
                : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 text-[#a5b0c4] hover:text-[#e2e6f0]'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">tune</span>
            <span className="hidden lg:inline text-[10px] uppercase">Tools</span>
            {bookmarksCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#ffc174]" />
            )}
          </button>

          {/* Slender Dropdown Menu */}
          {isMenuOpen && (
            <div
              className={`absolute right-0 top-8 w-48 rounded-xl border p-1.5 shadow-2xl backdrop-blur-xl z-50 flex flex-col gap-0.5 text-xs font-mono animate-in fade-in zoom-in-95 duration-150 ${
                isLightMode
                  ? 'bg-white/95 border-slate-200 text-slate-700 shadow-slate-200/50'
                  : 'bg-[#0e131d]/95 border-white/10 text-[#e2e6f0] shadow-black/80'
              }`}
            >
              <button
                onClick={() => {
                  onOpenBookmarks();
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px] text-[#ffc174]">star</span>
                  <span>Presets</span>
                </div>
                {bookmarksCount > 0 && (
                  <span className="text-[10px] px-1.5 rounded bg-[#ffc174]/20 text-[#ffc174]">
                    {bookmarksCount}
                  </span>
                )}
              </button>

              <button
                onClick={() => {
                  onOpenWallpapers();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[15px] text-[#8ed5ff]">wallpaper</span>
                <span>Atmosphere & Wallpapers</span>
              </button>

              <button
                onClick={() => {
                  onOpenDxLogbook();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[15px] text-[#ffc174]">menu_book</span>
                <span>DX Logbook</span>
              </button>

              <button
                onClick={() => {
                  onOpenAudioSettings();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[15px] text-[#4edea3]">equalizer</span>
                <span>DSP Hardware EQ</span>
              </button>

              <button
                onClick={() => {
                  onToggleOscilloscope();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[15px] text-[#4edea3]">graphic_eq</span>
                <span>CRT Scope ({isOscilloscopeOpen ? 'ON' : 'OFF'})</span>
              </button>

              <button
                onClick={() => {
                  onOpenDirectory();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[15px] text-[#a5b0c4]">hub</span>
                <span>Station Directory</span>
              </button>

              <div className="h-[1px] bg-current opacity-10 my-1" />

              <button
                onClick={() => {
                  onToggleTheme();
                  setIsMenuOpen(false);
                }}
                className="flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[15px]">
                    {isLightMode ? 'dark_mode' : 'light_mode'}
                  </span>
                  <span>{isLightMode ? 'Dark Mode' : 'Light Mode'}</span>
                </div>
              </button>

              <button
                onClick={() => {
                  onToggleZenMode();
                  setIsMenuOpen(false);
                }}
                className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors text-left"
              >
                <span className="material-symbols-outlined text-[15px]">fullscreen</span>
                <span>Zen Mode</span>
              </button>
            </div>
          )}
        </div>

        {/* Lightweight UTC Clock */}
        <div className="hidden sm:flex font-mono text-[11px] opacity-70 pl-1 tracking-wider tabular-nums">
          {utcTime}
        </div>
      </div>
    </header>
  );
};
