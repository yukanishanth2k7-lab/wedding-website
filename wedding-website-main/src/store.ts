import { create } from 'zustand';
import type Lenis from 'lenis';

interface AppState {
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  heroProgress: number; // HERO: hero-local scroll progress 0→1 (0 at load, 1 when hero exits)
  setHeroProgress: (progress: number) => void;
  // A11Y: user prefers reduced motion (media query) — every animation honors it
  prefersReducedMotion: boolean;
  setPrefersReducedMotion: (v: boolean) => void;
  // A11Y: browser can't run WebGL — DOM-only fallback instead of a dead canvas
  webglSupported: boolean;
  setWebglSupported: (v: boolean) => void;
  // ORYZO-STYLE: which photo set the 3D centerpiece shows (segmented control swaps it)
  stackTheme: 'weddings' | 'decor' | 'moments';
  setStackTheme: (t: 'weddings' | 'decor' | 'moments') => void;
}

export const useAppStore = create<AppState>((set) => ({
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),
  heroProgress: 0,
  setHeroProgress: (progress) => set({ heroProgress: progress }),
  prefersReducedMotion: false,
  setPrefersReducedMotion: (v) => set({ prefersReducedMotion: v }),
  webglSupported: true,
  setWebglSupported: (v) => set({ webglSupported: v }),
  stackTheme: 'weddings',
  setStackTheme: (t) => set({ stackTheme: t }),
}));

// A11Y: one-line selector so any component can gate its animation on the
// motion preference without re-subscribing to unrelated state.
export const usePrefersReducedMotion = () =>
  useAppStore((state) => state.prefersReducedMotion);

// A11Y: move focus to the target section after nav-link jumps so keyboard users
// land on real content instead of a blurred body.
export function focusSection(id: string) {
  requestAnimationFrame(() => {
    document.getElementById(id)?.focus({ preventScroll: true });
  });
}

// NAVBAR: App registers the live Lenis instance here so the Navbar can smooth-scroll
// to sections (native anchor jumps get overridden by Lenis' scroll ownership).
let lenisInstance: Lenis | null = null;

export function setLenisInstance(lenis: Lenis | null) {
  lenisInstance = lenis;
}

export function getLenisInstance() {
  return lenisInstance;
}
