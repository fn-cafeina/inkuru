import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Animated } from 'react-native';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';

/** Height of the floating pill, excluding the gap to the screen edge. */
export const TAB_BAR_HEIGHT = 48;
/** Clearance screens need below their content so the pill never covers it. */
export const TAB_BAR_SPACE = TAB_BAR_HEIGHT + 40;

const HIDE_OFFSET = TAB_BAR_HEIGHT + 32;
const SCROLL_DELTA = 4;

type TabBarVisibility = {
  hidden: Animated.Value;
  hideOffset: number;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  resetY: () => void;
  show: () => void;
};

const TabBarVisibilityContext = createContext<TabBarVisibility | null>(null);

export function TabBarVisibilityProvider({ children }: { children: ReactNode }) {
  const [hidden] = useState(() => new Animated.Value(0));
  const isHidden = useRef(false);
  const lastY = useRef(0);

  const setHidden = useCallback(
    (next: boolean) => {
      if (isHidden.current === next) {
        return;
      }
      isHidden.current = next;
      Animated.timing(hidden, {
        toValue: next ? 1 : 0,
        duration: 180,
        useNativeDriver: true,
      }).start();
    },
    [hidden],
  );

  const onScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = event.nativeEvent.contentOffset.y;
      const delta = y - lastY.current;
      lastY.current = y;

      if (y <= 0 || delta < -SCROLL_DELTA) {
        setHidden(false);
      } else if (delta > SCROLL_DELTA) {
        setHidden(true);
      }
    },
    [setHidden],
  );

  const show = useCallback(() => setHidden(false), [setHidden]);

  // lastY belongs to the tab that scrolled; reset it on tab switch so the
  // next tab's first scroll isn't measured against a foreign offset.
  const resetY = useCallback(() => {
    lastY.current = 0;
  }, []);

  const value = useMemo(
    () => ({ hidden, hideOffset: HIDE_OFFSET, onScroll, resetY, show }),
    [hidden, onScroll, resetY, show],
  );

  return (
    <TabBarVisibilityContext.Provider value={value}>
      {children}
    </TabBarVisibilityContext.Provider>
  );
}

export function useTabBarVisibility() {
  const value = useContext(TabBarVisibilityContext);

  if (!value) {
    throw new Error('useTabBarVisibility used outside TabBarVisibilityProvider');
  }

  return value;
}
