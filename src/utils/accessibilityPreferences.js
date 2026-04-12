const SETTINGS_STORAGE_KEY = 'mdc-settings';

const DEFAULT_ACCESSIBILITY = {
  highContrast: false,
  largeText: false,
  reduceMotion: true,
};

export const getStoredAccessibilityPreferences = () => {
  if (typeof window === 'undefined') return DEFAULT_ACCESSIBILITY;

  try {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_ACCESSIBILITY;

    const parsed = JSON.parse(raw);
    const fromStorage = parsed?.accessibility || {};

    return {
      highContrast: Boolean(fromStorage.highContrast),
      largeText: Boolean(fromStorage.largeText),
      reduceMotion: fromStorage.reduceMotion !== false,
    };
  } catch (error) {
    console.warn('Failed to read accessibility preferences:', error);
    return DEFAULT_ACCESSIBILITY;
  }
};

export const applyAccessibilityPreferences = (preferences = DEFAULT_ACCESSIBILITY) => {
  if (typeof document === 'undefined') return;

  const root = document.documentElement;
  const next = {
    highContrast: Boolean(preferences.highContrast),
    largeText: Boolean(preferences.largeText),
    reduceMotion: preferences.reduceMotion !== false,
  };

  root.classList.toggle('app-high-contrast', next.highContrast);
  root.classList.toggle('app-large-text', next.largeText);
  root.classList.toggle('app-reduce-motion', next.reduceMotion);
};

export const applyStoredAccessibilityPreferences = () => {
  applyAccessibilityPreferences(getStoredAccessibilityPreferences());
};
