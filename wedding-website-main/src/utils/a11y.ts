/**
 * A11Y: shared accessibility helpers.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

/** Query focusable elements inside a container (offsetParent filter hides display:none). */
export function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
    (el) => el.offsetParent !== null || el === document.activeElement
  );
}

/**
 * A11Y FOCUS TRAP — used by modal surfaces (Portfolio lightbox) so keyboard
 * users cannot Tab out into the page behind a dialog. Cycles Tab / Shift+Tab
 * within the container; call from the container's onKeyDown handler.
 */
export function trapFocus(event: React.KeyboardEvent<HTMLElement>): void {
  if (event.key !== 'Tab') return;
  const container = event.currentTarget;
  const focusables = getFocusableElements(container);

  if (focusables.length === 0) {
    // Nothing focusable inside — swallow the keypress so focus can't escape.
    event.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement;
  const isInside = container.contains(active);

  if (event.shiftKey) {
    // Shift+Tab from the first (or while focus is outside) — wrap to last.
    if (!isInside || active === first) {
      event.preventDefault();
      last.focus();
    }
  } else if (!isInside || active === last) {
    // Tab from the last (or while focus is outside) — wrap to first.
    event.preventDefault();
    first.focus();
  }
}

/**
 * WEBGL SUPPORT DETECTION — probe for a WebGL2/WebGL1 context on an offscreen
 * canvas. Returns false when the browser/OS can't create one (hardware
 * acceleration disabled, driver blocklist, headless environments...).
 */
export function detectWebGLSupport(): boolean {
  let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
  try {
    const canvas = document.createElement('canvas');
    const attrs = { failIfMajorPerformanceCaveat: false } as WebGLContextAttributes;
    gl =
      (canvas.getContext('webgl2', attrs) as WebGL2RenderingContext | null) ||
      (canvas.getContext('webgl', attrs) as WebGLRenderingContext | null);
    if (!gl) return false;
    // Probe a basic call — some blocked drivers hand back a dead context.
    return typeof gl.getParameter(gl.VENDOR) === 'string';
  } catch {
    return false;
  } finally {
    // Drop the probe context so we don't leak a GPU context per check.
    (gl as WebGLRenderingContext | null)?.getExtension('WEBGL_lose_context')?.loseContext();
  }
}
