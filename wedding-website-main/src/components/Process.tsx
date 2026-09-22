import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../store';
import './Process.css';

/* PROCESS — how booking works, four steps. Oryzo-grade restraint:
   a numbered rail, generous whitespace, gold hairlines, staggered
   entrance. No flash — the motion is a quiet fade-and-rise. */

const STEPS = [
  {
    num: '01',
    title: 'The first message',
    body: 'Tell us your dates and your story. We reply within two working days with availability and a honest, itemised quote.',
  },
  {
    num: '02',
    title: 'The sitting',
    body: 'We meet — over coffee in Karaikal or a call. We walk through your venues, your light, the moments that matter to you.',
  },
  {
    num: '03',
    title: 'The day',
    body: 'We arrive early, stay late, and disappear into the background. You live the day; we keep the frames you missed.',
  },
  {
    num: '04',
    title: 'The roll',
    body: 'A private online gallery in ten days. Films in four weeks. Hand-finished albums follow — every frame checked by us.',
  },
];

export default function Process() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <section className="section process-section content-layer" id="process">
      <p className="section-kicker">From your first message to your final film</p>
      <h2 className="section-title script-text">How booking works</h2>

      <ol className="process-rail">
        {STEPS.map((s, i) => (
          <motion.li
            key={s.num}
            className="process-step"
            initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.9, delay: i * 0.12, ease: [0.22, 1, 0.36, 1] }}
          >
            <span className="process-num">{s.num}</span>
            <span className="process-line" aria-hidden="true" />
            <h3 className="process-title">{s.title}</h3>
            <p className="process-body">{s.body}</p>
          </motion.li>
        ))}
      </ol>
    </section>
  );
}
