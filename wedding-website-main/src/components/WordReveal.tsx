import { useEffect, useRef } from 'react';
import { motion, useTransform, useMotionValue, type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from '../store';
import './WordReveal.css';

/* ORYZO "ISN'T JUST A COASTER" MOMENT — a pinned, centered statement whose words
   illuminate one by one as you scroll through the section. Set in Canela→
   Fraunces; words rise from dark to a champagne-gradient fill while a frosted
   charcoal bed + gold backlight keep them legible over the 3D corridor. */

const STATEMENT =
  "One camera. Every angle of your story. It sees the vows you whispered, the hands that shook, and the room that held its breath.";

/* The emotive beats of the statement — set in the calligraphic italic
   so the typography itself carries feeling, like a line from a letter. */
const ACCENT_WORDS = new Set(['vows', 'whispered', 'breath']);
const isAccent = (word: string) => ACCENT_WORDS.has(word.replace(/[^a-z]/gi, '').toLowerCase());

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  // Illumination = the opacity ramp. Fill is a static champagne gradient
  // (CSS) — animating `color` does nothing on background-clip:text, and a
  // JS-driven gradient stop per word would thrash style recalc on scroll.
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span
      style={{ opacity }}
      className={`word-reveal-word${isAccent(word) ? ' word-reveal-word--accent' : ''}`}
    >
      {word}
    </motion.span>
  );
}

export default function WordReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();

  /* PROGRESS: measured per-frame from the section's own rect instead of
     framer's useScroll({ target }). With Lenis owning the scroll, framer's
     cached target offsets went stale — words stayed stuck at their dim start
     opacity on some loads. One getBoundingClientRect per frame is cheaper
     than a style recalc and can never be stale. */
  const scrollYProgress = useMotionValue(0);
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      const el = sectionRef.current;
      if (el) {
        const r = el.getBoundingClientRect();
        const span = r.height - window.innerHeight;
        const p = span > 0 ? Math.min(1, Math.max(0, -r.top / span)) : 0;
        scrollYProgress.set(p);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [scrollYProgress]);

  const words = STATEMENT.split(' ');
  const glowScale = useTransform(scrollYProgress, [0.55, 0.95], [0.4, 1.15]);
  const glowOpacity = useTransform(scrollYProgress, [0.55, 0.8, 1], [0, 0.55, 0]);

  if (prefersReducedMotion) {
    // A11Y: reduced motion — plain fully-lit text, no pin, no per-word animation.
    return (
      <section className="word-reveal-section" ref={sectionRef}>
        <p className="word-reveal-text">{STATEMENT}</p>
      </section>
    );
  }

  return (
    <section className="word-reveal-section" ref={sectionRef}>
      <motion.div className="word-reveal-glow" style={{ scale: glowScale, opacity: glowOpacity }} aria-hidden="true" />
      <p className="word-reveal-text" aria-label={STATEMENT}>
        {words.map((word, i) => {
          const start = i / words.length;
          const end = Math.min(start + 1.5 / words.length, 1);
          return <Word key={`${word}-${i}`} word={word} progress={scrollYProgress} range={[start, end]} />;
        })}
      </p>
      <span className="word-reveal-kicker" aria-hidden="true">THE NARRATOR · EST. 2009 · KARAIKAL</span>
    </section>
  );
}
