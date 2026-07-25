/**
 * startRafLoop — a requestAnimationFrame loop that suspends while the tab is hidden.
 *
 * AQUA runs three loops at once (globe, process flow, molecular) plus a WebGL
 * renderer. Browsers throttle background rAF but do not reliably stop it, so a
 * backgrounded tab keeps paying for animation nobody is watching.
 *
 *   frame(timestamp) — called once per frame, same contract as rAF
 *   onResume()       — called just before the first frame back, so the caller can
 *                      drop the delta accumulated while hidden instead of
 *                      integrating the whole gap in one step
 *
 * Returns a stop() that cancels the frame and removes the listener. Safe to call
 * more than once.
 */
export function startRafLoop(frame, { onResume } = {}) {
  let rafId = null;

  function step(timestamp) {
    rafId = requestAnimationFrame(step);
    frame(timestamp);
  }

  function requestFrames() {
    if (rafId === null) rafId = requestAnimationFrame(step);
  }

  function cancelFrames() {
    if (rafId === null) return;
    cancelAnimationFrame(rafId);
    rafId = null;
  }

  function handleVisibility() {
    if (document.visibilityState === 'hidden') {
      cancelFrames();
    } else {
      onResume?.();
      requestFrames();
    }
  }

  document.addEventListener('visibilitychange', handleVisibility);
  if (document.visibilityState !== 'hidden') requestFrames();

  return function stop() {
    document.removeEventListener('visibilitychange', handleVisibility);
    cancelFrames();
  };
}
