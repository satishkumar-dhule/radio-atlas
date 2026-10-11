import React, { useState, useEffect } from 'react';
import { Station } from '../types/radio';

export interface DxLogEntry {
  id: string;
  stationId: string;
  stationTitle: string;
  city: string;
  country: string;
  frequencyDisplay: string;
  timestamp: string; // ISO string
  utcTime: string;
  distanceKm: number;
  snr: string;
  notes: string;
}

interface DXLogbookModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeStation: Station;
  onSelectStation: (st: Station) => void;
  stations: Station[];
}

// Calculate Haversine distance in kilometers
function calculateHaversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

export const DXLogbookModal: React.FC<DXLogbookModalProps> = ({
  isOpen,
  onClose,
  activeStation,
  onSelectStation,
  stations,
}) => {
  const [logs, setLogs] = useState<DxLogEntry[]>(() => {
    try {
      const saved = localStorage.getItem('radio_atlas_dx_logs');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeNotes, setActiveNotes] = useState<string>('');

  useEffect(() => {
    try {
      localStorage.setItem('radio_atlas_dx_logs', JSON.stringify(logs));
    } catch {
      // ignore
    }
  }, [logs]);

  if (!isOpen) return null;

  // Reference monitor station (defaults to Tokyo or Greenwich lat 51.48, lng 0.0)
  const listenerLat = 35.68;
  const listenerLng = 139.69;
  const currentDistance = calculateHaversine(
    listenerLat,
    listenerLng,
    activeStation.coordinates.lat,
    activeStation.coordinates.lng
  );

  const handleLogCurrent = () => {
    const now = new Date();
    const hrs = String(now.getUTCHours()).padStart(2, '0');
    const mins = String(now.getUTCMinutes()).padStart(2, '0');

    const entry: DxLogEntry = {
      id: Date.now().toString(),
      stationId: activeStation.id,
      stationTitle: activeStation.title,
      city: activeStation.city,
      country: activeStation.country,
      frequencyDisplay: activeStation.frequencyDisplay,
      timestamp: now.toISOString(),
      utcTime: `${hrs}:${mins} UTC`,
      distanceKm: currentDistance,
      snr: `${(42 + Math.random() * 8).toFixed(1)} dB`,
      notes: activeNotes.trim() || 'Intercepted nocturnal carrier broadcast.',
    };

    setLogs((prev) => [entry, ...prev]);
    setActiveNotes('');
  };

  const handleDelete = (id: string) => {
    setLogs((prev) => prev.filter((item) => item.id !== id));
  };

  const handleExportMarkdown = () => {
    let md = `# Radio Atlas — Night Airwaves DX Logbook\n\n`;
    md += `Exported on: ${new Date().toUTCString()}\n\n`;
    md += `| UTC Time | Station | Frequency | Location | Distance | Notes |\n`;
    md += `|---|---|---|---|---|---|\n`;

    logs.forEach((l) => {
      md += `| ${l.utcTime} | ${l.stationTitle} | ${l.frequencyDisplay} | ${l.city}, ${l.country} | ${l.distanceKm} km | ${l.notes} |\n`;
    });

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `radio-atlas-dx-log-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-[#0b0f17] border border-white/10 rounded-2xl shadow-[0_20px_60px_rgba(0,0,0,0.85)] p-5 sm:p-6 flex flex-col gap-4 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2.5">
            <span className="material-symbols-outlined text-[#ffc174] text-xl">
              menu_book
            </span>
            <div>
              <h2 className="font-mono text-sm tracking-widest text-[#e2e6f0] uppercase font-semibold">
                Shortwave DX Logbook
              </h2>
              <span className="font-mono text-[10px] text-[#7d8799]">
                Record intercepted frequencies & long-distance airwaves
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {logs.length > 0 && (
              <button
                onClick={handleExportMarkdown}
                title="Export Logbook as Markdown"
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/[0.05] hover:bg-white/[0.1] text-[11px] font-mono text-[#4edea3] transition-colors"
              >
                <span className="material-symbols-outlined text-[14px]">download</span>
                <span>Export .md</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-[#7d8799] hover:text-[#e2e6f0] transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Log Current Intercept Box */}
        <div className="bg-[#121824]/70 p-3.5 rounded-xl border border-white/5 flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#ffc174] shadow-[0_0_8px_#ffc174]" />
              <span className="text-[#e2e6f0] font-semibold">{activeStation.title}</span>
              <span className="text-[#7d8799]">• {activeStation.frequencyDisplay}</span>
            </div>
            <span className="text-[#4edea3]">{currentDistance.toLocaleString()} km away</span>
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add observation notes (e.g. crystal clear signal, late night ambient jazz)..."
              value={activeNotes}
              onChange={(e) => setActiveNotes(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogCurrent()}
              className="flex-1 bg-[#0b0f17] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-[#e2e6f0] placeholder-[#7d8799]/70 focus:outline-none focus:border-[#ffc174]/50 font-body"
            />
            <button
              onClick={handleLogCurrent}
              className="px-3.5 py-1.5 rounded-lg bg-[#ffc174] hover:bg-[#f59e0b] text-[#080b11] font-mono text-xs font-semibold tracking-wider transition-colors flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[15px]">add_task</span>
              <span>Log Entry</span>
            </button>
          </div>
        </div>

        {/* Logged Intercepts Table */}
        <div className="flex-1 max-h-72 overflow-y-auto space-y-2 pr-1">
          {logs.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[#7d8799] flex flex-col items-center gap-2">
              <span className="material-symbols-outlined text-2xl text-white/20">
                radio_button_checked
              </span>
              <span>No DX logs recorded yet.</span>
              <span className="text-[11px] text-white/40">
                Click "Log Entry" above to record your first late-night frequency intercept!
              </span>
            </div>
          ) : (
            logs.map((entry) => {
              const matchedStation = stations.find((s) => s.id === entry.stationId);

              return (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-[#121824]/50 border border-white/5 flex flex-col gap-1.5 text-xs font-mono group hover:border-white/15 transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-[#ffc174] font-semibold">{entry.frequencyDisplay}</span>
                      <span className="text-white/30">•</span>
                      <span
                        onClick={() => matchedStation && onSelectStation(matchedStation)}
                        className="text-[#e2e6f0] hover:text-[#4edea3] cursor-pointer font-medium truncate max-w-[200px]"
                      >
                        {entry.stationTitle}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-[#4edea3]">{entry.distanceKm.toLocaleString()} km</span>
                      <span className="text-[#7d8799]">{entry.utcTime}</span>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="text-[#7d8799] hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Delete log"
                      >
                        ✕
                      </button>
                    </div>
                  </div>

                  <div className="text-[#7d8799] text-[11px] font-body">
                    {entry.city}, {entry.country} — <span className="text-white/80">{entry.notes}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] font-mono text-[#7d8799]">
          <span>{logs.length} Intercepts Logged</span>
          <span className="text-[#4edea3]">Local Offline Persistence</span>
        </div>
      </div>
    </div>
  );
};
