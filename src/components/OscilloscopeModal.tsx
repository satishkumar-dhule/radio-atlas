import React, { useEffect, useRef, useState } from 'react';
import { audioEngine } from '../services/audioEngine';
import { Station } from '../types/radio';

interface OscilloscopeModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStation: Station;
  currentFrequency: number;
  isPlaying: boolean;
}

export const OscilloscopeModal: React.FC<OscilloscopeModalProps> = ({
  isOpen,
  onClose,
  activeStation,
  currentFrequency,
  isPlaying,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [viewMode, setViewMode] = useState<'waveform' | 'spectrum'>('waveform');

  useEffect(() => {
    if (!isOpen) return;

    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const render = () => {
      const width = canvas.width;
      const height = canvas.height;

      // Dark phosphor persistence decay
      ctx.fillStyle = 'rgba(8, 11, 17, 0.22)';
      ctx.fillRect(0, 0, width, height);

      // CRT Grid Lines
      ctx.strokeStyle = 'rgba(78, 222, 163, 0.08)';
      ctx.lineWidth = 1;

      // Horizontal grid lines
      for (let y = 20; y < height; y += 30) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Vertical grid lines
      for (let x = 20; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }

      // Center crosshairs
      ctx.strokeStyle = 'rgba(78, 222, 163, 0.2)';
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.moveTo(width / 2, 0);
      ctx.lineTo(width / 2, height);
      ctx.stroke();

      const timeData = audioEngine.getAnalyserData();
      const freqData = audioEngine.getFrequencyData();

      const delta = Math.abs(currentFrequency - activeStation.frequency);
      const isLocked = delta < 0.15 && isPlaying;

      if (viewMode === 'waveform') {
        ctx.lineWidth = 2;
        ctx.strokeStyle = isLocked ? '#4edea3' : '#ffc174';
        ctx.shadowBlur = 8;
        ctx.shadowColor = isLocked ? 'rgba(78, 222, 163, 0.8)' : 'rgba(255, 193, 116, 0.8)';
        ctx.beginPath();

        const sliceWidth = (width * 1.0) / (timeData ? timeData.length : 128);
        let x = 0;

        if (timeData && isPlaying) {
          for (let i = 0; i < timeData.length; i++) {
            // If delta > 0.15, introduce static noise distortion
            let v = timeData[i] / 128.0;
            if (delta >= 0.15) {
              const noiseAmount = Math.min(1.0, delta * 1.5);
              v += (Math.random() - 0.5) * noiseAmount;
            }
            const y = (v * height) / 2;

            if (i === 0) {
              ctx.moveTo(x, y);
            } else {
              ctx.lineTo(x, y);
            }
            x += sliceWidth;
          }
        } else {
          // Flatline with micro hum
          for (let i = 0; i < width; i += 5) {
            const y = height / 2 + (Math.sin(i * 0.05 + Date.now() * 0.002) * (isPlaying ? 12 : 2));
            if (i === 0) ctx.moveTo(i, y);
            else ctx.lineTo(i, y);
          }
        }

        ctx.stroke();
        ctx.shadowBlur = 0; // reset
      } else {
        // Spectrum FFT View
        if (freqData) {
          const barWidth = (width / freqData.length) * 2.5;
          let barX = 0;

          for (let i = 0; i < freqData.length; i++) {
            const barHeight = (freqData[i] / 255) * (height - 20);
            const hue = isLocked ? '#4edea3' : '#ffc174';

            ctx.fillStyle = hue;
            ctx.shadowBlur = 4;
            ctx.shadowColor = hue;
            ctx.fillRect(barX, height - barHeight, barWidth - 1, barHeight);

            barX += barWidth;
            if (barX > width) break;
          }
          ctx.shadowBlur = 0;
        }
      }

      animId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [isOpen, viewMode, currentFrequency, activeStation, isPlaying]);

  if (!isOpen) return null;

  const delta = Math.abs(currentFrequency - activeStation.frequency);
  const isLocked = delta < 0.15;
  const snr = isLocked ? (48 - delta * 40).toFixed(1) : (12 - Math.min(10, delta * 15)).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0b0f17] border border-white/10 rounded-2xl p-5 sm:p-6 shadow-[0_16px_48px_rgba(0,0,0,0.8)] flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] shadow-[0_0_8px_#4edea3]" />
            <h2 className="font-mono text-sm uppercase tracking-wider text-[#e2e6f0]">
              CRT Carrier Signal Scope
            </h2>
            <span className="font-mono text-[11px] text-[#7d8799] hidden sm:inline">
              // TELEMETRY MONITOR
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View Mode Toggle */}
            <div className="flex items-center bg-white/[0.04] p-1 rounded-lg border border-white/5 text-[11px] font-mono">
              <button
                onClick={() => setViewMode('waveform')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === 'waveform'
                    ? 'bg-[#4edea3]/20 text-[#4edea3]'
                    : 'text-[#7d8799] hover:text-[#e2e6f0]'
                }`}
              >
                Waveform
              </button>
              <button
                onClick={() => setViewMode('spectrum')}
                className={`px-2.5 py-1 rounded transition-colors ${
                  viewMode === 'spectrum'
                    ? 'bg-[#4edea3]/20 text-[#4edea3]'
                    : 'text-[#7d8799] hover:text-[#e2e6f0]'
                }`}
              >
                Spectrum
              </button>
            </div>

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors"
              aria-label="Close Oscilloscope"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Oscilloscope Screen */}
        <div className="relative w-full h-56 sm:h-64 rounded-xl overflow-hidden border border-[#1e2738] bg-[#06090f] shadow-inner">
          <canvas
            ref={canvasRef}
            width={640}
            height={260}
            className="w-full h-full block"
          />

          {/* CRT Screen Scanlines / Graticule Overlay */}
          <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.6)_100%)]" />
          <div className="absolute top-2 left-3 font-mono text-[10px] text-[#4edea3]/70">
            CH1: 50mV/DIV · 10ms/DIV
          </div>
          <div className="absolute top-2 right-3 font-mono text-[10px] text-[#ffc174]/70">
            {isLocked ? '● STEREO LOCK' : '○ SEEKING CARRIER'}
          </div>
        </div>

        {/* Live Telemetry Gauges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs text-[#7d8799]">
          <div className="bg-[#121824]/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-[10px] uppercase text-[#7d8799]/80 block">Carrier Freq</span>
            <span className="text-[#ffc174] font-medium text-sm tabular-nums">
              {currentFrequency.toFixed(2)} MHz
            </span>
          </div>

          <div className="bg-[#121824]/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-[10px] uppercase text-[#7d8799]/80 block">Signal Strength</span>
            <span className="text-[#4edea3] font-medium text-sm tabular-nums">
              {isLocked ? `${activeStation.rssi} dBm` : '-89 dBm'}
            </span>
          </div>

          <div className="bg-[#121824]/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-[10px] uppercase text-[#7d8799]/80 block">SNR Ratio</span>
            <span className="text-[#e2e6f0] font-medium text-sm tabular-nums">
              {snr} dB
            </span>
          </div>

          <div className="bg-[#121824]/60 p-2.5 rounded-lg border border-white/5">
            <span className="text-[10px] uppercase text-[#7d8799]/80 block">Format</span>
            <span className="text-[#a5b0c4] font-medium text-sm truncate">
              {activeStation.bitrate}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
