import { ReaderSettings } from '../types';

const SETTINGS_KEY = 'bookglass_settings_v1';
const PROGRESS_KEY = 'bookglass_reading_progress_v1';

const DEFAULT_SETTINGS: ReaderSettings = {
  theme: 'night',
  nightLightEnabled: true,
  nightLightWarmth: 75, // 0 (cool amber) to 100 (warm golden candle)
  nightLightIntensity: 85, // 0 to 100
  soundEnabled: true,
  zoom: 1.0,
  isFocusMode: false,
  singlePageMode: false,
};

export const storageService = {
  getSettings(): ReaderSettings {
    try {
      const data = localStorage.getItem(SETTINGS_KEY);
      if (data) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
      }
    } catch {
      // Fallback
    }
    return DEFAULT_SETTINGS;
  },

  saveSettings(settings: ReaderSettings): void {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch {
      // Ignore
    }
  },

  getReadingProgress(bookId: string): number {
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return parsed[bookId] || 0;
      }
    } catch {
      // Fallback
    }
    return 0;
  },

  saveReadingProgress(bookId: string, spreadIndex: number): void {
    try {
      const data = localStorage.getItem(PROGRESS_KEY);
      const parsed = data ? JSON.parse(data) : {};
      parsed[bookId] = spreadIndex;
      localStorage.setItem(PROGRESS_KEY, JSON.stringify(parsed));
    } catch {
      // Fallback
    }
  },
};
