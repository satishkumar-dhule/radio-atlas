import React, { useState } from 'react';
import { WALLPAPERS, WallpaperId, SKIN_THEMES, SkinThemeId } from '../types/wallpaper';

interface WallpaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentWallpaper: WallpaperId;
  onSelectWallpaper: (id: WallpaperId) => void;
  currentSkin: SkinThemeId;
  onSelectSkin: (id: SkinThemeId) => void;
  isLightMode: boolean;
  onToggleTheme: () => void;
  onLaunchScreensaver?: () => void;
}

export const WallpaperModal: React.FC<WallpaperModalProps> = ({
  isOpen,
  onClose,
  currentWallpaper,
  onSelectWallpaper,
  currentSkin,
  onSelectSkin,
  isLightMode,
  onToggleTheme,
  onLaunchScreensaver,
}) => {
  const [activeTab, setActiveTab] = useState<'wallpapers' | 'skins'>('wallpapers');
  const [filterCategory, setFilterCategory] = useState<'all' | 'natural' | 'dark' | 'retro' | 'light'>('all');

  if (!isOpen) return null;

  const filteredWallpapers = WALLPAPERS.filter(
    (w) => filterCategory === 'all' || w.category === filterCategory
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0b0f17] border border-white/10 rounded-2xl shadow-[0_24px_70px_rgba(0,0,0,0.9)] p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#ffc174] text-xl">
              palette
            </span>
            <div>
              <h2 className="font-mono text-sm tracking-widest text-[#e2e6f0] uppercase font-semibold">
                Atmosphere, Skins & Wallpapers
              </h2>
              <span className="font-mono text-[10px] text-[#7d8799]">
                Customize visual themes, dynamic nocturnal scenes and hardware skins
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark / Light Mode Toggle Button */}
            <button
              onClick={onToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-mono text-[#e2e6f0] transition-colors"
              title="Toggle Light / Dark Mode"
            >
              <span className="material-symbols-outlined text-[14px] text-[#ffc174]">
                {isLightMode ? 'dark_mode' : 'light_mode'}
              </span>
              <span>{isLightMode ? 'Dark' : 'Light'}</span>
            </button>

            {onLaunchScreensaver && (
              <button
                onClick={() => {
                  onClose();
                  onLaunchScreensaver();
                }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ffc174]/15 hover:bg-[#ffc174]/25 border border-[#ffc174]/40 text-xs font-mono text-[#ffc174] transition-colors"
                title="Launch Zen Desktop Wallpaper Mode"
              >
                <span className="material-symbols-outlined text-[14px]">desktop_windows</span>
                <span>Screensaver</span>
              </button>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border-b border-white/5 pb-2">
          <div className="flex items-center gap-2 font-mono text-xs">
            <button
              onClick={() => setActiveTab('wallpapers')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === 'wallpapers'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#7d8799] hover:text-white'
              }`}
            >
              Backdrop Wallpapers ({WALLPAPERS.length})
            </button>
            <button
              onClick={() => setActiveTab('skins')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                activeTab === 'skins'
                  ? 'bg-white/15 text-white font-semibold'
                  : 'text-[#7d8799] hover:text-white'
              }`}
            >
              Telemetry Skins ({SKIN_THEMES.length})
            </button>
          </div>

          {activeTab === 'wallpapers' && (
            <div className="flex items-center gap-1 font-mono text-[10px]">
              {(['all', 'natural', 'dark', 'retro', 'light'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(cat)}
                  className={`px-2 py-0.5 rounded capitalize transition-colors ${
                    filterCategory === cat
                      ? 'bg-[#ffc174]/20 text-[#ffc174] font-semibold'
                      : 'text-[#7d8799] hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Tab 1: Wallpapers */}
        {activeTab === 'wallpapers' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
            {filteredWallpapers.map((wp) => {
              const isSelected = wp.id === currentWallpaper;

              return (
                <div
                  key={wp.id}
                  onClick={() => onSelectWallpaper(wp.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-2 group ${
                    isSelected
                      ? 'bg-[#192130] border-[#ffc174] shadow-[0_0_16px_rgba(255,193,116,0.22)]'
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

                  <div className="flex flex-col gap-0.5">
                    <span className="font-mono text-xs text-[#e2e6f0] font-medium group-hover:text-white">
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
        )}

        {/* Tab 2: Telemetry Skins */}
        {activeTab === 'skins' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[380px] overflow-y-auto pr-1">
            {SKIN_THEMES.map((sk) => {
              const isSelected = sk.id === currentSkin;

              return (
                <div
                  key={sk.id}
                  onClick={() => onSelectSkin(sk.id)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-[#192130] border-[#ffc174] shadow-[0_0_16px_rgba(255,193,116,0.22)]'
                      : 'bg-[#121824]/60 hover:bg-[#121824] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-5 h-5 rounded-full border border-white/20 shadow-lg"
                      style={{ backgroundColor: sk.accentHex }}
                    />
                    <div className="flex flex-col">
                      <span className="font-mono text-xs text-white font-medium">
                        {sk.name}
                      </span>
                      <span className="text-[10px] text-[#7d8799] font-mono">
                        Accent: {sk.accentHex}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`px-2.5 py-1 rounded-full text-[10px] font-mono border ${sk.badgeClass}`}
                  >
                    {isSelected ? 'ACTIVE' : 'SELECT'}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer info */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#7d8799]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[#4edea3] animate-pulse" />
            <span>Channel atmospheric sync active: visuals shift with every station tune</span>
          </div>
          <span>Radio Atlas Desktop FX</span>
        </div>
      </div>
    </div>
  );
};
