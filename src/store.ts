import { create } from 'zustand';
import type Lenis from 'lenis';

interface AppState {
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;
  isMobile: boolean;
  setIsMobile: (isMobile: boolean) => void;
  heroProgress: number; // HERO: hero-local scroll progress 0→1 (0 at load, 1 when hero exits)
  setHeroProgress: (progress: number) => void;
}

export const useAppStore = create<AppState>((set) => ({
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  isMobile: false,
  setIsMobile: (isMobile) => set({ isMobile }),
  heroProgress: 0,
  setHeroProgress: (progress) => set({ heroProgress: progress }),
}));

// NAVBAR: App registers the live Lenis instance here so the Navbar can smooth-scroll
// to sections (native anchor jumps get overridden by Lenis' scroll ownership).
let lenisInstance: Lenis | null = null;

export function setLenisInstance(lenis: Lenis | null) {
  lenisInstance = lenis;
}

export function getLenisInstance() {
  return lenisInstance;
}
