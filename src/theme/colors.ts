import { useColorScheme } from 'react-native';

// `accent` must match `--color-accent-500` in global.css so class-based and
// prop-based accents stay in sync.
export const palette = {
  light: {
    background: '#fafafa',
    surface: '#ffffff',
    border: '#e4e4e7',
    text: '#18181b',
    textMuted: '#52525b',
    iconInactive: '#71717a',
    ripple: 'rgba(24, 24, 27, 0.12)',
    scrim: 'rgba(9, 9, 11, 0.5)',
    accent: '#8b5cf6',
    onAccent: '#ffffff',
    notification: '#dc2626',
  },
  dark: {
    background: '#09090b',
    surface: '#18181b',
    border: '#27272a',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    iconInactive: '#71717a',
    ripple: 'rgba(244, 244, 245, 0.12)',
    scrim: 'rgba(9, 9, 11, 0.5)',
    accent: '#8b5cf6',
    onAccent: '#ffffff',
    notification: '#f87171',
  },
} as const;

export function useColors() {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
