import { useAppStore } from '../store';
import FloatingText from './FloatingText';
import FloatingShatteredImage from './FloatingShatteredImage';

const IMAGES = [
  '/gallery/webp/wedding-1.webp',
  '/gallery/webp/wedding-2.webp',
  '/gallery/webp/about-form.webp',
  '/gallery/webp/contact-img.webp',
  '/gallery/webp/decor-2.webp',
  '/gallery/webp/decor-3.webp',
  '/gallery/webp/decor-4.webp',
  '/gallery/webp/decor-5.webp',
  '/gallery/webp/decor-6.webp',
  '/gallery/webp/decor-7.webp',
  '/gallery/webp/wedding-entertainment.webp',
  '/gallery/webp/wedding-entertainment-1.webp',
  '/gallery/webp/moment-1.webp',
  '/gallery/webp/moment-2.webp',
  '/gallery/webp/wedding.webp',
];

/* FINALE REPRISE — the camera path ends at z=-60 but the trail stopped at z=-51, so
   the last 3-4 sections scrolled past an empty fog wall. These 6 planes (same
   luxeweddings.in gallery images, webp derivatives) extend the corridor to z=-75
   with wider spacing so the closing stops each have imagery in frame. */
const REPRISE = [
  { url: '/gallery/webp/decor-7.webp', position: [-5.5, 0.8, -55] as [number, number, number], rotation: [0.04, 0.22, 0] as [number, number, number], width: 4.4, seed: 300 },
  { url: '/gallery/webp/wedding-entertainment-1.webp', position: [5.6, -0.6, -59] as [number, number, number], rotation: [0.03, -0.24, 0] as [number, number, number], width: 4.2, seed: 313 },
  { url: '/gallery/webp/moment-1.webp', position: [-5.2, -1.2, -63] as [number, number, number], rotation: [0.05, 0.26, 0] as [number, number, number], width: 4.5, seed: 326 },
  { url: '/gallery/webp/wedding-2.webp', position: [5.4, 1.0, -67] as [number, number, number], rotation: [0.02, -0.26, 0] as [number, number, number], width: 4.6, seed: 339 },
  { url: '/gallery/webp/decor-5.webp', position: [-5.8, -0.4, -71] as [number, number, number], rotation: [0.04, 0.24, 0] as [number, number, number], width: 4.4, seed: 352 },
  { url: '/gallery/webp/moment-2.webp', position: [0.6, -1.6, -75] as [number, number, number], rotation: [0.06, -0.1, 0] as [number, number, number], width: 5.0, seed: 365 },
];

export default function GalleryPlanes() {
  const isMobile = useAppStore((state) => state.isMobile);
  const shardCount = isMobile ? 15 : 40;

  // Distribute 15 images along the entire scroll path from Z = 5 down to Z = -55
  const positionsAndRotations = IMAGES.map((url, i) => {
    // Spread across 60 units of depth (approx 4 units apart)
    const z = 5 - (i * 4.0);
    
    // Follow the camera path roughly. Camera wanders in X from -4 to 6.
    // We alternate images left and right of the center path.
    const isLeft = i % 2 === 0;
    const xBase = isLeft ? -5.0 : 5.0;
    const xOffset = Math.sin(i * 1.5) * 2.0; 
    const x = xBase + xOffset;
    
    // Vary Y to keep it dynamic but visible
    const y = -1.5 + (Math.cos(i * 2.1) * 3.5); 
    
    // Angle them slightly inward toward the center path
    const rotY = isLeft ? 0.2 + (Math.sin(i)*0.1) : -0.2 + (Math.sin(i)*0.1);
    const rotX = Math.cos(i) * 0.05;
    
    return {
      url,
      position: [x, y, z] as [number, number, number],
      rotation: [rotX, rotY, 0] as [number, number, number],
      width: 3.5 + Math.sin(i)*0.8, // vary width between 2.7 and 4.3
      seed: 100 + i * 13
    };
  });

  return (
    <group position={[0, 0, 0]}>
      {/* 3D FLOATING TEXT placed near the mid gallery images */}
      <FloatingText text="A Timeless Vow" position={[-4, 1, -15]} fontSize={0.8} />
      <FloatingText text="Elegance in Motion" position={[5.5, -2, -35]} fontSize={1.0} color="#D4AF37" />

      {positionsAndRotations.map((item, index) => (
        <FloatingShatteredImage 
          key={item.url + index}
          url={item.url}
          position={item.position}
          rotation={item.rotation}
          width={item.width}
          shardCount={shardCount}
          seed={item.seed}
        />
      ))}

      {/* FINALE REPRISE: reprise wing rendered by the same shattered-glass system, so
          the closing sections get the identical assemble-on-approach + gold snap-flash
          animation as the rest of the trail — no new animation style introduced */}
      {REPRISE.map((item) => (
        <FloatingShatteredImage
          key={item.url + '-reprise'}
          url={item.url}
          position={item.position}
          rotation={item.rotation}
          width={item.width}
          shardCount={shardCount}
          seed={item.seed}
        />
      ))}
    </group>
  );
}
