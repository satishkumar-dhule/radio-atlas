import React, { useState, useEffect } from 'react';
import { Station } from '../types/radio';
import { searchRadioGardenLive } from '../data/stations';

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
  const [selectedRegion, setSelectedRegion] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [liveSearchResults, setLiveSearchResults] = useState<Station[]>([]);
  const [isSearchingLive, setIsSearchingLive] = useState<boolean>(false);

  // Perform live search on Radio Garden API when search query is entered
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
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
  }, [searchQuery]);

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
    // Approximate UTC offset from longitude
    const approxOffsetHours = Math.round(lng / 15);
    const totalMinutes = now.getUTCHours() * 60 + now.getUTCMinutes() + approxOffsetHours * 60;
    const adjustedMinutes = ((totalMinutes % 1440) + 1440) % 1440;
    const hrs = String(Math.floor(adjustedMinutes / 60)).padStart(2, '0');
    const mins = String(Math.floor(adjustedMinutes % 60)).padStart(2, '0');
    return `${hrs}:${mins}`;
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
                Live Broadcast Network ({stations.length} Scraped Channels)
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

        {/* Search & Filter */}
        <div className="flex flex-col gap-3 py-4">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-[#7d8799]">
              {isSearchingLive ? 'autorenew' : 'search'}
            </span>
            <input
              type="text"
              placeholder="Search Radio Garden (e.g. Setagaya, KMEL, Berlin, Tokyo)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121824] border border-white/10 rounded-xl pl-9 pr-8 py-2 text-xs text-[#e2e6f0] placeholder-[#7d8799]/60 focus:outline-none focus:border-[#4edea3]/50 font-body"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-[#7d8799] hover:text-[#e2e6f0]"
              >
                ✕
              </button>
            )}
          </div>

          {/* Region Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-[11px] font-mono no-scrollbar">
            {regions.map((region) => (
              <button
                key={region}
                onClick={() => setSelectedRegion(region)}
                className={`px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedRegion === region
                    ? 'bg-[#4edea3]/20 text-[#4edea3] border border-[#4edea3]/40'
                    : 'bg-white/[0.03] text-[#7d8799] hover:text-[#e2e6f0] border border-white/5'
                }`}
              >
                {region === 'all' ? 'All Continents' : region}
              </button>
            ))}
          </div>
        </div>

        {/* Station List */}
        <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
          {combinedStations.length === 0 ? (
            <div className="text-center py-12 text-[#7d8799] font-mono text-xs flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-[#7d8799]/50">
                radio
              </span>
              <span>No Radio Garden channels found for "{searchQuery}".</span>
              <span className="text-[11px] text-[#7d8799]/60">Try searching a different city or station callsign.</span>
            </div>
          ) : (
            combinedStations.map((st) => {
              const isActive = st.id === activeStation.id;
              const isFav = favorites.includes(st.id);
              const localTime = getLocalTime(st.coordinates.lat, st.coordinates.lng);

              return (
                <div
                  key={st.id}
                  onClick={() => {
                    onSelectStation(st);
                    onClose();
                  }}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 group ${
                    isActive
                      ? 'bg-[#192130] border-[#4edea3]/50 shadow-[0_0_16px_rgba(78,222,163,0.18)]'
                      : 'bg-[#121824]/60 hover:bg-[#121824] border-white/5 hover:border-white/15'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span
                        className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          isActive
                            ? 'bg-[#4edea3] shadow-[0_0_8px_#4edea3]'
                            : st.accentColor === 'secondary'
                            ? 'bg-[#4edea3]/70'
                            : 'bg-[#ffc174]/70'
                        }`}
                      />
                      <span className="font-semibold text-sm text-[#e2e6f0] truncate">
                        {st.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="font-mono text-xs text-[#ffc174] font-medium">
                        {st.frequencyDisplay}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleFavorite(st.id);
                        }}
                        className="text-[#7d8799] hover:text-[#ffc174] p-1 transition-colors"
                        title="Bookmark station"
                      >
                        <span className="material-symbols-outlined text-[16px]">
                          {isFav ? 'star' : 'star_outline'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-[#7d8799]">
                    <span className="truncate max-w-[220px] text-[#a5b0c4]">
                      {st.city}, {st.country}
                    </span>
                    <span className="font-mono text-[11px] tabular-nums text-white/50">
                      {localTime} Local
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-[#7d8799]/80 pt-1 border-t border-white/5">
                    <span className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#4edea3]/80 inline-block" />
                      <span>Radio Garden</span>
                      <span className="text-white/20">·</span>
                      <span className="truncate max-w-[120px]">{st.bitrate}</span>
                    </span>
                    {st.radioGardenUrl && (
                      <a
                        href={st.radioGardenUrl}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-[#4edea3]/70 hover:text-[#4edea3] hover:underline"
                      >
                        view ↗
                      </a>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#7d8799]">
          <span>{stations.length} Scraped Radio Garden Channels</span>
          <span className="text-[#4edea3]">Live Streams Connected</span>
        </div>
      </div>
    </div>
  );
};
