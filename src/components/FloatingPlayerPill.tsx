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
  isLightMode: boolean;
  onOpenAudioSettings: () => void;
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
  isLightMode,
  onOpenAudioSettings,
}) => {
  const [showVolumeSlider, setShowVolumeSlider] = useState<boolean>(false);
  const [showQuickSettings, setShowQuickSettings] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  const isScanning = Math.abs(currentFrequency - activeStation.frequency) > 0.18;

  const handleCopyLink = () => {
    const url = `${window.location.origin}/#station=${activeStation.id}`;
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 1800);
  };

  return (
    <div className="relative z-40 w-full pb-4 sm:pb-6 flex items-center justify-center px-4">
      <div
        className={`w-full max-w-xl backdrop-blur-2xl border rounded-full px-3.5 sm:px-4 py-2 shadow-xl flex flex-col gap-1.5 transition-all duration-300 ${
          isLightMode
            ? 'bg-white/85 border-slate-200/80 text-slate-800 shadow-slate-200/60'
            : 'bg-[#0e131d]/85 border-white/[0.08] text-[#e2e6f0] shadow-black/60 hover:border-white/15'
        }`}
      >
        {/* Slender Top Row */}
        <div className="flex items-center justify-between gap-2.5">
          {/* Left: Compact Play Button & Inline Airwave Typography */}
          <div className="flex items-center gap-2.5 min-w-0">
            <button
              onClick={onTogglePlay}
              className={`w-8 h-8 rounded-full transition-all duration-200 flex items-center justify-center flex-shrink-0 active:scale-95 shadow-sm ${
                isLightMode
                  ? 'bg-slate-100 hover:bg-[#ffc174] text-slate-800'
                  : 'bg-white/[0.08] hover:bg-[#ffc174] text-[#e2e6f0] hover:text-[#080b11]'
              }`}
              aria-label={isPlaying ? 'Pause broadcast' : 'Play broadcast'}
            >
              <span className="material-symbols-outlined text-[17px]">
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
                <span className="font-body opacity-80 truncate hidden sm:inline max-w-[140px]">
                  {activeStation.title}
                </span>

                <button
                  onClick={onToggleBookmark}
                  title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Station'}
                  className="p-0.5 text-slate-400 hover:text-[#ffc174] transition-colors"
                >
                  <span className="material-symbols-outlined text-[13px]">
                    {isBookmarked ? 'star' : 'star_outline'}
                  </span>
                </button>
              </div>

              <span className="font-body text-[11px] opacity-75 truncate max-w-[180px] sm:max-w-[280px]">
                {isScanning ? 'Tuning frequency carrier...' : activeStation.track}
              </span>
            </div>
          </div>

          {/* Right: Zen Wave, Mute & Quick Tool */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            {/* 3-bar zen soundwave */}
            <div
              className={`hidden sm:flex items-center gap-0.5 h-3 px-1 ${
                isPlaying && !isMuted ? 'opacity-85' : 'opacity-20'
              } transition-opacity duration-300`}
            >
              <span
                className={`w-[1.5px] bg-[#059669] dark:bg-[#4edea3] rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-3 animate-pulse' : 'h-1'
                }`}
              />
              <span
                className={`w-[1.5px] bg-[#059669]/80 dark:bg-[#4edea3]/80 rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-2 animate-pulse' : 'h-1'
                }`}
                style={{ animationDelay: '150ms' }}
              />
              <span
                className={`w-[1.5px] bg-[#059669] dark:bg-[#4edea3] rounded-full transition-all duration-300 ${
                  isPlaying && !isMuted ? 'h-3.5 animate-pulse' : 'h-1'
                }`}
                style={{ animationDelay: '300ms' }}
              />
            </div>

            {/* Quick Tools Popup Toggle (Rain, Sleep, Share) */}
            <div className="relative">
              <button
                onClick={() => setShowQuickSettings(!showQuickSettings)}
                title="Audio layers, Sleep timer & Share"
                className={`w-7 h-7 rounded-full flex items-center justify-center transition-colors text-xs ${
                  isRainActive || isVinylActive || sleepMinutesLeft
                    ? 'bg-[#ffc174]/20 text-[#ffc174]'
                    : 'text-slate-400 hover:text-slate-800 dark:hover:text-white'
                }`}
              >
                <span className="material-symbols-outlined text-[15px]">more_horiz</span>
              </button>

              {showQuickSettings && (
                <div
                  className={`absolute bottom-9 right-0 p-2 rounded-xl border backdrop-blur-xl shadow-2xl flex flex-col gap-1 w-44 z-50 text-[11px] font-mono animate-in fade-in zoom-in-95 duration-100 ${
                    isLightMode
                      ? 'bg-white/95 border-slate-200 text-slate-800'
                      : 'bg-[#0e131d]/95 border-white/10 text-[#e2e6f0]'
                  }`}
                >
                  <button
                    onClick={onToggleRain}
                    className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                      isRainActive
                        ? 'bg-[#4edea3]/20 text-[#059669] dark:text-[#4edea3]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>Night Rain</span>
                    <span>{isRainActive ? 'ON' : 'OFF'}</span>
                  </button>

                  <button
                    onClick={onToggleVinyl}
                    className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                      isVinylActive
                        ? 'bg-[#ffc174]/20 text-[#d97706] dark:text-[#ffc174]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>Vinyl Warmth</span>
                    <span>{isVinylActive ? 'ON' : 'OFF'}</span>
                  </button>

                  <div className="h-[1px] bg-current opacity-10 my-0.5" />

                  <button
                    onClick={() => {
                      onOpenAudioSettings();
                      setShowQuickSettings(false);
                    }}
                    className="flex items-center justify-between px-2 py-1 rounded opacity-70 hover:opacity-100"
                  >
                    <span>DSP Equalizer</span>
                    <span className="text-[10px]">⚙</span>
                  </button>

                  <button
                    onClick={() => {
                      onSetSleepTimer(sleepMinutesLeft ? null : 30);
                    }}
                    className={`flex items-center justify-between px-2 py-1 rounded transition-colors ${
                      sleepMinutesLeft
                        ? 'bg-[#4edea3]/20 text-[#059669] dark:text-[#4edea3]'
                        : 'opacity-70 hover:opacity-100'
                    }`}
                  >
                    <span>Sleep Timer</span>
                    <span>{sleepMinutesLeft ? `${sleepMinutesLeft}m` : 'OFF'}</span>
                  </button>

                  <button
                    onClick={handleCopyLink}
                    className="flex items-center justify-between px-2 py-1 rounded opacity-70 hover:opacity-100"
                  >
                    <span>{copiedLink ? 'Link Copied!' : 'Copy Share Link'}</span>
                    <span className="material-symbols-outlined text-[13px]">
                      {copiedLink ? 'check' : 'share'}
                    </span>
                  </button>
                </div>
              )}
            </div>

            {/* Volume Control */}
            <div
              className="relative flex items-center"
              onMouseEnter={() => setShowVolumeSlider(true)}
              onMouseLeave={() => setShowVolumeSlider(false)}
            >
              {showVolumeSlider && (
                <div
                  className={`absolute bottom-8 right-0 p-2 rounded-xl border backdrop-blur-md shadow-xl flex items-center gap-2 w-28 z-50 ${
                    isLightMode ? 'bg-white/95 border-slate-200' : 'bg-[#0e131d]/95 border-white/10'
                  }`}
                >
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.02"
                    value={isMuted ? 0 : volume}
                    onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                    className="w-full h-1 bg-black/10 dark:bg-white/10 rounded-full appearance-none cursor-pointer accent-[#ffc174]"
                  />
                </div>
              )}

              <button
                onClick={onToggleMute}
                className="w-7 h-7 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-800 dark:hover:text-white transition-colors focus:outline-none"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                <span
                  className={`material-symbols-outlined text-[16px] ${
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
