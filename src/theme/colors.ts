import { useColorScheme } from 'react-native';

export const palette = {
  light: {
    background: '#fafafa',
    surface: '#ffffff',
    border: '#e4e4e7',
    text: '#18181b',
    textMuted: '#52525b',
    iconInactive: '#71717a',
    ripple: 'rgba(24, 24, 27, 0.12)',
    primary: '#18181b',
    onPrimary: '#fafafa',
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
    primary: '#f4f4f5',
    onPrimary: '#18181b',
    notification: '#f87171',
  },
} as const;

export function useColors() {
  return palette[useColorScheme() === 'dark' ? 'dark' : 'light'];
}
