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

   FRAMING FIX: at rest the corridor camera is already yawed a few
   degrees toward the spline's first waypoint — a straight-on plane
   slid right and left a black band. The plane now sits ON the rest
   view ray and turns to face the camera, so the photograph fills
   the viewport edge-to-edge. A top-biased crop (same idea as CSS
   object-position: center 30%) keeps the couple's faces in frame
   instead of cropping them off the top.
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
  uniform vec2 uCenter;     // image point (uv) held at screen center (the faces)
  uniform vec2 uScale;      // plane world size (w, h) — keeps the iris circular
  uniform float uRadius;    // world radius normalizer
  varying vec2 vUv;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);

    // ── APERTURE IRIS: same 6-blade hexagon as the corridor photos,
    // computed in WORLD units so it stays circular on any plane aspect.
    // At uOpen = 1 the hexagon's circumradius clears the corners.
    vec2 p = (vUv - uCenter) * uScale;
    float r = length(p) / uRadius;
    float ang = atan(p.y, p.x) + (1.0 - uOpen) * 0.55;
    float sector = mod(ang, 1.0471976) - 0.5235988;
    float edge = uOpen * 1.72 / max(cos(sector), 0.001);
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

// ── REST FRAMING ──
// The corridor camera rests at (0, 0.4, 10.5) looking a few degrees LEFT
// (toward the spline's first waypoint). These place the plane on that
// view ray, turned to face the lens, so the photo fills the viewport.
const REST_YAW = 0.15;   // rad — plane normal aimed back at the resting camera
const REST_X = -0.82;    // world x where the rest view ray crosses z = 5.1
const FOCUS_V = 0.62;    // image line (uv, from bottom) held at screen center — the faces
const OVERSCAN = 1.15;   // cover plus margin for pointer parallax

export default function HeroPhoto() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture('/gallery/webp/contact-img.webp');
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
    const camDist = 5.4; // camera z=10.5 → photo z=5.1
    const fov = (42 * Math.PI) / 180;
    const frustumH = 2 * camDist * Math.tan(fov / 2);
    const frustumW = frustumH * (size.width / size.height);
    const img = texture.image as HTMLImageElement | undefined;
    const aspect = img && img.width && img.height ? img.width / img.height : 0.8; // 1280×1600 fallback
    let w: number, h: number;
    if (frustumW / frustumH > aspect) {
      w = frustumW * OVERSCAN;
      h = w / aspect;
    } else {
      h = frustumH * OVERSCAN;
      w = h * aspect;
    }
    return { w, h };
  }, [size.width, size.height, texture]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uOpen: { value: 0 },
      uFade: { value: 1 },
      uCenter: { value: new THREE.Vector2(0.5, FOCUS_V) },
      uScale: { value: new THREE.Vector2(1, 1) },
      uRadius: { value: 1 },
    }),
    [texture]
  );

  // keep the iris circular as the plane resizes (frame-driven: applied in
  // useFrame below so it can never fall out of sync with the mesh scale)

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
    // iris geometry tracks the live scale (circular on any aspect, any zoom)
    mat.uniforms.uScale.value.set(fitted.w * zoom, fitted.h * zoom);
    mat.uniforms.uRadius.value = (Math.min(fitted.w, fitted.h) * zoom) / 2;
  });

  return (
    <mesh
      ref={meshRef}
      position={[REST_X, 0.35 - (FOCUS_V - 0.5) * fitted.h, 5.1]}
      rotation={[0, REST_YAW, 0]}
    >
      <planeGeometry args={[1, 1]} />
      <shaderMaterial ref={matRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} transparent depthWrite={false} />
    </mesh>
  );
}
