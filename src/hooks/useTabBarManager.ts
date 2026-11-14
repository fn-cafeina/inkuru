import { useCallback, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

import { setTabBarVisibility } from '../navigation/tabBarState';

const THRESHOLD = 8;

/**
 * Rokimu behavior: hide the tab bar while scrolling down, show it while
 * scrolling up. `reset` restores visibility (called on focus or term change).
 */
export function useTabBarManager() {
  const scrollYRef = useRef(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const currentY = event.nativeEvent.contentOffset.y;
      const delta = currentY - scrollYRef.current;

      if (Math.abs(delta) > THRESHOLD) {
        setTabBarVisibility(delta < 0);
      }

      scrollYRef.current = currentY;
    },
    [],
  );

  const reset = useCallback(() => {
    scrollYRef.current = 0;
    setTabBarVisibility(true);
  }, []);

  return { handleScroll, reset };
}
