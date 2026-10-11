import React, { useState, useEffect, useRef } from 'react';
import { Station, RadioGardenPlace } from '../types/radio';
import { searchRadioGardenLive } from '../data/stations';
import { radioGardenService } from '../services/radioGardenService';

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
  const [matchingPlaces, setMatchingPlaces] = useState<RadioGardenPlace[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'all' | 'favorites'>('all');
  const [isLoadingPlace, setIsLoadingPlace] = useState<string | null>(null);

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
      setMatchingPlaces([]);
    }
  }, [isOpen]);

  // Live Radio Garden search & 12k+ places search debounce
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setLiveResults([]);
      setMatchingPlaces([]);
      return;
    }

    // Immediate 12k+ places matching from compact memory cache
    const places = radioGardenService.searchPlaces(query.trim(), 12);
    setMatchingPlaces(places);

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      const res = await searchRadioGardenLive(query.trim());
      setLiveResults(res);
      setIsSearchingLive(false);
    }, 300);

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

  // Combine station results
  const allResults = [...filteredStations];
  liveResults.forEach((liveSt) => {
    if (!allResults.some((s) => s.id === liveSt.id)) {
      allResults.push(liveSt);
    }
  });

  const clampedStations = allResults.slice(0, 25);

  const handleSelectPlace = async (place: RadioGardenPlace) => {
    setIsLoadingPlace(place.id);
    try {
      const channels = await radioGardenService.fetchChannelsForPlace(place);
      if (channels.length > 0) {
        onSelectStation(channels[0]);
        onClose();
      }
    } finally {
      setIsLoadingPlace(null);
    }
  };

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, clampedStations.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + clampedStations.length) % Math.max(1, clampedStations.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (clampedStations[selectedIndex]) {
          onSelectStation(clampedStations[selectedIndex]);
          onClose();
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, clampedStations, selectedIndex, onSelectStation, onClose]);

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
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Search all 12,845+ cities, countries or frequencies..."
            className="w-full bg-transparent text-sm text-[#e2e6f0] placeholder-slate-400 focus:outline-none font-body"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setLiveResults([]);
                setMatchingPlaces([]);
              }}
              className="p-1 text-slate-400 hover:text-white rounded-full"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          )}
          <kbd className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-mono text-slate-400 bg-white/5 border border-white/10 rounded">
            ESC
          </kbd>
        </div>

        {/* Filter Pills Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b border-white/5 bg-[#0e1420]/40 text-xs">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setFilterMode('all')}
              className={`px-2.5 py-1 rounded-full text-[11px] font-mono transition-all ${
                filterMode === 'all'
                  ? 'bg-[#ffc174] text-[#080b11] font-medium'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              All Airwaves
            </button>
            <button
              onClick={() => setFilterMode('favorites')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-mono transition-all ${
                filterMode === 'favorites'
                  ? 'bg-[#ffc174] text-[#080b11] font-medium'
                  : 'text-slate-400 hover:text-white bg-white/5'
              }`}
            >
              <span className="material-symbols-outlined text-xs">star</span>
              <span>Saved ({favorites.length})</span>
            </button>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            {allResults.length} stations · {matchingPlaces.length > 0 ? `${matchingPlaces.length} cities` : '12,845 places'}
          </span>
        </div>

        {/* Results List */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto divide-y divide-white/5 font-mono text-xs">
          {/* 12,845 Places matches header */}
          {matchingPlaces.length > 0 && (
            <div className="p-2 bg-white/[0.02]">
              <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-widest text-slate-400 flex items-center justify-between">
                <span>Global Cities (12,845 Places Directory)</span>
                <span className="text-[#ffc174]">{matchingPlaces.length} matches</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 mt-1">
                {matchingPlaces.map((pl) => (
                  <button
                    key={pl.id}
                    onClick={() => handleSelectPlace(pl)}
                    disabled={isLoadingPlace === pl.id}
                    className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-[#ffc174]/15 border border-white/5 hover:border-[#ffc174]/40 transition-all text-left group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-white group-hover:text-[#ffc174] truncate text-xs">
                        {pl.title}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{pl.country}</div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <span className="px-1.5 py-0.5 rounded text-[9px] bg-white/10 text-emerald-400 font-mono">
                        {pl.size || 1} {pl.size === 1 ? 'stn' : 'stns'}
                      </span>
                      {isLoadingPlace === pl.id && (
                        <span className="w-2 h-2 rounded-full bg-[#ffc174] animate-ping" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Stations List */}
          {clampedStations.length === 0 && matchingPlaces.length === 0 ? (
            <div className="py-12 px-4 text-center text-slate-400 font-body text-sm">
              <span className="material-symbols-outlined text-4xl text-slate-600 mb-2 block">
                radar
              </span>
              No broadcast frequencies found for &quot;{query}&quot;
            </div>
          ) : (
            clampedStations.map((st, index) => {
              const isSelected = index === selectedIndex;
              const isActive = st.id === activeStation.id;
              const isFav = favorites.includes(st.id);

              return (
                <div
                  key={st.id}
                  onClick={() => {
                    onSelectStation(st);
                    onClose();
                  }}
                  className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                    isSelected ? 'bg-white/10' : 'hover:bg-white/5'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 pr-3">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        isActive ? 'bg-[#ffc174] animate-pulse' : 'bg-slate-600'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate text-xs">
                          {st.title}
                        </span>
                        <span className="text-[10px] text-[#ffc174] px-1.5 py-0.2 bg-[#ffc174]/10 rounded border border-[#ffc174]/20 flex-shrink-0">
                          {st.frequencyDisplay}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 truncate mt-0.5">
                        {st.city}, {st.country} · {st.callsign}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(st.id);
                      }}
                      className="p-1 rounded text-slate-400 hover:text-[#ffc174] transition-colors"
                    >
                      <span className="material-symbols-outlined text-base">
                        {isFav ? 'star' : 'star_border'}
                      </span>
                    </button>
                    {isActive && (
                      <span className="text-[9px] uppercase tracking-wider text-[#4edea3] font-bold">
                        TUNED
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer shortcuts info */}
        <div className="px-4 py-2 border-t border-white/5 bg-[#0a0d14] flex items-center justify-between text-[10px] font-mono text-slate-400">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span>Radio Garden 12k+ Hubs Active</span>
        </div>
      </div>
    </div>
  );
};
