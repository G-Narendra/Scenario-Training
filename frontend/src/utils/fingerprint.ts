/**
 * frontend/src/utils/fingerprint.ts
 *
 * Computes an immutable SHA-256 browser/device fingerprint based on:
 * - HTML5 Canvas 2D render dynamics
 * - WebGL unmasked vendor and renderer strings
 * - Screen dimensions & color depth
 * - Hardware concurrency & timezone
 *
 * Prevents unauthorized bypasses and token exhaustion under a single shared cohort passcode.
 */

export async function getDeviceFingerprint(): Promise<string> {
  const STORAGE_KEY = '_3h_device_fp';

  try {
    const cached = localStorage.getItem(STORAGE_KEY);
    if (cached && cached.length === 64) {
      return cached;
    }
  } catch (e) {
    // localStorage may be disabled in strict privacy modes
  }

  const components: string[] = [];

  // 1. User Agent & Language
  components.push(navigator.userAgent || 'unknown-ua');
  components.push(navigator.language || 'en');
  components.push(String(navigator.hardwareConcurrency || 4));

  // 2. Screen Dynamics
  if (typeof window !== 'undefined' && window.screen) {
    components.push(`${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`);
  }

  // 3. Timezone
  try {
    components.push(Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC');
  } catch {
    components.push(String(new Date().getTimezoneOffset()));
  }

  // 4. HTML5 Canvas Fingerprint
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 50;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillStyle = '#0B192C';
      ctx.fillRect(0, 0, 200, 50);
      ctx.fillStyle = '#FF6500';
      ctx.fillText('3H-SOLUTIONS-TRAINING-2026', 10, 10);
      components.push(canvas.toDataURL());
    }
  } catch (e) {
    components.push('canvas-unsupported');
  }

  // 5. WebGL Vendor & Renderer
  try {
    const glCanvas = document.createElement('canvas');
    const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
    if (gl && 'getExtension' in gl) {
      const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const vendor = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
        const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
        components.push(`${vendor}::${renderer}`);
      }
    }
  } catch (e) {
    components.push('webgl-unsupported');
  }

  // Compute SHA-256 Digest
  const rawString = components.join('||');
  let hashHex = '';

  try {
    const msgBuffer = new TextEncoder().encode(rawString);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    // Fallback simple 64-char pseudo-hash if crypto.subtle is unavailable
    let hash = 0;
    for (let i = 0; i < rawString.length; i++) {
      hash = (hash << 5) - hash + rawString.charCodeAt(i);
      hash |= 0;
    }
    hashHex = Math.abs(hash).toString(16).padStart(64, '0');
  }

  try {
    localStorage.setItem(STORAGE_KEY, hashHex);
  } catch (e) {
    // Ignore storage errors
  }

  return hashHex;
}
