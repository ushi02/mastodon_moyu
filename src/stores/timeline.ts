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

function isSameTimelineContext(
  previousConfig: Partial<AppConfig>,
  nextConfig: Partial<AppConfig>
): boolean {
  const previous = { ...DEFAULT_CONFIG, ...previousConfig };
  const next = { ...DEFAULT_CONFIG, ...nextConfig };

  return (
    previous.instanceUrl === next.instanceUrl &&
    previous.timelineType === next.timelineType &&
    previous.accessToken === next.accessToken
  );
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
  const previousConfig = currentConfig;
  currentConfig = config;

  isLoading.set(true);
  error.set(null);

  try {
    const data = await fetchTimeline(config);
    const existingStatuses = get(statuses);
    const shouldReplaceStatuses =
      existingStatuses.length === 0 || !isSameTimelineContext(previousConfig, config);

    statuses.set(
      shouldReplaceStatuses ? data : mergeStatuses(data, existingStatuses)
    );
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
