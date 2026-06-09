import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { DEFAULT_CONFIG } from '../src/api/types.ts';

const STATE_DIR = path.join(
  process.env.XDG_STATE_HOME || path.join(os.homedir(), '.local', 'state'),
  'touchfish-mastodon'
);
const STATE_PATH = path.join(STATE_DIR, 'tui-state.json');

function sanitizeTimelineType(value) {
  return value === 'public' ? 'public' : 'home';
}

function sanitizeConfig(config = {}) {
  const instanceUrl = typeof config.instanceUrl === 'string' ? config.instanceUrl.trim() : '';
  const accessToken = typeof config.accessToken === 'string' ? config.accessToken.trim() : '';

  return {
    ...DEFAULT_CONFIG,
    ...config,
    instanceUrl: instanceUrl || DEFAULT_CONFIG.instanceUrl,
    accessToken,
    timelineType: sanitizeTimelineType(config.timelineType),
    refreshInterval: Number.isFinite(config.refreshInterval)
      ? Math.min(Math.max(config.refreshInterval, 15), 600)
      : DEFAULT_CONFIG.refreshInterval,
    limit: Number.isFinite(config.limit)
      ? Math.min(Math.max(config.limit, 10), 80)
      : DEFAULT_CONFIG.limit,
  };
}

function emptyTimelineState() {
  return {
    selectedStatusId: null,
    topStatusId: null,
    expandedSpoilerIds: [],
  };
}

function sanitizeTimelineState(value = {}) {
  return {
    selectedStatusId:
      typeof value.selectedStatusId === 'string' && value.selectedStatusId.trim()
        ? value.selectedStatusId
        : null,
    topStatusId:
      typeof value.topStatusId === 'string' && value.topStatusId.trim() ? value.topStatusId : null,
    expandedSpoilerIds: Array.isArray(value.expandedSpoilerIds)
      ? value.expandedSpoilerIds.filter((item) => typeof item === 'string')
      : [],
  };
}

export function defaultTuiState() {
  return {
    version: 1,
    hasCompletedOnboarding: false,
    config: sanitizeConfig(DEFAULT_CONFIG),
    timelines: {
      home: emptyTimelineState(),
      public: emptyTimelineState(),
    },
  };
}

export function loadTuiState() {
  try {
    const raw = fs.readFileSync(STATE_PATH, 'utf8');
    const parsed = JSON.parse(raw);

    return {
      ...defaultTuiState(),
      ...parsed,
      config: sanitizeConfig(parsed.config),
      timelines: {
        home: sanitizeTimelineState(parsed.timelines?.home),
        public: sanitizeTimelineState(parsed.timelines?.public),
      },
      hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
    };
  } catch (_error) {
    return defaultTuiState();
  }
}

export function saveTuiState(state) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

export function getStatePath() {
  return STATE_PATH;
}

export function normalizeInstanceUrl(value) {
  const trimmed = String(value || '').trim().replace(/\/+$/, '');
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

export function updateTimelinePosition(state, timelineType, patch) {
  return {
    ...state,
    timelines: {
      ...state.timelines,
      [timelineType]: {
        ...state.timelines[timelineType],
        ...patch,
      },
    },
  };
}
