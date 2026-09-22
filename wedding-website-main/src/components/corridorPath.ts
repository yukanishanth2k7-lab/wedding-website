import * as THREE from 'three';

/* ═══════════════════════════════════════════════════════════════
   THE CORRIDOR — one shared spline for everything that flies:
   the viewer's camera (CameraRig) and the working DSLR
   (DslrCamera) both travel THIS curve, so the DSLR always glides
   along the exact same weighted path the viewer experiences.

   Photos hang alternately left/right of the curve at eye level,
   tilted inward. Each photo gets a clickT: the scroll position at
   which the DSLR (leading the viewer by a breath) presses its
   shutter — the moment that photo rack-focuses sharp through its
   aperture-iris wipe.
   ═══════════════════════════════════════════════════════════════ */

// Waypoints: a weighted S-path down the stage. Y stays near eye level (0.1–0.7)
// so photos frame against the DOM copy which occupies the center column.
const WAYPOINTS: THREE.Vector3[] = [
  new THREE.Vector3(0, 0.4, 10.5),
  new THREE.Vector3(-1.6, 0.7, 2),
  new THREE.Vector3(2.2, 0.2, -6.5),
  new THREE.Vector3(-2.2, 0.55, -16),
  new THREE.Vector3(1.8, 0.15, -26),
  new THREE.Vector3(-1.8, 0.5, -36),
  new THREE.Vector3(1.6, 0.1, -46),
  new THREE.Vector3(0, 0.35, -58),
];

export const corridorCurve = new THREE.CatmullRomCurve3(WAYPOINTS, false, 'catmullrom', 0.35);

export interface CorridorPhoto {
  url: string;
  /** side offset from the corridor centerline at this depth */
  x: number;
  y: number;
  z: number;
  /** world width of the photo plane (height derives from aspect) */
  width: number;
  /** resting inward tilt (radians) — photos angle toward the path */
  rotY: number;
  /** per-photo variation seeds for the scroll drift choreography */
  seed: number;
  /** scroll t at which the DSLR's shutter fires for THIS photo */
  clickT: number;
}

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
  '/gallery/wedding-1.jpg', // high-res (1600²) — the 406px wedding.webp read permanently soft
];

// Nearest-t lookup: sample the curve densely once, find the parameter whose
// curve point passes closest to each photo. The click fires just AFTER closest
// approach — you glide up to a blurred frame, and as you draw level with it,
// the shutter snaps and it sharpens.
const CURVE_SAMPLES = 600;
const sampled: THREE.Vector3[] = corridorCurve.getSpacedPoints(CURVE_SAMPLES);

function nearestT(point: THREE.Vector3): number {
  let bestIdx = 0;
  let bestDist = Infinity;
  for (let i = 0; i < sampled.length; i++) {
    const d = sampled[i].distanceToSquared(point);
    if (d < bestDist) {
      bestDist = d;
      bestIdx = i;
    }
  }
  return bestIdx / (sampled.length - 1);
}

export const CORRIDOR_PHOTOS: CorridorPhoto[] = IMAGES.map((url, i) => {
  const isLeft = i % 2 === 0;
  const z = -1.5 - i * 3.65; // ~15 photos across the flight (z −1.5 → −52.6)
  const xBase = isLeft ? -4.7 : 4.7;
  const x = xBase + Math.sin(i * 1.7) * 0.7;
  const y = 0.15 + Math.cos(i * 2.3) * 0.55;
  const rotY = isLeft ? 0.32 : -0.32;
  const width = 3.9 + Math.sin(i * 0.9) * 0.5;

  const clickT = THREE.MathUtils.clamp(nearestT(new THREE.Vector3(x, y, z)) + 0.02, 0.05, 0.985);

  return { url, x, y, z, width, rotY, seed: 17 + i * 29, clickT };
});

/** The scroll window over which one photo's drift/tilt choreography plays. */
export const PHOTO_APPROACH = 0.11; // t-units before the click: drift settles in
export const PHOTO_SHARPEN = 0.028; // t-units for the rack-focus after the click
export const PHOTO_IRIS = 0.045; // t-units for the iris wipe after the click
