import { useEffect, useMemo, useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { getLenisInstance, useAppStore } from '../store';
import './Hero.css';

/* HERO — cinematic layered 3D (HeroCanvas) + DOM fallback + scroll-linked content.

   BUG RULE (kept from the previous fix): the couple image is visible on first paint.
   The DOM <img> below renders immediately (eager, fetchpriority-high) and the WebGL
   canvas — which re-renders the same photo as its primary layer — mounts on top of
   it. Either one being visible satisfies "no blank screen"; the canvas fades in over
   the identical-looking DOM image, so there is never a visible swap. */

// CTA helper: route through Lenis (when present) so the glide matches the navbar
const scrollToId = (id: string) => {
  const lenis = getLenisInstance();
  if (lenis) lenis.scrollTo(`#${id}`, { duration: 1.4 });
  else document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
};

// Floating golden particles (DOM layer, transform-only — matches 3D dust)
const useParticles = () =>
  useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        left: `${(i * 37 + 13) % 100}%`,
        size: 3 + ((i * 7) % 5),
        duration: 9 + ((i * 5) % 7),
        delay: (i * 1.3) % 9,
        drift: ((i * 11) % 40) - 20,
      })),
    []
  );

export default function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const setHeroProgress = useAppStore((s) => s.setHeroProgress);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // HERO SCROLL PHASES: publish the hero-LOCAL progress (0 at load → 1 when the hero
  // has fully exited) so the 3D camera/particle phases track the hero itself, not
  // the whole page. useScroll → MotionValue.subscribe runs on rAF, off the main thread.
  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => setHeroProgress(v));
    return () => unsub();
  }, [scrollYProgress, setHeroProgress]);

  // PHASE 4 (Exit): the hero dissolves into the next section — the 3D world scales
  // up slightly while a sandal gradient veil rises; no hard cut, no fade-to-white.
  const contentY = useTransform(scrollYProgress, [0, 0.55], [0, -70]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.45, 0.62], [1, 1, 0]);
  const veilOpacity = useTransform(scrollYProgress, [0.55, 0.95], [0, 0.92]);
  
  const particles = useParticles();

  return (
    <section className="hero-section" id="home" ref={sectionRef}>
      {/* PHASE 4: sandal dissolve veil — the hero melts into the next section */}
      <motion.div className="hero-veil" style={{ opacity: veilOpacity }} aria-hidden="true" />

      {/* Soft light glow — drifts with scroll (kept, feeds the volumetric feel) */}
      <motion.div className="hero-glow" style={{ opacity: 0.5 }} aria-hidden="true" />

      {/* Floating golden particles (DOM, mirrors the 3D dust) */}
      <div className="hero-particles" aria-hidden="true">
        {particles.map((p, i) => (
          <motion.span
            key={i}
            className="hero-particle"
            style={{ left: p.left, width: p.size, height: p.size }}
            animate={{ y: [0, -140, 0], x: [0, p.drift, 0], opacity: [0, 0.8, 0] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'easeInOut' }}
          />
        ))}
      </div>

      {/* Content: text fades upward naturally on load and on scroll-out */}
      <motion.div
        className="hero-content"
        style={{ y: contentY, opacity: contentOpacity }}
        initial={{ opacity: 0, y: 60 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
      >
        <motion.p
          className="hero-eyebrow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          Luxury Wedding Photography &amp; Films
        </motion.p>

        <h1 className="hero-title">Crafting Timeless Wedding Stories</h1>

        <motion.p
          className="hero-sub"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.2, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          We capture emotions, traditions, and unforgettable moments through cinematic
          photography and luxury wedding films.
        </motion.p>

        <motion.div
          className="hero-ctas"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <a
            className="btn-gold"
            href="#contact"
            onClick={(e) => {
              e.preventDefault();
              scrollToId('contact');
            }}
          >
            Book Your Date
          </a>
          <a
            className="btn-outline"
            href="#portfolio"
            onClick={(e) => {
              e.preventDefault();
              scrollToId('portfolio');
            }}
          >
            Watch Showreel
          </a>
        </motion.div>

        <motion.div
          className="hero-stats"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
        >
          <div className="hero-stat">
            <span className="hero-stat-num">500+</span>
            <span className="hero-stat-label">Weddings</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">8+</span>
            <span className="hero-stat-label">Years</span>
          </div>
          <div className="hero-stat">
            <span className="hero-stat-num">4K</span>
            <span className="hero-stat-label">Cinematic Films</span>
          </div>
        </motion.div>
      </motion.div>

      <motion.div
        className="scroll-indicator"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, y: [0, 10, 0] }}
        transition={{ delay: 2, duration: 2.2, repeat: Infinity, ease: [0.45, 0, 0.55, 1] }}
      >
        <div className="mouse">
          <div className="wheel"></div>
        </div>
        <span className="script-text">Scroll down</span>
      </motion.div>
    </section>
  );
}
