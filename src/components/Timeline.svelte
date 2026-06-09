<script lang="ts">
  /**
   * Timeline — Scrollable timeline container.
   * Renders list of StatusItems with smooth scrolling and state.
   */
  import { onDestroy, tick } from 'svelte';
  import StatusItem from './StatusItem.svelte';
  import { statuses, isLoading, isLoadingMore, canLoadMore, error, loadMoreTimeline } from '../stores';
  import { persistedState, t, updatePersistedState } from '../stores';

  let scrollContainer: HTMLDivElement;
  let scrollSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let hasRestoredScroll = false;
  const loadMoreThreshold = 240;
  let keyboardScrollFrame: number | null = null;
  let keyboardScrollPosition = 0;
  let keyboardScrollVelocity = 0;
  let pendingRefreshRestore = false;

  async function restoreScrollPosition() {
    if (!scrollContainer || hasRestoredScroll) return;
    await tick();

    if ($persistedState.topVisibleStatusId) {
      const anchor = scrollContainer.querySelector<HTMLElement>(
        `[data-status-id="${$persistedState.topVisibleStatusId}"]`
      );

      if (anchor) {
        scrollContainer.scrollTop = anchor.offsetTop + $persistedState.topVisibleStatusOffset;
        hasRestoredScroll = true;
        return;
      }
    }

    if ($persistedState.scrollPosition > 0) {
      scrollContainer.scrollTop = $persistedState.scrollPosition;
    }

    hasRestoredScroll = true;
  }

  $: if (scrollContainer && $statuses.length > 0) {
    restoreScrollPosition();
  }

  $: if (scrollContainer && pendingRefreshRestore && $statuses.length > 0) {
    restoreCapturedAnchor();
  }

  function getTopVisibleAnchor() {
    if (!scrollContainer) return null;

    const anchors = Array.from(
      scrollContainer.querySelectorAll<HTMLElement>('[data-status-id]')
    );

    for (const anchor of anchors) {
      const bottom = anchor.offsetTop + anchor.offsetHeight;
      if (bottom > scrollContainer.scrollTop) {
        return anchor;
      }
    }

    return anchors.at(-1) ?? null;
  }

  // Save scroll position on change (debounced)
  function handleScroll() {
    const distanceFromBottom =
      scrollContainer.scrollHeight - (scrollContainer.scrollTop + scrollContainer.clientHeight);
    if (distanceFromBottom < loadMoreThreshold) {
      loadMoreTimeline();
    }

    if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
      if (scrollContainer) {
        const topAnchor = getTopVisibleAnchor();
        updatePersistedState({
          scrollPosition: scrollContainer.scrollTop,
          topVisibleStatusId: topAnchor?.dataset.statusId,
          topVisibleStatusOffset: topAnchor
            ? scrollContainer.scrollTop - topAnchor.offsetTop
            : 0,
        });
        hasRestoredScroll = true;
      }
    }, 500);
  }

  /**
   * Scroll by a given number of pixels (for keyboard navigation).
   */
  export function scrollBy(delta: number) {
    if (scrollContainer) {
      if (keyboardScrollFrame === null) {
        keyboardScrollPosition = scrollContainer.scrollTop;
      }
      keyboardScrollVelocity += delta * 0.22;
      keyboardScrollVelocity = Math.max(-48, Math.min(48, keyboardScrollVelocity));
      startKeyboardScroll();
    }
  }

  /**
   * Scroll to top.
   */
  export function scrollToTop() {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  /**
   * Scroll to bottom.
   */
  export function scrollToBottom() {
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: scrollContainer.scrollHeight, behavior: 'smooth' });
    }
  }

  export function scrollPage(direction: 1 | -1) {
    if (scrollContainer) {
      scrollBy(Math.round(scrollContainer.clientHeight * 0.5) * direction);
    }
  }

  export function captureScrollAnchor() {
    if (!scrollContainer) return;

    const topAnchor = getTopVisibleAnchor();
    updatePersistedState({
      scrollPosition: scrollContainer.scrollTop,
      topVisibleStatusId: topAnchor?.dataset.statusId,
      topVisibleStatusOffset: topAnchor
        ? scrollContainer.scrollTop - topAnchor.offsetTop
        : 0,
    });
    pendingRefreshRestore = true;
  }

  async function restoreCapturedAnchor() {
    if (!scrollContainer) return;
    await tick();

    const anchorId = $persistedState.topVisibleStatusId;
    if (!anchorId) {
      pendingRefreshRestore = false;
      return;
    }

    const anchor = scrollContainer.querySelector<HTMLElement>(`[data-status-id="${anchorId}"]`);
    if (anchor) {
      scrollContainer.scrollTop = anchor.offsetTop + $persistedState.topVisibleStatusOffset;
    }

    pendingRefreshRestore = false;
  }

  function startKeyboardScroll() {
    if (!scrollContainer || keyboardScrollFrame !== null) return;

    const step = () => {
      if (!scrollContainer) {
        keyboardScrollFrame = null;
        return;
      }

      const maxScrollTop = scrollContainer.scrollHeight - scrollContainer.clientHeight;
      keyboardScrollPosition = Math.max(
        0,
        Math.min(maxScrollTop, keyboardScrollPosition + keyboardScrollVelocity)
      );
      scrollContainer.scrollTop = Math.round(keyboardScrollPosition);

      if (keyboardScrollPosition <= 0 || keyboardScrollPosition >= maxScrollTop) {
        keyboardScrollVelocity *= 0.5;
      }

      keyboardScrollVelocity *= 0.84;
      if (Math.abs(keyboardScrollVelocity) < 0.35) {
        keyboardScrollVelocity = 0;
        keyboardScrollFrame = null;
        return;
      }

      keyboardScrollFrame = requestAnimationFrame(step);
    };

    keyboardScrollFrame = requestAnimationFrame(step);
  }

  onDestroy(() => {
    if (scrollSaveTimer) clearTimeout(scrollSaveTimer);
    if (keyboardScrollFrame !== null) cancelAnimationFrame(keyboardScrollFrame);
  });
</script>

<div
  class="timeline"
  bind:this={scrollContainer}
  on:scroll={handleScroll}
>
  {#if $error}
    <div class="timeline-error">
      <span class="error-icon">⚠</span>
      <span>{$error}</span>
    </div>
  {/if}

  {#if $isLoading && $statuses.length === 0}
    <div class="timeline-loading">
      <span class="loading-dots">{$t('timeline.fetching')}<span class="dots">...</span></span>
    </div>
  {/if}

  {#each $statuses as status (status.id)}
    <div class="timeline-anchor" data-status-id={status.id}>
      <StatusItem {status} />
    </div>
  {/each}

  {#if $statuses.length > 0}
    <div class="timeline-more">
      <button
        class="load-more-btn"
        on:click={() => loadMoreTimeline()}
        disabled={$isLoadingMore || !$canLoadMore}
      >
        {$isLoadingMore
          ? $t('timeline.loadingMore')
          : $canLoadMore
            ? $t('timeline.loadMore')
            : $t('timeline.noMorePosts')}
      </button>
    </div>
  {/if}

  {#if !$isLoading && $statuses.length === 0 && !$error}
    <div class="timeline-empty">
      <div>{$t('timeline.noPosts')}</div>
      <div class="empty-hint">{$t('timeline.refreshHint')}</div>
    </div>
  {/if}
</div>

<style>
  .timeline {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    position: relative;
    overflow-anchor: none;
  }

  .timeline-anchor {
    position: relative;
    overflow-anchor: none;
  }

  .timeline-more {
    padding: var(--spacing-md) var(--spacing-lg) calc(var(--spacing-md) * 2);
    display: flex;
    justify-content: center;
  }

  .load-more-btn {
    border: 1px solid var(--border-light);
    background: var(--bg-secondary);
    color: var(--text-primary);
    border-radius: 999px;
    padding: 8px 14px;
    font-size: var(--font-size-sm);
    cursor: pointer;
  }

  .load-more-btn:hover:enabled {
    background: color-mix(in srgb, var(--accent) 10%, var(--bg-secondary));
  }

  .load-more-btn:disabled {
    opacity: 0.55;
    cursor: default;
  }

  .timeline-error {
    margin: var(--spacing-md);
    padding: var(--spacing-md);
    font-size: var(--font-size-sm);
    color: #EF4444;
    background: rgba(239, 68, 68, 0.1);
    border: 1px solid rgba(239, 68, 68, 0.2);
    border-radius: 8px;
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    backdrop-filter: blur(8px);
  }

  .error-icon {
    font-size: var(--font-size-base);
  }

  .timeline-loading {
    padding: var(--spacing-xl) var(--spacing-lg);
    text-align: center;
    color: var(--text-muted);
    font-size: var(--font-size-sm);
    font-family: var(--font-display);
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100px;
  }

  .loading-dots {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--bg-secondary);
    padding: 8px 16px;
    border-radius: 20px;
    box-shadow: var(--shadow-sm);
    border: 1px solid var(--border-light);
  }

  .loading-dots .dots {
    animation: blink 1.4s infinite both;
  }

  @keyframes blink {
    0% { opacity: 0.2; }
    20% { opacity: 1; }
    100% { opacity: 0.2; }
  }

  .timeline-empty {
    padding: var(--spacing-xl) var(--spacing-lg);
    text-align: center;
    color: var(--text-muted);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 200px;
  }

  .timeline-empty div:first-child {
    font-family: var(--font-display);
    font-size: var(--font-size-base);
    color: var(--text-secondary);
    margin-bottom: var(--spacing-xs);
  }

  .empty-hint {
    font-size: var(--font-size-xs);
    opacity: 0.6;
    background: var(--bg-secondary);
    padding: 4px 8px;
    border-radius: 4px;
    font-family: var(--font-mono);
  }
</style>
