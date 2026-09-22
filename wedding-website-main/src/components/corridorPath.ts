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
  // FULL-QUALITY SOURCES: the original high-res JPGs (luxeweddings.in
  // originals, already in /public/gallery) instead of the lossy webp
  // conversions — after the flash the photo must be genuinely sharp.
  '/gallery/wedding-1.jpg',
  '/gallery/wedding-2.jpg',
  '/gallery/about-form.jpg',
  '/gallery/contact-img.jpg',
  '/gallery/decor-2.jpg',
  '/gallery/decor-3.jpg',
  '/gallery/decor-4.jpg',
  '/gallery/decor-5.jpg',
  '/gallery/decor-6.jpg',
  '/gallery/decor-7.jpg',
  '/gallery/wedding-entertainment.jpg',
  '/gallery/wedding-entertainment-1.jpg',
  '/gallery/moment-1.jpg',
  '/gallery/moment-2.jpg',
];

// Nearest-t lookup: sample the curve densely once, find the parameter whose
// curve point passes closest to each photo. The click fires a breath BEFORE
// closest approach — the shutter snaps and the flash fires while the frame is
// still growing on screen, so you always meet finished photographs, never
// blurred ones.
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

// Click retiming: the curve's S-path makes some adjacent photos' approach
// moments collide (two flashes at once, one photo skipped). So after finding
// each photo's natural approach t, clicks are RE-TIMED: sorted by approach,
// then a forward pass enforces a minimum spacing between consecutive fires —
// every photo gets its own distinct flash → clear beat, in order.
const MIN_CLICK_GAP = 0.06; // > flash 0.022 + hd window headroom: no overlap
const FIRST_CLICK = 0.045;  // the first frame flashes almost immediately —
                            // the viewer sees the first blur→flash→clear
                            // beat right after the hero photo develops
const LAST_CLICK = 0.93;    // 0.93 + flash 0.022 + hd 0.02 = 0.972 — the finale
                            // always completes before the page ends

export const CORRIDOR_PHOTOS: CorridorPhoto[] = (() => {
  const photos = IMAGES.map((url, i) => {
    const isLeft = i % 2 === 0;
    const z = -1.5 - i * 3.65; // ~15 photos across the flight (z −1.5 → −52.6)
    const xBase = isLeft ? -4.7 : 4.7;
    const x = xBase + Math.sin(i * 1.7) * 0.7;
    const y = 0.15 + Math.cos(i * 2.3) * 0.55;
    const rotY = isLeft ? 0.32 : -0.32;
    const width = 3.9 + Math.sin(i * 0.9) * 0.5;

    const approachT = nearestT(new THREE.Vector3(x, y, z));
    return { url, x, y, z, width, rotY, seed: 17 + i * 29, approachT, clickT: 0 };
  });

  // retime: walk the photos in approach order, pushing clicks apart
  const byApproach = [...photos].sort((a, b) => a.approachT - b.approachT);
  let prev = -Infinity;
  for (const p of byApproach) {
    p.clickT = THREE.MathUtils.clamp(
      Math.max(p.approachT - 0.015, prev + MIN_CLICK_GAP, FIRST_CLICK),
      FIRST_CLICK,
      LAST_CLICK
    );
    prev = p.clickT;
  }
  // Backward pass: the forward pass can pile late photos onto LAST_CLICK
  // (they'd clamp to the same instant — one shared flash, one skipped photo).
  // Walk back from the finale and spread any overflow onto earlier photos.
  let next = Infinity;
  for (let i = byApproach.length - 1; i >= 0; i--) {
    const p = byApproach[i];
    p.clickT = THREE.MathUtils.clamp(Math.min(p.clickT, next - MIN_CLICK_GAP), FIRST_CLICK, LAST_CLICK);
    next = p.clickT;
  }
  return photos;
})();

/** The scroll window over which one photo's drift/tilt choreography plays. */
export const PHOTO_APPROACH = 0.11; // t-units before the click: drift settles in
// FLASH WINDOW: 0.18–0.22s spec. The journey spans ~1500px of scroll ≈ 90s at
// the tuned wheel pace, so t=1 ≈ 90s → 1s ≈ 0.011 t-units → 0.20s ≈ 0.0022.
// Rounded up slightly for visibility at fast scroll speeds.
export const PHOTO_FLASH = 0.0024; // t-units — the white burst lives ~0.2s
export const PHOTO_HD_SETTLE = 0.004; // t-units — the HD detail pulse after the burst
// Kept as aliases: nothing outside IrisPhoto should reference the old names.
export const PHOTO_SHARPEN = 0.0001; // legacy: sharpness now snaps in one frame
export const PHOTO_IRIS = 0.004;     // legacy: iris wipe removed (DslrCamera press-hold window)
// (must stay < CLICK_AIM_WINDOW 0.03 and < MIN_CLICK_GAP 0.055 — one burst per
// click, fully decayed before the camera turns to the next frame)
