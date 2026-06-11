// Persistence store — save/restore window state and app config

import { writable, get } from 'svelte/store';
import { DEFAULT_CONFIG, type AppConfig } from '../api';

const STORAGE_KEY = 'touchfish_state_v2';
const MIN_WINDOW_WIDTH = 280;
const MAX_WINDOW_WIDTH = 1200;
const MIN_WINDOW_HEIGHT = 200;
const MAX_WINDOW_HEIGHT = 1600;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function sanitizeConfig(config: Partial<AppConfig> | undefined): AppConfig {
  return {
    ...DEFAULT_CONFIG,
    ...config,
    instanceUrl: typeof config?.instanceUrl === 'string' && config.instanceUrl.trim()
      ? config.instanceUrl
      : DEFAULT_CONFIG.instanceUrl,
    accessToken: typeof config?.accessToken === 'string' ? config.accessToken : DEFAULT_CONFIG.accessToken,
    timelineType: config?.timelineType === 'home' ? 'home' : 'public',
    themeMode: config?.themeMode === 'light' ? 'light' : 'dark',
    locale: config?.locale === 'en' || config?.locale === 'ja' ? config.locale : 'zh-CN',
    globalShortcut:
      typeof config?.globalShortcut === 'string' && config.globalShortcut.trim()
        ? config.globalShortcut.trim()
        : DEFAULT_CONFIG.globalShortcut,
    refreshInterval: Number.isFinite(config?.refreshInterval)
      ? clamp(config!.refreshInterval as number, 15, 600)
      : DEFAULT_CONFIG.refreshInterval,
    opacity: Number.isFinite(config?.opacity)
      ? clamp(config!.opacity as number, 0.35, 1)
      : DEFAULT_CONFIG.opacity,
    limit: Number.isFinite(config?.limit)
      ? clamp(config!.limit as number, 10, 80)
      : DEFAULT_CONFIG.limit,
    fontScale: Number.isFinite(config?.fontScale)
      ? clamp(config!.fontScale as number, 0.9, 1.45)
      : DEFAULT_CONFIG.fontScale,
    accentColor: typeof config?.accentColor === 'string' && config.accentColor.trim()
      ? config.accentColor
      : DEFAULT_CONFIG.accentColor,
  };
}

export interface TimelineViewState {
  scrollPosition: number;
  topVisibleStatusId?: string;
  topVisibleStatusOffset: number;
}

function sanitizeTimelineViewState(state: Partial<TimelineViewState> | undefined): TimelineViewState {
  return {
    scrollPosition: Number.isFinite(state?.scrollPosition) ? Math.max(0, state!.scrollPosition as number) : 0,
    topVisibleStatusId: typeof state?.topVisibleStatusId === 'string' && state.topVisibleStatusId
      ? state.topVisibleStatusId
      : undefined,
    topVisibleStatusOffset: Number.isFinite(state?.topVisibleStatusOffset)
      ? state!.topVisibleStatusOffset as number
      : 0,
  };
}

export function getTimelineStateKey(config: Partial<AppConfig>): string {
  const normalized = { ...DEFAULT_CONFIG, ...config };
  const instanceUrl = normalized.instanceUrl.replace(/\/+$/, '');

  return `${instanceUrl}::${normalized.timelineType}`;
}

export interface PersistedState {
  config: AppConfig;
  scrollPosition: number;
  topVisibleStatusId?: string;
  topVisibleStatusOffset: number;
  timelineViewStates: Record<string, TimelineViewState>;
  hasCompletedOnboarding: boolean;
  windowX?: number;
  windowY?: number;
  windowWidth?: number;
  windowHeight?: number;
}

const defaultState: PersistedState = {
  config: { ...DEFAULT_CONFIG },
  scrollPosition: 0,
  topVisibleStatusOffset: 0,
  timelineViewStates: {},
  hasCompletedOnboarding: false,
};

/**
 * Load persisted state from localStorage.
 */
function loadState(): PersistedState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const config = sanitizeConfig(parsed.config);
      const timelineViewStates = Object.fromEntries(
        Object.entries(parsed.timelineViewStates ?? {}).map(([key, value]) => [
          key,
          sanitizeTimelineViewState(value as Partial<TimelineViewState>),
        ])
      );
      const legacyTimelineState = sanitizeTimelineViewState(parsed);
      const timelineKey = getTimelineStateKey(config);

      if (
        !timelineViewStates[timelineKey] &&
        (legacyTimelineState.scrollPosition > 0 ||
          legacyTimelineState.topVisibleStatusId ||
          legacyTimelineState.topVisibleStatusOffset !== 0)
      ) {
        timelineViewStates[timelineKey] = legacyTimelineState;
      }

      return {
        ...defaultState,
        ...parsed,
        config,
        ...legacyTimelineState,
        timelineViewStates,
        hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
        windowWidth: Number.isFinite(parsed.windowWidth)
          ? clamp(parsed.windowWidth, MIN_WINDOW_WIDTH, MAX_WINDOW_WIDTH)
          : undefined,
        windowHeight: Number.isFinite(parsed.windowHeight)
          ? clamp(parsed.windowHeight, MIN_WINDOW_HEIGHT, MAX_WINDOW_HEIGHT)
          : undefined,
        windowX: Number.isFinite(parsed.windowX) ? parsed.windowX : undefined,
        windowY: Number.isFinite(parsed.windowY) ? parsed.windowY : undefined,
      };
    }
  } catch (e) {
    console.warn('[TouchFish] Failed to load persisted state:', e);
  }
  return { ...defaultState };
}

/**
 * Save state to localStorage.
 */
function saveState(state: PersistedState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn('[TouchFish] Failed to save state:', e);
  }
}

// ---- Exports ----
export const persistedState = writable<PersistedState>(loadState());

// Auto-save on changes (debounced)
let saveTimer: ReturnType<typeof setTimeout> | null = null;

persistedState.subscribe((state) => {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => saveState(state), 300);
});

/**
 * Update a specific field in persisted state.
 */
export function updatePersistedState(partial: Partial<PersistedState>): void {
  persistedState.update((s) => ({ ...s, ...partial }));
}

/**
 * Update config within persisted state.
 */
export function updateConfig(partial: Partial<AppConfig>): void {
  persistedState.update((s) => ({
    ...s,
    config: { ...s.config, ...partial },
  }));
}

export function getTimelineViewState(config: Partial<AppConfig>): TimelineViewState {
  const state = get(persistedState);
  const timelineKey = getTimelineStateKey(config);

  return state.timelineViewStates[timelineKey] ?? sanitizeTimelineViewState(state);
}

export function updateTimelineViewState(
  config: Partial<AppConfig>,
  partial: Partial<TimelineViewState>
): void {
  persistedState.update((state) => {
    const timelineKey = getTimelineStateKey(config);
    const currentTimelineState = state.timelineViewStates[timelineKey] ?? sanitizeTimelineViewState(state);
    const nextTimelineState = sanitizeTimelineViewState({
      ...currentTimelineState,
      ...partial,
    });

    return {
      ...state,
      scrollPosition: nextTimelineState.scrollPosition,
      topVisibleStatusId: nextTimelineState.topVisibleStatusId,
      topVisibleStatusOffset: nextTimelineState.topVisibleStatusOffset,
      timelineViewStates: {
        ...state.timelineViewStates,
        [timelineKey]: nextTimelineState,
      },
    };
  });
}

/**
 * Get current config snapshot.
 */
export function getConfig(): AppConfig {
  return get(persistedState).config;
}
