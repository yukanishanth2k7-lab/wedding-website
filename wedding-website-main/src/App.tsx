import { useEffect } from 'react';
import { Routes, Route, useLocation } from 'react-router-dom';
import { AnimatePresence, MotionConfig } from 'framer-motion';
import { useAppStore } from './store';
import Home from './pages/Home';
import PortfolioPage from './pages/PortfolioPage';

function App() {
  const location = useLocation();
  const setPrefersReducedMotion = useAppStore((s) => s.setPrefersReducedMotion);

  // A11Y (source of truth): the OS "Reduce Motion" setting SEEDS the store —
  // it does not own it. From then on the navbar toggle can override it, and
  // OS changes while the tab is open still sync in live.
  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const apply = () => setPrefersReducedMotion(mq.matches);
    apply();
    mq.addEventListener('change', apply);
    return () => mq.removeEventListener('change', apply);
  }, [setPrefersReducedMotion]);

  // A11Y (DOM mirror): <html data-motion="full|reduced"> is derived FROM the
  // store, so the navbar toggle flips every CSS keyframe gate instantly —
  // CSS can't read the store, only this attribute.
  useEffect(() => {
    const sync = (v: boolean) => {
      document.documentElement.dataset.motion = v ? 'reduced' : 'full';
    };
    sync(useAppStore.getState().prefersReducedMotion);
    const unsub = useAppStore.subscribe((state) => sync(state.prefersReducedMotion));
    return unsub;
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/portfolio" element={<PortfolioPage />} />
        </Routes>
      </AnimatePresence>
    </MotionConfig>
  );
}

export default App;
