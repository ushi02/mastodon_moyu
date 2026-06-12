// Timeline store — manages fetching, caching, and state for Mastodon timeline

import { writable, derived, get } from 'svelte/store';
import { fetchTimeline, type MastodonStatus, type AppConfig, DEFAULT_CONFIG } from '../api';
import { getTimelineStateKey } from './persistence';

// ---- State ----
export const statuses = writable<MastodonStatus[]>([]);
export const isLoading = writable(false);
export const isLoadingMore = writable(false);
export const error = writable<string | null>(null);
export const lastFetchedAt = writable<Date | null>(null);
export const canLoadMore = writable(true);

// ---- Derived ----
export const statusCount = derived(statuses, ($s) => $s.length);

// ---- Auto-refresh timer ----
let refreshTimer: ReturnType<typeof setInterval> | null = null;
let currentConfig: Partial<AppConfig> = {};
let currentTimelineKey = getTimelineStateKey(DEFAULT_CONFIG);

interface TimelineCacheEntry {
  statuses: MastodonStatus[];
  canLoadMore: boolean;
  lastFetchedAt: Date | null;
}

const timelineCache = new Map<string, TimelineCacheEntry>();

function getCacheEntry(timelineKey: string): TimelineCacheEntry {
  const existing = timelineCache.get(timelineKey);
  if (existing) return existing;

  const nextEntry = {
    statuses: [],
    canLoadMore: true,
    lastFetchedAt: null,
  };
  timelineCache.set(timelineKey, nextEntry);

  return nextEntry;
}

function updateCacheEntry(timelineKey: string, partial: Partial<TimelineCacheEntry>) {
  const currentEntry = getCacheEntry(timelineKey);
  const nextEntry = { ...currentEntry, ...partial };
  timelineCache.set(timelineKey, nextEntry);

  if (timelineKey === currentTimelineKey) {
    statuses.set(nextEntry.statuses);
    canLoadMore.set(nextEntry.canLoadMore);
    lastFetchedAt.set(nextEntry.lastFetchedAt);
  }
}

export function activateTimeline(config: Partial<AppConfig> = {}): void {
  const timelineKey = getTimelineStateKey(config);
  const entry = getCacheEntry(timelineKey);

  currentConfig = config;
  currentTimelineKey = timelineKey;
  statuses.set(entry.statuses);
  canLoadMore.set(entry.canLoadMore);
  lastFetchedAt.set(entry.lastFetchedAt);
}

function mergeStatuses(
  incomingStatuses: MastodonStatus[],
  existingStatuses: MastodonStatus[]
): MastodonStatus[] {
  if (existingStatuses.length === 0) return incomingStatuses;

  const merged = [...incomingStatuses];
  const seenIds = new Set(incomingStatuses.map((status) => status.id));

  for (const status of existingStatuses) {
    if (!seenIds.has(status.id)) {
      merged.push(status);
    }
  }

  return merged;
}

/**
 * Fetch timeline and update stores.
 */
export async function refreshTimeline(config: Partial<AppConfig> = {}): Promise<void> {
  const currentlyLoading = get(isLoading);
  if (currentlyLoading) return;
  currentConfig = config;
  const timelineKey = getTimelineStateKey(config);
  currentTimelineKey = timelineKey;

  isLoading.set(true);
  error.set(null);

  try {
    const data = await fetchTimeline(config);
    const existingStatuses = getCacheEntry(timelineKey).statuses;
    const shouldReplaceStatuses = existingStatuses.length === 0;
    const nextStatuses = shouldReplaceStatuses ? data : mergeStatuses(data, existingStatuses);
    const nextCanLoadMore = data.length >= ((config.limit ?? DEFAULT_CONFIG.limit));
    const fetchedAt = new Date();

    updateCacheEntry(timelineKey, {
      statuses: nextStatuses,
      canLoadMore: nextCanLoadMore,
      lastFetchedAt: fetchedAt,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    error.set(msg);
    console.error('[TouchFish] Timeline fetch error:', msg);
  } finally {
    isLoading.set(false);
  }
}

export async function loadMoreTimeline(): Promise<void> {
  if (get(isLoading) || get(isLoadingMore) || !get(canLoadMore)) return;

  const currentStatuses = get(statuses);
  const lastStatus = currentStatuses.at(-1);
  if (!lastStatus) return;

  isLoadingMore.set(true);
  error.set(null);

  try {
    const data = await fetchTimeline(currentConfig, { maxId: lastStatus.id });
    const nextStatuses = [...currentStatuses, ...data];
    const nextCanLoadMore = data.length >= ((currentConfig.limit ?? DEFAULT_CONFIG.limit));

    updateCacheEntry(currentTimelineKey, {
      statuses: nextStatuses,
      canLoadMore: nextCanLoadMore,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    error.set(msg);
    console.error('[TouchFish] Timeline load more error:', msg);
  } finally {
    isLoadingMore.set(false);
  }
}

/**
 * Start auto-refresh interval.
 */
export function startAutoRefresh(config: Partial<AppConfig> = {}): void {
  stopAutoRefresh();
  const interval = (config.refreshInterval ?? DEFAULT_CONFIG.refreshInterval) * 1000;
  refreshTimer = setInterval(() => {
    refreshTimeline(config);
  }, interval);
}

/**
 * Stop auto-refresh interval.
 */
export function stopAutoRefresh(): void {
  if (refreshTimer !== null) {
    clearInterval(refreshTimer);
    refreshTimer = null;
  }
}
