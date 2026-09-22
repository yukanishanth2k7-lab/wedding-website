import { useRef } from 'react';
import { motion, useScroll, useTransform, type MotionValue } from 'framer-motion';
import { usePrefersReducedMotion } from '../store';
import './WordReveal.css';

/* ORYZO "ISN'T JUST A COASTER" MOMENT — a pinned, centered statement whose words
   illuminate one by one as you scroll through the section. This is the signature
   Oryzo typography animation: dark words flush to gold at a per-word scroll
   threshold while the section holds the viewport. */

const STATEMENT =
  "One camera. Every angle of your story. It sees the vows you whispered, the hands that shook, and the room that held its breath.";

function Word({ word, progress, range }: { word: string; progress: MotionValue<number>; range: [number, number] }) {
  const opacity = useTransform(progress, range, [0.16, 1]);
  const color = useTransform(progress, range, ['#f1e6d8', '#d4af37']);
  return (
    <motion.span style={{ opacity, color }} className="word-reveal-word">
      {word}
    </motion.span>
  );
}

export default function WordReveal() {
  const sectionRef = useRef<HTMLElement>(null);
  const prefersReducedMotion = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end end'],
  });

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
