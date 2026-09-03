/**
 * RNF-05 on a phone: text that follows the system size, and motion that
 * respects "reduce motion".
 *
 * React Native scales text with the OS setting by default, which is right —
 * but a fixed-height row will clip that larger text instead of growing. These
 * helpers let a screen ask for the current scale and size around it.
 */
import { useEffect, useState } from 'react';
import { AccessibilityInfo, AppState, PixelRatio } from 'react-native';

/**
 * The system font scale, clamped.
 *
 * Yugo's screens are dense — cards with a photo, chips and two actions — and
 * past roughly 1.6× the layout stops being usable rather than more readable.
 * Clamping keeps large-text users served without breaking the screen; anyone
 * who needs more is better served by the OS zoom, which magnifies everything.
 */
export function useFontScale(max = 1.6): number {
  const [scale, setScale] = useState(() => Math.min(PixelRatio.getFontScale(), max));

  useEffect(() => {
    // The setting can change while the app is backgrounded. React Native has
    // no event for the font scale itself, so re-read it whenever the app comes
    // back to the foreground. (An earlier version listened to a non-existent
    // AccessibilityInfo event, which never fired.)
    const update = () => setScale(Math.min(PixelRatio.getFontScale(), max));
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') update();
    });
    update();
    return () => subscription.remove();
  }, [max]);

  return scale;
}

/** Scales a fixed dimension with the system text size. */
export function scaled(value: number, scale: number): number {
  return Math.round(value * scale);
}

/**
 * Whether the person asked the system to reduce motion. Honour it by cutting
 * animation, never by removing information.
 */
export function useReduceMotion(): boolean {
  const [reduce, setReduce] = useState(false);

  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((enabled) => {
      if (active) setReduce(enabled);
    });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduce);
    return () => {
      active = false;
      subscription.remove();
    };
  }, []);

  return reduce;
}
