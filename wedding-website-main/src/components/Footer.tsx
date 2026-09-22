import { motion } from 'framer-motion';
import { usePrefersReducedMotion } from '../store';
import './Footer.css';

/* FOOTER — the quiet sign-off. Studio signature, contact details,
   social links, and the copyright line. Charcoal-on-charcoal with
   gold hairlines; the fade-up entrance is the last breath of the
   scroll journey. */

const SOCIALS = [
  { label: 'Instagram', href: 'https://instagram.com/venusphotostudiokaraikal', handle: '@venusphotostudio' },
  { label: 'Facebook', href: 'https://facebook.com/venusphotostudiokaraikal', handle: 'Venus Photo Studio' },
  { label: 'WhatsApp', href: 'https://wa.me/919999999999', handle: '+91 99999 99999' },
];

export default function Footer() {
  const prefersReducedMotion = usePrefersReducedMotion();

  return (
    <motion.footer
      className="footer-section content-layer"
      initial={prefersReducedMotion ? false : { opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="footer-inner">
        <div className="footer-brand">
          <p className="footer-name">Venus Photo Studio <span className="footer-amp">And Lab</span></p>
          <p className="footer-tag">Weddings · Films · Albums — since 2009, Karaikal</p>
        </div>

        <address className="footer-contact">
          <a href="tel:+919999999999">+91 99999 99999</a>
          <a href="mailto:hello@venusphotostudio.in">hello@venusphotostudio.in</a>
          <span>Nehru Street, Karaikal, Puducherry 609602</span>
        </address>

        <nav className="footer-social" aria-label="Social links">
          {SOCIALS.map((s) => (
            <a key={s.label} href={s.href} target="_blank" rel="noreferrer">
              <span className="footer-social-label">{s.label}</span>
              <span className="footer-social-handle">{s.handle}</span>
            </a>
          ))}
        </nav>
      </div>

      <div className="footer-rule" aria-hidden="true" />
      <p className="footer-copy">
        © {new Date().getFullYear()} Venus Photo Studio And Lab, Karaikal. Every frame ours, every story yours.
      </p>
    </motion.footer>
  );
}
