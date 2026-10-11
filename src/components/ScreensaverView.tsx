import React, { useEffect, useRef, useState } from 'react';
import { Station } from '../types/radio';
import { audioEngine } from '../services/audioEngine';
import { getStationAtmosphere } from '../utils/stationAtmosphere';
import { SkinThemeId, SKIN_THEMES } from '../types/wallpaper';

interface ScreensaverViewProps {
  isOpen: boolean;
  onClose: () => void;
  activeStation: Station;
  isPlaying: boolean;
  isLightMode: boolean;
  skinTheme: SkinThemeId;
}

export const ScreensaverView: React.FC<ScreensaverViewProps> = ({
  isOpen,
  onClose,
  activeStation,
  isPlaying,
  isLightMode,
  skinTheme,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [timeStr, setTimeStr] = useState<string>('');
  const [utcStr, setUtcStr] = useState<string>('');

  const currentSkin = SKIN_THEMES.find((s) => s.id === skinTheme) || SKIN_THEMES[0];
  const atmosphere = getStationAtmosphere(activeStation, isLightMode);

  // Live Clock updater
  useEffect(() => {
    if (!isOpen) return;

    const updateClock = () => {
      const now = new Date();
      setTimeStr(
        now.toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })
      );
      setUtcStr(
        `${String(now.getUTCHours()).padStart(2, '0')}:${String(
          now.getUTCMinutes()
        ).padStart(2, '0')} UTC`
      );
    };

    updateClock();
    const interval = setInterval(updateClock, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  // Audio Visualizer Canvas
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;

    const render = () => {
      animId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);

      const freqData = audioEngine.getFrequencyData();
      const waveData = audioEngine.getAnalyserData();

      const accent = currentSkin.accentHex;

      // 1. Draw spectrum bars
      const barCount = 48;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const value = isPlaying && freqData ? (freqData[i * 2] || 0) / 255 : Math.sin(Date.now() * 0.003 + i * 0.2) * 0.15 + 0.15;
        const barHeight = Math.max(4, value * height * 0.7);
        const x = i * barWidth;
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, y, 0, height);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }

      // 2. Draw smooth central waveform ribbon
      if (waveData && isPlaying) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 10;

        const sliceWidth = width / waveData.length;
        let x = 0;

        for (let i = 0; i < waveData.length; i++) {
          const v = waveData[i] / 128.0;
          const y = (v * height) / 2;

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
          x += sliceWidth;
        }

        ctx.stroke();
        ctx.shadowBlur = 0;
      }
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, isPlaying, currentSkin]);

  // Handle escape key or click to dismiss
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'z') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#080b11] text-white flex flex-col justify-between p-8 sm:p-14 select-none cursor-pointer overflow-hidden animate-in fade-in duration-500"
    >
      {/* Background Nocturnal Photography Layer */}
      {atmosphere.pictureUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 filter blur-sm scale-105 pointer-events-none transition-all duration-1000"
          style={{ backgroundImage: `url(${atmosphere.pictureUrl})` }}
        />
      )}

      {/* Radiant Glow Atmosphere */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(circle at 50% 30%, ${atmosphere.color1}, transparent 70%),
            radial-gradient(circle at 20% 80%, ${atmosphere.color2}, transparent 60%)
          `,
        }}
      />

      {/* Top Bar Watermark */}
      <div className="relative z-10 flex items-center justify-between text-xs font-mono text-white/60">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: currentSkin.accentHex }} />
          <span className="tracking-widest uppercase font-semibold text-white">
            RADIO ATLAS • DESKTOP SCREENSAVER
          </span>
        </div>

        <div className="flex items-center gap-4">
          <span>{utcStr}</span>
          <span className="px-2 py-0.5 rounded border border-white/20 bg-black/40 text-[10px]">
            ESC / CLICK TO EXIT
          </span>
        </div>
      </div>

      {/* Centerpiece: Huge Glowing Clock & Station Metadata */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-4 text-center my-auto">
        {/* Giant Digital Clock */}
        <div className="font-mono text-7xl sm:text-9xl font-light tracking-tight text-white drop-shadow-[0_0_35px_rgba(255,255,255,0.25)]">
          {timeStr}
        </div>

        {/* Station Frequency & City */}
        <div className="flex flex-col items-center gap-1.5 mt-2">
          <div
            className="font-mono text-xl sm:text-2xl font-bold tracking-widest px-4 py-1 rounded-full border shadow-2xl backdrop-blur-md"
            style={{
              borderColor: currentSkin.accentHex,
              color: currentSkin.accentHex,
              backgroundColor: 'rgba(8, 11, 17, 0.7)',
            }}
          >
            {activeStation.frequencyDisplay} • {activeStation.city.toUpperCase()}
          </div>

          <div className="text-lg sm:text-xl font-medium text-white/90 drop-shadow">
            {activeStation.title}
          </div>

          <div className="text-xs sm:text-sm font-mono text-white/60">
            {activeStation.country} • {atmosphere.pictureTitle || 'Live Radio Garden Stream'}
          </div>
        </div>
      </div>

      {/* Bottom Visualizer Canvas */}
      <div className="relative z-10 w-full flex flex-col items-center gap-3">
        <canvas
          ref={canvasRef}
          width={800}
          height={90}
          className="w-full max-w-3xl h-20 opacity-80"
        />

        <div className="flex items-center gap-3 text-[11px] font-mono text-white/40">
          <span>ATMOSPHERE: {atmosphere.moodName.toUpperCase()}</span>
          <span>·</span>
          <span>SKIN: {currentSkin.name.toUpperCase()}</span>
          <span>·</span>
          <span>CARRIER STATUS: {isPlaying ? 'TRANSMITTING' : 'STANDBY'}</span>
        </div>
      </div>
    </div>
  );
};
