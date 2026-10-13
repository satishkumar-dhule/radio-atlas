import React, { useEffect, useRef, useState, useMemo } from 'react';
import { Station } from '../types/radio';
import { audioEngine } from '../services/audioEngine';
import { getStationAtmosphere } from '../utils/stationAtmosphere';
import { generateStationTheme, StationDynamicPalette } from '../utils/themeFormula';

interface ScreensaverViewProps {
  isOpen: boolean;
  onClose: () => void;
  activeStation: Station;
  stations?: Station[];
  onSelectStation?: (st: Station) => void;
  isLightMode: boolean;
  palette?: StationDynamicPalette;
}

// Authentic Radio Station Frequency Tuner Dial with 3D Hover & Precision Needle
const StationRadioDialBadge: React.FC<{
  station: Station;
  isActive: boolean;
  onSelect: () => void;
  palette: StationDynamicPalette;
}> = ({ station, isActive, onSelect, palette }) => {
  const [isHovered, setIsHovered] = useState<boolean>(false);

  // Map station frequency (88.0 - 108.0 MHz) to dial needle angle (-130 deg to +130 deg)
  const clampedFreq = Math.min(108, Math.max(88, station.frequency));
  const freqRatio = (clampedFreq - 88) / 20; // 0.0 to 1.0
  const needleAngle = -130 + freqRatio * 260; // -130° to +130°

  const size = 112;
  const center = size / 2;
  const radius = center - 12;

  // Number of radial tuner tick lines
  const totalTicks = 28;

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="badge-perspective relative flex flex-col items-center gap-2 cursor-pointer group"
    >
      {/* 3D Analog Radio Tuner Dial */}
      <div
        className="radio-tuner-dial relative rounded-full p-1.5 backdrop-blur-2xl border transition-all duration-300 select-none"
        style={{
          width: size,
          height: size,
          backgroundColor: isActive
            ? 'rgba(10, 16, 28, 0.98)'
            : isHovered
            ? 'rgba(18, 26, 42, 0.90)'
            : 'rgba(8, 12, 20, 0.85)',
          borderColor: isActive
            ? palette.accentHex
            : isHovered
            ? `${palette.accentHex}90`
            : 'rgba(255, 255, 255, 0.16)',
          boxShadow: isHovered
            ? `0 24px 45px rgba(0, 0, 0, 0.9), 0 0 28px ${palette.accentHex}50`
            : isActive
            ? `0 12px 30px rgba(0, 0, 0, 0.7), 0 0 18px ${palette.accentHex}35`
            : '0 8px 20px rgba(0, 0, 0, 0.5)',
        }}
      >
        <svg width={size - 12} height={size - 12} className="overflow-visible">
          {/* Dial Face Outer Inset Ring */}
          <circle
            cx={center - 6}
            cy={center - 6}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.5"
          />

          {/* Active Band Arc Glow */}
          <circle
            cx={center - 6}
            cy={center - 6}
            r={radius - 1}
            fill="none"
            stroke={isActive ? palette.accentHex : 'rgba(255, 255, 255, 0.25)'}
            strokeWidth="2.5"
            strokeDasharray={`${radius * Math.PI * 1.44} 1000`}
            strokeDashoffset="0"
            strokeLinecap="round"
            className="transform -rotate-90 origin-center"
            style={{ opacity: isActive ? 0.9 : 0.3 }}
          />

          {/* Radial Frequency Ticks & Calibration Marks */}
          {Array.from({ length: totalTicks }).map((_, i) => {
            const tickRatio = i / (totalTicks - 1);
            const angleDeg = -130 + tickRatio * 260;
            const angleRad = (angleDeg * Math.PI) / 180;
            const isMajor = i % 4 === 0;
            const tickLength = isMajor ? 8 : 4;

            const rInner = radius - 3 - tickLength;
            const rOuter = radius - 3;

            const x1 = center - 6 + rInner * Math.sin(angleRad);
            const y1 = center - 6 - rInner * Math.cos(angleRad);
            const x2 = center - 6 + rOuter * Math.sin(angleRad);
            const y2 = center - 6 - rOuter * Math.cos(angleRad);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={
                  tickRatio <= freqRatio
                    ? palette.accentHex
                    : 'rgba(255, 255, 255, 0.22)'
                }
                strokeWidth={isMajor ? 1.8 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Dial Center Core Hub */}
          <circle
            cx={center - 6}
            cy={center - 6}
            r={radius * 0.42}
            fill="#050811"
            stroke={isActive ? `${palette.accentHex}70` : 'rgba(255, 255, 255, 0.12)'}
            strokeWidth="1.5"
          />

          {/* Tuner Indicator Needle */}
          <g transform={`rotate(${needleAngle}, ${center - 6}, ${center - 6})`}>
            {/* Needle Line */}
            <line
              x1={center - 6}
              y1={center - 6 + 4}
              x2={center - 6}
              y2={center - 6 - radius + 2}
              stroke={isActive ? '#ffffff' : palette.accentHex}
              strokeWidth="2"
              strokeLinecap="round"
              style={{
                filter: `drop-shadow(0 0 5px ${palette.accentHex})`,
              }}
            />
            {/* Needle Tip Red Marker Dot */}
            <circle
              cx={center - 6}
              cy={center - 6 - radius + 3}
              r="2"
              fill={isActive ? '#ffffff' : palette.accentHex}
            />
          </g>

          {/* Center Brass/Steel Fastener Nut */}
          <circle cx={center - 6} cy={center - 6} r="5" fill="#1e293b" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="1" />
          <circle cx={center - 6} cy={center - 6} r="2.5" fill={palette.accentHex} />
        </svg>

        {/* Center Station City Monogram & Active Status */}
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-3 pointer-events-none">
          <span
            className="font-mono text-[10px] font-bold tracking-widest leading-none"
            style={{ color: isActive ? palette.accentHex : '#e2e8f0' }}
          >
            {station.frequency.toFixed(1)}
          </span>
          <span className="font-mono text-[8px] uppercase opacity-50 text-white leading-none mt-0.5">
            MHz
          </span>
        </div>
      </div>

      {/* 3D Hover Tooltip Card */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-200 pointer-events-none ${
          isHovered ? 'scale-105 opacity-100' : 'opacity-85'
        }`}
      >
        <span
          className="font-mono text-xs font-semibold truncate max-w-[120px]"
          style={{ color: isActive ? palette.accentHex : '#ffffff' }}
        >
          {station.city}
        </span>
        <span className="font-mono text-[10px] opacity-60 text-white/70">
          {station.title.slice(0, 18)}
        </span>
      </div>
    </div>
  );
};

// Minimal Precision Analogue Clock Component
const AnalogueClock: React.FC<{
  date: Date;
  label: string;
  sublabel: string;
  accentColor: string;
  size?: number;
}> = ({ date, label, sublabel, accentColor, size = 180 }) => {
  const hours = date.getHours() % 12;
  const minutes = date.getMinutes();
  const seconds = date.getSeconds() + date.getMilliseconds() / 1000;

  const hourAngle = (hours + minutes / 60) * 30; // 360 / 12 = 30
  const minuteAngle = (minutes + seconds / 60) * 6; // 360 / 60 = 6
  const secondAngle = seconds * 6; // 360 / 60 = 6

  const center = size / 2;
  const radius = center - 10;

  return (
    <div className="flex flex-col items-center gap-3 select-none">
      <div
        className="relative rounded-full border shadow-2xl backdrop-blur-xl transition-all"
        style={{
          width: size,
          height: size,
          borderColor: `${accentColor}40`,
          backgroundColor: 'rgba(9, 13, 22, 0.75)',
          boxShadow: `0 0 35px ${accentColor}25`,
        }}
      >
        <svg width={size} height={size} className="overflow-visible">
          {/* Subtle Outer Dial Ring */}
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke="rgba(255, 255, 255, 0.08)"
            strokeWidth="1.5"
          />

          {/* 12 Hour Ticks */}
          {Array.from({ length: 12 }).map((_, i) => {
            const angle = (i * 30 * Math.PI) / 180;
            const isQuarter = i % 3 === 0;
            const innerR = radius - (isQuarter ? 10 : 5);
            const x1 = center + innerR * Math.sin(angle);
            const y1 = center - innerR * Math.cos(angle);
            const x2 = center + (radius - 2) * Math.sin(angle);
            const y2 = center - (radius - 2) * Math.cos(angle);

            return (
              <line
                key={i}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke={isQuarter ? accentColor : 'rgba(255, 255, 255, 0.3)'}
                strokeWidth={isQuarter ? 2 : 1}
                strokeLinecap="round"
              />
            );
          })}

          {/* Hour Hand */}
          <line
            x1={center}
            y1={center}
            x2={center + radius * 0.5 * Math.sin((hourAngle * Math.PI) / 180)}
            y2={center - radius * 0.5 * Math.cos((hourAngle * Math.PI) / 180)}
            stroke="#ffffff"
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Minute Hand */}
          <line
            x1={center}
            y1={center}
            x2={center + radius * 0.75 * Math.sin((minuteAngle * Math.PI) / 180)}
            y2={center - radius * 0.75 * Math.cos((minuteAngle * Math.PI) / 180)}
            stroke="rgba(255, 255, 255, 0.85)"
            strokeWidth="2.2"
            strokeLinecap="round"
          />

          {/* Precision Second Hand */}
          <line
            x1={center - radius * 0.18 * Math.sin((secondAngle * Math.PI) / 180)}
            y1={center + radius * 0.18 * Math.cos((secondAngle * Math.PI) / 180)}
            x2={center + radius * 0.85 * Math.sin((secondAngle * Math.PI) / 180)}
            y2={center - radius * 0.85 * Math.cos((secondAngle * Math.PI) / 180)}
            stroke={accentColor}
            strokeWidth="1.5"
            strokeLinecap="round"
          />

          {/* Center Pivot Pin */}
          <circle cx={center} cy={center} r="4" fill="#ffffff" />
          <circle cx={center} cy={center} r="2" fill={accentColor} />
        </svg>
      </div>

      {/* Clock Details */}
      <div className="flex flex-col items-center text-center">
        <span className="font-mono text-xs font-semibold tracking-widest uppercase text-white">
          {label}
        </span>
        <span className="font-mono text-[11px] opacity-60 text-white/70">
          {sublabel}
        </span>
      </div>
    </div>
  );
};

export const ScreensaverView: React.FC<ScreensaverViewProps> = ({
  isOpen,
  onClose,
  activeStation,
  stations = [],
  onSelectStation,
  isLightMode,
  palette: propPalette,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [now, setNow] = useState<Date>(new Date());

  const palette = useMemo(() => {
    if (propPalette) return propPalette;
    const lat = activeStation.coordinates?.lat ?? 0;
    const lng = activeStation.coordinates?.lng ?? 0;
    return generateStationTheme(activeStation.id, activeStation.city, lat, lng, activeStation.frequency);
  }, [activeStation, propPalette]);

  const atmosphere = getStationAtmosphere(activeStation, isLightMode);

  // Compute station local time based on geo longitude
  const stationDate = useMemo(() => {
    const lng = activeStation.geo ? activeStation.geo[0] : activeStation.coordinates?.lng ?? 0;
    const offsetHours = Math.round(lng / 15);
    const utcTime = now.getTime() + now.getTimezoneOffset() * 60000;
    return new Date(utcTime + offsetHours * 3600000);
  }, [activeStation, now]);

  // Live frame ticker for smooth second hand motion
  useEffect(() => {
    if (!isOpen) return;
    let animId: number;
    const update = () => {
      setNow(new Date());
      animId = requestAnimationFrame(update);
    };
    animId = requestAnimationFrame(update);
    return () => cancelAnimationFrame(animId);
  }, [isOpen]);

  // Real-time audio waveform canvas
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
      const accent = palette.accentHex;

      // Spectrum Bars
      const barCount = 48;
      const barWidth = width / barCount;

      for (let i = 0; i < barCount; i++) {
        const val = freqData ? (freqData[i * 2] || 0) / 255 : Math.sin(Date.now() * 0.003 + i * 0.2) * 0.15 + 0.15;
        const barHeight = Math.max(4, val * height * 0.7);
        const x = i * barWidth;
        const y = height - barHeight;

        const grad = ctx.createLinearGradient(0, y, 0, height);
        grad.addColorStop(0, accent);
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.fillRect(x + 1, y, barWidth - 2, barHeight);
      }

      // Smooth central waveform
      if (waveData) {
        ctx.beginPath();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.shadowColor = accent;
        ctx.shadowBlur = 8;

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
    return () => cancelAnimationFrame(animId);
  }, [isOpen, palette]);

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

  // Curate station badges for Apple Watch ring grid
  const badgeStations = (stations.length > 0 ? stations : [activeStation]).slice(0, 8);

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#080b11] text-white flex flex-col justify-between p-6 sm:p-10 select-none cursor-pointer overflow-y-auto animate-in fade-in duration-500"
    >
      {/* Background Nocturnal Atmosphere */}
      {atmosphere.pictureUrl && (
        <div
          className="absolute inset-0 bg-cover bg-center opacity-20 filter blur-sm scale-105 pointer-events-none transition-all duration-1000"
          style={{ backgroundImage: `url(${atmosphere.pictureUrl})` }}
        />
      )}

      {/* Radiant Color Halo */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `radial-gradient(circle at 50% 30%, ${palette.accentMuted}, transparent 70%)`,
        }}
      />

      {/* Header Watermark */}
      <div className="relative z-10 flex items-center justify-between text-xs font-mono text-white/60 mb-4">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: palette.accentHex }} />
          <span className="tracking-widest uppercase font-semibold text-white">
            RADIO ATLAS • ANALOGUE TIME & ACTIVITY BADGES
          </span>
        </div>

        <span className="px-2 py-0.5 rounded border border-white/20 bg-black/40 text-[10px]">
          ESC / CLICK TO EXIT
        </span>
      </div>

      {/* Centerpiece 1: Dual Analogue Clocks (User Local Time & Station Local Time) */}
      <div className="relative z-10 flex flex-col items-center justify-center gap-6 my-auto">
        <div className="flex flex-col sm:flex-row items-center justify-center gap-8 sm:gap-16">
          {/* 1. Viewer's Local Analogue Clock */}
          <AnalogueClock
            date={now}
            label="Your Local Time"
            sublabel={now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            accentColor="#ffffff"
            size={165}
          />

          {/* 2. Station's Local Analogue Clock */}
          <AnalogueClock
            date={stationDate}
            label={`${activeStation.city.toUpperCase()} TIME`}
            sublabel={`${stationDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })} (${activeStation.country})`}
            accentColor={palette.accentHex}
            size={185}
          />
        </div>

        {/* Centerpiece 2: ANALOG RADIO STATION FREQUENCY TUNER DIALS (Interactive 3D Hover) */}
        <div className="flex flex-col items-center gap-3 w-full max-w-4xl mt-3">
          <div className="flex items-center gap-2 text-xs font-mono tracking-widest text-white/50 uppercase">
            <span>Analog Radio Frequency Dials</span>
            <span className="opacity-30">·</span>
            <span className="text-[10px] opacity-75">Click to Tune • Hover for 3D</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-6 p-4 rounded-3xl bg-black/40 border border-white/10 backdrop-blur-xl">
            {badgeStations.map((st) => (
              <StationRadioDialBadge
                key={st.id}
                station={st}
                isActive={st.id === activeStation.id}
                onSelect={() => {
                  if (onSelectStation) {
                    onSelectStation(st);
                  }
                }}
                palette={palette}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Live Audio Beat Visualizer */}
      <div className="relative z-10 w-full flex flex-col items-center gap-2 mt-4">
        <canvas
          ref={canvasRef}
          width={800}
          height={60}
          className="w-full max-w-3xl h-14 opacity-85"
        />

        <div className="flex items-center gap-3 text-[11px] font-mono text-white/40">
          <span>ON-AIR: {activeStation.title.toUpperCase()}</span>
          <span>·</span>
          <span style={{ color: palette.accentHex }}>
            {activeStation.frequencyDisplay}
          </span>
          <span>·</span>
          <span>LIVE CARRIER</span>
        </div>
      </div>
    </div>
  );
};
