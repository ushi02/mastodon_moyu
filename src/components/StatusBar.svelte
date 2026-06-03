<script lang="ts">
  /**
   * StatusBar — Bottom status bar showing instance info,
   * timeline mode, and opacity control.
   */
  import { createEventDispatcher } from 'svelte';
  import { persistedState, updateConfig, refreshTimeline, startAutoRefresh } from '../stores';

  const dispatch = createEventDispatcher();

  $: config = $persistedState.config;

  function handleOpacityChange(e: Event) {
    const target = e.target as HTMLInputElement;
    updateConfig({ opacity: parseFloat(target.value) });
  }

  function toggleThemeMode() {
    updateConfig({ themeMode: config.themeMode === 'dark' ? 'light' : 'dark' });
  }

  async function handleTimelineChange(nextTimeline: 'public' | 'home') {
    if (nextTimeline === config.timelineType) return;

    if (nextTimeline === 'home' && !config.accessToken) {
      dispatch('settings');
      return;
    }

    const nextConfig = { ...config, timelineType: nextTimeline };
    updateConfig({ timelineType: nextTimeline });
    await refreshTimeline(nextConfig);
    startAutoRefresh(nextConfig);
  }
</script>

<footer class="statusbar">
  <div class="statusbar-left">
    <span class="statusbar-instance" title={config.instanceUrl}>
      {config.instanceUrl.replace('https://', '')}
    </span>
  </div>
  <div class="statusbar-center">
    <div class="timeline-toggle" role="tablist" aria-label="时间线切换">
      <button
        class:active={config.timelineType === 'public'}
        class="toggle-btn"
        on:click={() => handleTimelineChange('public')}
      >
        Public
      </button>
      <button
        class:active={config.timelineType === 'home'}
        class="toggle-btn"
        on:click={() => handleTimelineChange('home')}
      >
        Home
      </button>
    </div>
  </div>
  <div class="statusbar-right">
    <div class="statusbar-tools">
      <button
        type="button"
        class="settings-toggle"
        title="设置"
        on:click={() => dispatch('settings')}
      >
        ⚙
      </button>
      <button
        type="button"
        class="theme-toggle"
        title={config.themeMode === 'dark' ? '切换到 Light' : '切换到 Dark'}
        on:click={toggleThemeMode}
      >
        {config.themeMode === 'dark' ? '◐' : '◑'}
      </button>
      <label class="opacity-control" title="透明度">
      <input
        type="range"
        min="0.2"
        max="1"
        step="0.05"
        value={config.opacity}
        on:input={handleOpacityChange}
        class="opacity-slider"
      />
      <span class="opacity-value">{Math.round(config.opacity * 100)}%</span>
      </label>
    </div>
  </div>
</footer>

<style>
  .statusbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 32px;
    padding: 0 14px 8px;
    background: transparent;
    font-size: 11px;
    color: var(--text-muted);
    flex-shrink: 0;
    gap: var(--spacing-sm);
    font-family: var(--font-sans);
  }

  .statusbar-left {
    flex: 1;
    overflow: hidden;
  }

  .statusbar-instance {
    opacity: 0.7;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    font-size: 10px;
    letter-spacing: 0.02em;
  }

  .statusbar-center {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;
  }

  .timeline-toggle {
    display: inline-flex;
    align-items: center;
    padding: 2px;
    border-radius: 999px;
    background: color-mix(in srgb, var(--bg-secondary) 72%, transparent);
    border: 1px solid var(--border-light);
    gap: 2px;
  }

  .toggle-btn {
    border: none;
    background: transparent;
    color: var(--text-muted);
    font-size: 11px;
    padding: 4px 10px;
    border-radius: 999px;
    cursor: pointer;
    transition: background var(--transition-fast), color var(--transition-fast), opacity var(--transition-fast);
    opacity: 0.8;
  }

  .toggle-btn.active {
    background: var(--accent-gradient);
    color: #fff;
    opacity: 1;
  }

  .statusbar-right {
    flex-shrink: 0;
  }

  .statusbar-tools {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .theme-toggle {
    border: none;
    background: transparent;
    color: var(--text-muted);
    width: 24px;
    height: 24px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 13px;
    line-height: 1;
  }

  .settings-toggle {
    border: none;
    background: transparent;
    color: var(--text-muted);
    width: 28px;
    height: 28px;
    border-radius: 999px;
    cursor: pointer;
    font-size: 15px;
    line-height: 1;
  }

  .opacity-control {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    padding: 0;
  }

  .opacity-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 120px;
    height: 4px;
    background: color-mix(in srgb, var(--border-light) 72%, transparent);
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }

  .opacity-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    appearance: none;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--accent);
    cursor: pointer;
    box-shadow: var(--shadow-sm);
    transition: transform var(--transition-fast);
  }

  .opacity-slider::-webkit-slider-thumb:hover {
    background: #93C5FD;
  }

  .opacity-value {
    min-width: 26px;
    text-align: right;
    opacity: 0.68;
    font-size: 10px;
    font-variant-numeric: tabular-nums;
  }
</style>
