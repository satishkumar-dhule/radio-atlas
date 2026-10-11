// Deep Google Analytics 4 (GA4) Integration for Radio Atlas

declare global {
  interface Window {
    dataLayer: any[];
    gtag?: (...args: any[]) => void;
  }
}

// Configurable measurement ID with standard default
export const GA_MEASUREMENT_ID =
  (import.meta.env.VITE_GA_MEASUREMENT_ID as string) || 'G-RADIOATLAS1';

class AnalyticsService {
  private initialized: boolean = false;
  private eventLog: Array<{ timestamp: string; event: string; params: Record<string, any> }> = [];

  constructor() {
    this.init();
  }

  public init() {
    if (typeof window === 'undefined' || this.initialized) return;

    try {
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () {
        window.dataLayer.push(arguments);
      };

      // Ensure dataLayer receives standard config
      window.gtag('js', new Date());
      window.gtag('config', GA_MEASUREMENT_ID, {
        send_page_view: true,
        transport_type: 'beacon',
      });

      // Inject gtag.js script if not present
      const scriptId = 'google-analytics-gtag';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.async = true;
        script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`;
        script.onerror = () => {
          // Gracefully continue if adblocker blocks GA script
          console.debug('[Analytics] GA script blocked or offline, fallback event logging active.');
        };
        document.head.appendChild(script);
      }

      this.initialized = true;
      console.log(`[Analytics] Google Analytics initialized (${GA_MEASUREMENT_ID})`);
    } catch (err) {
      console.debug('[Analytics] Initialization error:', err);
    }
  }

  // Generic event dispatch with fallback logging
  public trackEvent(eventName: string, params: Record<string, any> = {}) {
    const entry = {
      timestamp: new Date().toISOString(),
      event: eventName,
      params,
    };
    this.eventLog.unshift(entry);
    if (this.eventLog.length > 100) this.eventLog.pop();

    try {
      if (typeof window !== 'undefined' && typeof window.gtag === 'function') {
        window.gtag('event', eventName, {
          ...params,
          app_name: 'Radio Atlas',
          client_timestamp: Date.now(),
        });
      }
    } catch (err) {
      console.debug('[Analytics] Error tracking event:', err);
    }
  }

  // Deep event track: Station Tuning
  public trackStationTune(station: {
    id: string;
    title: string;
    city: string;
    country: string;
    frequencyDisplay?: string;
    genre?: string;
  }, source: 'map_click' | 'fan_out' | 'search' | 'quick_jump' | 'drift' | 'preset' = 'map_click') {
    this.trackEvent('station_tune', {
      station_id: station.id,
      station_title: station.title,
      city: station.city,
      country: station.country,
      frequency: station.frequencyDisplay,
      genre: station.genre || 'Ambient',
      source,
    });
  }

  // Deep event track: Playback controls
  public trackPlayback(action: 'play' | 'pause' | 'volume_change' | 'buffer_start' | 'error', details: Record<string, any> = {}) {
    this.trackEvent('audio_playback', {
      action,
      ...details,
    });
  }

  // Deep event track: DSP & Equalizer
  public trackDspPreset(preset: string, isAiAuto: boolean, rationale?: string) {
    this.trackEvent('dsp_master_change', {
      preset,
      is_ai_auto: isAiAuto,
      rationale: rationale || 'manual_selection',
    });
  }

  // Deep event track: Map interaction
  public trackMapInteraction(action: 'tile_switch' | 'zoom' | 'pan' | 'click_radar' | 'fan_out_expand', details: Record<string, any> = {}) {
    this.trackEvent('map_interaction', {
      action,
      ...details,
    });
  }

  // Deep event track: Wallpaper / Skins
  public trackSkinOrWallpaper(wallpaperId: string, skinThemeId?: string) {
    this.trackEvent('theme_change', {
      wallpaper_id: wallpaperId,
      skin_theme_id: skinThemeId || 'amber',
    });
  }

  // Deep event track: DX Logbook
  public trackDxLog(action: 'log_intercept' | 'open_logbook' | 'export_csv', stationTitle?: string) {
    this.trackEvent('dx_logbook', {
      action,
      station_title: stationTitle,
    });
  }

  // Deep event track: Screensaver
  public trackScreensaver(action: 'open' | 'close') {
    this.trackEvent('screensaver_mode', { action });
  }

  // Get recent event telemetry for in-app diagnosis or inspection
  public getRecentEvents() {
    return this.eventLog;
  }
}

export const analytics = new AnalyticsService();
