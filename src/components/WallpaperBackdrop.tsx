import React, { useMemo } from 'react';
import { WallpaperId } from '../types/wallpaper';

interface WallpaperBackdropProps {
  wallpaper: WallpaperId;
  isLightMode: boolean;
}

export const WallpaperBackdrop: React.FC<WallpaperBackdropProps> = ({
  wallpaper,
  isLightMode,
}) => {
  // Generate random static stars for the constellation wallpaper
  const stars = useMemo(() => {
    return Array.from({ length: 90 }, (_, i) => ({
      id: i,
      x: (i * 37) % 100,
      y: (i * 53) % 100,
      size: (i % 3) * 0.7 + 0.8,
      opacity: (i % 5) * 0.15 + 0.25,
      delay: (i % 7) * 0.7,
    }));
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-700">
      {/* 1. Obsidian Void (Default Dark) */}
      {wallpaper === 'obsidian' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_45%,rgba(255,193,116,0.038),transparent_75%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_55%_45%_at_78%_38%,rgba(78,222,163,0.028),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_40%_35%_at_25%_65%,rgba(142,213,255,0.02),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#080b11]/80 via-transparent to-[#080b11]/90" />
        </>
      )}

      {/* 2. Cosmic Starfield */}
      {wallpaper === 'constellations' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(30,41,69,0.4),transparent_80%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(142,213,255,0.04),transparent_50%)]" />
          <svg className="absolute inset-0 w-full h-full opacity-60">
            {stars.map((s) => (
              <circle
                key={s.id}
                cx={`${s.x}%`}
                cy={`${s.y}%`}
                r={s.size}
                fill="#e2e8f0"
                opacity={s.opacity}
                className="animate-pulse"
                style={{ animationDuration: `${3 + (s.id % 4)}s`, animationDelay: `${s.delay}s` }}
              />
            ))}
          </svg>
        </>
      )}

      {/* 3. Ionospheric Aurora */}
      {wallpaper === 'aurora' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_15%,rgba(78,222,163,0.08),transparent_70%)] animate-pulse" style={{ animationDuration: '6s' }} />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_35%,rgba(56,189,248,0.06),transparent_65%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_60%,rgba(168,85,247,0.04),transparent_70%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#061016]/80 via-transparent to-[#080b11]/90" />
        </>
      )}

      {/* 4. Midnight Rainscape */}
      {wallpaper === 'rain' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(14,23,42,0.6),transparent_80%)]" />
          {/* Subtle bokeh spots */}
          <div className="absolute top-[20%] left-[25%] w-48 h-48 rounded-full bg-amber-500/[0.03] blur-3xl" />
          <div className="absolute top-[50%] right-[30%] w-64 h-64 rounded-full bg-cyan-500/[0.03] blur-3xl" />
          <div className="absolute bottom-[20%] left-[45%] w-56 h-56 rounded-full bg-emerald-500/[0.02] blur-3xl" />
          {/* Rain streaks pattern */}
          <div className="absolute inset-0 bg-[linear-gradient(175deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[length:18px_48px] opacity-40" />
        </>
      )}

      {/* 5. Shortwave Radar Grid */}
      {wallpaper === 'radar' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06),transparent_75%)]" />
          {/* Circular radar rings */}
          <div className="absolute inset-0 flex items-center justify-center opacity-15">
            <div className="w-[300px] h-[300px] rounded-full border border-emerald-500/40" />
            <div className="absolute w-[600px] h-[600px] rounded-full border border-emerald-500/30" />
            <div className="absolute w-[900px] h-[900px] rounded-full border border-emerald-500/20" />
            <div className="absolute w-full h-[1px] bg-emerald-500/25" />
            <div className="absolute h-full w-[1px] bg-emerald-500/25" />
          </div>
        </>
      )}

      {/* 6. Amber Phosphor Tube */}
      {wallpaper === 'amber_phosphor' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,rgba(245,158,11,0.09),transparent_75%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_60%,rgba(217,119,6,0.05),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#140b05]/60 via-transparent to-[#0d0703]/80" />
        </>
      )}

      {/* 7. Cartographic Blueprint (Light Mode) */}
      {wallpaper === 'blueprint' && (
        <>
          <div className="absolute inset-0 bg-[#f1f4f9]" />
          {/* Architectural drafting grid */}
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:40px_40px] opacity-35" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.04),transparent_70%)]" />
        </>
      )}

      {/* 8. Solar Dawn Horizon (Light Mode) */}
      {wallpaper === 'solar_dawn' && (
        <>
          <div className="absolute inset-0 bg-[#f8f6f0]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_90%,rgba(251,191,36,0.12),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_80%,rgba(244,114,182,0.06),transparent_60%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_45%_at_70%_40%,rgba(147,197,253,0.08),transparent_65%)]" />
        </>
      )}
    </div>
  );
};
