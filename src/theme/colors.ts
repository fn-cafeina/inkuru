import { useColorScheme } from 'react-native';

// `accent` is the Gyro Zeppeli olive green. It is darkened in light mode for
// text contrast and lightened in dark mode. `--color-accent-500` in global.css
// mirrors the light value.
export const palette = {
  light: {
    background: '#fafafa',
    surface: '#ffffff',
    border: '#e4e4e7',
    text: '#18181b',
    textMuted: '#52525b',
    iconInactive: '#71717a',
    ripple: 'rgba(79, 122, 62, 0.16)',
    scrim: 'rgba(9, 9, 11, 0.5)',
    accent: '#4f7a3e',
    onAccent: '#ffffff',
    accentContainer: '#e4efdb',
    onAccentContainer: '#2f4d24',
    notification: '#dc2626',
  },
  dark: {
    background: '#09090b',
    surface: '#18181b',
    border: '#27272a',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    iconInactive: '#a1a1aa',
    ripple: 'rgba(166, 217, 126, 0.18)',
    scrim: 'rgba(9, 9, 11, 0.5)',
    accent: '#a6d97e',
    onAccent: '#12240a',
    accentContainer: '#2b4420',
    onAccentContainer: '#d8eec6',
    notification: '#f87171',
  },
} as const;

export function useColors() {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
