// Timeline store — manages fetching, caching, and state for Mastodon timeline

import { writable, derived, get } from 'svelte/store';
import { fetchTimeline, type MastodonStatus, type AppConfig, DEFAULT_CONFIG } from '../api';

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

/**
 * Fetch timeline and update stores.
 */
export async function refreshTimeline(config: Partial<AppConfig> = {}): Promise<void> {
  const currentlyLoading = get(isLoading);
  if (currentlyLoading) return;
  currentConfig = config;

  isLoading.set(true);
  error.set(null);

  try {
    const data = await fetchTimeline(config);
    statuses.set(data);
    canLoadMore.set(data.length >= ((config.limit ?? DEFAULT_CONFIG.limit)));
    lastFetchedAt.set(new Date());
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
    statuses.set([...currentStatuses, ...data]);
    canLoadMore.set(data.length >= ((currentConfig.limit ?? DEFAULT_CONFIG.limit)));
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
