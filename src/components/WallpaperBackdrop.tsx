import React, { useMemo, useState, useEffect } from 'react';
import { WallpaperId } from '../types/wallpaper';
import { Station } from '../types/radio';
import { getStationAtmosphere } from '../utils/stationAtmosphere';

interface WallpaperBackdropProps {
  wallpaper: WallpaperId;
  isLightMode: boolean;
  activeStation: Station;
  isPhotoEnabled?: boolean;
}

export const WallpaperBackdrop: React.FC<WallpaperBackdropProps> = ({
  wallpaper,
  isLightMode,
  activeStation,
  isPhotoEnabled = true,
}) => {
  // Generate random static stars for the constellation layer
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

  // Compute station-reactive atmosphere and scenic photo
  const atmosphere = useMemo(() => {
    return getStationAtmosphere(activeStation, isLightMode);
  }, [activeStation, isLightMode]);

  const { color1, color2, color3, glowPosition, moodName, hemisphere, pictureUrl, pictureTitle } =
    atmosphere;

  // Dual-buffer image state for smooth image crossfade on channel change
  const [currentImage, setCurrentImage] = useState<string>(pictureUrl);
  const [previousImage, setPreviousImage] = useState<string | null>(null);
  const [isCrossfading, setIsCrossfading] = useState<boolean>(false);

  useEffect(() => {
    if (pictureUrl !== currentImage) {
      setPreviousImage(currentImage);
      setCurrentImage(pictureUrl);
      setIsCrossfading(true);
      const timer = setTimeout(() => {
        setIsCrossfading(false);
        setPreviousImage(null);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [pictureUrl, currentImage]);

  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden transition-colors duration-1000">
      {/* 1. SCENIC CITY NOCTURNE PHOTOGRAPHY (Dynamic on every channel change!) */}
      {isPhotoEnabled && (
        <div className="absolute inset-0 overflow-hidden transition-opacity duration-1000">
          {/* Previous image fading out */}
          {previousImage && (
            <div
              className="absolute inset-0 bg-cover bg-center transition-opacity duration-1000 scale-100"
              style={{
                backgroundImage: `url(${previousImage})`,
                opacity: isLightMode ? 0.08 : 0.22,
                filter: isLightMode ? 'blur(10px) saturate(0.8)' : 'blur(8px) saturate(1.2) brightness(0.65)',
              }}
            />
          )}

          {/* Current image fading in with smooth scale drift */}
          <div
            key={currentImage}
            className={`absolute inset-0 bg-cover bg-center transition-all duration-1000 ${
              isCrossfading ? 'opacity-0 scale-105' : 'opacity-100 scale-100'
            }`}
            style={{
              backgroundImage: `url(${currentImage})`,
              opacity: isLightMode ? 0.10 : 0.26,
              filter: isLightMode ? 'blur(8px) saturate(0.9)' : 'blur(6px) saturate(1.25) brightness(0.7)',
            }}
          />

          {/* Vignette & Contrast Overlay */}
          <div
            className={`absolute inset-0 ${
              isLightMode
                ? 'bg-gradient-to-b from-[#f4f5f8]/85 via-[#f4f5f8]/75 to-[#f4f5f8]/90'
                : 'bg-gradient-to-b from-[#080b11]/85 via-[#080b11]/70 to-[#080b11]/90'
            }`}
          />
        </div>
      )}

      {/* 2. CHANNEL-REACTIVE ATMOSPHERIC ILLUMINATION (Shifts color & origin on every channel change!) */}
      <div
        style={{
          background: `
            radial-gradient(ellipse 70% 60% at ${glowPosition.x}% ${glowPosition.y}%, ${color1}, transparent 70%),
            radial-gradient(ellipse 60% 50% at ${100 - glowPosition.x}% ${Math.min(90, glowPosition.y + 20)}%, ${color2}, transparent 65%),
            radial-gradient(ellipse 50% 40% at 50% 85%, ${color3}, transparent 60%)
          `,
          transition: 'background 1.2s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className="absolute inset-0 opacity-100 transition-opacity duration-1000"
      />

      {/* 3. Station Mood & Photo Location Watermark */}
      <div className="absolute bottom-20 sm:bottom-2 left-1/2 -translate-x-1/2 pointer-events-none text-[9px] font-mono tracking-widest uppercase opacity-25 dark:opacity-30 whitespace-nowrap transition-opacity duration-1000 hidden md:flex items-center gap-2">
        <span>{moodName}</span>
        <span>·</span>
        <span>{hemisphere === 'north' ? 'Northern Sky' : 'Southern Sky'}</span>
        {isPhotoEnabled && (
          <>
            <span>·</span>
            <span className="truncate max-w-[200px]">{pictureTitle}</span>
          </>
        )}
      </div>

      {/* 4. WALLPAPER PRESET TEXTURE LAYERS (Layered over the reactive atmosphere) */}

      {/* Obsidian Void */}
      {wallpaper === 'obsidian' && (
        <div className="absolute inset-0 bg-gradient-to-b from-[#080b11]/70 via-transparent to-[#080b11]/85" />
      )}

      {/* Cosmic Starfield */}
      {wallpaper === 'constellations' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_50%,rgba(30,41,69,0.35),transparent_80%)]" />
          <svg className="absolute inset-0 w-full h-full opacity-60">
            {stars.map((s) => (
              <circle
                key={s.id}
                cx={`${s.x}%`}
                cy={`${s.y}%`}
                r={s.size}
                fill="#e2e6f0"
                opacity={s.opacity}
                className="animate-pulse"
                style={{ animationDuration: `${3 + (s.id % 4)}s`, animationDelay: `${s.delay}s` }}
              />
            ))}
          </svg>
        </>
      )}

      {/* Ionospheric Aurora */}
      {wallpaper === 'aurora' && (
        <>
          <div
            className="absolute inset-0 bg-[radial-gradient(ellipse_90%_45%_at_50%_15%,rgba(78,222,163,0.12),transparent_70%)] animate-pulse"
            style={{ animationDuration: '6s' }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_50%_at_70%_35%,rgba(56,189,248,0.08),transparent_65%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#061016]/70 via-transparent to-[#080b11]/85" />
        </>
      )}

      {/* Midnight Rainscape */}
      {wallpaper === 'rain' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(14,23,42,0.5),transparent_80%)]" />
          <div className="absolute top-[20%] left-[25%] w-48 h-48 rounded-full bg-amber-500/[0.04] blur-3xl" />
          <div className="absolute top-[50%] right-[30%] w-64 h-64 rounded-full bg-cyan-500/[0.04] blur-3xl" />
          <div className="absolute inset-0 bg-[linear-gradient(175deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[length:18px_48px] opacity-45" />
        </>
      )}

      {/* Shortwave Radar Grid */}
      {wallpaper === 'radar' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(16,185,129,0.06),transparent_75%)]" />
          <div className="absolute inset-0 flex items-center justify-center opacity-20">
            <div className="w-[300px] h-[300px] rounded-full border border-emerald-500/40" />
            <div className="absolute w-[600px] h-[600px] rounded-full border border-emerald-500/30" />
            <div className="absolute w-[900px] h-[900px] rounded-full border border-emerald-500/20" />
            <div className="absolute w-full h-[1px] bg-emerald-500/25" />
            <div className="absolute h-full w-[1px] bg-emerald-500/25" />
          </div>
        </>
      )}

      {/* Amber Phosphor Tube */}
      {wallpaper === 'amber_phosphor' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_75%_65%_at_50%_45%,rgba(245,158,11,0.10),transparent_75%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#140b05]/50 via-transparent to-[#0d0703]/75" />
        </>
      )}

      {/* Cartographic Blueprint (Light Mode) */}
      {wallpaper === 'blueprint' && (
        <>
          <div className="absolute inset-0 bg-[#f1f4f9]/85" />
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#cbd5e1_1px,transparent_1px),linear-gradient(to_bottom,#cbd5e1_1px,transparent_1px)] bg-[size:40px_40px] opacity-35" />
        </>
      )}

      {/* Solar Dawn Horizon (Light Mode) */}
      {wallpaper === 'solar_dawn' && (
        <>
          <div className="absolute inset-0 bg-[#f8f6f0]/85" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_90%,rgba(251,191,36,0.12),transparent_70%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_30%_80%,rgba(244,114,182,0.06),transparent_60%)]" />
        </>
      )}

      {/* Satellite Planetary Scenery */}
      {wallpaper === 'satellite_scenes' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_70%_at_50%_40%,rgba(14,40,58,0.4),transparent_75%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(16,185,129,0.06),transparent_60%)]" />
          <div className="absolute inset-0 bg-gradient-to-b from-[#06121e]/60 via-transparent to-[#040910]/80" />
        </>
      )}

      {/* Cyber Synthwave Grid */}
      {wallpaper === 'cyber_grid' && (
        <>
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_50%_at_50%_30%,rgba(244,63,94,0.08),transparent_70%)]" />
          <div
            className="absolute bottom-0 inset-x-0 h-[45%] opacity-25 pointer-events-none"
            style={{
              background: 'linear-gradient(to bottom, transparent, rgba(168,85,247,0.15)), repeating-linear-gradient(90deg, rgba(236,72,153,0.3) 0, rgba(236,72,153,0.3) 1px, transparent 1px, transparent 40px), repeating-linear-gradient(0deg, rgba(59,130,246,0.3) 0, rgba(59,130,246,0.3) 1px, transparent 1px, transparent 24px)',
              transform: 'perspective(400px) rotateX(60deg)',
              transformOrigin: 'bottom center',
            }}
          />
        </>
      )}
    </div>
  );
};
