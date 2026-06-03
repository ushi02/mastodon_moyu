// Mastodon REST API client

import { DEFAULT_CONFIG, type AppConfig, type MastodonCustomEmoji, type MastodonStatus } from './types';

/**
 * Fetch the timeline from a Mastodon instance.
 */
export async function fetchTimeline(
  config: Partial<AppConfig> = {},
  options: { maxId?: string } = {}
): Promise<MastodonStatus[]> {
  const { instanceUrl, limit, timelineType, accessToken } = { ...DEFAULT_CONFIG, ...config };
  
  const endpoint = timelineType === 'home' ? '/api/v1/timelines/home' : '/api/v1/timelines/public';
  const params = new URLSearchParams({ limit: String(limit) });
  if (options.maxId) {
    params.set('max_id', options.maxId);
  }
  const url = `${instanceUrl}${endpoint}?${params.toString()}`;

  const headers: Record<string, string> = {
    'Accept': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url, {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    let errorMsg = `API error: ${response.status} ${response.statusText}`;
    try {
      const errorJson = await response.json();
      if (errorJson && errorJson.error) {
        errorMsg = `API error (${response.status}): ${errorJson.error}`;
      }
    } catch (_) {
      // Ignore if response is not JSON
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

/**
 * Strip HTML tags from Mastodon status content.
 * Returns clean text for terminal-style display.
 */
export function stripHtml(html: string): string {
  // Preserve Mastodon custom emoji shortcodes before stripping tags.
  let text = html.replace(/<img[^>]*\balt="([^"]+)"[^>]*>/gi, '$1');
  // Replace <br> and </p> with newlines
  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/p>\s*<p>/gi, '\n\n');
  // Remove all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '');
  // Decode common HTML entities
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  text = text.replace(/&nbsp;/g, ' ');
  // Collapse multiple newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  return text.trim();
}

/**
 * Keep Mastodon's sanitized rich text and inline custom emoji images.
 */
export function renderMastodonHtml(html: string): string {
  return html
    .replace(/<a\b/gi, '<a target="_blank" rel="noreferrer noopener"')
    .replace(/<img\b([^>]*?)class="([^"]*?)custom-emoji([^"]*?)"([^>]*)>/gi, (_match, pre, left, right, post) => {
      const mergedClass = `${left} custom-emoji ${right}`.trim().replace(/\s+/g, ' ');
      return `<img${pre}class="${mergedClass}"${post}>`;
    });
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Replace emoji shortcodes like :blobcat: with inline emoji images from Mastodon metadata.
 */
export function applyCustomEmojis(
  html: string,
  emojis: MastodonCustomEmoji[] | undefined
): string {
  if (!emojis?.length) return html;

  let rendered = html;
  for (const emoji of emojis) {
    const shortcode = `:${emoji.shortcode}:`;
    const pattern = new RegExp(escapeRegExp(shortcode), 'g');
    const src = escapeHtml(emoji.static_url || emoji.url);
    const alt = escapeHtml(shortcode);
    rendered = rendered.replace(
      pattern,
      `<img class="custom-emoji" src="${src}" alt="${alt}" title="${alt}" />`
    );
  }

  return rendered;
}

/**
 * Format a timestamp to a relative or compact time string.
 */
export function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60) return `${diffSec}s`;
  if (diffMin < 60) return `${diffMin}m`;
  if (diffHour < 24) return `${diffHour}h`;
  if (diffDay < 7) return `${diffDay}d`;

  // Compact date format
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${month}/${day}`;
}
