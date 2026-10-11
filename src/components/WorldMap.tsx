import React, { useState, useRef, useCallback } from 'react';
import { Station, RadioGardenPlace } from '../types/radio';

interface WorldMapProps {
  stations: Station[];
  allPlaces?: RadioGardenPlace[];
  activeStation: Station;
  onSelectStation: (station: Station) => void;
  isPlaying: boolean;
  isLightMode: boolean;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  stations,
  allPlaces = [],
  activeStation,
  onSelectStation,
  isPlaying,
  isLightMode,
}) => {
  const [showAllNodes, setShowAllNodes] = useState<boolean>(true);
  const [showDayNight, setShowDayNight] = useState<boolean>(true);
  const [showSkywaveBeam, setShowSkywaveBeam] = useState<boolean>(true);

  // Pan & Zoom state
  const [zoom, setZoom] = useState<number>(1.0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [hasMoved, setHasMoved] = useState<boolean>(false);

  const containerRef = useRef<HTMLDivElement | null>(null);

  // Focus on active station
  const focusStation = useCallback((st: Station) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const targetZoom = Math.max(2.2, zoom);

    const targetX = ((50 - st.mapPosition.x) / 100) * rect.width * (targetZoom / 1.0);
    const targetY = ((50 - st.mapPosition.y) / 100) * rect.height * (targetZoom / 1.0);

    setZoom(targetZoom);
    setPan({ x: targetX, y: targetY });
  }, [zoom]);

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(6.0, Math.round((prev + 0.6) * 10) / 10));
  };

  const handleZoomOut = () => {
    setZoom((prev) => {
      const next = Math.max(1.0, Math.round((prev - 0.6) * 10) / 10);
      if (next === 1.0) setPan({ x: 0, y: 0 });
      return next;
    });
  };

  const handleResetView = () => {
    setZoom(1.0);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.83;
    setZoom((prev) => {
      const newZoom = Math.min(6.0, Math.max(1.0, prev * zoomFactor));
      if (newZoom === 1.0) {
        setPan({ x: 0, y: 0 });
      } else {
        setPan((p) => ({
          x: p.x * zoomFactor * 0.95,
          y: p.y * zoomFactor * 0.95,
        }));
      }
      return Math.round(newZoom * 100) / 100;
    });
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setHasMoved(true);
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    const maxPanX = (zoom - 1) * 450 + 200;
    const maxPanY = (zoom - 1) * 250 + 120;

    setPan({
      x: Math.max(-maxPanX, Math.min(maxPanX, newX)),
      y: Math.max(-maxPanY, Math.min(maxPanY, newY)),
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const touchStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX - pan.x,
        y: e.touches[0].clientY - pan.y,
      };
      setIsDragging(true);
      setHasMoved(false);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    setHasMoved(true);
    const newX = e.touches[0].clientX - touchStartRef.current.x;
    const newY = e.touches[0].clientY - touchStartRef.current.y;
    setPan({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Sun terminator
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  const sunLng = -((utcHours - 12) * 15);
  const sunX = ((sunLng + 180) / 360) * 1000;
  const nightCenterX = (sunX + 500) % 1000;

  const beaconScale = 1 / Math.pow(zoom, 0.45);

  const stX = (activeStation.mapPosition.x / 100) * 1000;
  const stY = (activeStation.mapPosition.y / 100) * 500;
  const listenerX = 880;
  const listenerY = 150;
  const midX = (stX + listenerX) / 2;
  const midY = Math.min(stY, listenerY) - 55;

  return (
    <main
      className="relative flex-1 w-full h-full flex items-center justify-center z-10 overflow-hidden select-none cursor-grab active:cursor-grabbing"
      onWheel={handleWheel}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Zoomable World Map Stage */}
      <div
        ref={containerRef}
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transition: isDragging ? 'none' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
          transformOrigin: 'center center',
        }}
        className="relative w-full max-w-[1380px] h-[78%] sm:h-[82%] flex items-center justify-center px-4 sm:px-6 pointer-events-auto"
      >
        <svg
          className="w-full h-full object-contain pointer-events-none select-none opacity-40 dark:opacity-40 transition-opacity duration-1000"
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 1000 500"
        >
          <defs>
            <radialGradient cx="50%" cy="50%" id="oceanGlow" r="50%">
              <stop
                offset="0%"
                stopColor={isLightMode ? '#cbd5e1' : '#121a28'}
                stopOpacity={isLightMode ? 0.25 : 0.35}
              />
              <stop
                offset="60%"
                stopColor={isLightMode ? '#e2e8f0' : '#0b0f17'}
                stopOpacity={isLightMode ? 0.1 : 0.18}
              />
              <stop
                offset="100%"
                stopColor={isLightMode ? '#f1f5f9' : '#080b11'}
                stopOpacity="0"
              />
            </radialGradient>

            <linearGradient id="twilightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isLightMode ? '#0f172a' : '#080b11'} stopOpacity={isLightMode ? 0.12 : 0.6} />
              <stop offset="45%" stopColor={isLightMode ? '#0f172a' : '#080b11'} stopOpacity="0.04" />
              <stop offset="50%" stopColor="#ffc174" stopOpacity="0.06" />
              <stop offset="55%" stopColor={isLightMode ? '#0f172a' : '#080b11'} stopOpacity="0.04" />
              <stop offset="100%" stopColor={isLightMode ? '#0f172a' : '#080b11'} stopOpacity={isLightMode ? 0.12 : 0.6} />
            </linearGradient>

            <linearGradient id="skywaveBeamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ffc174" stopOpacity="0.75" />
              <stop offset="50%" stopColor="#4edea3" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#8ed5ff" stopOpacity="0.25" />
            </linearGradient>
          </defs>

          {/* Ocean Ambient Center Glow */}
          <circle cx="500" cy="250" fill="url(#oceanGlow)" r="380" />

          {/* Hairline Coordinate Grids */}
          <g
            stroke={isLightMode ? '#94a3b8' : '#1e2738'}
            strokeWidth="0.35"
            strokeDasharray="2 4"
            opacity={isLightMode ? 0.5 : 0.4}
          >
            <line x1="80" y1="250" x2="920" y2="250" />
            <line x1="120" y1="160" x2="880" y2="160" />
            <line x1="120" y1="340" x2="880" y2="340" />
            <line x1="500" y1="60" x2="500" y2="440" />
            <line x1="300" y1="80" x2="300" y2="420" />
            <line x1="700" y1="80" x2="700" y2="420" />
          </g>

          {/* Continental Silhouettes */}
          <g
            className="transition-all duration-700"
            fill={isLightMode ? '#cbd5e1' : '#131924'}
            stroke={isLightMode ? '#94a3b8' : '#1d2636'}
            strokeLinejoin="round"
            strokeWidth="0.5"
          >
            {/* North America */}
            <polygon points="120,75 165,60 235,70 285,115 265,165 210,185 190,230 150,210 130,165 95,125 90,90" />
            <polygon points="140,235 160,240 180,280 155,290 135,260" />
            <polygon points="265,35 310,40 335,75 290,80 265,55" />

            {/* South America */}
            <polygon points="230,285 285,290 340,340 325,410 290,460 260,450 240,380 215,310" />

            {/* Europe & UK */}
            <polygon points="460,75 510,65 545,90 525,140 480,150 440,130 445,100" />
            <polygon points="490,50 520,40 530,70 500,75" />
            <polygon points="435,75 450,80 440,110 425,95" />

            {/* Africa */}
            <polygon points="450,175 530,175 570,235 565,300 520,375 470,365 435,280 425,215" />
            <polygon points="565,330 580,335 575,370 560,360" />

            {/* Eurasia & Asia */}
            <polygon points="545,80 620,65 740,75 860,115 875,165 825,195 765,175 700,240 640,230 590,205 550,150" />
            <polygon points="680,220 725,235 710,300 660,270" />
            <polygon points="760,255 820,265 810,305 770,295" />
            <polygon points="840,165 865,175 855,230 830,220" />

            {/* Oceania */}
            <polygon points="780,340 850,330 880,380 840,430 760,410 750,360" />
            <polygon points="885,410 910,420 895,450 875,440" />
          </g>

          {/* Solar Night Shadow */}
          {showDayNight && (
            <ellipse
              cx={nightCenterX}
              cy="250"
              rx="380"
              ry="240"
              fill="url(#twilightGrad)"
              className="pointer-events-none transition-all duration-1000"
            />
          )}

          {/* Ionospheric Skywave Beam */}
          {showSkywaveBeam && isPlaying && (
            <g className="transition-all duration-500">
              <path
                d={`M ${stX} ${stY} Q ${midX} ${midY} ${listenerX} ${listenerY}`}
                fill="none"
                stroke="url(#skywaveBeamGrad)"
                strokeWidth="1.25"
                strokeDasharray="3 4"
                opacity="0.75"
                className="animate-pulse"
              />
              <circle cx={stX} cy={stY} r="3.5" fill="#ffc174" opacity="0.9" />
              <circle cx={listenerX} cy={listenerY} r="2.5" fill="#4edea3" opacity="0.8" />
            </g>
          )}
        </svg>

        {/* Ambient Radio Garden place nodes */}
        {showAllNodes &&
          allPlaces.map((pl) => {
            const isNearActive =
              Math.abs(pl.mapPosition.x - activeStation.mapPosition.x) < 2 &&
              Math.abs(pl.mapPosition.y - activeStation.mapPosition.y) < 2;

            if (isNearActive) return null;

            return (
              <div
                key={pl.id}
                style={{
                  left: `${pl.mapPosition.x}%`,
                  top: `${pl.mapPosition.y}%`,
                  transform: `translate(-50%, -50%) scale(${beaconScale})`,
                }}
                className="absolute pointer-events-none z-20 transition-transform duration-300"
              >
                <div className={`w-1 h-1 rounded-full ${isLightMode ? 'bg-[#059669]/40' : 'bg-[#4edea3]/35'}`} />
              </div>
            );
          })}

        {/* PRIMARY ACTIVE & FEATURED RADIO GARDEN BEACONS */}
        {stations.map((st) => {
          const isActive = st.id === activeStation.id;
          const isAmber = st.accentColor === 'primary';

          return (
            <div
              key={st.id}
              onClick={(e) => {
                e.stopPropagation();
                if (!hasMoved) {
                  onSelectStation(st);
                }
              }}
              style={{
                left: `${st.mapPosition.x}%`,
                top: `${st.mapPosition.y}%`,
                transform: `translate(-50%, -50%) scale(${beaconScale})`,
              }}
              className="station-node absolute cursor-pointer z-30 group p-2.5 focus:outline-none transition-transform duration-300"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onSelectStation(st);
                }
              }}
              aria-label={`Tune to ${st.title} in ${st.city}`}
            >
              <div className="relative flex items-center justify-center">
                {/* Active Concentric Carrier Halo Ripple */}
                {isActive && (
                  <>
                    <div
                      className={`active-halo absolute w-12 h-12 rounded-full ${
                        isAmber ? 'bg-[#ffc174]/15' : 'bg-[#4edea3]/15'
                      } beacon-ripple pointer-events-none`}
                    />
                    <div
                      className={`active-ping absolute w-6 h-6 rounded-full ${
                        isAmber ? 'bg-[#ffc174]/20' : 'bg-[#4edea3]/20'
                      } pointer-events-none transition-all`}
                    />
                  </>
                )}

                {/* Central Luminous Carrier Beacon Dot */}
                <div
                  className={`node-dot rounded-full transition-all duration-300 ${
                    isActive
                      ? isAmber
                        ? 'w-3 h-3 bg-[#ffc174] shadow-[0_0_16px_rgba(255,193,116,0.9)] scale-110'
                        : 'w-3 h-3 bg-[#4edea3] shadow-[0_0_16px_rgba(78,222,163,0.9)] scale-110'
                      : isAmber
                      ? 'w-2 h-2 bg-[#ffc174]/60 hover:bg-[#ffc174] shadow-[0_0_8px_rgba(255,193,116,0.4)] group-hover:scale-125'
                      : 'w-2 h-2 bg-[#4edea3]/60 hover:bg-[#4edea3] shadow-[0_0_8px_rgba(78,222,163,0.4)] group-hover:scale-125'
                  }`}
                />

                {/* Floating Tooltip Pill */}
                <div
                  style={{
                    transform: `translateX(-50%) scale(${1 / beaconScale})`,
                  }}
                  className={`absolute bottom-5 left-1/2 pointer-events-none whitespace-nowrap font-mono text-[10px] tracking-wider px-2.5 py-1 rounded-full border backdrop-blur-md shadow-xl transition-all duration-300 z-50 origin-bottom ${
                    isLightMode
                      ? 'bg-white/95 text-slate-800 border-slate-300'
                      : 'bg-[#080b11]/94 text-[#e2e6f0] border-white/10'
                  } ${
                    isActive
                      ? 'opacity-100 translate-y-0 border-[#ffc174]/40'
                      : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0'
                  }`}
                >
                  <span className="font-semibold">{st.city}</span>
                  <span className="opacity-30 mx-1">•</span>
                  <span className={isAmber ? 'text-[#ffc174]' : 'text-[#059669] dark:text-[#4edea3]'}>
                    {st.frequencyDisplay}
                  </span>
                  <span className="opacity-30 mx-1">•</span>
                  <span className="opacity-75 max-w-[120px] truncate inline-block align-bottom">
                    {st.title}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* ULTRA-THIN SLENDER ZOOM CONTROLS (BOTTOM RIGHT) */}
      <div
        className={`absolute right-5 bottom-20 sm:bottom-24 z-40 flex flex-col items-center gap-1 p-1 rounded-xl border shadow-lg backdrop-blur-md transition-opacity duration-200 opacity-60 hover:opacity-100 ${
          isLightMode
            ? 'bg-white/80 border-slate-200 text-slate-700'
            : 'bg-[#0e131d]/80 border-white/10 text-[#e2e6f0]'
        }`}
      >
        <button
          onClick={handleZoomIn}
          title="Zoom in (+)"
          className="w-6 h-6 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 text-sm font-semibold"
        >
          +
        </button>

        <div className="text-[9px] font-mono opacity-60 tabular-nums">
          {Math.round(zoom * 100)}%
        </div>

        <button
          onClick={handleZoomOut}
          title="Zoom out (−)"
          className="w-6 h-6 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95 text-sm font-semibold"
        >
          −
        </button>

        <button
          onClick={() => focusStation(activeStation)}
          title="Center Active Station"
          className="w-6 h-6 rounded-lg hover:bg-[#ffc174]/20 hover:text-[#ffc174] flex items-center justify-center transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[14px]">my_location</span>
        </button>

        <button
          onClick={handleResetView}
          title="Reset to World View"
          className="w-6 h-6 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[14px]">restart_alt</span>
        </button>
      </div>
    </main>
  );
};
