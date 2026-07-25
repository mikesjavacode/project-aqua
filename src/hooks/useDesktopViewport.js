/**
 * useDesktopViewport — true while the viewport can hold the five-layer console.
 *
 * Every layer is absolutely positioned at a fixed pixel size (the advisor panel
 * alone is 720px wide). Below MIN_WIDTH_PX they overlap into an unreadable
 * stack, so App.jsx renders a notice instead of a broken screen.
 */

import { useState, useEffect } from 'react';

export const MIN_WIDTH_PX = 1280;

export function useDesktopViewport() {
  const query = `(min-width: ${MIN_WIDTH_PX}px)`;
  const [isDesktop, setIsDesktop] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handleChange = (event) => setIsDesktop(event.matches);
    mql.addEventListener('change', handleChange);
    return () => mql.removeEventListener('change', handleChange);
  }, [query]);

  return isDesktop;
}
