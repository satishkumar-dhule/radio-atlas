import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Station, RadioGardenPlace } from '../types/radio';

interface WorldMapProps {
  stations: Station[];
  allPlaces?: RadioGardenPlace[];
  activeStation: Station;
  onSelectStation: (station: Station) => void;
  isPlaying: boolean;
}

export const WorldMap: React.FC<WorldMapProps> = ({
  stations,
  allPlaces = [],
  activeStation,
  onSelectStation,
  isPlaying,
}) => {
  const [showAllNodes, setShowAllNodes] = useState<boolean>(true);
  const [showDayNight, setShowDayNight] = useState<boolean>(true);

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

    // Station mapPosition x (0..100) and y (0..100)
    // Convert to pixel offset from center
    const targetX = ((50 - st.mapPosition.x) / 100) * rect.width * (targetZoom / 1.0);
    const targetY = ((50 - st.mapPosition.y) / 100) * rect.height * (targetZoom / 1.0);

    setZoom(targetZoom);
    setPan({ x: targetX, y: targetY });
  }, [zoom]);

  // Zoom controls
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

  // Mouse wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.2 : 0.83;
    setZoom((prev) => {
      const newZoom = Math.min(6.0, Math.max(1.0, prev * zoomFactor));
      if (newZoom === 1.0) {
        setPan({ x: 0, y: 0 });
      } else {
        // Adjust pan slightly to zoom towards cursor
        setPan((p) => ({
          x: p.x * zoomFactor * 0.95,
          y: p.y * zoomFactor * 0.95,
        }));
      }
      return Math.round(newZoom * 100) / 100;
    });
  };

  // Drag handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return; // Only left click
    setIsDragging(true);
    setHasMoved(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    setHasMoved(true);
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;

    // Constrain pan within boundary limits based on zoom
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

  // Touch handlers for mobile
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

  // Calculate Sun terminator position for night hemisphere
  const now = new Date();
  const utcHours = now.getUTCHours() + now.getUTCMinutes() / 60;
  // Subsolar longitude in degrees
  const sunLng = -((utcHours - 12) * 15);
  // Convert sunLng to map percent x (0..100)
  const sunX = ((sunLng + 180) / 360) * 1000;
  // Night center is opposite sun
  const nightCenterX = (sunX + 500) % 1000;

  // Inverse scale for beacons so dots stay refined at high zoom
  const beaconScale = 1 / Math.pow(zoom, 0.45);

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
          className="w-full h-full object-contain pointer-events-none select-none opacity-45 transition-opacity duration-1000"
          preserveAspectRatio="xMidYMid meet"
          viewBox="0 0 1000 500"
        >
          <defs>
            <radialGradient cx="50%" cy="50%" id="oceanGlow" r="50%">
              <stop offset="0%" stopColor="#121a28" stopOpacity="0.4" />
              <stop offset="60%" stopColor="#0b0f17" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#080b11" stopOpacity="0" />
            </radialGradient>

            {/* Earth Day / Night Twilight Gradient */}
            <linearGradient id="twilightGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#080b11" stopOpacity="0.65" />
              <stop offset="45%" stopColor="#080b11" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#ffc174" stopOpacity="0.08" />
              <stop offset="55%" stopColor="#080b11" stopOpacity="0.1" />
              <stop offset="100%" stopColor="#080b11" stopOpacity="0.65" />
            </linearGradient>
          </defs>

          {/* Ocean Ambient Center Glow */}
          <circle cx="500" cy="250" fill="url(#oceanGlow)" r="390" />

          {/* Atmospheric Coordinate Grids */}
          <g stroke="#1e2738" strokeWidth="0.5" strokeDasharray="3 4" opacity="0.45">
            <line x1="80" y1="250" x2="920" y2="250" />
            <line x1="120" y1="160" x2="880" y2="160" />
            <line x1="120" y1="340" x2="880" y2="340" />
            <line x1="500" y1="60" x2="500" y2="440" />
            <line x1="300" y1="80" x2="300" y2="420" />
            <line x1="700" y1="80" x2="700" y2="420" />
          </g>

          {/* Continental Zen Silhouettes */}
          <g
            className="transition-all duration-700"
            fill="#131924"
            stroke="#1d2636"
            strokeLinejoin="round"
            strokeWidth="0.75"
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

            {/* Oceania / Australia */}
            <polygon points="780,340 850,330 880,380 840,430 760,410 750,360" />
            <polygon points="885,410 910,420 895,450 875,440" />
          </g>

          {/* Real-time Solar Night Shadow Terminator */}
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
        </svg>

        {/* Ambient Radio Garden place grid nodes */}
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
                <div className="w-1.5 h-1.5 rounded-full bg-[#4edea3]/40 shadow-[0_0_4px_#4edea3]" />
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
              className="station-node absolute cursor-pointer z-30 group p-3 focus:outline-none transition-transform duration-300"
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
                      className={`active-halo absolute w-14 h-14 rounded-full ${
                        isAmber ? 'bg-[#ffc174]/15' : 'bg-[#4edea3]/15'
                      } beacon-ripple pointer-events-none`}
                    />
                    <div
                      className={`active-halo-delayed absolute w-14 h-14 rounded-full ${
                        isAmber ? 'bg-[#ffc174]/10' : 'bg-[#4edea3]/10'
                      } beacon-ripple-delayed pointer-events-none`}
                    />
                    <div
                      className={`active-ping absolute w-7 h-7 rounded-full ${
                        isAmber ? 'bg-[#ffc174]/25' : 'bg-[#4edea3]/25'
                      } pointer-events-none transition-all`}
                    />
                  </>
                )}

                {/* Central Luminous Carrier Beacon Dot */}
                <div
                  className={`node-dot rounded-full transition-all duration-300 ${
                    isActive
                      ? isAmber
                        ? 'w-3.5 h-3.5 bg-[#ffc174] shadow-[0_0_20px_rgba(255,193,116,0.95)] scale-110'
                        : 'w-3.5 h-3.5 bg-[#4edea3] shadow-[0_0_20px_rgba(78,222,163,0.95)] scale-110'
                      : isAmber
                      ? 'w-2.5 h-2.5 bg-[#ffc174]/60 hover:bg-[#ffc174] shadow-[0_0_10px_rgba(255,193,116,0.5)] group-hover:scale-125'
                      : 'w-2.5 h-2.5 bg-[#4edea3]/60 hover:bg-[#4edea3] shadow-[0_0_10px_rgba(78,222,163,0.5)] group-hover:scale-125'
                  }`}
                />

                {/* Floating Tooltip Pill */}
                <div
                  style={{
                    transform: `translateX(-50%) scale(${1 / beaconScale})`,
                  }}
                  className={`absolute bottom-6 left-1/2 pointer-events-none whitespace-nowrap font-mono text-[11px] tracking-wider bg-[#080b11]/94 px-3 py-1.5 rounded-full border border-white/10 backdrop-blur-md shadow-2xl transition-all duration-300 z-50 origin-bottom ${
                    isActive
                      ? 'opacity-100 translate-y-0 text-[#e2e6f0] border-[#ffc174]/30'
                      : 'opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 text-[#a5b0c4]'
                  }`}
                >
                  <span className="font-semibold text-[#e2e6f0]">{st.city}</span>
                  <span className="text-white/30 mx-1.5">•</span>
                  <span className={isAmber ? 'text-[#ffc174]' : 'text-[#4edea3]'}>
                    {st.frequencyDisplay}
                  </span>
                  <span className="text-white/30 mx-1.5">•</span>
                  <span className="text-white/70 max-w-[140px] truncate inline-block align-bottom">
                    {st.title}
                  </span>
                  {isActive && isPlaying && (
                    <span className="ml-2 inline-flex items-center text-[10px] text-[#4edea3] animate-pulse">
                      ● LIVE STREAM
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* FLOATING ZOOM & COMPASS HUD CONTROLS */}
      <div className="absolute right-6 bottom-24 sm:bottom-28 z-40 flex flex-col items-center gap-1.5 bg-[#0e131d]/90 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl">
        {/* Zoom In */}
        <button
          onClick={handleZoomIn}
          title="Zoom in (+)"
          className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#e2e6f0] transition-colors active:scale-95 text-base"
        >
          +
        </button>

        {/* Zoom Value Display */}
        <div className="text-[10px] font-mono text-[#7d8799] py-0.5 tabular-nums">
          {Math.round(zoom * 100)}%
        </div>

        {/* Zoom Out */}
        <button
          onClick={handleZoomOut}
          title="Zoom out (−)"
          className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#e2e6f0] transition-colors active:scale-95 text-base"
        >
          −
        </button>

        <div className="w-4 h-[1px] bg-white/10 my-0.5" />

        {/* Focus on Active Station */}
        <button
          onClick={() => focusStation(activeStation)}
          title="Target Active Station"
          className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-[#ffc174]/20 hover:text-[#ffc174] flex items-center justify-center text-[#7d8799] transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[17px]">my_location</span>
        </button>

        {/* Reset View */}
        <button
          onClick={handleResetView}
          title="Reset to Full World View"
          className="w-8 h-8 rounded-xl bg-white/[0.04] hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors active:scale-95"
        >
          <span className="material-symbols-outlined text-[17px]">restart_alt</span>
        </button>
      </div>

      {/* MAP STATUS & MINI LOCATOR INSET */}
      <div className="absolute bottom-24 sm:bottom-28 left-6 z-30 hidden md:flex items-center gap-3">
        {/* Radio Garden Network Tag */}
        <div className="flex items-center gap-2 text-[10px] font-mono text-[#7d8799]/85 bg-[#080b11]/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-white/10 shadow-lg">
          <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3] shadow-[0_0_6px_#4edea3]" />
          <span>Interactive Zoomable Airwaves</span>
          <span className="text-white/20">|</span>
          <button
            onClick={() => setShowDayNight(!showDayNight)}
            className="hover:text-[#ffc174] transition-colors"
          >
            {showDayNight ? 'Night Shadow ON' : 'Night Shadow OFF'}
          </button>
          <span className="text-white/20">|</span>
          <button
            onClick={() => setShowAllNodes(!showAllNodes)}
            className="hover:text-[#4edea3] transition-colors"
          >
            {showAllNodes ? 'Place Nodes ON' : 'Place Nodes OFF'}
          </button>
        </div>
      </div>
    </main>
  );
};
