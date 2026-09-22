import { useMemo, useRef, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';

/* ═══════════════════════════════════════════════════════════════
   HERO PHOTO — full-screen cover photo facing the viewer at load.

   The site's transition language is the APERTURE, so the hero
   speaks it too: on load the photo develops through a hexagonal
   lens-iris opening from the center (0 → open over ~1.6s), and as
   you scroll the same iris CLOSES (blades sweeping shut) while the
   photo gently pushes in — the lens capping before the corridor
   opens up behind it. No flash, no plain zoom, no shatter.
   ═══════════════════════════════════════════════════════════════ */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uOpen;      // 0 = iris shut, 1 = fully open
  uniform float uFade;      // overall dim before fully shut
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);

    // ── APERTURE IRIS: same 6-blade hexagon as the corridor photos.
    // At uOpen = 1 the hexagon's circumradius clears the corners.
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;
    float ang = atan(p.y, p.x) + (1.0 - uOpen) * 0.55;
    float sector = mod(ang, 1.0471976) - 0.5235988;
    float edge = uOpen * 1.62 / max(cos(sector), 0.001);
    float inside = smoothstep(edge, edge - 0.04, r);
    // a gold glint rides the blade edge while the iris moves
    float edgeGlow = smoothstep(0.07, 0.0, abs(r - edge)) * uOpen * (1.0 - uOpen) * 4.0;

    vec3 color = tex.rgb * inside;
    color += vec3(0.83, 0.68, 0.35) * edgeGlow * 0.4;

    // outside the blades: the dark lens barrel, with a faint gold ring
    vec3 barrel = vec3(0.035, 0.033, 0.03) + vec3(0.16, 0.13, 0.06) * smoothstep(1.05, 0.75, r) * (1.0 - uOpen);
    color = mix(barrel, color, inside);

    gl_FragColor = vec4(color * uFade, 1.0);
    #include <colorspace_fragment>
  }
`;

export default function HeroPhoto() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture('/gallery/wedding-1.jpg');
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const prefersReducedMotion = useAppStore((s) => s.prefersReducedMotion);

  // LOAD: open the iris shortly after mount (after the loader clears)
  const [bornAt] = useState(() => performance.now());

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

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uOpen: { value: 0 },
      uFade: { value: 1 },
    }),
    [texture]
  );

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const t = useAppStore.getState().scrollProgress;

    // LOAD: iris opens from shut over ~1.6s (reduced motion: instantly open)
    const elapsed = (performance.now() - bornAt) / 1000;
    const loadOpen = prefersReducedMotion
      ? 1
      : THREE.MathUtils.clamp((elapsed - 0.35) / 1.6, 0, 1);
    const openEased = loadOpen * loadOpen * (3 - 2 * loadOpen);

    // SCROLL: the iris closes over the first 11% of scroll (blades shut),
    // with a gentle push-in (max 6%, much quieter than the old zoom)
    const scrollShut = THREE.MathUtils.smoothstep(t, 0.02, 0.11);
    const open = openEased * (1 - scrollShut);

    mat.uniforms.uOpen.value = open;
    mat.uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(t, 0.09, 0.125);
    mesh.visible = mat.uniforms.uFade.value > 0.01;
    const zoom = 1 + THREE.MathUtils.smoothstep(t, 0, 0.12) * 0.06;
    mesh.scale.set(fitted.w * zoom, fitted.h * zoom, 1);
  });

  return (
    <mesh ref={meshRef} position={[0, 0.35, 5.1]}>
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={matRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
}
