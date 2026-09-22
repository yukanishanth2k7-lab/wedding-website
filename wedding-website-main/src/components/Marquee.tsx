import { usePrefersReducedMotion } from '../store';
import './Marquee.css';

const PHRASES = [
  'Weddings',
  'Cinematic Films',
  'Premium Albums',
  'Family Portraits',
  'Since 2009',
  'Karaikal',
];

/* ORYZO-STYLE MARQUEE — the tilted, edge-bleeding band that slides the brand
   vocabulary across the viewport between acts. Pure CSS animation, duplicated
   track for a seamless loop; reduced motion freezes the slide (content stays
   readable, static). */
export default function Marquee() {
  const prefersReducedMotion = usePrefersReducedMotion();
  const track = [...PHRASES, ...PHRASES];

  return (
    <div className="marquee-band" aria-hidden="true">
      <div className={`marquee-track${prefersReducedMotion ? ' marquee-track--paused' : ''}`}>
        {track.map((p, i) => (
          <span className="marquee-item" key={`${p}-${i}`}>
            {p}
            <span className="marquee-star">✦</span>
          </span>
        ))}
      </div>
    </div>
  );
}
