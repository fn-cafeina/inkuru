import { useColorScheme } from 'react-native';

// `accent` is the Gyro Zeppeli olive green. It is darkened in light mode for
// text contrast and lightened in dark mode.
// `reader*` values are deliberately mode-independent: the reader is always
// dark, like every image viewer, so a light theme does not flash a white
// canvas behind the pages. Do not wrap them in useColorScheme.
export const palette = {
  light: {
    background: '#fafafa',
    surface: '#ffffff',
    border: '#e4e4e7',
    text: '#18181b',
    textMuted: '#52525b',
    iconInactive: '#71717a',
    scrim: 'rgba(0, 0, 0, 0.5)',
    accent: '#4f7a3e',
    onAccent: '#ffffff',
    accentContainer: '#e4efdb',
    onAccentContainer: '#2f4d24',
    notification: '#dc2626',
  },
  dark: {
    background: '#000000',
    surface: '#171717',
    border: '#262626',
    text: '#fafafa',
    textMuted: '#a3a3a3',
    iconInactive: '#a3a3a3',
    scrim: 'rgba(0, 0, 0, 0.5)',
    accent: '#a6d97e',
    onAccent: '#12240a',
    accentContainer: '#2b4420',
    onAccentContainer: '#d8eec6',
    notification: '#f87171',
  },
} as const;

/** Reader chrome, identical in both schemes (see the note above). */
export const reader = {
  background: '#000000',
  surface: '#171717',
  border: '#262626',
  text: '#fafafa',
  textMuted: '#a3a3a3',
  overlay: 'rgba(0, 0, 0, 0.7)',
  track: 'rgba(255, 255, 255, 0.25)',
  bar: 'rgba(255, 255, 255, 0.9)',
  scrim: 'rgba(0, 0, 0, 0.5)',
} as const;

export function useColors() {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
