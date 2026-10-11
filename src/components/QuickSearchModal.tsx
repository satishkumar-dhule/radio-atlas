import React, { useState, useEffect, useRef } from 'react';
import { Station } from '../types/radio';
import { searchRadioGardenLive } from '../data/stations';

interface QuickSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  activeStation: Station;
  onSelectStation: (st: Station) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export const QuickSearchModal: React.FC<QuickSearchModalProps> = ({
  isOpen,
  onClose,
  stations,
  activeStation,
  onSelectStation,
  favorites,
  onToggleFavorite,
}) => {
  const [query, setQuery] = useState<string>('');
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [liveResults, setLiveResults] = useState<Station[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');

  const inputRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setSelectedIndex(0);
    } else {
      setQuery('');
      setLiveResults([]);
    }
  }, [isOpen]);

  // Live Radio Garden search debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setLiveResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      const res = await searchRadioGardenLive(query.trim());
      setLiveResults(res);
      setIsSearchingLive(false);
    }, 350);

    return () => clearTimeout(timer);
  }, [query]);

  // Filter local stations
  const filteredStations = stations.filter((st) => {
    if (filterMode === 'favorites' && !favorites.includes(st.id)) return false;
    if (!query.trim()) return true;

    const q = query.toLowerCase();
    return (
      st.title.toLowerCase().includes(q) ||
      st.city.toLowerCase().includes(q) ||
      st.country.toLowerCase().includes(q) ||
      st.frequencyDisplay.toLowerCase().includes(q)
    );
  });

  // Combine with live search results
  const allResults = [...filteredStations];
  liveResults.forEach((liveSt) => {
    if (!allResults.some((s) => s.id === liveSt.id)) {
      allResults.push(liveSt);
    }
  });

  // Clamp selected index
  const clampedResults = allResults.slice(0, 30);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, clampedResults.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + clampedResults.length) % Math.max(1, clampedResults.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (clampedResults[selectedIndex]) {
          onSelectStation(clampedResults[selectedIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, clampedResults, selectedIndex, onSelectStation, onClose]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const activeElement = listRef.current.children[selectedIndex] as HTMLElement;
      if (activeElement) {
        activeElement.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [selectedIndex]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 px-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-xl bg-[#0b0f17] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Search Bar Input */}
        <div className="relative flex items-center px-4 py-3.5 border-b border-white/10 bg-[#121824]/60">
          <span className="material-symbols-outlined text-[#ffc174] text-xl mr-3">
            {isSearchingLive ? 'autorenew' : 'search'}
          </span>
          <input
            ref={inputRef}
            type="text"
            placeholder="Quick search Radio Garden by station, city, frequency... (Cmd+K)"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            className="w-full bg-transparent text-sm text-[#e2e6f0] placeholder-[#7d8799]/70 focus:outline-none font-body"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-[#7d8799] hover:text-[#e2e6f0] text-xs px-2 py-1"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-block font-mono text-[10px] text-[#7d8799] bg-white/[0.05] border border-white/10 px-2 py-0.5 rounded ml-2">
            ESC
          </kbd>
        </div>

        {/* Quick Filter Bar */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-white/5 text-[11px] font-mono bg-[#0e131d]/40">
          <button
            onClick={() => {
              setFilterMode('all');
              setSelectedIndex(0);
            }}
            className={`px-2.5 py-1 rounded-md transition-colors ${
              filterMode === 'all'
                ? 'bg-[#ffc174]/20 text-[#ffc174] font-medium'
                : 'text-[#7d8799] hover:text-[#e2e6f0]'
            }`}
          >
            All Stations ({stations.length})
          </button>
          <button
            onClick={() => {
              setFilterMode('favorites');
              setSelectedIndex(0);
            }}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-md transition-colors ${
              filterMode === 'favorites'
                ? 'bg-[#ffc174]/20 text-[#ffc174] font-medium'
                : 'text-[#7d8799] hover:text-[#e2e6f0]'
            }`}
          >
            <span className="material-symbols-outlined text-[13px]">star</span>
            <span>Bookmarks ({favorites.length})</span>
          </button>
        </div>

        {/* Results List */}
        <div
          ref={listRef}
          className="max-h-80 sm:max-h-96 overflow-y-auto p-2 space-y-1 divide-y divide-white/[0.03]"
        >
          {clampedResults.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[#7d8799]">
              {filterMode === 'favorites'
                ? 'No bookmarked stations yet. Click the star icon on any station to save it!'
                : `No stations found for "${query}".`}
            </div>
          ) : (
            clampedResults.map((st, idx) => {
              const isSelected = idx === selectedIndex;
              const isCurrentPlaying = st.id === activeStation.id;
              const isFav = favorites.includes(st.id);

              return (
                <div
                  key={st.id}
                  onClick={() => {
                    onSelectStation(st);
                    onClose();
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#192130] text-[#e2e6f0]'
                      : 'hover:bg-[#121824]/60 text-[#a5b0c4]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isCurrentPlaying
                          ? 'bg-[#4edea3] shadow-[0_0_8px_#4edea3]'
                          : 'bg-[#7d8799]/60'
                      }`}
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium truncate text-[#e2e6f0]">
                          {st.title}
                        </span>
                        {isCurrentPlaying && (
                          <span className="text-[9px] font-mono text-[#4edea3] px-1.5 py-0.2 rounded bg-[#4edea3]/10">
                            TUNED
                          </span>
                        )}
                      </div>
                      <span className="text-[11px] text-[#7d8799] truncate">
                        {st.city}, {st.country}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="font-mono text-xs text-[#ffc174] font-medium">
                      {st.frequencyDisplay}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(st.id);
                      }}
                      className="p-1 text-[#7d8799] hover:text-[#ffc174] transition-colors"
                      title={isFav ? 'Remove bookmark' : 'Add bookmark'}
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {isFav ? 'star' : 'star_outline'}
                      </span>
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="px-4 py-2.5 bg-[#0a0e16] border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#7d8799]">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Tune In</span>
            <span>★ Bookmark</span>
          </div>
          <span>Radio Garden Live</span>
        </div>
      </div>
    </div>
  );
};
