<script lang="ts">
  /**
   * Main page — Root layout of TouchFish.
   * Integrates all components, keyboard shortcuts, and window management.
   */
  import { onMount, onDestroy } from 'svelte';
  import { get } from 'svelte/store';
  import { hide as hideApp, show as showApp } from '@tauri-apps/api/app';
  import { getCurrentWindow } from '@tauri-apps/api/window';
  import { LogicalSize, LogicalPosition } from '@tauri-apps/api/dpi';
  import { availableMonitors, primaryMonitor } from '@tauri-apps/api/window';
  import TitleBar from '../components/TitleBar.svelte';
  import Timeline from '../components/Timeline.svelte';
  import StatusBar from '../components/StatusBar.svelte';
  import Settings from '../components/Settings.svelte';
  import {
    refreshTimeline,
    startAutoRefresh,
    stopAutoRefresh,
    persistedState,
    updatePersistedState,
    getConfig,
    error,
    t,
  } from '../stores';
  import { isRegistered, register, unregister } from '@tauri-apps/plugin-global-shortcut';
  import { DEFAULT_CONFIG } from '../api';
  import '../styles/global.css';

  const appWindow = getCurrentWindow();

  let timelineComponent: Timeline;
  let showSettings = false;
  let settingsMode: 'setup' | 'settings' = 'settings';
  let settingsSection: 'account' | 'appearance' | 'help' = 'account';
  let windowSaveTimer: ReturnType<typeof setTimeout> | null = null;
  let registeredShortcut: string | null = null;
  let shortcutRegistrationError: string | null = null;
  let shortcutWarning: string | null = null;
  let pendingGotoTop = false;
  let gotoTopTimer: ReturnType<typeof setTimeout> | null = null;
  const defaultShortcut = DEFAULT_CONFIG.globalShortcut;

  $: applyTheme($persistedState.config);

  function tt(key: string, params?: Record<string, string | number>) {
    return get(t)(key, params);
  }

  function applyTheme(config: typeof $persistedState.config) {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    root.dataset.theme = config.themeMode ?? 'dark';
    root.style.setProperty('--ui-font-scale', String(config.fontScale ?? 1));
    root.style.setProperty('--ui-accent', config.accentColor);
    root.style.setProperty('--window-opacity', String(config.opacity ?? 0.85));
  }

  function openSettings(
    mode: 'setup' | 'settings' = 'settings',
    section: 'account' | 'appearance' | 'help' = 'account'
  ) {
    settingsMode = mode;
    settingsSection = section;
    showSettings = true;
  }

  async function hideWindowInstant() {
    await hideApp();
    await appWindow.hide();
  }

  async function toggleWindowVisibility() {
    const isMinimized = await appWindow.isMinimized();
    if (isMinimized) {
      await showApp();
      await appWindow.unminimize();
      await appWindow.show();
      await appWindow.setFocus();
      return;
    }

    const isVisible = await appWindow.isVisible();
    if (isVisible) {
      await hideWindowInstant();
    } else {
      await showApp();
      await appWindow.show();
      await appWindow.setFocus();
    }
  }

  async function registerConfiguredShortcut(shortcut: string) {
    const normalizedShortcut = shortcut.trim() || defaultShortcut;
    shortcutRegistrationError = null;

    try {
      if (registeredShortcut && registeredShortcut !== normalizedShortcut) {
        await unregister(registeredShortcut);
      }

      const alreadyRegistered = await isRegistered(normalizedShortcut);
      if (!alreadyRegistered || registeredShortcut === normalizedShortcut) {
        await register(normalizedShortcut, async (event) => {
          if (event.state !== 'Pressed') return;
          await toggleWindowVisibility();
        });
      }

      registeredShortcut = normalizedShortcut;
      shortcutWarning = null;
    } catch (e) {
      console.warn('[TouchFish] Failed to register global shortcut:', e);

      if (normalizedShortcut !== defaultShortcut) {
        try {
          if (registeredShortcut && registeredShortcut !== defaultShortcut) {
            await unregister(registeredShortcut);
          }

          const fallbackRegistered = await isRegistered(defaultShortcut);
          if (!fallbackRegistered || registeredShortcut === defaultShortcut) {
            await register(defaultShortcut, async (event) => {
              if (event.state !== 'Pressed') return;
              await toggleWindowVisibility();
            });
          }

          registeredShortcut = defaultShortcut;
          shortcutWarning = null;
          updatePersistedState({
            config: {
              ...getConfig(),
              globalShortcut: defaultShortcut,
            },
          });
          shortcutRegistrationError = tt('shortcuts.fallbackToDefault', {
            shortcut: defaultShortcut,
          });
          openSettings('settings', 'account');
          return;
        } catch (fallbackError) {
          console.warn('[TouchFish] Failed to register fallback shortcut:', fallbackError);
        }
      }

      registeredShortcut = null;
      shortcutRegistrationError = tt('shortcuts.defaultRegistrationFailed', {
        shortcut: defaultShortcut,
      });
      shortcutWarning = tt('shortcuts.warning');
      openSettings('settings', 'account');
    }
  }

  // Reactively open settings if auth is required or onboarding is not finished
  $: if (
    !$persistedState.hasCompletedOnboarding ||
    $error?.includes('authenticated user') ||
    (getConfig().timelineType === 'home' && !getConfig().accessToken)
  ) {
    if (!showSettings) showSettings = true;
    if (!$persistedState.hasCompletedOnboarding) {
      settingsMode = 'setup';
      settingsSection = 'help';
    } else {
      settingsMode = 'settings';
      settingsSection = 'account';
    }
  }

  // ---- Keyboard shortcuts ----
  function handleKeydown(e: KeyboardEvent) {
    // Ignore if typing in an input
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

    if (e.key !== 'g' && gotoTopTimer) {
      clearTimeout(gotoTopTimer);
      gotoTopTimer = null;
      pendingGotoTop = false;
    }

    switch (e.key) {
      case 'j':
        e.preventDefault();
        timelineComponent?.scrollBy(56);
        break;
      case 'k':
        e.preventDefault();
        timelineComponent?.scrollBy(-56);
        break;
      case 'r':
        e.preventDefault();
        timelineComponent?.captureScrollAnchor();
        refreshTimeline(getConfig());
        break;
      case 'd':
        e.preventDefault();
        timelineComponent?.scrollPage(1);
        break;
      case 'g':
        e.preventDefault();
        if (pendingGotoTop) {
          if (gotoTopTimer) {
            clearTimeout(gotoTopTimer);
            gotoTopTimer = null;
          }
          pendingGotoTop = false;
          timelineComponent?.scrollToTop();
        } else {
          pendingGotoTop = true;
          gotoTopTimer = setTimeout(() => {
            pendingGotoTop = false;
            gotoTopTimer = null;
          }, 400);
        }
        break;
      case 'G':
        e.preventDefault();
        timelineComponent?.scrollToBottom();
        break;
      case 'u':
        e.preventDefault();
        timelineComponent?.scrollPage(-1);
        break;
      case 'ArrowDown':
        e.preventDefault();
        timelineComponent?.scrollBy(28);
        break;
      case 'ArrowUp':
        e.preventDefault();
        timelineComponent?.scrollBy(-28);
        break;
    }
  }

  // ---- Window state persistence ----
  async function saveWindowState() {
    try {
      const position = await appWindow.outerPosition();
      const size = await appWindow.outerSize();
      updatePersistedState({
        windowX: position.x,
        windowY: position.y,
        windowWidth: size.width,
        windowHeight: size.height,
      });
    } catch (e) {
      // Silently ignore errors during window state save
    }
  }

  async function restoreWindowState() {
    const state = $persistedState;
    try {
      const monitors = await availableMonitors();
      const monitor = await primaryMonitor();
      const compactWidth = monitor ? Math.round(monitor.size.width * 0.32) : 360;
      const compactHeight = monitor ? Math.round(monitor.size.height * 0.4) : 520;
      const targetWidth = Math.max(280, compactWidth);
      const targetHeight = Math.max(200, compactHeight);
      const savedX = state.windowX;
      const savedY = state.windowY;

      await appWindow.setSize(new LogicalSize(targetWidth, targetHeight));

      const hasValidSavedPosition =
        savedX !== undefined &&
        savedY !== undefined &&
        monitors.some((monitor) => {
          const { position, size } = monitor;
          return (
            savedX + targetWidth > position.x &&
            savedX < position.x + size.width &&
            savedY + targetHeight > position.y &&
            savedY < position.y + size.height
          );
        });

      if (hasValidSavedPosition) {
        await appWindow.setPosition(new LogicalPosition(savedX, savedY));
        return;
      }

      if (monitor) {
        const centeredX = monitor.position.x + Math.round((monitor.size.width - targetWidth) / 2);
        const centeredY = monitor.position.y + Math.round((monitor.size.height - targetHeight) / 2);
        await appWindow.setPosition(new LogicalPosition(centeredX, centeredY));
      }
    } catch (e) {
      console.warn('[TouchFish] Failed to restore window state:', e);
    }
  }

  // Debounced window state save on move/resize
  function scheduleWindowSave() {
    if (windowSaveTimer) clearTimeout(windowSaveTimer);
    windowSaveTimer = setTimeout(saveWindowState, 500);
  }

  let unlistenMove: (() => void) | null = null;
  let unlistenResize: (() => void) | null = null;

  onMount(async () => {
    // Restore window state
    await restoreWindowState();
    await appWindow.show();
    await appWindow.setFocus();

    await registerConfiguredShortcut(getConfig().globalShortcut);

    const config = getConfig();

    if ($persistedState.hasCompletedOnboarding && !(config.timelineType === 'home' && !config.accessToken)) {
      await refreshTimeline(config);
      startAutoRefresh(config);
    } else {
      openSettings($persistedState.hasCompletedOnboarding ? 'settings' : 'setup', 'help');
    }

    // Listen for window move/resize to persist state
    unlistenMove = await appWindow.onMoved(() => scheduleWindowSave());
    unlistenResize = await appWindow.onResized(() => scheduleWindowSave());
  });

  onDestroy(() => {
    stopAutoRefresh();
    if (windowSaveTimer) clearTimeout(windowSaveTimer);
    if (gotoTopTimer) clearTimeout(gotoTopTimer);
    if (unlistenMove) unlistenMove();
    if (unlistenResize) unlistenResize();
    if (registeredShortcut) {
      unregister(registeredShortcut).catch(() => {});
    }
  });
</script>

<svelte:window on:keydown={handleKeydown} />

<div
  class="app-shell"
  role="application"
>
  <TitleBar />
  {#if shortcutWarning && !showSettings}
    <div class="app-banner">
      <span>{shortcutWarning}</span>
      <button class="banner-action" on:click={() => openSettings('settings', 'account')}
        >{$t('banner.openSettings')}</button
      >
      <button
        class="banner-close"
        on:click={() => (shortcutWarning = null)}
        aria-label={$t('banner.closeNotice')}>×</button
      >
    </div>
  {/if}
  {#if showSettings}
    <Settings
      mode={settingsMode}
      initialSection={settingsSection}
      shortcutRegistrationError={shortcutRegistrationError}
      on:close={() => (showSettings = false)}
      on:save={async () => {
        updatePersistedState({ hasCompletedOnboarding: true });
        const config = getConfig();
        await registerConfiguredShortcut(config.globalShortcut);
        await refreshTimeline(config);
        startAutoRefresh(config);
      }}
    />
  {:else}
    <Timeline bind:this={timelineComponent} />
    <StatusBar on:settings={() => openSettings('settings', 'account')} />
  {/if}
</div>

<style>
  .app-shell {
    display: flex;
    flex-direction: column;
    height: 100vh;
    width: 100vw;
    background: var(--bg-primary);
    backdrop-filter: blur(16px) saturate(180%);
    -webkit-backdrop-filter: blur(16px) saturate(180%);
    border: none;
    border-radius: 0;
    overflow: hidden;
    transition: opacity var(--transition-normal);
    box-shadow: none;
  }

  .app-banner {
    display: flex;
    align-items: center;
    gap: var(--spacing-sm);
    padding: 8px 12px;
    border-bottom: 1px solid var(--border-light);
    background: color-mix(in srgb, var(--accent) 12%, var(--bg-secondary));
    color: var(--text-secondary);
    font-size: var(--font-size-xs);
  }

  .app-banner span {
    flex: 1;
  }

  .banner-action,
  .banner-close {
    border: 1px solid var(--border-light);
    background: var(--bg-primary);
    color: var(--text-primary);
    border-radius: 8px;
    padding: 4px 8px;
    font-size: var(--font-size-xs);
    cursor: pointer;
  }

  .banner-close {
    width: 24px;
    padding: 4px 0;
  }
</style>
