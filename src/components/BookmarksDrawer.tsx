import React from 'react';
import { Station } from '../types/radio';

interface BookmarksDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  favorites: string[];
  activeStation: Station;
  onSelectStation: (st: Station) => void;
  onToggleFavorite: (id: string) => void;
}

export const BookmarksDrawer: React.FC<BookmarksDrawerProps> = ({
  isOpen,
  onClose,
  stations,
  favorites,
  activeStation,
  onSelectStation,
  onToggleFavorite,
}) => {
  if (!isOpen) return null;

  const bookmarkedStations = stations.filter((st) => favorites.includes(st.id));

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-sm h-full bg-[#0b0f17] border-l border-white/10 flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-label="Bookmarked Airwaves"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#ffc174] text-xl">
              bookmark
            </span>
            <div>
              <h2 className="font-mono text-sm tracking-widest text-[#e2e6f0] uppercase font-semibold">
                Saved Presets
              </h2>
              <span className="font-mono text-[10px] text-[#7d8799]">
                {bookmarkedStations.length} Saved Transmitters
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors"
          >
            ✕
          </button>
        </div>

        {/* List of Bookmarks */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2.5 pr-1">
          {bookmarkedStations.length === 0 ? (
            <div className="py-16 text-center text-xs font-mono text-[#7d8799] flex flex-col items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-white/20">
                star_outline
              </span>
              <span>No bookmarked stations yet.</span>
              <p className="text-[11px] text-white/40 max-w-[200px]">
                Click the star icon next to any station on the player, map, or directory to save your favorite airwaves!
              </p>
            </div>
          ) : (
            bookmarkedStations.map((st, idx) => {
              const isTuned = st.id === activeStation.id;

              return (
                <div
                  key={st.id}
                  onClick={() => {
                    onSelectStation(st);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex flex-col gap-1.5 group ${
                    isTuned
                      ? 'bg-[#192130] border-[#ffc174]/50 shadow-[0_0_12px_rgba(255,193,116,0.15)]'
                      : 'bg-[#121824]/60 hover:bg-[#121824] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-white/5 text-[#ffc174] font-semibold">
                        P{idx + 1}
                      </span>
                      <span className="text-xs font-medium text-[#e2e6f0] truncate">
                        {st.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-xs text-[#ffc174]">
                        {st.frequencyDisplay}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(st.id);
                        }}
                        className="text-[#ffc174] hover:text-red-400 p-1 transition-colors"
                        title="Remove from presets"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          star
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-[#7d8799]">
                    <span className="truncate">{st.city}, {st.country}</span>
                    {isTuned && (
                      <span className="font-mono text-[10px] text-[#4edea3] animate-pulse">
                        ● TUNED
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#7d8799]">
          <span>Direct Preset Tuning</span>
          <span className="text-[#ffc174]">Auto-Synced</span>
        </div>
      </div>
    </div>
  );
};
