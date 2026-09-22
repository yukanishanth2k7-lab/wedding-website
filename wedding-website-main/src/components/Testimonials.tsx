import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../store';
import './Testimonials.css';

/* TESTIMONIALS — one voice at a time, quietly crossfading. No carousel
   chrome: a single quote, auto-advancing, with pause-on-hover and dots
   that are real buttons. Reduced motion: static first quote. */

const QUOTES = [
  {
    text: 'We forgot they were even there. Then the gallery arrived and there was our whole day — every hug we missed, every tear we never saw.',
    name: 'Anitha & Karthik',
    detail: 'Wedding, Karaikal',
  },
  {
    text: 'The film made my mother cry a second time. Same tears, four weeks later, from the other side of the world.',
    name: 'Divya R.',
    detail: 'Destination wedding, Chidambaram',
  },
  {
    text: 'They shot our pre-wedding at dawn on the beach road like it was a film set. Twenty minutes of golden light, not one frame wasted.',
    name: 'Sneha & Vikram',
    detail: 'Pre-wedding, Nagapattinam coast',
  },
  {
    text: 'Albums so beautiful we ordered two extra for our parents. Hand-finished, thick pages — heirlooms, honestly.',
    name: 'Meera S.',
    detail: 'Wedding + album, Karaikal',
  },
];

const HOLD_MS = 6500;

export default function Testimonials() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const prefersReducedMotion = usePrefersReducedMotion();
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (paused || prefersReducedMotion) return;
    timer.current = window.setInterval(() => {
      setIndex((i) => (i + 1) % QUOTES.length);
    }, HOLD_MS);
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [paused, prefersReducedMotion]);

  const q = QUOTES[index];

  return (
    <section
      className="section testimonials-section content-layer"
      id="testimonials"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <p className="section-kicker">Kind words from the couples</p>
      <h2 className="section-title script-text">What they say after</h2>

      <motion.blockquote
        className="testimonial-quote"
        key={index}
        initial={prefersReducedMotion ? false : { opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="testimonial-mark" aria-hidden="true">“</span>
        <p className="testimonial-text">{q.text}</p>
        <footer className="testimonial-footer">
          <span className="testimonial-name">{q.name}</span>
          <span className="testimonial-detail">{q.detail}</span>
        </footer>
      </motion.blockquote>

      <div className="testimonial-dots" role="group" aria-label="Choose a testimonial">
        {QUOTES.map((item, i) => (
          <button
            key={item.name}
            type="button"
            className={`testimonial-dot${i === index ? ' active' : ''}`}
            aria-pressed={i === index}
            aria-label={`Testimonial ${i + 1} of ${QUOTES.length}: ${item.name}`}
            onClick={() => setIndex(i)}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </div>
    </section>
  );
}
