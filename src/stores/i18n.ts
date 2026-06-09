import { derived } from 'svelte/store';
import type { AppConfig } from '../api';
import { persistedState } from './persistence';

export type Locale = AppConfig['locale'];

type TranslationValue = string | ((params?: Record<string, string | number>) => string);

type MessageTree = {
  [key: string]: TranslationValue | MessageTree;
};

function shortcutParam(params?: Record<string, string | number>): string {
  return String(params?.shortcut ?? '');
}

const messages: Record<Locale, MessageTree> = {
  'zh-CN': {
    common: {
      cancel: '取消',
      close: '关闭',
      saveAndRefresh: '保存并刷新',
      saveAndStart: '保存并开始摸鱼',
      settings: '设置',
      dark: 'Dark',
      light: 'Light',
      public: 'Public',
      home: 'Home',
    },
    banner: {
      openSettings: '去设置',
      closeNotice: '关闭提示',
    },
    shortcuts: {
      fallbackToDefault: (params) =>
        `自定义快捷键不可用，已自动回退到默认：${shortcutParam(params)}`,
      defaultRegistrationFailed: (params) =>
        `默认快捷键 ${shortcutParam(params)} 也注册失败了。通常是和别的应用冲突，或 macOS 还没给全局快捷键相关权限。`,
      warning: '全局快捷键还没生效，先在设置里换一个不冲突的组合键。',
      label: '一键开关快捷键',
      placeholder: '点击这里后，直接按组合键',
      recording: '录制中',
      idle: '快捷键',
      recordingHint: '现在直接按你想要的组合键；`Esc` 取消，`Backspace` 清空。',
      idleHint: (params) => `默认是 \`${shortcutParam(params)}\`。点输入框后直接按组合键即可。`,
      reset: '恢复默认',
    },
    settings: {
      setupTitle: '初始设置',
      sectionsLabel: '设置栏目',
      account: '账号',
      appearance: '外观',
      help: '教程',
      accountTitle: '账号登录',
      instanceUrl: '实例地址',
      tokenGuideTitle: 'Token 获取步骤',
      tokenGuide1: '1. 先确认你的实例支持 Mastodon API，并且你有登录账号。',
      tokenGuide2: '2. 进入 `Preferences -> Development -> New Application`。',
      tokenGuide3: '3. 填写应用名称等信息，并把 Scopes 至少勾上 `read`。',
      tokenGuide4: '4. 创建应用后点进该应用详情页，再复制 Access Token 粘回这里。',
      accessTokenPlaceholder: '填入后可查看 Home 时间线',
      hideToken: '隐藏 token',
      showToken: '显示 token',
      hide: '隐藏',
      show: '显示',
      appearanceTitle: '外观调节',
      languageLabel: '界面语言',
      languageZh: '中文',
      languageEn: 'English',
      languageJa: '日本語',
      themeMode: '界面模式',
      darkDescription: '适合低调摸鱼，减少刺眼感',
      lightDescription: '提高对比度，文字更清楚',
      fontScale: '字体大小',
      accentColor: '主题色',
      helpTitle: '快速教程',
      openCloseTitle: '打开 / 关闭',
      openClose1: '全局快捷键：不切回 app 也能一键开关。',
      openClose2: '默认是 `⌘D`，也可以在设置里改成别的组合。',
      readingTitle: '阅读操作',
      reading1: '`j` / `k`：向下或向上滚动。',
      reading2: '`d` / `u`：向下或向上跳半页。',
      reading3: '`↑` / `↓`：细一点地滚动。',
      reading4: '`gg`：回到顶部，`G`：到最底，`r`：刷新时间线。',
      validationInstance: '需要先填一个实例地址。',
      validationToken: '主页时间线需要 Access Token。你也可以先切到 Public 模式开始用。',
    },
    statusBar: {
      timelineSwitch: '时间线切换',
      switchToLight: '切换到 Light',
      switchToDark: '切换到 Dark',
      opacity: '透明度',
    },
    timeline: {
      fetching: '获取中',
      loadMore: '加载更多',
      loadingMore: '加载中…',
      noMorePosts: '没有更多内容了',
      noPosts: '还没有内容',
      refreshHint: '按 r 刷新',
    },
    statusItem: {
      boosted: '转嘟了',
      hide: '隐藏',
      show: '显示',
    },
  },
  en: {
    common: {
      cancel: 'Cancel',
      close: 'Close',
      saveAndRefresh: 'Save and refresh',
      saveAndStart: 'Save and start',
      settings: 'Settings',
      dark: 'Dark',
      light: 'Light',
      public: 'Public',
      home: 'Home',
    },
    banner: {
      openSettings: 'Open settings',
      closeNotice: 'Dismiss notice',
    },
    shortcuts: {
      fallbackToDefault: (params) =>
        `Custom shortcut unavailable. Switched back to default: ${shortcutParam(params)}`,
      defaultRegistrationFailed: (params) =>
        `The default shortcut ${shortcutParam(params)} also failed to register. It may conflict with another app, or macOS permissions may be missing.`,
      warning: 'The global shortcut is not active yet. Pick a different shortcut in Settings.',
      label: 'Global shortcut',
      placeholder: 'Focus here, then press your shortcut',
      recording: 'Recording',
      idle: 'Shortcut',
      recordingHint: 'Press the shortcut now. `Esc` cancels and `Backspace` clears it.',
      idleHint: (params) =>
        `Default: \`${shortcutParam(params)}\`. Focus the field and press a key combo.`,
      reset: 'Reset default',
    },
    settings: {
      setupTitle: 'Setup',
      sectionsLabel: 'Settings sections',
      account: 'Account',
      appearance: 'Appearance',
      help: 'Help',
      accountTitle: 'Account login',
      instanceUrl: 'Instance URL',
      tokenGuideTitle: 'How to get a token',
      tokenGuide1: '1. Make sure your instance supports the Mastodon API and that you can log in.',
      tokenGuide2: '2. Open `Preferences -> Development -> New Application`.',
      tokenGuide3: '3. Fill in the app details and enable at least the `read` scope.',
      tokenGuide4: '4. Open the new app page, copy the Access Token, and paste it here.',
      accessTokenPlaceholder: 'Needed for the Home timeline',
      hideToken: 'Hide token',
      showToken: 'Show token',
      hide: 'Hide',
      show: 'Show',
      appearanceTitle: 'Appearance',
      languageLabel: 'Interface language',
      languageZh: 'Chinese',
      languageEn: 'English',
      languageJa: 'Japanese',
      themeMode: 'Theme mode',
      darkDescription: 'Lower contrast for a quieter, less distracting look',
      lightDescription: 'Higher contrast for clearer reading',
      fontScale: 'Font size',
      accentColor: 'Accent color',
      helpTitle: 'Quick guide',
      openCloseTitle: 'Open / close',
      openClose1: 'Use the global shortcut to toggle the window without switching apps.',
      openClose2: 'The default is `⌘D`, and you can change it in Settings.',
      readingTitle: 'Reading',
      reading1: '`j` / `k`: scroll down or up.',
      reading2: '`d` / `u`: jump half a page down or up.',
      reading3: '`↑` / `↓`: fine scrolling.',
      reading4: '`gg`: top, `G`: bottom, `r`: refresh the timeline.',
      validationInstance: 'Please enter an instance URL first.',
      validationToken: 'The Home timeline needs an Access Token. You can also switch to Public first.',
    },
    statusBar: {
      timelineSwitch: 'Timeline switcher',
      switchToLight: 'Switch to Light',
      switchToDark: 'Switch to Dark',
      opacity: 'Opacity',
    },
    timeline: {
      fetching: 'fetching',
      loadMore: 'load more',
      loadingMore: 'loading…',
      noMorePosts: 'no more posts',
      noPosts: 'no posts yet',
      refreshHint: 'press r to refresh',
    },
    statusItem: {
      boosted: 'boosted',
      hide: 'hide',
      show: 'show',
    },
  },
  ja: {
    common: {
      cancel: 'キャンセル',
      close: '閉じる',
      saveAndRefresh: '保存して更新',
      saveAndStart: '保存して始める',
      settings: '設定',
      dark: 'Dark',
      light: 'Light',
      public: 'Public',
      home: 'Home',
    },
    banner: {
      openSettings: '設定を開く',
      closeNotice: '通知を閉じる',
    },
    shortcuts: {
      fallbackToDefault: (params) =>
        `カスタムショートカットは使えなかったため、既定値 ${shortcutParam(params)} に戻しました。`,
      defaultRegistrationFailed: (params) =>
        `既定のショートカット ${shortcutParam(params)} も登録できませんでした。ほかのアプリとの競合か、macOS の権限不足の可能性があります。`,
      warning: 'グローバルショートカットはまだ有効ではありません。設定で別の組み合わせを選んでください。',
      label: 'グローバルショートカット',
      placeholder: 'ここを選択して、ショートカットを押してください',
      recording: '入力中',
      idle: 'ショートカット',
      recordingHint: '今そのまま押してください。`Esc` でキャンセル、`Backspace` でクリアできます。',
      idleHint: (params) =>
        `既定値は \`${shortcutParam(params)}\` です。入力欄を選んでそのままキーを押してください。`,
      reset: '既定に戻す',
    },
    settings: {
      setupTitle: '初期設定',
      sectionsLabel: '設定セクション',
      account: 'アカウント',
      appearance: '表示',
      help: 'ガイド',
      accountTitle: 'アカウント設定',
      instanceUrl: 'インスタンス URL',
      tokenGuideTitle: 'Token の取得手順',
      tokenGuide1: '1. 利用中のインスタンスが Mastodon API に対応し、ログインできることを確認します。',
      tokenGuide2: '2. `Preferences -> Development -> New Application` を開きます。',
      tokenGuide3: '3. アプリ情報を入力し、Scopes で少なくとも `read` を有効にします。',
      tokenGuide4: '4. 作成後にアプリ詳細ページを開き、Access Token をコピーしてここに貼り付けます。',
      accessTokenPlaceholder: 'Home タイムラインを見るには必要です',
      hideToken: 'トークンを隠す',
      showToken: 'トークンを表示',
      hide: '隠す',
      show: '表示',
      appearanceTitle: '表示設定',
      languageLabel: '表示言語',
      languageZh: '中国語',
      languageEn: '英語',
      languageJa: '日本語',
      themeMode: 'テーマ',
      darkDescription: '目立ちにくく、まぶしさを抑えた表示',
      lightDescription: 'コントラストを上げて文字を読みやすく表示',
      fontScale: '文字サイズ',
      accentColor: 'アクセントカラー',
      helpTitle: 'クイックガイド',
      openCloseTitle: '開く / 閉じる',
      openClose1: 'アプリを切り替えなくても、グローバルショートカットで表示を切り替えられます。',
      openClose2: '既定値は `⌘D` で、設定から別の組み合わせに変更できます。',
      readingTitle: '閲覧操作',
      reading1: '`j` / `k`：下または上へスクロール。',
      reading2: '`d` / `u`：半ページ下または上へ移動。',
      reading3: '`↑` / `↓`：細かくスクロール。',
      reading4: '`gg`：先頭、`G`：末尾、`r`：タイムラインを更新。',
      validationInstance: 'まずインスタンス URL を入力してください。',
      validationToken: 'Home タイムラインには Access Token が必要です。先に Public に切り替えて使うこともできます。',
    },
    statusBar: {
      timelineSwitch: 'タイムライン切り替え',
      switchToLight: 'Light に切り替え',
      switchToDark: 'Dark に切り替え',
      opacity: '透明度',
    },
    timeline: {
      fetching: '取得中',
      loadMore: 'もっと見る',
      loadingMore: '読み込み中…',
      noMorePosts: 'これ以上ありません',
      noPosts: 'まだ投稿がありません',
      refreshHint: 'r キーで更新',
    },
    statusItem: {
      boosted: 'がブースト',
      hide: '隠す',
      show: '表示',
    },
  },
};

export const localeOptions: Array<{ value: Locale; labelKey: string }> = [
  { value: 'zh-CN', labelKey: 'settings.languageZh' },
  { value: 'en', labelKey: 'settings.languageEn' },
  { value: 'ja', labelKey: 'settings.languageJa' },
];

function getMessage(locale: Locale, key: string): TranslationValue | undefined {
  return key.split('.').reduce<TranslationValue | MessageTree | undefined>((current, part) => {
    if (!current || typeof current === 'string' || typeof current === 'function') return current;
    return current[part];
  }, messages[locale]) as TranslationValue | undefined;
}

export function translate(
  locale: Locale,
  key: string,
  params?: Record<string, string | number>
): string {
  const message = getMessage(locale, key) ?? getMessage('en', key);
  if (!message) return key;
  return typeof message === 'function' ? message(params) : message;
}

export const locale = derived(persistedState, ($persistedState) => $persistedState.config.locale);

export const t = derived(locale, ($locale) => {
  return (key: string, params?: Record<string, string | number>) => translate($locale, key, params);
});
