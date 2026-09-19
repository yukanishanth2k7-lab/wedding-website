import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Canvas } from '@react-three/fiber';
import ShatteredImageReveal from './ShatteredImageReveal';
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
  onClick: () => void;
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
      onClick={onClick}
      style={{ position: 'relative', cursor: 'pointer' }}
    >
      <div 
        ref={registerRef} 
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '4px' }} 
      />
      <img src={img.src} alt={img.label} loading="lazy" style={{ opacity: 0, visibility: 'hidden', width: '100%', height: 'auto', display: 'block' }} />
      <figcaption className="portfolio-item-caption">{img.label}</figcaption>
    </motion.figure>
  );
};

export default function Portfolio() {
  const [filter, setFilter] = useState<Category | 'all'>('all');
  const [lightbox, setLightbox] = useState<PortfolioImage | null>(null);
  
  // Store refs to DOM elements so the global canvas can track them
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const isMobile = window.innerWidth < 768;

  const visible = filter === 'all' ? IMAGES : IMAGES.filter((i) => i.category === filter);

  const close = useCallback(() => setLightbox(null), []);
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lightbox, close]);

  return (
    <section className="section portfolio-section content-layer" id="portfolio">
      <h2 className="section-title script-text">Portfolio</h2>

      <div className="portfolio-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            className={`portfolio-filter${filter === f.key ? ' active' : ''}`}
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
              onClick={() => setLightbox(img)} 
              registerRef={(el) => {
                if (el) itemRefs.current.set(img.src, el);
                else itemRefs.current.delete(img.src);
              }}
            />
          ))}
        </AnimatePresence>
      </motion.div>

      {/* Global Canvas Overlay for Shattered Glass */}
      <Canvas
        orthographic
        camera={{ position: [0, 0, 100], zoom: 1 }}
        style={{
          position: 'fixed',
          inset: 0,
          pointerEvents: 'none',
          zIndex: 10 // above grid, below lightbox
        }}
        gl={{ alpha: true, antialias: true }}
      >
        {visible.map((img, index) => (
          <ShatteredImageReveal
            key={img.src}
            url={img.src}
            domTarget={() => itemRefs.current.get(img.src) || null}
            shardCount={isMobile ? 30 : 80}
            seed={100 + index * 13}
          />
        ))}
      </Canvas>

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
            <motion.figure
              className="lightbox-figure"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <img src={lightbox.src} alt={lightbox.label} />
              <figcaption>{lightbox.label}</figcaption>
              <button className="lightbox-close" onClick={close} aria-label="Close">
                <X size={22} />
              </button>
            </motion.figure>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
