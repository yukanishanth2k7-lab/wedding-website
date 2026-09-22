import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight } from 'lucide-react';
import { trapFocus } from '../utils/a11y';
import { getLenisInstance } from '../store';
import './Portfolio.css';

type Category = 'photography' | 'cinematography';

interface PortfolioImage {
  src: string;
  category: Category;
  label: string;
}

const IMAGES: PortfolioImage[] = [
  { src: '/gallery/webp/wedding-1.webp', category: 'photography', label: 'Wedding Photography' },
  { src: '/gallery/webp/wedding-2.webp', category: 'photography', label: 'Wedding Photography' },
  { src: '/gallery/webp/about-form.webp', category: 'photography', label: 'Couples' },
  { src: '/gallery/webp/contact-img.webp', category: 'photography', label: 'Portraits' },
  { src: '/gallery/webp/decor-2.webp', category: 'photography', label: 'Decor' },
  { src: '/gallery/webp/decor-3.webp', category: 'photography', label: 'Decor' },
  { src: '/gallery/webp/decor-4.webp', category: 'photography', label: 'Decor' },
  { src: '/gallery/webp/decor-5.webp', category: 'photography', label: 'Decor' },
  { src: '/gallery/webp/decor-6.webp', category: 'cinematography', label: 'Highlights' },
  { src: '/gallery/webp/decor-7.webp', category: 'cinematography', label: 'Highlights' },
  { src: '/gallery/webp/wedding-entertainment.webp', category: 'cinematography', label: 'Entertainment' },
  { src: '/gallery/webp/wedding-entertainment-1.webp', category: 'cinematography', label: 'Entertainment' },
  { src: '/gallery/webp/moment-1.webp', category: 'cinematography', label: 'Moments' },
  { src: '/gallery/webp/moment-2.webp', category: 'cinematography', label: 'Moments' },
  { src: '/gallery/webp/wedding.webp', category: 'photography', label: 'Wedding Photography' },
];

const FILTERS: Array<{ key: Category | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'photography', label: 'Photography' },
  { key: 'cinematography', label: 'Cinematography' },
];

const PortfolioItem = ({ 
  img, 
  onClick, 
  registerRef 
}: { 
  img: PortfolioImage; 
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  registerRef: (el: HTMLDivElement | null) => void;
}) => {
  return (
    <motion.figure
      className="portfolio-item"
      layout
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      style={{ position: 'relative' }}
    >
      {/* A11Y: a real button wraps the image — grid is fully keyboard operable
          (Tab to an image, Enter to open the lightbox) and screen readers announce
          it as a button with the photo's label. */}
      <button
        type="button"
        className="portfolio-item-btn"
        onClick={onClick}
        aria-label={`${img.label} — open larger view`}
      >
        <div 
          ref={registerRef} 
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '4px' }} 
          aria-hidden="true"
        />
        <img src={img.src} alt={img.label} loading="lazy" style={{ opacity: 0, visibility: 'hidden', width: '100%', height: 'auto', display: 'block' }} />
        <figcaption className="portfolio-item-caption">{img.label}</figcaption>
      </button>
    </motion.figure>
  );
};

export default function Portfolio() {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [lightbox, setLightbox] = useState<PortfolioImage | null>(null);

  const visible = filter === 'all' ? IMAGES : IMAGES.filter((i) => i.category === filter);

  const close = useCallback(() => setLightbox(null), []);
  // A11Y: remember which grid button opened the dialog so focus can return
  // there on close (keyboard users land back where they were, not on body).
  const lastTrigger = useRef<HTMLElement | null>(null);
  const openLightbox = (img: PortfolioImage) => (e: React.MouseEvent<HTMLButtonElement>) => {
    lastTrigger.current = e.currentTarget;
    setLightbox(img);
  };
  useEffect(() => {
    if (!lightbox && lastTrigger.current) {
      lastTrigger.current.focus();
      lastTrigger.current = null;
    }
  }, [lightbox]);
  const step = useCallback(
    (dir: 1 | -1) => {
      setLightbox((cur) => {
        if (!cur) return cur;
        const idx = visible.findIndex((i) => i.src === cur.src);
        const next = (idx + dir + visible.length) % visible.length;
        return visible[next];
      });
    },
    [visible]
  );

  // A11Y: dialog keyboard support — Escape closes, arrows navigate, focus is
  // trapped inside while open (trapFocus on the dialog's onKeyDown).
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') step(1);
      if (e.key === 'ArrowLeft') step(-1);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, close, step]);

  // A11Y: hide the page behind the dialog from AT + lock background scroll.
  useEffect(() => {
    if (!lightbox) return;
    const root = document.getElementById('root');
    const main = document.querySelector('main');
    [root, main].forEach((el) => {
      if (el instanceof HTMLElement) el.setAttribute('aria-hidden', 'true');
    });
    document.body.style.overflow = 'hidden';
    // FIX (scroll): body overflow alone doesn't stop Lenis — the smooth-scroll
    // raf kept scrolling the page BEHIND the open lightbox. Stop/start it so
    // the dialog truly owns the wheel while open.
    const lenis = getLenisInstance();
    lenis?.stop();
    return () => {
      [root, main].forEach((el) => {
        if (el instanceof HTMLElement) el.removeAttribute('aria-hidden');
      });
      document.body.style.overflow = '';
      lenis?.start();
    };
  }, [lightbox]);

  return (
    <section className="section portfolio-section content-layer" id="portfolio">
      <h2 className="section-title script-text">Portfolio</h2>

      {/* A11Y: filter group semantics + pressed state so AT announces the active filter. */}
      <div className="portfolio-filters" role="group" aria-label="Filter portfolio by category">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`portfolio-filter${filter === f.key ? ' active' : ''}`}
            aria-pressed={filter === f.key}
            onClick={() => setFilter(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      <motion.div
        className="portfolio-grid"
        initial={{ opacity: 0, y: 50 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      >
        <AnimatePresence mode="popLayout">
          {visible.map((img) => (
            <PortfolioItem 
              key={img.src} 
              img={img} 
              onClick={openLightbox(img)} 
              registerRef={() => {}}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Global Canvas Overlay for Shattered Glass — A11Y: skipped entirely when
          WebGL is unavailable (the plain grid images below still work); decorative,
          so hidden from AT. */}
      {/* NOTE: the old per-item WebGL shard overlay was removed with the new
          camera-narrator design — the grid below is the workhorse now. */}

      <AnimatePresence>
        {lightbox && (
          <motion.div
            className="lightbox-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
            onClick={close}
          >
            {/* A11Y: proper dialog semantics — role=dialog + aria-modal, focus
                trapped via onKeyDown, labelled by the caption, Escape/arrows wired. */}
            <motion.figure
              className="lightbox-figure"
              role="dialog"
              aria-modal="true"
              aria-label={`${lightbox.label} — image viewer`}
              tabIndex={-1}
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={trapFocus}
              ref={(el) => {
                // Move focus into the dialog when it opens.
                if (el && document.activeElement !== el) el.focus();
              }}
            >
              <img src={lightbox.src} alt={lightbox.label} />
              <figcaption>{lightbox.label}</figcaption>
              <div className="lightbox-controls">
                <button className="lightbox-nav" onClick={() => step(-1)} aria-label="Previous image">
                  <ChevronLeft size={22} />
                </button>
                <button className="lightbox-close" onClick={close} aria-label="Close viewer">
                  <X size={22} />
                </button>
                <button className="lightbox-nav" onClick={() => step(1)} aria-label="Next image">
                  <ChevronRight size={22} />
                </button>
              </div>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
