<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { get } from 'svelte/store';
  import { DEFAULT_CONFIG } from '../api';
  import { persistedState, updateConfig } from '../stores';

  export let mode: 'setup' | 'settings' = 'settings';
  export let initialSection: 'account' | 'appearance' | 'help' = 'account';
  export let shortcutRegistrationError: string | null = null;

  const dispatch = createEventDispatcher();

  const accentPresets = [
    { name: 'Sage', value: '#7FA38A' },
    { name: 'Clay', value: '#B7876B' },
    { name: 'Dust Rose', value: '#B7848C' },
    { name: 'Slate', value: '#7C8CA5' },
  ];

  const initialConfig = get(persistedState).config;

  let activeSection: 'account' | 'appearance' | 'help' = initialSection;
  let validationMessage = '';

  $: config = $persistedState.config;

  let instanceUrl = initialConfig.instanceUrl;
  let accessToken = initialConfig.accessToken;
  let timelineType = initialConfig.timelineType;
  let themeMode = initialConfig.themeMode;
  let globalShortcut = initialConfig.globalShortcut;
  let fontScale = initialConfig.fontScale;
  let accentColor = initialConfig.accentColor;
  let opacity = initialConfig.opacity;
  let isRecordingShortcut = false;
  let isAccessTokenVisible = false;

  const showCloseButton = mode === 'settings';
  $: isSetupMode = mode === 'setup';
  $: if (activeSection === 'appearance') {
    updateConfig({
      themeMode,
      fontScale,
      accentColor,
    });
  }

  function normalizeInstanceUrl(url: string): string {
    const trimmed = url.trim().replace(/\/$/, '');
    if (!trimmed) return '';
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://${trimmed}`;
  }

  function handleSave() {
    validationMessage = '';

    const normalizedInstanceUrl = normalizeInstanceUrl(instanceUrl);
    if (!normalizedInstanceUrl) {
      validationMessage = '需要先填一个实例地址。';
      activeSection = 'account';
      return;
    }

    if (timelineType === 'home' && !accessToken.trim()) {
      validationMessage = '主页时间线需要 Access Token。你也可以先切到 Public 模式开始用。';
      activeSection = 'account';
      return;
    }

    updateConfig({
      instanceUrl: normalizedInstanceUrl,
      accessToken: accessToken.trim(),
      timelineType,
      themeMode,
      globalShortcut: globalShortcut.trim(),
      fontScale,
      accentColor,
      opacity,
    });

    dispatch('close');
    dispatch('save');
  }

  function handleCancel() {
    dispatch('close');
  }

  function resetShortcutToDefault() {
    globalShortcut = DEFAULT_CONFIG.globalShortcut;
  }

  function normalizeShortcutKey(event: KeyboardEvent): string | null {
    const key = event.key;

    if (['Meta', 'Control', 'Alt', 'Shift'].includes(key)) return null;
    if (key === ' ') return 'Space';
    if (key === 'Escape') return 'Esc';
    if (key === 'ArrowUp') return 'Up';
    if (key === 'ArrowDown') return 'Down';
    if (key === 'ArrowLeft') return 'Left';
    if (key === 'ArrowRight') return 'Right';
    if (key.length === 1) return key.toUpperCase();
    return key;
  }

  function handleShortcutKeydown(event: KeyboardEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (event.key === 'Escape') {
      isRecordingShortcut = false;
      return;
    }

    if (event.key === 'Backspace') {
      globalShortcut = '';
      isRecordingShortcut = false;
      return;
    }

    const mainKey = normalizeShortcutKey(event);
    if (!mainKey) {
      isRecordingShortcut = true;
      return;
    }

    const modifiers: string[] = [];
    if (event.metaKey || event.ctrlKey) modifiers.push('CommandOrControl');
    if (event.altKey) modifiers.push('Alt');
    if (event.shiftKey) modifiers.push('Shift');

    globalShortcut = [...modifiers, mainKey].join('+');
    isRecordingShortcut = false;
  }
</script>

<div class="settings-screen">
  <div class="settings-modal">
    <div class="settings-header">
      <div>
        <h2>{isSetupMode ? '初始' : ''}</h2>
      </div>
      {#if showCloseButton}
        <button class="close-btn" on:click={handleCancel}>✕</button>
      {/if}
    </div>

    <div class="settings-layout">
      <aside class="settings-sidebar" aria-label="设置栏目">
        <button
          class:active={activeSection === 'account'}
          class="tab-btn"
          on:click={() => (activeSection = 'account')}
        >
          账号
        </button>
        <button
          class:active={activeSection === 'appearance'}
          class="tab-btn"
          on:click={() => (activeSection = 'appearance')}
        >
          外观
        </button>
        <button
          class:active={activeSection === 'help'}
          class="tab-btn"
          on:click={() => (activeSection = 'help')}
        >
          教程
        </button>
      </aside>

      <div class="settings-body">
      {#if activeSection === 'account'}
        <section class="panel-section">
          <div class="section-heading">
            <h3>账号登录</h3>
          </div>

          <div class="form-group">
            <label for="instanceUrl">实例地址</label>
            <input
              id="instanceUrl"
              type="url"
              bind:value={instanceUrl}
              placeholder="https://mastodon.social"
            />
          </div>

          <div class="token-guide">
            <h4>Token 获取步骤</h4>
            <p>2. 进入 `Preferences -> Development -> New Application`。</p>
            <p>3. 填写应用名称等信息，并把 Scopes 至少勾上 `read`。</p>
            <p>4. 创建应用后点进该应用详情页，再复制 Access Token 粘回这里。</p>
          </div>

          <div class="form-group">
            <label for="accessToken">Access Token</label>
            <div class="password-row">
              <input
                id="accessToken"
                type={isAccessTokenVisible ? 'text' : 'password'}
                bind:value={accessToken}
                placeholder="填入后可查看 Home 时间线"
              />
              <button
                type="button"
                class="visibility-toggle"
                on:click={() => (isAccessTokenVisible = !isAccessTokenVisible)}
                aria-label={isAccessTokenVisible ? '隐藏 token' : '显示 token'}
                title={isAccessTokenVisible ? '隐藏 token' : '显示 token'}
              >
                {isAccessTokenVisible ? '隐藏' : '显示'}
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="globalShortcut">一键开关快捷键</label>
            <div class:shortcut-recorder={true} class:recording={isRecordingShortcut}>
              <input
                id="globalShortcut"
                type="text"
                readonly
                bind:value={globalShortcut}
                placeholder="点击这里后，直接按组合键"
                on:focus={() => (isRecordingShortcut = true)}
                on:blur={() => (isRecordingShortcut = false)}
                on:keydown={handleShortcutKeydown}
              />
              <span class="recorder-chip">{isRecordingShortcut ? '录制中' : '快捷键'}</span>
            </div>
            <div class="inline-actions">
              <span class="help-text">
                {#if isRecordingShortcut}
                  现在直接按你想要的组合键；`Esc` 取消，`Backspace` 清空。
                {:else}
                  默认是 `{DEFAULT_CONFIG.globalShortcut}`。点输入框后直接按组合键即可。
                {/if}
              </span>
              <button type="button" class="text-btn" on:click={resetShortcutToDefault}>恢复默认</button>
            </div>
          </div>

          {#if shortcutRegistrationError}
            <div class="validation-banner">{shortcutRegistrationError}</div>
          {/if}
        </section>
      {/if}

      {#if activeSection === 'appearance'}
        <section class="panel-section">
          <div class="section-heading">
            <h3>外观调节</h3>
          </div>

          <div class="form-group">
            <span class="form-label">界面模式</span>
            <div class="radio-group" role="radiogroup" aria-label="界面模式">
              <label class="radio-card">
                <input type="radio" bind:group={themeMode} value="dark" />
                <div>
                  <strong>Dark</strong>
                  <span>适合低调摸鱼，减少刺眼感</span>
                </div>
              </label>
              <label class="radio-card">
                <input type="radio" bind:group={themeMode} value="light" />
                <div>
                  <strong>Light</strong>
                  <span>提高对比度，文字更清楚</span>
                </div>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="fontScale">字体大小</label>
            <div class="range-row">
              <input
                id="fontScale"
                type="range"
                min="0.9"
                max="1.45"
                step="0.05"
                bind:value={fontScale}
              />
              <span>{Math.round(fontScale * 100)}%</span>
            </div>
          </div>

          <div class="form-group">
            <span class="form-label">主题色</span>
            <div class="accent-grid">
              {#each accentPresets as preset}
                <button
                  type="button"
                  class:active={accentColor === preset.value}
                  class="accent-chip"
                  style={`--chip-color:${preset.value}`}
                  on:click={() => (accentColor = preset.value)}
                >
                  <span class="accent-swatch"></span>
                  {preset.name}
                </button>
              {/each}
            </div>
          </div>

        </section>
      {/if}

      {#if activeSection === 'help'}
        <section class="panel-section">
          <div class="section-heading">
            <h3>快速教程</h3>
          </div>

          <div class="help-grid">
            <article class="help-card">
              <h4>打开 / 关闭</h4>
              <p>全局快捷键：不切回 app 也能一键开关。</p>
              <p>默认是 `⌘D`，也可以设置 -> 账 -> 一键开关快捷键里改成别的组合。</p>
            </article>

            <article class="help-card">
              <h4>阅读操作</h4>
              <p>`j` / `k`：向下或向上滚动。</p>
              <p>`d` / `u`：向下或向上跳半页。</p>
              <p>`↑` / `↓`：细一点地滚动。</p>
              <p>`gg`：回到顶部，`G`：到最底，`r`：刷新时间线。</p>
            </article>
          </div>
        </section>
      {/if}

      {#if validationMessage}
        <div class="validation-banner">{validationMessage}</div>
      {/if}
      </div>
    </div>

    <div class="settings-footer">
      {#if showCloseButton}
        <button class="btn btn-secondary" on:click={handleCancel}>取消</button>
      {/if}
      <button class="btn btn-primary" on:click={handleSave}>
        {isSetupMode ? '保存并开始摸鱼' : '保存并刷新'}
      </button>
    </div>
  </div>
</div>

<style>
  .settings-screen {
    flex: 1;
    min-height: 0;
    background:
      radial-gradient(circle at top left, color-mix(in srgb, var(--accent) 14%, transparent), transparent 32%),
      linear-gradient(
        180deg,
        color-mix(in srgb, var(--bg-primary) 96%, white 4%),
        color-mix(in srgb, var(--bg-secondary) 94%, white 6%)
      );
    display: flex;
    align-items: stretch;
    justify-content: center;
    padding: 18px;
  }

  .settings-modal {
    width: min(100%, 760px);
    height: 100%;
    overflow: hidden;
    background: color-mix(in srgb, var(--bg-primary) 94%, rgba(255, 255, 255, 0.08));
    border: 1px solid var(--border-light);
    border-radius: 18px;
    display: flex;
    flex-direction: column;
    box-shadow: var(--shadow-md);
  }

  .settings-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: var(--spacing-md);
    padding: 12px 16px 0;
  }

  .settings-header h2 {
    font-size: var(--font-size-xs);
    color: var(--text-primary);
    opacity: 0.55;
  }

  .close-btn {
    background: transparent;
    border: none;
    color: var(--text-muted);
    cursor: pointer;
    font-size: 16px;
    width: 32px;
    height: 32px;
    border-radius: 10px;
  }

  .close-btn:hover {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  .settings-layout {
    display: grid;
    grid-template-columns: 110px minmax(0, 1fr);
    min-height: 0;
    flex: 1;
  }

  .settings-sidebar {
    padding: 18px 10px 16px 16px;
    border-right: 1px solid var(--border);
    display: flex;
    flex-direction: column;
    gap: 6px;
  }

  .tab-btn {
    border: none;
    background: transparent;
    color: var(--text-muted);
    padding: 9px 10px;
    border-radius: 10px;
    font-size: var(--font-size-sm);
    cursor: pointer;
    transition: all var(--transition-fast);
    text-align: left;
  }

  .tab-btn.active {
    color: var(--text-primary);
    background: color-mix(in srgb, var(--accent) 16%, transparent);
    box-shadow: inset 2px 0 0 var(--accent);
  }

  .settings-body {
    padding: 18px 20px 12px 18px;
    overflow: auto;
    display: flex;
    flex-direction: column;
    gap: 14px;
    min-width: 0;
  }

  .panel-section {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .section-heading h3 {
    font-size: calc(var(--font-size-base) * 1.15);
    margin-bottom: 4px;
  }

  .form-group {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .form-group label,
  .form-label {
    font-size: var(--font-size-xs);
    color: var(--text-secondary);
  }

  input[type="url"],
  input[type="password"],
  input[type="range"] {
    width: 100%;
  }

  input[type="url"],
  input[type="password"] {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--border);
    color: var(--text-primary);
    padding: 10px 12px;
    border-radius: 12px;
    font-family: var(--font-mono);
    font-size: var(--font-size-sm);
    outline: none;
  }

  .password-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    align-items: center;
  }

  .visibility-toggle {
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.05);
    color: var(--text-secondary);
    border-radius: 12px;
    padding: 10px 12px;
    font-size: var(--font-size-xs);
    cursor: pointer;
    white-space: nowrap;
  }

  .shortcut-recorder {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 10px 12px;
    border-radius: 14px;
    border: 1px solid color-mix(in srgb, var(--accent) 30%, var(--border));
    background:
      linear-gradient(
        135deg,
        color-mix(in srgb, var(--accent) 8%, var(--bg-secondary)),
        color-mix(in srgb, var(--bg-primary) 96%, white 4%)
      );
    cursor: pointer;
  }

  .shortcut-recorder input {
    border: none;
    background: transparent;
    padding: 0;
    font-family: var(--font-mono);
    letter-spacing: 0.03em;
    text-align: left;
  }

  .shortcut-recorder input:focus {
    box-shadow: none;
  }

  .recorder-chip {
    padding: 4px 8px;
    border-radius: 999px;
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-muted);
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  .shortcut-recorder.recording {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 20%, transparent);
  }

  .shortcut-recorder.recording .recorder-chip {
    background: color-mix(in srgb, var(--accent) 18%, transparent);
    color: var(--accent);
  }

  input[type="url"]:focus,
  input[type="password"]:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 18%, transparent);
  }

  .help-text {
    font-size: var(--font-size-xs);
    color: var(--text-muted);
  }

  .inline-actions {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
  }

  .token-guide {
    padding: 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
  }

  .token-guide h4,
  .help-card h4 {
    margin-bottom: 8px;
    font-size: var(--font-size-sm);
  }

  .token-guide p,
  .help-card p {
    color: var(--text-secondary);
    font-size: var(--font-size-sm);
    margin-bottom: 4px;
  }

  .range-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 12px;
    align-items: center;
  }

  input[type="range"] {
    accent-color: var(--accent);
  }

  .accent-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .accent-chip {
    border: 1px solid var(--border);
    background: rgba(255, 255, 255, 0.04);
    color: var(--text-secondary);
    border-radius: 14px;
    padding: 10px 12px;
    display: flex;
    align-items: center;
    gap: 10px;
    cursor: pointer;
  }

  .accent-chip.active {
    border-color: var(--chip-color);
    box-shadow: inset 0 0 0 1px var(--chip-color);
    color: var(--text-primary);
  }

  .accent-swatch {
    width: 14px;
    height: 14px;
    border-radius: 999px;
    background: var(--chip-color);
    box-shadow: 0 0 12px color-mix(in srgb, var(--chip-color) 45%, transparent);
  }

  .help-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .help-card {
    padding: 14px;
    border-radius: 14px;
    background: rgba(255, 255, 255, 0.04);
    border: 1px solid var(--border);
  }

  .validation-banner {
    padding: 12px 14px;
    border-radius: 12px;
    background: rgba(239, 68, 68, 0.12);
    border: 1px solid rgba(239, 68, 68, 0.24);
    color: #fca5a5;
    font-size: var(--font-size-sm);
  }

  .settings-footer {
    padding: 16px 20px 20px;
    border-top: 1px solid var(--border);
    display: flex;
    justify-content: flex-end;
    gap: 10px;
  }

  .btn {
    border: none;
    border-radius: 12px;
    padding: 10px 14px;
    cursor: pointer;
    font-size: var(--font-size-sm);
    font-family: var(--font-mono);
    transition: all var(--transition-fast);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.08);
    color: var(--text-primary);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.14);
  }

  .btn-primary {
    background: var(--accent-gradient);
    color: #fff;
    box-shadow: var(--shadow-glow);
  }

  .btn-primary:hover {
    filter: brightness(1.03);
  }

  .text-btn {
    border: none;
    background: transparent;
    color: var(--accent);
    cursor: pointer;
    font-size: var(--font-size-xs);
    white-space: nowrap;
  }

  @media (max-width: 520px) {
    .settings-modal {
      width: 100%;
      height: 100%;
      border-radius: 14px;
    }

    .settings-layout {
      grid-template-columns: 1fr;
    }

    .settings-sidebar {
      border-right: none;
      border-bottom: 1px solid var(--border);
      flex-direction: row;
      padding: 12px 16px 0;
      gap: 8px;
    }

    .accent-grid {
      grid-template-columns: 1fr;
    }
  }
</style>
