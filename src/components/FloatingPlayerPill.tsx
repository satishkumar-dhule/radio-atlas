import React, { useState } from 'react';
import { Station } from '../types/radio';

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
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  isRainActive: boolean;
  isVinylActive: boolean;
  onToggleRain: () => void;
  onToggleVinyl: () => void;
  sleepMinutesLeft: number | null;
  onSetSleepTimer: (minutes: number | null) => void;
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
  isBookmarked,
  onToggleBookmark,
  isRainActive,
  isVinylActive,
  onToggleRain,
  onToggleVinyl,
  sleepMinutesLeft,
  onSetSleepTimer,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showAtmosphereMenu, setShowAtmosphereMenu] = useState<boolean>(false);
  const [showSleepMenu, setShowSleepMenu] = useState<boolean>(false);

  const isScanning = Math.abs(currentFrequency - activeStation.frequency) > 0.18;

  return (
    <div className="relative z-40 w-full pb-6 sm:pb-8 flex items-center justify-center px-4 sm:px-6">
      <div className="w-full max-w-2xl bg-[#0e131d]/90 backdrop-blur-2xl border border-white/[0.08] rounded-full px-5 py-3 shadow-[0_8px_32px_rgba(0,0,0,0.65)] flex flex-col gap-2 transition-all duration-500 hover:border-white/15">
        {/* Top Row: Play/Pause, Metadata, Visualizer & Controls */}
        <div className="flex items-center justify-between gap-3">
          {/* Left: Play/Pause Button + Tuned Node Identity + Quick Bookmark */}
          <div className="flex items-center gap-3 min-w-0">
            {/* Play/Pause Button */}
            <button
              onClick={onTogglePlay}
              className="w-10 h-10 rounded-full bg-white/[0.06] hover:bg-[#ffc174] text-[#e2e6f0] hover:text-[#080b11] transition-all duration-300 flex items-center justify-center flex-shrink-0 group active:scale-95 shadow-md"
              aria-label={isPlaying ? 'Pause broadcast' : 'Play broadcast'}
            >
              <span className="material-symbols-outlined text-[20px] transition-transform duration-200">
                {isPlaying ? 'pause' : 'play_arrow'}
              </span>
            </button>

            {/* Tuned Airwave Identity */}
            <div className="flex flex-col min-w-0 pr-1">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-medium text-[#ffc174] tracking-wide whitespace-nowrap">
                  {isScanning
                    ? `${currentFrequency.toFixed(2)} MHz • Scanning`
                    : `${activeStation.frequencyDisplay} • ${activeStation.city}`}
                </span>
                <span className="w-1 h-1 rounded-full bg-white/20 hidden sm:inline-block" />
                <span className="font-body text-xs text-[#7d8799] truncate hidden sm:inline-block">
                  {isScanning ? 'Radio Garden Scanner' : activeStation.title}
                </span>

                {/* Quick 1-click Bookmark Star */}
                <button
                  onClick={onToggleBookmark}
                  title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Station'}
                  className="p-0.5 text-[#7d8799] hover:text-[#ffc174] transition-colors"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isBookmarked ? 'star' : 'star_outline'}
                  </span>
                </button>
              </div>
              <span className="font-body text-[13px] text-[#e2e6f0]/90 font-light truncate max-w-[200px] sm:max-w-[320px]">
                {isScanning ? 'Inter-frequency radio static...' : activeStation.track}
              </span>
            </div>
          </div>

          {/* Right: Soundwave, Atmosphere FX, Sleep Timer, Volume */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
            {/* Zen soundwave */}
            <div
              className={`hidden sm:flex items-center gap-1 h-4 px-1 ${
                isPlaying && !isMuted ? 'opacity-90' : 'opacity-25'
              } transition-opacity duration-300`}
            >
              <span
                className={`w-[2px] bg-[#4edea3] rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-3.5 animate-pulse' : 'h-1'
                }`}
              />
              <span
                className={`w-[2px] bg-[#4edea3]/80 rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-2 animate-pulse' : 'h-1'
                }`}
                style={{ animationDelay: '150ms' }}
              />
              <span
                className={`w-[2px] bg-[#4edea3] rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-4 animate-pulse' : 'h-1'
                }`}
                style={{ animationDelay: '300ms' }}
              />
            </div>

            {/* Atmosphere FX Menu Toggle (Rain / Vinyl) */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowAtmosphereMenu(!showAtmosphereMenu);
                  setShowSleepMenu(false);
                }}
                title="Atmosphere Layers (Night Rain / Vinyl)"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs ${
                  isRainActive || isVinylActive
                    ? 'bg-[#ffc174]/20 text-[#ffc174]'
                    : 'text-[#7d8799] hover:text-[#e2e6f0]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">water_drop</span>
              </button>

              {showAtmosphereMenu && (
                <div className="absolute bottom-9 right-0 p-2.5 rounded-xl bg-[#0e131d]/95 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col gap-2 w-40 z-50 text-[11px] font-mono">
                  <div className="text-[10px] uppercase text-[#7d8799] font-semibold border-b border-white/5 pb-1">
                    Nocturnal FX
                  </div>
                  <button
                    onClick={onToggleRain}
                    className={`flex items-center justify-between p-1.5 rounded transition-colors ${
                      isRainActive
                        ? 'bg-[#4edea3]/20 text-[#4edea3]'
                        : 'text-[#7d8799] hover:text-[#e2e6f0]'
                    }`}
                  >
                    <span>Night Rain</span>
                    <span className="text-[9px]">{isRainActive ? 'ON' : 'OFF'}</span>
                  </button>
                  <button
                    onClick={onToggleVinyl}
                    className={`flex items-center justify-between p-1.5 rounded transition-colors ${
                      isVinylActive
                        ? 'bg-[#ffc174]/20 text-[#ffc174]'
                        : 'text-[#7d8799] hover:text-[#e2e6f0]'
                    }`}
                  >
                    <span>Vinyl Warmth</span>
                    <span className="text-[9px]">{isVinylActive ? 'ON' : 'OFF'}</span>
                  </button>
                </div>
              )}
            </div>

            {/* Sleep Timer Toggle */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowSleepMenu(!showSleepMenu);
                  setShowAtmosphereMenu(false);
                }}
                title={sleepMinutesLeft ? `Sleep Timer: ${sleepMinutesLeft}m remaining` : 'Sleep Timer'}
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs ${
                  sleepMinutesLeft
                    ? 'bg-[#4edea3]/20 text-[#4edea3]'
                    : 'text-[#7d8799] hover:text-[#e2e6f0]'
                }`}
              >
                <span className="material-symbols-outlined text-[16px]">bedtime</span>
              </button>

              {showSleepMenu && (
                <div className="absolute bottom-9 right-0 p-2.5 rounded-xl bg-[#0e131d]/95 border border-white/10 backdrop-blur-md shadow-2xl flex flex-col gap-1.5 w-36 z-50 text-[11px] font-mono">
                  <div className="text-[10px] uppercase text-[#7d8799] font-semibold border-b border-white/5 pb-1">
                    Sleep Timer
                  </div>
                  {[15, 30, 45, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => {
                        onSetSleepTimer(mins);
                        setShowSleepMenu(false);
                      }}
                      className={`p-1 rounded text-left transition-colors ${
                        sleepMinutesLeft === mins
                          ? 'bg-[#4edea3]/20 text-[#4edea3]'
                          : 'text-[#7d8799] hover:text-[#e2e6f0]'
                      }`}
                    >
                      {mins} Minutes
                    </button>
                  ))}
                  {sleepMinutesLeft && (
                    <button
                      onClick={() => {
                        onSetSleepTimer(null);
                        setShowSleepMenu(false);
                      }}
                      className="p-1 rounded text-left text-red-400 hover:text-red-300"
                    >
                      Cancel Timer
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Volume / Mute Hover Control */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              {showVolumeSlider && (
                <div className="absolute bottom-9 right-0 p-2.5 rounded-xl bg-[#0e131d]/95 border border-white/10 backdrop-blur-md shadow-2xl flex items-center gap-2 w-32 z-50">
                  <span className="text-[10px] font-mono text-[#7d8799]">
                    {isMuted ? '0%' : `${Math.round(volume * 100)}%`}
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer accent-[#ffc174]"
                  />
                </div>
              )}

              <button
                onClick={onToggleMute}
                className="w-8 h-8 rounded-full flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors focus:outline-none"
                aria-label={isMuted ? 'Unmute radio' : 'Mute radio'}
              >
                <span
                  className={`material-symbols-outlined text-[18px] ${
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

        {/* Bottom Row: Ethereal Micro-Scrubber Track / Frequency Slider */}
        <div className="relative w-full flex flex-col pt-0.5 group/scrub">
          <div className="relative w-full h-1.5 pointer-events-none mb-0.5">
            {stations.slice(0, 30).map((st) => {
              const minFreq = 80.0;
              const maxFreq = 108.0;
              const pct = ((st.frequency - minFreq) / (maxFreq - minFreq)) * 100;
              const isCurrent = Math.abs(currentFrequency - st.frequency) < 0.2;

              if (pct < 0 || pct > 100) return null;

              return (
                <div
                  key={st.id}
                  style={{ left: `${pct}%` }}
                  className={`absolute top-0 w-0.5 h-1.5 -translate-x-1/2 transition-colors ${
                    isCurrent ? 'bg-[#ffc174] h-2 shadow-[0_0_6px_#ffc174]' : 'bg-white/15'
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
            className="w-full h-1 bg-white/[0.08] group-hover/scrub:bg-white/[0.14] rounded-full appearance-none cursor-pointer accent-[#ffc174] focus:outline-none transition-all"
            aria-label="Frequency tuning scrubber"
          />

          {/* Micro Scale Tick Labels */}
          <div className="flex justify-between items-center text-[9px] font-mono text-[#7d8799]/60 px-0.5 pt-1">
            <span>80.0</span>
            <span>88.0</span>
            <span>96.0</span>
            <span>104.0</span>
            <span>108.0 MHz</span>
          </div>
        </div>
      </div>
    </div>
  );
};
