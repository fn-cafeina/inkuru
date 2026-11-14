import { useSyncExternalStore } from 'react';

let visible = true;
const listeners = new Set<() => void>();

export function subscribeTabBarVisibility(listener: () => void): () => void {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
}

export function getTabBarVisibility(): boolean {
  return visible;
}

export function setTabBarVisibility(value: boolean): void {
  if (value === visible) {
    return;
  }

  visible = value;

  for (const listener of listeners) {
    listener();
  }
}

/** Reactive tab bar visibility, same shape as the update state store. */
export function useTabBarVisibility(): boolean {
  return useSyncExternalStore(subscribeTabBarVisibility, getTabBarVisibility);
}
