import React, { useState, useEffect } from 'react';
import { Station } from '../types/radio';

interface TopBarProps {
  activeStation: Station;
  onDrift: () => void;
  onOpenDirectory: () => void;
  onOpenQuickSearch: () => void;
  onOpenBookmarks: () => void;
  bookmarksCount: number;
  onToggleOscilloscope: () => void;
  isOscilloscopeOpen: boolean;
  isPlaying: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeStation,
  onDrift,
  onOpenDirectory,
  onOpenQuickSearch,
  onOpenBookmarks,
  bookmarksCount,
  onToggleOscilloscope,
  isOscilloscopeOpen,
  isPlaying,
}) => {
  const [utcTime, setUtcTime] = useState<string>('00:00 UTC');
  const [isDrifting, setIsDrifting] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getUTCHours()).padStart(2, '0');
      const mins = String(now.getUTCMinutes()).padStart(2, '0');
      const secs = String(now.getUTCSeconds()).padStart(2, '0');
      setUtcTime(`${hrs}:${mins}:${secs} UTC`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDriftClick = () => {
    setIsDrifting(true);
    onDrift();
    setTimeout(() => setIsDrifting(false), 700);
  };

  return (
    <header className="relative z-30 w-full px-6 sm:px-8 py-4 sm:py-5 flex items-center justify-between text-[#e2e6f0]">
      {/* Brand / Philosophy Mark */}
      <div className="flex items-center gap-3 group cursor-default">
        <span className="w-2 h-2 rounded-full bg-[#ffc174] shadow-[0_0_12px_#ffc174] transition-transform duration-500 group-hover:scale-125" />
        <span className="font-body text-[14px] sm:text-[15px] font-medium tracking-[0.22em] text-[#e2e6f0]/95 uppercase">
          Radio Atlas
        </span>
        <span className="hidden sm:inline-block font-mono text-[10px] text-[#7d8799]/80 tracking-wider pl-2 border-l border-white/10 uppercase">
          Night Airwaves
        </span>
      </div>

      {/* Center Coordinates & Active Atmosphere Carrier */}
      <div className="hidden md:flex items-center gap-2.5 font-mono text-xs text-[#7d8799] tracking-wide transition-opacity duration-500">
        <span
          className={`w-1.5 h-1.5 rounded-full ${
            isPlaying ? 'bg-[#4edea3] shadow-[0_0_8px_#4edea3]' : 'bg-[#7d8799]'
          } transition-colors duration-300`}
        />
        <span className="text-[#a5b0c4]">
          {activeStation.coordinates.display}
        </span>
        <span className="text-white/20">|</span>
        <span className="text-[#ffc174]/90 font-mono text-[11px]">
          {activeStation.frequencyDisplay}
        </span>
      </div>

      {/* Right Controls: Quick Search, Bookmarks, Scope, Directory & Drift */}
      <div className="flex items-center gap-2 sm:gap-3.5">
        {/* Quick Search Button */}
        <button
          onClick={onOpenQuickSearch}
          title="Quick Search (Cmd+K)"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-white/20 transition-all text-xs font-mono tracking-wider text-[#a5b0c4] hover:text-[#e2e6f0]"
        >
          <span className="material-symbols-outlined text-[15px] text-[#ffc174]">search</span>
          <span className="hidden md:inline text-[11px] uppercase">Search</span>
          <kbd className="hidden lg:inline text-[9px] px-1 rounded bg-white/10 text-[#7d8799]">⌘K</kbd>
        </button>

        {/* Bookmarks Quick Access */}
        <button
          onClick={onOpenBookmarks}
          title="Saved Bookmarks"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 transition-all text-xs font-mono tracking-wider text-[#7d8799] hover:text-[#e2e6f0]"
        >
          <span className="material-symbols-outlined text-[15px] text-[#ffc174]">star</span>
          <span className="hidden sm:inline text-[11px] uppercase">Presets</span>
          {bookmarksCount > 0 && (
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#ffc174]/20 text-[#ffc174] font-semibold">
              {bookmarksCount}
            </span>
          )}
        </button>

        {/* Oscilloscope Toggle */}
        <button
          onClick={onToggleOscilloscope}
          title="Toggle CRT Signal Scope"
          className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-all text-xs font-mono tracking-wider ${
            isOscilloscopeOpen
              ? 'bg-[#4edea3]/15 border-[#4edea3]/50 text-[#4edea3] shadow-[0_0_12px_rgba(78,222,163,0.2)]'
              : 'bg-white/[0.03] hover:bg-white/[0.08] border-white/5 hover:border-white/15 text-[#7d8799] hover:text-[#e2e6f0]'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">graphic_eq</span>
          <span className="hidden lg:inline text-[11px] uppercase">Scope</span>
        </button>

        {/* Directory Toggle */}
        <button
          onClick={onOpenDirectory}
          title="Browse Global Airwave Stations"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 hover:border-white/15 transition-all text-xs text-[#7d8799] hover:text-[#e2e6f0] font-mono tracking-wider"
        >
          <span className="material-symbols-outlined text-[15px]">hub</span>
          <span className="hidden lg:inline text-[11px] uppercase">Atlas</span>
        </button>

        {/* Drift Button */}
        <button
          onClick={handleDriftClick}
          title="Drift to random nocturnal station"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.04] hover:bg-white/[0.09] border border-white/10 hover:border-[#ffc174]/40 transition-all text-xs text-[#a5b0c4] hover:text-[#e2e6f0] font-body tracking-wider group active:scale-95"
        >
          <span
            className={`material-symbols-outlined text-[15px] text-[#ffc174] transition-transform duration-700 ${
              isDrifting ? 'rotate-180' : 'group-hover:rotate-45'
            }`}
          >
            shuffle
          </span>
          <span className="tracking-wide text-[11px] uppercase font-mono">Drift</span>
        </button>

        {/* UTC Clock */}
        <div className="hidden xl:flex flex-col items-end font-mono pl-2">
          <span className="text-xs text-[#e2e6f0]/85 tracking-widest font-light tabular-nums">
            {utcTime}
          </span>
        </div>
      </div>
    </header>
  );
};
