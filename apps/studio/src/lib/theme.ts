export const THEMES = ['system', 'light', 'dark'] as const;
export type Theme = (typeof THEMES)[number];
export const THEME_COOKIE = 'sf-theme';
export const readTheme = (v: string | undefined): Theme => (v === 'light' || v === 'dark' ? v : 'system');
