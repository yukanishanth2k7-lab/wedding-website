import { useFrame, useThree } from '@react-three/fiber';
import { useRef } from 'react';
import * as THREE from 'three';
import { useAppStore, usePrefersReducedMotion } from '../store';
import { corridorCurve } from './corridorPath';

// PERF: read the store inside the frame loop (getState), NOT via a component
// subscription — a subscription re-renders this component ~60x/s during scroll.

/* CORRIDOR FLIGHT — the viewer's camera. It flies THE SAME spline as the working
   DSLR (DslrCamera), a fixed breath behind it: you follow the photographer
   down the corridor while they work the frames ahead of you. Look-at leads
   slightly ahead on the curve with a damped re-frame — weighted, never snappy.
   Gentle pointer parallax keeps the frame alive; reduced motion gets 1:1. */
export default function CameraRig() {
  const { camera } = useThree();
  const prefersReducedMotion = usePrefersReducedMotion();
  const lookAtTarget = useRef(new THREE.Vector3(0, 0.35, 5));
  const scrollProgressSmoothed = useRef(0);
  const pointer = useThree((s) => s.pointer);

  useFrame((_state, delta) => {
    const scrollProgress = useAppStore.getState().scrollProgress;
    // Feather the scroll response (Lenis already smooths; this is the glide).
    // Tighter lambda than before: the 3D must track the DOM, not trail it —
    // the double-smoothing lag read as "scrolling doesn't respond".
    scrollProgressSmoothed.current = prefersReducedMotion
      ? scrollProgress
      : THREE.MathUtils.damp(scrollProgressSmoothed.current, scrollProgress, 5.5, delta);
    const t = scrollProgressSmoothed.current;

    // Ride the corridor, a breath behind the DSLR's lead of 0.045
    const viewerT = Math.max(t - 0.01, 0);
    const p = corridorCurve.getPointAt(viewerT);
    camera.position.set(
      p.x + (prefersReducedMotion ? 0 : pointer.x * 0.28),
      p.y + (prefersReducedMotion ? 0 : pointer.y * 0.16),
      p.z
    );

    // Look slightly ahead on the curve — the "opera glass" re-frame
    const ahead = corridorCurve.getPointAt(Math.min(viewerT + 0.05, 1));
    const blended = prefersReducedMotion
      ? ahead
      : lookAtTarget.current.lerp(ahead, 1 - Math.exp(-2.6 * delta));
    camera.lookAt(blended);
    if (prefersReducedMotion) lookAtTarget.current.copy(ahead);
  });

  return null;
}
