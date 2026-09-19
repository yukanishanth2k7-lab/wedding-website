import { useFrame, useThree } from '@react-three/fiber';
import { useMemo, useRef } from 'react';
import * as THREE from 'three';
import { useAppStore } from '../store';

// FIX (blank space): one stop per REAL visual moment — the old 8-point spline padded
// the path beyond the 4 actual sections, forcing blank space just to fill the scroll.
const STOPS = [
  { p: new THREE.Vector3(0, 0, 10), look: new THREE.Vector3(0, 0, 0) }, // Hero (shatter plane)
  { p: new THREE.Vector3(-4, -1.5, -14), look: new THREE.Vector3(-3, -3.5, -30) }, // Our Story: dolly toward frames
  { p: new THREE.Vector3(6, -3.5, -36), look: new THREE.Vector3(0, -4, -30) }, // Event Details: gallery sweep backdrop
  { p: new THREE.Vector3(0, -2, -48), look: new THREE.Vector3(0, -5, -30) }, // RSVP: settle back
  { p: new THREE.Vector3(0, -3, -60), look: new THREE.Vector3(0, -5, -30) }, // RSVP: slow resting push-in
] as const;

// FIX (cheap 3D): slow the re-orientation so the camera never snaps between stops.
const LOOK_RATE = 1.6; // 1/s lerp factor for the look-at target (was ~4, felt twitchy)
const POS_RATE = 2.2; // 1/s lerp factor for position

export default function CameraRig() {
  const { camera } = useThree();
  const scrollProgress = useAppStore((state) => state.scrollProgress);
  const lookAtTarget = useRef(new THREE.Vector3(0, 0, 0));
  const scrollProgressSmoothed = useRef(0);

  const curve = useMemo(() => new THREE.CatmullRomCurve3(STOPS.map((s) => s.p)), []);

  useFrame((_state, delta) => {
    // Map scroll progress (0-1) to curve position with mild temporal smoothing —
    // scrub already smooths via Lenis; this just feathers the camera response.
    scrollProgressSmoothed.current = THREE.MathUtils.damp(
      scrollProgressSmoothed.current,
      scrollProgress,
      3.5, // damping lambda — higher = snappier, lower = floatier
      delta
    );
    const t = scrollProgressSmoothed.current;

    // FIX (blank space): positions map 1:1 to section boundaries — each stop is a
    // real visual moment (hero, story, gallery, details, RSVP), no padding stops.
    camera.position.lerp(curve.getPointAt(t), 1 - Math.exp(-POS_RATE * delta));

    // FIX (cheap 3D): damp the look-at toward a point ahead on the curve for a
    // slow "opera glass" re-frame instead of a hard lookAt snap between stops.
    const ahead = curve.getPointAt(Math.min(t + 0.04, 1));
    const targetLook = STOPS[Math.min(Math.floor(t * (STOPS.length - 1)), STOPS.length - 1)].look;
    const blended = ahead.clone().lerp(targetLook, 0.5);
    lookAtTarget.current.lerp(blended, 1 - Math.exp(-LOOK_RATE * delta));
    camera.lookAt(lookAtTarget.current);
  });

  return null;
}
