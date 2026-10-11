import React, { useState, useEffect } from 'react';
import { analytics, GA_MEASUREMENT_ID } from '../services/analytics';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLightMode: boolean;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({
  isOpen,
  onClose,
  isLightMode,
}) => {
  const [events, setEvents] = useState<Array<{ timestamp: string; event: string; params: Record<string, any> }>>([]);
  const [lastTestPing, setLastTestPing] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setEvents(analytics.getRecentEvents());
    const interval = setInterval(() => {
      setEvents(analytics.getRecentEvents());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const handleSendTestPing = () => {
    const testId = `test_${Date.now()}`;
    analytics.trackEvent('manual_telemetry_ping', {
      ping_type: 'user_diagnostic',
      test_id: testId,
      screen_resolution: `${window.innerWidth}x${window.innerHeight}`,
      user_agent: navigator.userAgent.slice(0, 50),
    });
    setLastTestPing(new Date().toLocaleTimeString());
    setEvents(analytics.getRecentEvents());
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className={`w-full max-w-lg rounded-2xl border p-5 shadow-2xl flex flex-col gap-4 font-mono transition-all ${
          isLightMode
            ? 'bg-white/95 border-slate-200 text-slate-800 shadow-slate-300/50'
            : 'bg-[#0e131d]/95 border-white/10 text-[#e2e6f0] shadow-black/80'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-current/10 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-[#4edea3] shadow-[0_0_8px_#4edea3] animate-pulse" />
            <div>
              <h2 className="text-sm font-semibold tracking-wider uppercase">Google Analytics 4</h2>
              <p className="text-[10px] opacity-60">Deep Real-Time Telemetry & Event Stream</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 flex items-center justify-center opacity-70 hover:opacity-100 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Configuration Overview */}
        <div className="grid grid-cols-2 gap-2 text-[11px] p-3 rounded-xl bg-black/5 dark:bg-white/[0.03] border border-current/10">
          <div>
            <span className="opacity-50 text-[10px] uppercase block">Measurement ID</span>
            <span className="font-semibold text-[#ffc174]">{GA_MEASUREMENT_ID}</span>
          </div>
          <div>
            <span className="opacity-50 text-[10px] uppercase block">Engine Status</span>
            <span className="font-semibold text-[#4edea3] flex items-center gap-1">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              gtag.js Connected
            </span>
          </div>
          <div>
            <span className="opacity-50 text-[10px] uppercase block">Transport Mode</span>
            <span className="font-medium">Beacon API (Async)</span>
          </div>
          <div>
            <span className="opacity-50 text-[10px] uppercase block">Events Dispatched</span>
            <span className="font-medium tabular-nums">{events.length} logged</span>
          </div>
        </div>

        {/* Live Event Stream */}
        <div className="flex flex-col gap-1.5 min-h-0">
          <div className="flex items-center justify-between text-[11px]">
            <span className="opacity-70 font-semibold uppercase text-[10px]">Real-Time Event Feed:</span>
            <button
              onClick={handleSendTestPing}
              className="px-2 py-0.5 rounded-lg border border-[#ffc174]/40 hover:bg-[#ffc174]/10 text-[#d97706] dark:text-[#ffc174] text-[10px] transition-all flex items-center gap-1 active:scale-95"
            >
              <span className="material-symbols-outlined text-[12px]">send</span>
              <span>Send Test Ping</span>
            </button>
          </div>

          <div className="h-44 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-black/20 border border-current/10 text-[10px] scrollbar-thin">
            {events.length === 0 ? (
              <div className="flex items-center justify-center h-full opacity-40 text-xs">
                No events in queue yet. Tune a station or interact with the map!
              </div>
            ) : (
              events.map((evt, idx) => (
                <div
                  key={idx}
                  className="p-1.5 rounded-lg bg-black/10 dark:bg-white/[0.02] border border-current/5 flex flex-col gap-0.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[#4edea3]">{evt.event}</span>
                    <span className="opacity-40 text-[9px] tabular-nums">
                      {new Date(evt.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="opacity-75 text-[9px] truncate">
                    {JSON.stringify(evt.params)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between pt-1 border-t border-current/10 text-[10px] opacity-60">
          <span>Google Analytics 4 Telemetry Engine</span>
          {lastTestPing && <span>Last ping: {lastTestPing}</span>}
        </div>
      </div>
    </div>
  );
};
