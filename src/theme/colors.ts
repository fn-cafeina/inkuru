// The app is dark-only: `useColors` always returns this palette.
// `accent` is the Gyro Zeppeli olive green, lightened for dark backgrounds.
// `reader` uses the same scale; the reader is always dark, like every
// image viewer.
export const palette = {
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

/** Reader chrome (see the note above). */
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
  return palette.dark;
}
