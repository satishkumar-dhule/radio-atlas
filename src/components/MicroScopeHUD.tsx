import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/audioEngine';

interface MicroScopeHUDProps {
  isPlaying: boolean;
  isLightMode: boolean;
  onExpandScope: () => void;
  accentColor?: string;
}

export const MicroScopeHUD: React.FC<MicroScopeHUDProps> = ({
  isPlaying,
  isLightMode,
  onExpandScope,
  accentColor = '#4edea3',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<'wave' | 'fft'>('wave');
  const [isMinimized, setIsMinimized] = useState<boolean>(false);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (isMinimized) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let phase = 0;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark CRT clear
      ctx.fillStyle = isLightMode ? 'rgba(240, 243, 248, 0.45)' : 'rgba(8, 11, 17, 0.45)';
      ctx.fillRect(0, 0, width, height);

      // Subtle phosphor grid
      ctx.strokeStyle = isLightMode ? 'rgba(148, 163, 184, 0.15)' : 'rgba(78, 222, 163, 0.08)';
      ctx.lineWidth = 0.5;
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      if (mode === 'wave') {
        const timeData = audioEngine.getAnalyserData();
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = accentColor;
        ctx.shadowColor = accentColor;
        ctx.shadowBlur = isLightMode ? 2 : 4;
        ctx.beginPath();

        if (isPlaying && timeData && timeData.length > 0) {
          const sliceWidth = width / timeData.length;
          let x = 0;
          for (let i = 0; i < timeData.length; i++) {
            const v = timeData[i] / 128.0;
            const y = (v * height) / 2;
            if (i === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
            x += sliceWidth;
          }
        } else {
          // Idle sine trace
          phase += 0.06;
          for (let x = 0; x < width; x++) {
            const y = height / 2 + Math.sin(x * 0.08 + phase) * (isPlaying ? 5 : 2);
            if (x === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
        }
        ctx.stroke();
        ctx.shadowBlur = 0;
      } else {
        // FFT Frequency bars
        const freqData = audioEngine.getFrequencyData();
        const barCount = 24;
        const barWidth = width / barCount - 1;

        for (let i = 0; i < barCount; i++) {
          let mag = 0;
          if (isPlaying && freqData) {
            const dataIndex = Math.floor((i / barCount) * (freqData.length / 2));
            mag = freqData[dataIndex] / 255.0;
          } else {
            mag = Math.max(0.08, Math.sin(i * 0.4 + phase) * 0.2 + 0.15);
          }
          const barHeight = Math.max(2, mag * (height - 4));
          const x = i * (barWidth + 1);
          const y = height - barHeight;

          ctx.fillStyle = accentColor;
          ctx.fillRect(x, y, barWidth, barHeight);
        }
      }

      animFrameRef.current = requestAnimationFrame(render);
    };

    render();

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isPlaying, mode, isMinimized, isLightMode, accentColor]);

  if (isMinimized) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        title="Open Live CRT Scope HUD"
        className={`fixed bottom-24 right-4 sm:right-6 z-30 p-2 rounded-full border shadow-lg backdrop-blur-xl transition-all duration-300 flex items-center gap-1.5 text-[10px] font-mono ${
          isLightMode
            ? 'bg-white/85 border-slate-200/80 text-slate-700 shadow-slate-200/40'
            : 'bg-[#0e131d]/85 border-white/[0.08] text-[#e2e6f0] shadow-black/60 hover:border-white/15'
        }`}
      >
        <span className="material-symbols-outlined text-[13px] text-[#4edea3]">graphic_eq</span>
        <span className="hidden sm:inline">Scope HUD</span>
      </button>
    );
  }

  return (
    <div
      className={`fixed bottom-24 right-4 sm:right-6 z-30 hidden sm:flex flex-col gap-1.5 p-2 rounded-xl border shadow-xl backdrop-blur-xl transition-all duration-300 text-[9px] font-mono select-none ${
        isLightMode
          ? 'bg-white/85 border-slate-200/80 text-slate-700 shadow-slate-200/40'
          : 'bg-[#0e131d]/85 border-white/[0.08] text-[#e2e6f0] shadow-black/60 hover:border-white/15'
      }`}
    >
      {/* Top HUD bar */}
      <div className="flex items-center justify-between gap-3 border-b border-current/10 pb-1">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-1.5 h-1.5 rounded-full ${isPlaying ? 'animate-pulse' : 'opacity-40'}`}
            style={{ backgroundColor: accentColor }}
          />
          <span className="font-semibold tracking-wider uppercase text-[8px] opacity-80">
            CRT {mode === 'wave' ? 'Waveform' : 'Spectrum'}
          </span>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode Switcher */}
          <button
            onClick={() => setMode((m) => (m === 'wave' ? 'fft' : 'wave'))}
            title={mode === 'wave' ? 'Switch to FFT Spectrum' : 'Switch to Waveform'}
            className="px-1 py-0.2 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
          >
            {mode === 'wave' ? 'FFT' : 'OSC'}
          </button>

          {/* Full Screen Modal Expand */}
          <button
            onClick={onExpandScope}
            title="Expand Full CRT Scope Modal"
            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
          >
            <span className="material-symbols-outlined text-[11px]">open_in_full</span>
          </button>

          {/* Minimize */}
          <button
            onClick={() => setIsMinimized(true)}
            title="Minimize HUD"
            className="p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10 opacity-70 hover:opacity-100"
          >
            <span className="material-symbols-outlined text-[11px]">close</span>
          </button>
        </div>
      </div>

      {/* Retro Mini CRT Screen Canvas */}
      <div className="relative rounded overflow-hidden border border-current/10 bg-black/30 w-[140px] h-[52px]">
        <canvas ref={canvasRef} width={140} height={52} className="w-full h-full block" />
        <div className="absolute top-0.5 right-1 pointer-events-none text-[8px] opacity-60 tabular-nums">
          {isPlaying ? 'LOCK' : 'IDLE'}
        </div>
      </div>
    </div>
  );
};
