// Mastodon API types

export interface MastodonAccount {
  id: string;
  username: string;
  acct: string;
  display_name: string;
  avatar: string;
  emojis?: MastodonCustomEmoji[];
}

export interface MastodonCustomEmoji {
  shortcode: string;
  url: string;
  static_url: string;
  visible_in_picker?: boolean;
}

export interface MastodonStatus {
  id: string;
  created_at: string;
  content: string;
  account: MastodonAccount;
  emojis?: MastodonCustomEmoji[];
  reblogs_count: number;
  favourites_count: number;
  replies_count: number;
  language: string | null;
  visibility: string;
  sensitive: boolean;
  spoiler_text: string;
  reblog: MastodonStatus | null;
}

export interface AppConfig {
  instanceUrl: string;
  accessToken: string;
  timelineType: 'public' | 'home';
  themeMode: 'dark' | 'light';
  locale: 'zh-CN' | 'en' | 'ja';
  globalShortcut: string;
  refreshInterval: number; // seconds
  opacity: number; // 0.0 - 1.0
  limit: number; // posts per fetch
  fontScale: number;
  accentColor: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  instanceUrl: 'https://mastodon.social',
  accessToken: '',
  timelineType: 'home',
  themeMode: 'dark',
  locale: 'zh-CN',
  globalShortcut: 'CommandOrControl+D',
  refreshInterval: 60,
  opacity: 0.85,
  limit: 30,
  fontScale: 1,
  accentColor: '#4DA3FF',
};
