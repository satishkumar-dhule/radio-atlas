import React from 'react';
import { EqPreset } from '../services/audioEngine';

interface AudioSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeEqPreset: EqPreset;
  onSelectEqPreset: (preset: EqPreset) => void;
  isRainActive: boolean;
  isVinylActive: boolean;
  isCosmicActive: boolean;
  onToggleRain: () => void;
  onToggleVinyl: () => void;
  onToggleCosmic: () => void;
  sleepMinutesLeft: number | null;
  onSetSleepTimer: (mins: number | null) => void;
}

export const AudioSettingsModal: React.FC<AudioSettingsModalProps> = ({
  isOpen,
  onClose,
  activeEqPreset,
  onSelectEqPreset,
  isRainActive,
  isVinylActive,
  isCosmicActive,
  onToggleRain,
  onToggleVinyl,
  onToggleCosmic,
  sleepMinutesLeft,
  onSetSleepTimer,
}) => {
  if (!isOpen) return null;

  const presets: { id: EqPreset; name: string; desc: string }[] = [
    {
      id: 'tube',
      name: 'Vacuum Tube Preamp',
      desc: 'Warm analog harmonic saturation and smooth high-end roll-off',
    },
    {
      id: 'clean',
      name: 'Pure Hi-Fi Flat',
      desc: 'Direct neutral monitor signal with maximum dynamic range',
    },
    {
      id: 'lofi',
      name: 'Vintage Shortwave Transistor',
      desc: 'Bandpass filtered 1970s portable radio aesthetic',
    },
    {
      id: 'deepbass',
      name: 'Midnight Sub-Bass Warmth',
      desc: 'Deep low-end shelf for late-night contemplative listening',
    },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg bg-[#0b0f17] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#ffc174] text-xl">
              tune
            </span>
            <div>
              <h2 className="font-mono text-sm tracking-widest text-[#e2e6f0] uppercase font-semibold">
                DSP Master Acoustics
              </h2>
              <span className="font-mono text-[10px] text-[#7d8799]">
                Hardware emulation & atmospheric soundscape layers
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* EQ Hardware Preamp Section */}
        <div className="flex flex-col gap-2">
          <span className="text-[11px] font-mono uppercase text-[#7d8799] font-semibold">
            Analog DSP Equalizer
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {presets.map((p) => {
              const isSelected = p.id === activeEqPreset;

              return (
                <div
                  key={p.id}
                  onClick={() => onSelectEqPreset(p.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1 ${
                    isSelected
                      ? 'bg-[#192130] border-[#ffc174] shadow-[0_0_12px_rgba(255,193,116,0.15)]'
                      : 'bg-[#121824]/60 hover:bg-[#121824] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-[#e2e6f0]">
                      {p.name}
                    </span>
                    {isSelected && (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#ffc174]" />
                    )}
                  </div>
                  <span className="text-[10px] text-[#7d8799] leading-tight">
                    {p.desc}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Atmosphere Soundscape Layers */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <span className="text-[11px] font-mono uppercase text-[#7d8799] font-semibold">
            Atmospheric Soundscape Generator
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={onToggleRain}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                isRainActive
                  ? 'bg-[#4edea3]/20 border-[#4edea3]/50 text-[#4edea3]'
                  : 'bg-[#121824]/60 border-white/5 text-[#7d8799] hover:text-[#e2e6f0]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">water_drop</span>
              <span className="font-mono text-xs">Night Rain</span>
              <span className="text-[9px] font-mono opacity-80">{isRainActive ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onToggleVinyl}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                isVinylActive
                  ? 'bg-[#ffc174]/20 border-[#ffc174]/50 text-[#ffc174]'
                  : 'bg-[#121824]/60 border-white/5 text-[#7d8799] hover:text-[#e2e6f0]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">album</span>
              <span className="font-mono text-xs">Vinyl Warmth</span>
              <span className="text-[9px] font-mono opacity-80">{isVinylActive ? 'ON' : 'OFF'}</span>
            </button>

            <button
              onClick={onToggleCosmic}
              className={`p-2.5 rounded-xl border text-center transition-all flex flex-col items-center gap-1.5 ${
                isCosmicActive
                  ? 'bg-[#8ed5ff]/20 border-[#8ed5ff]/50 text-[#8ed5ff]'
                  : 'bg-[#121824]/60 border-white/5 text-[#7d8799] hover:text-[#e2e6f0]'
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">blur_on</span>
              <span className="font-mono text-xs">Cosmic Drone</span>
              <span className="text-[9px] font-mono opacity-80">{isCosmicActive ? 'ON' : 'OFF'}</span>
            </button>
          </div>
        </div>

        {/* Sleep Timer */}
        <div className="flex flex-col gap-2 pt-2 border-t border-white/10">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-mono uppercase text-[#7d8799] font-semibold">
              Sleep Timer
            </span>
            {sleepMinutesLeft && (
              <span className="font-mono text-xs text-[#4edea3]">
                {sleepMinutesLeft} min remaining
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {[15, 30, 45, 60].map((m) => (
              <button
                key={m}
                onClick={() => onSetSleepTimer(m)}
                className={`flex-1 py-1.5 rounded-lg border text-xs font-mono transition-all ${
                  sleepMinutesLeft === m
                    ? 'bg-[#4edea3]/20 border-[#4edea3] text-[#4edea3]'
                    : 'bg-[#121824]/60 border-white/5 text-[#7d8799] hover:text-[#e2e6f0]'
                }`}
              >
                {m}m
              </button>
            ))}
            {sleepMinutesLeft && (
              <button
                onClick={() => onSetSleepTimer(null)}
                className="px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/30 text-xs font-mono text-red-400 hover:bg-red-500/25 transition-all"
              >
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
