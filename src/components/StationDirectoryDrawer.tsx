import React, { useState, useEffect } from 'react';
import { Station, RadioGardenPlace } from '../types/radio';
import { searchRadioGardenLive } from '../data/stations';
import { radioGardenService } from '../services/radioGardenService';

interface StationDirectoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  activeStation: Station;
  onSelectStation: (st: Station) => void;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
}

export const StationDirectoryDrawer: React.FC<StationDirectoryDrawerProps> = ({
  isOpen,
  onClose,
  stations,
  activeStation,
  onSelectStation,
  favorites,
  onToggleFavorite,
}) => {
  const [activeTab, setActiveTab] = useState<'stations' | 'places'>('stations');
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveSearchResults, setLiveSearchResults] = useState<Station[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);
  const [loadingPlaceId, setLoadingPlaceId] = useState<string | null>(null);

  // Places search results for Tab 2
  const [matchedPlaces, setMatchedPlaces] = useState<RadioGardenPlace[]>(() => {
    return radioGardenService.getAllPlaces().slice(0, 50);
  });

  useEffect(() => {
    if (!isOpen) return;

    if (activeTab === 'places') {
      const places = radioGardenService.searchPlaces(searchQuery, 60);
      setMatchedPlaces(places);
    }
  }, [searchQuery, activeTab, isOpen]);

  // Perform live search on Radio Garden API when search query is entered in stations tab
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2 || activeTab !== 'stations') {
      setLiveSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearchingLive(true);
      const results = await searchRadioGardenLive(searchQuery.trim());
      setLiveSearchResults(results);
      setIsSearchingLive(false);
    }, 400);

    return () => clearTimeout(timer);
  }, [searchQuery, activeTab]);

  if (!isOpen) return null;

  const regions = [
    'all',
    'Asia & Pacific',
    'Europe',
    'North America',
    'South America',
    'Africa & Mid East',
    'Oceania',
  ];

  // Local filtered list from our scraped 438 Radio Garden stations
  const localFilteredStations = stations.filter((st) => {
    const matchesRegion =
      selectedRegion === 'all' ||
      (st.region && st.region.toLowerCase().includes(selectedRegion.toLowerCase()));

    const matchesSearch =
      st.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      st.frequencyDisplay.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesRegion && matchesSearch;
  });

  // Combine local and live search results (avoiding duplicates)
  const combinedStations = [...localFilteredStations];
  liveSearchResults.forEach((liveSt) => {
    if (!combinedStations.some((s) => s.id === liveSt.id)) {
      combinedStations.unshift(liveSt);
    }
  });

  const getLocalTime = (lat: number, lng: number) => {
    const now = new Date();
    const approxOffsetHours = Math.round(lng / 15);
    const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + approxOffsetHours * 60;
    const adjustedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hrs = String(Math.floor(adjustedMinutes / 60)).padStart(2, '0');
    const mins = String(Math.floor(adjustedMinutes % 60)).padStart(2, '0');
    return `${hrs}:${mins}`;
  };

  const handleTunePlace = async (place: RadioGardenPlace) => {
    setLoadingPlaceId(place.id);
    try {
      const chs = await radioGardenService.fetchChannelsForPlace(place);
      if (chs.length > 0) {
        onSelectStation(chs[0]);
        onClose();
      }
    } finally {
      setLoadingPlaceId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/65 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md h-full bg-[#0b0f17] border-l border-white/10 flex flex-col p-6 shadow-2xl animate-in slide-in-from-right duration-300"
        role="dialog"
        aria-label="Radio Garden Directory"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#4edea3] shadow-[0_0_10px_#4edea3]" />
            <div>
              <h2 className="font-mono text-sm tracking-widest text-[#e2e6f0] uppercase font-semibold">
                Radio Garden Airwaves
              </h2>
              <span className="font-mono text-[10px] text-[#4edea3]/80">
                12,845 Global Cities · 38,000+ Stations
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors"
            aria-label="Close directory"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher: Curated Stations vs 12k+ Global Cities */}
        <div className="grid grid-cols-2 gap-1.5 my-3 p-1 rounded-xl bg-white/[0.04] border border-white/5 text-xs font-mono">
          <button
            onClick={() => setActiveTab('stations')}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'stations'
                ? 'bg-[#ffc174] text-[#080b11] font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Stations ({stations.length})
          </button>
          <button
            onClick={() => setActiveTab('places')}
            className={`py-1.5 rounded-lg transition-all ${
              activeTab === 'places'
                ? 'bg-[#ffc174] text-[#080b11] font-semibold shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            All Cities (12,845)
          </button>
        </div>

        {/* Search Input */}
        <div className="relative mb-3">
          <input
            type="text"
            placeholder={
              activeTab === 'stations'
                ? 'Search city, station, country, frequency...'
                : 'Search any of 12,845 global cities or countries...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#10141e] border border-white/10 rounded-xl px-4 py-2 text-xs font-mono text-[#e2e6f0] placeholder-[#7d8799]/50 focus:outline-none focus:border-[#4edea3] transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-2.5 text-[#7d8799] hover:text-[#e2e6f0] text-xs"
            >
              ✕
            </button>
          )}
        </div>

        {/* Region Filter Chips (only in Stations tab) */}
        {activeTab === 'stations' && (
          <div className="flex gap-1.5 overflow-x-auto pb-3 mb-2 scrollbar-none">
            {regions.map((reg) => (
              <button
                key={reg}
                onClick={() => setSelectedRegion(reg)}
                className={`px-2.5 py-1 rounded-full text-[10px] font-mono whitespace-nowrap uppercase tracking-wider transition-all ${
                  selectedRegion === reg
                    ? 'bg-[#4edea3]/20 border border-[#4edea3]/60 text-[#4edea3]'
                    : 'bg-white/5 border border-white/5 text-[#7d8799] hover:text-[#e2e6f0]'
                }`}
              >
                {reg === 'all' ? 'All Regions' : reg}
              </button>
            ))}
          </div>
        )}

        {/* TAB 1: STATIONS LIST */}
        {activeTab === 'stations' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            {combinedStations.length === 0 ? (
              <div className="text-center py-12 text-[#7d8799]">
                <p>No broadcasts found matching query.</p>
                <p className="text-[10px] mt-1 text-[#ffc174]/70">
                  Switch to the &quot;All Cities&quot; tab to search across all 12,845 Radio Garden hubs.
                </p>
              </div>
            ) : (
              combinedStations.map((st) => {
                const isSelected = activeStation.id === st.id;
                const isBookmarked = favorites.includes(st.id);
                const localTime = getLocalTime(st.coordinates.lat, st.coordinates.lng);

                return (
                  <div
                    key={st.id}
                    onClick={() => {
                      onSelectStation(st);
                      onClose();
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex flex-col gap-1.5 ${
                      isSelected
                        ? 'bg-[#4edea3]/10 border-[#4edea3]/50 shadow-[0_0_15px_rgba(78,222,163,0.15)]'
                        : 'bg-[#10141e]/60 border-white/5 hover:border-white/15 hover:bg-[#10141e]'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            isSelected ? 'bg-[#4edea3] animate-pulse' : 'bg-[#7d8799]/40'
                          }`}
                        />
                        <span className="font-semibold text-[#e2e6f0] truncate">{st.title}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-[10px] text-[#ffc174] font-medium bg-[#ffc174]/10 px-1.5 py-0.5 rounded border border-[#ffc174]/20">
                          {st.frequencyDisplay}
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleFavorite(st.id);
                          }}
                          className={`p-1 rounded hover:bg-white/10 transition-colors ${
                            isBookmarked ? 'text-[#ffc174]' : 'text-[#7d8799] opacity-40 hover:opacity-100'
                          }`}
                        >
                          ★
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-[#7d8799]">
                      <span className="truncate">
                        {st.city}, {st.country}
                      </span>
                      <span className="tabular-nums flex-shrink-0">{localTime} Local</span>
                    </div>

                    <div className="flex items-center justify-between text-[9px] text-[#7d8799]/70 pt-1 border-t border-white/5">
                      <span className="truncate max-w-[200px]">{st.callsign}</span>
                      <span>{st.bitrate}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 2: 12,845 GLOBAL CITIES ATLAS */}
        {activeTab === 'places' && (
          <div className="flex-1 overflow-y-auto space-y-2 pr-1 font-mono text-xs">
            <div className="text-[10px] text-[#ffc174] mb-2 px-1 flex items-center justify-between">
              <span>Showing {matchedPlaces.length} cities</span>
              <span>12,845 total on Earth</span>
            </div>

            {matchedPlaces.map((pl) => (
              <div
                key={pl.id}
                onClick={() => handleTunePlace(pl)}
                className="p-3 rounded-xl border bg-[#10141e]/60 border-white/5 hover:border-[#ffc174]/40 hover:bg-[#ffc174]/10 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="min-w-0 pr-3">
                  <div className="font-semibold text-[#e2e6f0] group-hover:text-[#ffc174] truncate text-xs">
                    {pl.title}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate mt-0.5">{pl.country}</div>
                  <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                    {Math.abs(pl.geo[1]).toFixed(2)}° {pl.geo[1] >= 0 ? 'N' : 'S'}, {Math.abs(pl.geo[0]).toFixed(2)}° {pl.geo[0] >= 0 ? 'E' : 'W'}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-1 rounded text-[10px] bg-white/10 text-emerald-400 font-mono font-semibold">
                    {pl.size || 1} {pl.size === 1 ? 'Station' : 'Stations'}
                  </span>
                  {loadingPlaceId === pl.id ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-[#ffc174] animate-ping" />
                  ) : (
                    <span className="material-symbols-outlined text-base opacity-40 group-hover:opacity-100 group-hover:text-[#ffc174]">
                      play_arrow
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[9px] font-mono text-[#7d8799]">
          <span>Synced with Radio Garden Content Engine</span>
          <span>Static Ready</span>
        </div>
      </div>
    </div>
  );
};
