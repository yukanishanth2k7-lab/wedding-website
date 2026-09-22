import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';

/* ═══════════════════════════════════════════════════════════════
   HERO PHOTO — full-screen cover photo facing the viewer at load.
   Replaces the old shatter plane: as you scroll the first beats,
   the photo pushes IN slightly (a slow, confident zoom) and fades
   as the corridor opens up behind it. No glass, no flash — just a
   quiet dissolve into depth.
   ═══════════════════════════════════════════════════════════════ */

export default function HeroPhoto() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useTexture('/gallery/wedding-1.jpg');
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);

  useEffect(() => {
    sharpenTexture(texture, gl);
  }, [texture, gl]);

  // object-fit: cover sizing against the camera frustum at the photo's plane
  const fitted = useMemo(() => {
    const camDist = 5.4; // camera z=10.5(ish) → photo z=5.1
    const fov = (42 * Math.PI) / 180;
    const h = 2 * camDist * Math.tan(fov / 2);
    const w = h * (size.width / size.height);
    const img = texture.image as HTMLImageElement | undefined;
    const aspect = img && img.width && img.height ? img.width / img.height : 3 / 2;
    const cover = Math.max(w / aspect, h) * 1.06; // 6% overscan
    return { w: cover * aspect, h: cover };
  }, [size.width, size.height, texture]);

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const t = useAppStore.getState().scrollProgress;
    // Zoom: 1 → 1.12 over the first 12% of scroll
    const zoom = 1 + THREE.MathUtils.smoothstep(t, 0, 0.12) * 0.12;
    mesh.scale.set(fitted.w * zoom, fitted.h * zoom, 1);
    // Fade out over 4% → 12% as the corridor takes over
    mat.opacity = 1 - THREE.MathUtils.smoothstep(t, 0.04, 0.12);
    mesh.visible = mat.opacity > 0.01;
  });

  return (
    <mesh ref={meshRef} position={[0, 0.35, 5.1]}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial ref={matRef} map={texture} toneMapped={false} transparent depthWrite={false} />
    </mesh>
  );
}
