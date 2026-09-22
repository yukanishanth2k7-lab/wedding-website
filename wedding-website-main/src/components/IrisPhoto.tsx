import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';

/* ═══════════════════════════════════════════════════════════════
   IRIS PHOTO — the core reveal, replacing the old glass-shatter.

   The photo's whole life is driven by the distance between the
   VIEWER CAMERA and the photo:

     far         → the frame sits blurred (a 9-tap smear, "out of
                   focus" bokeh), slightly dark — waiting to be taken
     approaching → it drifts, tilts and rises into composition in
                   sync with scroll (shift/rotate per its seed)
     clickT      → the DSLR's shutter fires: rack-focus blur→sharp
                   exactly at the click, while an aperture-iris
                   wipe opens across the frame — blades retracting
                   from the edges like a lens iris
     passed      → stays sharp, breathing almost imperceptibly
   ═══════════════════════════════════════════════════════════════ */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uProgress;   // 0 = waiting/blurred, 1 = clicked/sharp
  uniform float uSeed;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Alive-at-rest: an almost imperceptible breathing so frames never
    // read as static textures. Scaled per-photo by seed.
    float breath = sin(uTime * 0.6 + uSeed) * 0.012 * (1.0 - uProgress * 0.5);
    pos.z += breath;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uProgress;   // 0 = blurred/waiting, 1 = clicked/sharp
  uniform float uIris;       // 0 = iris closed over frame, 1 = fully open
  uniform float uSeed;
  varying vec2 vUv;

  void main() {
    vec2 uv = vUv;

    // ── RACK FOCUS: 9-tap vertical smear whose radius collapses to 0
    // exactly as uProgress hits 1. The blur IS the pre-click state.
    float blurR = (1.0 - uProgress) * 0.012;
    vec4 sum = texture2D(uTexture, uv) * 0.30;
    sum += texture2D(uTexture, uv + vec2(0.0, blurR * 1.0)) * 0.14;
    sum += texture2D(uTexture, uv + vec2(0.0, blurR * 2.0)) * 0.10;
    sum += texture2D(uTexture, uv + vec2(0.0, blurR * 3.0)) * 0.06;
    sum += texture2D(uTexture, uv + vec2(0.0, blurR * 4.0)) * 0.03;
    sum += texture2D(uTexture, uv - vec2(0.0, blurR * 1.0)) * 0.14;
    sum += texture2D(uTexture, uv - vec2(0.0, blurR * 2.0)) * 0.10;
    sum += texture2D(uTexture, uv - vec2(0.0, blurR * 3.0)) * 0.06;
    sum += texture2D(uTexture, uv - vec2(0.0, blurR * 4.0)) * 0.03;
    vec4 texColor = sum;

    // HD grading (kept from the studio's look): contrast + warmth
    texColor.rgb = mix(vec3(0.5), texColor.rgb, 1.28);
    float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    texColor.rgb = mix(vec3(luminance), texColor.rgb, 1.18);
    texColor.rgb *= vec3(1.05, 0.97, 0.93);

    // ── APERTURE-IRIS WIPE: a 6-blade iris opening from a pinhole.
    // Each fragment computes its angle from center; the blade edge is
    // the hexagon's support radius. uIris: 0 = closed, 1 = open.
    vec2 p = uv - 0.5;
    float r = length(p) * 2.0;
    float ang = atan(p.y, p.x) + uIris * 0.35; // blades rotate as they open

    float blade = cos(mod(ang, 1.0471976) - 0.5235988); // 60° segments
    float bladeR = 0.55 / max(blade, 0.001);            // support radius

    float openR = bladeR * uIris * 1.4;
    float inIris = smoothstep(openR - 0.04, openR + 0.04, r);
    vec3 irisDark = vec3(0.055, 0.05, 0.045);

    vec3 color = mix(irisDark, texColor.rgb, inIris);

    // Before the click the whole frame sits slightly darker — "not taken yet"
    color *= mix(0.84, 1.0, uProgress);

    gl_FragColor = vec4(color, 1.0);
    #include <colorspace_fragment>
  }
`;

interface IrisPhotoProps {
  url: string;
  position: [number, number, number];
  rotY: number;
  width: number;
  seed: number;
  clickT: number;
}

export default function IrisPhoto({ url, position, rotY, width, seed, clickT }: IrisPhotoProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture(url);
  const gl = useThree((s) => s.gl);
  const prefersReducedMotion = useAppStore((s) => s.prefersReducedMotion);

  useEffect(() => {
    sharpenTexture(texture, gl);
  }, [texture, gl]);

  const aspect = useMemo(() => {
    const img = texture.image as HTMLImageElement | undefined;
    return img && img.width && img.height ? img.width / img.height : 3 / 2;
  }, [texture]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uIris: { value: 0 },
      uSeed: { value: seed },
    }),
    [texture, seed]
  );

  useFrame(({ camera, clock }) => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;

    const t = useAppStore.getState().scrollProgress;
    const time = clock.getElapsedTime();

    // A11Y: reduced motion — frames are static, sharp, no iris choreography.
    if (prefersReducedMotion) {
      mesh.position.set(position[0], position[1], position[2]);
      mesh.rotation.set(0, rotY, 0);
      mat.uniforms.uProgress.value = 1;
      mat.uniforms.uIris.value = 1;
      mat.uniforms.uTime.value = 0;
      return;
    }

    // Distance from the viewer camera to this photo drives the approach.
    const dist = camera.position.distanceTo(mesh.position as THREE.Vector3);
    const approach = 1 - THREE.MathUtils.smoothstep(dist, 4.0, 13.0);

    // DRIFT CHOREOGRAPHY (scroll-synced): the resting pose per seed drifts —
    // shift, tilt, roll — settling into composition as the approach completes.
    const settle = approach * approach * (3 - 2 * approach);
    const sway = Math.sin(seed * 1.13 + t * 9.0) * 0.35 * (1 - settle);
    const rise = Math.cos(seed * 0.71 + t * 7.0) * 0.4 * (1 - settle);
    const tilt = rotY + Math.sin(seed * 0.37 + t * 8.0) * 0.22 * (1 - settle);
    const roll = Math.cos(seed * 0.53 + t * 6.0) * 0.06 * (1 - settle);

    mesh.position.x = position[0] + sway;
    mesh.position.y = position[1] + rise;
    mesh.rotation.y = tilt;
    mesh.rotation.z = roll;

    // uProgress: the rack-focus. 0 until clickT, then eases over ~0.028 t.
    // (The DSLR's shutter reads the same threshold — sync is absolute.)
    const clickDelta = t - clickT;
    const raw = THREE.MathUtils.clamp(clickDelta / 0.028, 0, 1);
    mat.uniforms.uProgress.value = raw * raw * (3 - 2 * raw);
    mat.uniforms.uIris.value = THREE.MathUtils.clamp(clickDelta / 0.045, 0, 1);
    mat.uniforms.uTime.value = time;
  });

  return (
    <mesh ref={meshRef} position={position} rotation={[0, rotY, 0]} scale={[width, width / aspect, 1]}>
      <planeGeometry args={[1, 1, 1, 1]} />
      <shaderMaterial ref={matRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
    </mesh>
  );
}
