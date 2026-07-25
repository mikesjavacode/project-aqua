/**
 * useWebGL — true when the browser can actually give Three.js a context.
 *
 * Layer 1 is a Three.js globe. Without WebGL it silently never appears while
 * the other four layers carry on, so the console looks half-built rather than
 * unsupported — which is worse than saying so.
 *
 * The common cause is not an old browser. It is a machine with no GPU: on
 * software rendering (llvmpipe under a hypervisor, for instance) Chrome
 * blocklists WebGL by default, and headless Chrome quietly substitutes
 * SwiftShader, so the same page can render perfectly in a screenshot and show
 * nothing on the desktop it was captured from.
 *
 * Probed once at module scope: the answer cannot change during a page's life,
 * and creating throwaway contexts is not free.
 */

let cached = null;

export function webGLAvailable() {
  if (cached !== null) return cached;
  try {
    const canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2') ||
      canvas.getContext('webgl') ||
      canvas.getContext('experimental-webgl');
    cached = Boolean(gl && typeof gl.getParameter === 'function');
    // Release the probe context immediately rather than waiting for GC —
    // browsers cap how many live contexts a page may hold.
    gl?.getExtension('WEBGL_lose_context')?.loseContext();
  } catch {
    cached = false;
  }
  return cached;
}

export function useWebGL() {
  return webGLAvailable();
}
