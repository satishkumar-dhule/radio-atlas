import React from 'react';
import { WALLPAPERS, WallpaperId } from '../types/wallpaper';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: WallpaperId;
  onSelectWallpaper: (id: WallpaperId) => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper,
  onSelectWallpaper,
  isLightMode,
  onToggleTheme,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/65 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0b0f17] dark:bg-[#0b0f17] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#ffc174] text-xl">
              wallpaper
            </span>
            <div>
              <h2 className="font-mono text-sm tracking-widest text-[#e2e6f0] uppercase font-semibold">
                Atmosphere & Wallpapers
              </h2>
              <span className="font-mono text-[10px] text-[#7d8799]">
                Choose visual backdrop and light/dark theme
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-[#e2e6f0] transition-colors"
              title="Toggle Light / Dark Mode"
            >
              <span className="material-symbols-outlined text-[15px] text-[#ffc174]">
                {isLightMode ? 'dark_mode' : 'light_mode'}
              </span>
              <span>{isLightMode ? 'Dark Mode' : 'Light Mode'}</span>
            </button>

            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Wallpaper Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-96 overflow-y-auto pr-1">
          {WALLPAPERS.map((wp) => {
            const isSelected = wp.id === currentWallpaper;

            return (
              <div
                key={wp.id}
                onClick={() => {
                  onSelectWallpaper(wp.id);
                }}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 group ${
                  isSelected
                    ? 'bg-[#192130] border-[#ffc174] shadow-[0_0_16px_rgba(255,193,116,0.18)]'
                    : 'bg-[#121824]/60 hover:bg-[#121824] border-white/5 hover:border-white/15'
                }`}
              >
                {/* Visual Swatch */}
                <div
                  className={`w-full h-14 rounded-lg bg-gradient-to-r ${wp.previewGradient} border border-white/10 relative overflow-hidden flex items-end p-2`}
                >
                  <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 rounded bg-black/60 text-white/90 backdrop-blur-sm">
                    {wp.category}
                  </span>
                  {isSelected && (
                    <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#ffc174] shadow-[0_0_8px_#ffc174]" />
                  )}
                </div>

                {/* Details */}
                <div className="flex flex-col">
                  <span className="font-semibold text-xs text-[#e2e6f0]">
                    {wp.name}
                  </span>
                  <span className="text-[11px] text-[#7d8799] line-clamp-1">
                    {wp.description}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#7d8799]">
          <span>Procedural Free Themes</span>
          <span className="text-[#ffc174]">Instant Client-Side Render</span>
        </div>
      </div>
    </div>
  );
};
