<script lang="ts">
  /**
   * StatusItem — A single timeline status.
   * Minimal text-first layout for low-profile reading.
   */
  import type { MastodonStatus } from '../api/types';
  import { applyCustomEmojis, renderMastodonHtml, formatTime } from '../api/mastodon';

  export let status: MastodonStatus;
  let isContentRevealed = false;

  // Use the reblogged status if it's a boost
  $: displayStatus = status.reblog ?? status;
  $: isReblog = status.reblog !== null;
  $: contentHtml = applyCustomEmojis(
    renderMastodonHtml(displayStatus.content),
    displayStatus.emojis
  );
  $: timeAgo = formatTime(displayStatus.created_at);
  $: username = displayStatus.account.acct;
  $: displayName = displayStatus.account.display_name || username;
  $: displayNameHtml = applyCustomEmojis(displayName, displayStatus.account.emojis);
  $: spoilerTextHtml = applyCustomEmojis(displayStatus.spoiler_text, displayStatus.emojis);
  $: hasSpoiler = Boolean(displayStatus.spoiler_text);
  $: isContentHidden = hasSpoiler && !isContentRevealed;

  function toggleContentVisibility() {
    if (!hasSpoiler) return;
    isContentRevealed = !isContentRevealed;
  }
</script>

<article class="status-item" class:reblog={isReblog}>
  {#if isReblog}
    <div class="status-boost">
      <span class="boost-icon">⟲</span>
      <span class="boost-user">{status.account.display_name || status.account.acct} boosted</span>
    </div>
  {/if}

  <div class="status-header">
    <img
      src={displayStatus.account.avatar}
      alt={username}
      class="status-avatar"
      loading="lazy"
    />
    <div class="status-meta">
      <div class="status-name-row">
        <span class="status-display-name rendered-inline" title={displayName}>
          {@html displayNameHtml}
        </span>
        <span class="status-time">{timeAgo}</span>
      </div>
      <span class="status-user">@{username}</span>
    </div>
  </div>

  {#if displayStatus.spoiler_text}
    <button
      type="button"
      class="status-cw"
      aria-expanded={isContentRevealed}
      on:click={toggleContentVisibility}
    >
      <span class="cw-label">CW</span>
      <span class="cw-text rendered-inline">{@html spoilerTextHtml}</span>
      <span class="cw-toggle">{isContentRevealed ? 'hide' : 'show'}</span>
    </button>
  {/if}

  {#if !isContentHidden}
    <div class="status-content rendered-content">
      {@html contentHtml}
    </div>
  {/if}

  <div class="status-footer">
    <div class="action-buttons">
      {#if displayStatus.replies_count > 0}
        <span class="status-stat reply">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
          {displayStatus.replies_count}
        </span>
      {/if}
      {#if displayStatus.reblogs_count > 0}
        <span class="status-stat boost">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
          {displayStatus.reblogs_count}
        </span>
      {/if}
      {#if displayStatus.favourites_count > 0}
        <span class="status-stat fave">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
          {displayStatus.favourites_count}
        </span>
      {/if}
    </div>
    {#if displayStatus.language}
      <span class="status-lang">{displayStatus.language}</span>
    {/if}
  </div>
</article>

<style>
  .status-item {
    padding: 12px 16px;
    border-bottom: 1px solid var(--border-light);
    position: relative;
    background: transparent;
  }

  .status-header {
    display: flex;
    align-items: flex-start;
    gap: 10px;
    margin-bottom: var(--spacing-sm);
  }

  .status-avatar {
    width: 22px;
    height: 22px;
    border-radius: 50%;
    object-fit: cover;
    flex-shrink: 0;
    opacity: 0.92;
    border: 1px solid var(--border-light);
  }

  .status-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .status-name-row {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: var(--spacing-sm);
  }

  .status-display-name {
    font-family: var(--font-sans);
    font-weight: 600;
    color: var(--text-primary);
    font-size: calc(var(--font-size-sm) * 1.03);
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-user {
    color: var(--text-muted);
    font-size: 11px;
    opacity: 0.72;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .status-time {
    color: var(--text-muted);
    font-size: var(--font-size-xs);
    flex-shrink: 0;
    font-variant-numeric: tabular-nums;
  }

  /* Content */
  .status-content {
    color: var(--text-primary);
    font-size: var(--font-size-sm);
    line-height: 1.62;
    word-break: break-word;
    white-space: pre-wrap;
  }

  .rendered-content :global(p) {
    margin: 0 0 0.45em;
  }

  .rendered-content :global(p:last-child) {
    margin-bottom: 0;
  }

  .rendered-content :global(br) {
    content: '';
  }

  .rendered-content :global(a) {
    color: var(--text-link);
  }

  .rendered-content :global(img.custom-emoji) {
    width: 1.2em;
    height: 1.2em;
    vertical-align: -0.22em;
    margin: 0 0.04em;
  }

  .rendered-inline :global(img.custom-emoji) {
    width: 1.08em;
    height: 1.08em;
    vertical-align: -0.18em;
    margin: 0 0.03em;
  }

  /* Boost Header */
  .status-boost {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    margin-bottom: var(--spacing-sm);
    display: flex;
    align-items: center;
    gap: var(--spacing-xs);
    font-weight: 500;
  }

  .boost-icon {
    color: #34D399; /* Green for boost */
  }

  /* Content Warning */
  .status-cw {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    font-size: var(--font-size-xs);
    margin-bottom: var(--spacing-sm);
    padding: var(--spacing-sm);
    background: rgba(245, 158, 11, 0.1);
    border-radius: 6px;
    border: 1px solid rgba(245, 158, 11, 0.2);
    color: inherit;
    width: 100%;
    text-align: left;
    cursor: pointer;
  }

  .cw-label {
    font-weight: 700;
    color: #F59E0B;
    background: rgba(245, 158, 11, 0.2);
    padding: 2px 6px;
    border-radius: 4px;
  }

  .cw-text {
    color: var(--text-primary);
    flex: 1;
  }

  .cw-toggle {
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* Footer Actions */
  .status-footer {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 10px;
    font-size: var(--font-size-xs);
    color: var(--text-muted);
    opacity: 0.78;
  }

  .action-buttons {
    display: flex;
    gap: var(--spacing-lg);
  }

  .status-stat {
    display: flex;
    align-items: center;
    gap: 4px;
    font-family: var(--font-mono);
    cursor: default;
    transition: color var(--transition-fast);
  }

  .status-lang {
    text-transform: uppercase;
    letter-spacing: 0.5px;
    font-weight: 600;
    opacity: 0.5;
  }

  .reblog {
    background: transparent;
  }
</style>
