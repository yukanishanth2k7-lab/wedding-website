import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';
import { PHOTO_SHARPEN, PHOTO_IRIS, PHOTO_FLASH } from './corridorPath';

/* ═══════════════════════════════════════════════════════════════
   IRIS PHOTO — the core reveal.

   Each frame is a hung print (gold rim + dark matte + photo) sized
   to the photo's REAL aspect ratio, and the whole assembly drifts
   as one piece. The photo's life is driven by the scroll t against
   its clickT (the moment the DSLR's shutter fires for it):

     before click → visible but defocused (true 2D gaussian blur),
                    slightly dimmed — "not taken yet"
     click        → a hexagonal aperture-iris of SHARPNESS sweeps
                    open from the center while the focus racks —
                    inside the blades: sharp; outside: still soft;
                    when fully open the whole frame is crisp
     after        → stays sharp, breathing almost imperceptibly

   Everything is a pure function of (t − clickT), so scrubbing the
   page back and forth never desyncs blur from the shutter.
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
  uniform float uIris;       // 0 = iris not yet opened, 1 = fully open
  uniform float uFlash;      // 0 = quiet, 1 = flash burst at full brightness
  uniform float uSeed;
  varying vec2 vUv;

  // ── TRUE DEFOCUS: separable 13-tap gaussian (x then y) — a real
  // out-of-focus look, not a directional smear. Radius collapses to 0
  // exactly as uProgress hits 1.
  vec3 blurred(vec2 uv, float radius) {
    // init at declaration (single assignment path — keeps HLSL translators happy)
    vec3 result = texture2D(uTexture, uv).rgb;
    if (radius >= 0.0005) {
      result += (texture2D(uTexture, uv + vec2(0.0, radius * 1.4118)) .rgb
              + texture2D(uTexture, uv - vec2(0.0, radius * 1.4118)) .rgb) * 0.2967931837316281;
      result += (texture2D(uTexture, uv + vec2(0.0, radius * 3.2942)) .rgb
              + texture2D(uTexture, uv - vec2(0.0, radius * 3.2942)) .rgb) * 0.0944565457367937;
      result += (texture2D(uTexture, uv + vec2(0.0, radius * 5.1766)) .rgb
              + texture2D(uTexture, uv - vec2(0.0, radius * 5.1766)) .rgb) * 0.0103813624011481;
      // horizontal taps (halved weight — one cheap combined 2-pass blur)
      result += (texture2D(uTexture, uv + vec2(radius * 1.4118, 0.0)) .rgb
              + texture2D(uTexture, uv - vec2(radius * 1.4118, 0.0)) .rgb) * 0.14839659186581405;
      result += (texture2D(uTexture, uv + vec2(radius * 3.2942, 0.0)) .rgb
              + texture2D(uTexture, uv - vec2(radius * 3.2942, 0.0)) .rgb) * 0.04722827286839685;
      result += (texture2D(uTexture, uv + vec2(radius * 5.1766, 0.0)) .rgb
              + texture2D(uTexture, uv - vec2(radius * 5.1766, 0.0)) .rgb) * 0.00519068120057405;
    }
    return result;
  }

  // ── HD grading (the studio's look): contrast + warmth
  vec3 grade(vec3 c) {
    c = mix(vec3(0.5), c, 1.24);
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 1.12);
    c *= vec3(1.05, 0.97, 0.93);
    return c;
  }

  void main() {
    vec2 uv = vUv;
    float blurR = (1.0 - uProgress) * 0.012;

    vec3 soft = grade(blurred(uv, blurR));
    vec3 sharp = grade(texture2D(uTexture, uv).rgb);

    // ── APERTURE-IRIS WIPE: a 6-blade hexagonal iris of SHARPNESS
    // opening from the center over the blurred print. The hexagon's
    // inradius scales with uIris; at uIris = 1 its circumradius
    // (1.62 / cos 30° ≈ 1.87) clears the frame corners (r ≈ 1.41).
    vec2 p = uv - 0.5;
    float r = length(p) * 2.0;
    float ang = atan(p.y, p.x) + (1.0 - uIris) * 0.55; // blades rotate as they open
    float sector = mod(ang, 1.0471976) - 0.5235988;    // −30°..30° within a blade segment
    float edge = uIris * 1.62 / max(cos(sector), 0.001);

    float inside = smoothstep(edge, edge - 0.05, r);
    // soft gold hairline rides the blade edge while the iris is moving
    float edgeGlow = smoothstep(0.06, 0.0, abs(r - edge)) * uIris * (1.0 - uIris) * 4.0;

    vec3 color = mix(soft, sharp, inside);
    color += vec3(0.83, 0.68, 0.35) * edgeGlow * 0.35;

    // ── FLASH WASH: the DSLR's speedlight fires at the click. The burst
    // floods the frame with warm light and decays — the photograph
    // "catches the light" as it's taken. Alive before the click too: the
    // frame sits readable (light blur, gentle lift) rather than muddy.
    float flashLift = uFlash * (0.75 + 0.25 * inside);
    color = mix(color, vec3(1.06, 1.0, 0.9), flashLift * 0.82);
    color += flashLift * 0.28;
    color *= mix(0.94, 1.0, uProgress);

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

/* Frame proportions: gold rim / dark matte extend this far beyond the
   photo on each side (world units). Scaled to the photo's real aspect. */
const MAT = 0.07;
const RIM = 0.11;

export default function IrisPhoto({ url, position, rotY, width, seed, clickT }: IrisPhotoProps) {
  const driftRef = useRef<THREE.Group>(null);   // scroll drift (whole assembly)
  const breathRef = useRef<THREE.Group>(null);  // idle breathing
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture(url);
  const gl = useThree((s) => s.gl);
  const prefersReducedMotion = useAppStore((s) => s.prefersReducedMotion);

  useEffect(() => {
    sharpenTexture(texture, gl);
  }, [texture, gl]);

  // REAL aspect ratio → the photo fills its frame, no stretching, no crop
  const aspect = useMemo(() => {
    const img = texture.image as HTMLImageElement | undefined;
    return img && img.width && img.height ? img.width / img.height : 3 / 2;
  }, [texture]);

  const photoH = width / aspect;

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uIris: { value: 0 },
      uFlash: { value: 0 },
      uSeed: { value: seed },
    }),
    [texture, seed]
  );

  useFrame(({ camera, clock }) => {
    const drift = driftRef.current;
    const breath = breathRef.current;
    const mat = matRef.current;
    if (!drift || !breath || !mat) return;

    const t = useAppStore.getState().scrollProgress;
    const time = clock.getElapsedTime();

    // A11Y: reduced motion — frames are static, sharp, no iris choreography.
    if (prefersReducedMotion) {
      drift.position.set(position[0], position[1], position[2]);
      drift.rotation.set(0, rotY, 0);
      breath.position.z = 0;
      mat.uniforms.uProgress.value = 1;
      mat.uniforms.uIris.value = 1;
      mat.uniforms.uFlash.value = 0;
      mat.uniforms.uTime.value = 0;
      return;
    }

    // Distance from the viewer camera to this photo drives the approach.
    const dist = camera.position.distanceTo(drift.position as THREE.Vector3);
    const approach = 1 - THREE.MathUtils.smoothstep(dist, 4.0, 13.0);

    // DRIFT CHOREOGRAPHY (scroll-synced): the resting pose per seed drifts —
    // shift, tilt, roll — settling into composition as the approach completes.
    const settle = approach * approach * (3 - 2 * approach);
    const sway = Math.sin(seed * 1.13 + t * 9.0) * 0.35 * (1 - settle);
    const rise = Math.cos(seed * 0.71 + t * 7.0) * 0.4 * (1 - settle);
    const tilt = rotY + Math.sin(seed * 0.37 + t * 8.0) * 0.22 * (1 - settle);
    const roll = Math.cos(seed * 0.53 + t * 6.0) * 0.06 * (1 - settle);

    drift.position.x = position[0] + sway;
    drift.position.y = position[1] + rise;
    drift.rotation.y = tilt;
    drift.rotation.z = roll;
    breath.position.z = Math.sin(time * 0.6 + seed) * 0.012;

    // ── THE CLICK SYNC: both the rack-focus AND the iris are pure functions
    // of (t − clickT) — the exact moment the DSLR's shutter fires.
    const clickDelta = t - clickT;
    const raw = THREE.MathUtils.clamp(clickDelta / PHOTO_SHARPEN, 0, 1);
    mat.uniforms.uProgress.value = raw * raw * (3 - 2 * raw);
    const rawIris = THREE.MathUtils.clamp(clickDelta / PHOTO_IRIS, 0, 1);
    mat.uniforms.uIris.value = rawIris * rawIris * (3 - 2 * rawIris);
    // ── FLASH: a hard attack / exponential decay burst at the click.
    // Peaking exactly when the shutter fires, dying out over PHOTO_FLASH.
    const flash = clickDelta >= 0 && clickDelta < PHOTO_FLASH ? Math.exp(-clickDelta / (PHOTO_FLASH * 0.3)) : 0;
    mat.uniforms.uFlash.value = flash;
    mat.uniforms.uTime.value = time;
  });

  return (
    <group ref={driftRef} position={position} rotation={[0, rotY, 0]}>
      <group ref={breathRef}>
        {/* the photo — fills its plane at the image's true aspect */}
        <mesh scale={[width, photoH, 1]}>
          <planeGeometry args={[1, 1]} />
          <shaderMaterial ref={matRef} vertexShader={vertexShader} fragmentShader={fragmentShader} uniforms={uniforms} />
        </mesh>
        {/* dark matte, just behind the print */}
        <mesh position={[0, 0, -0.02]} scale={[width + MAT * 2, photoH + MAT * 2, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#0c0c0d" metalness={0.6} roughness={0.4} />
        </mesh>
        {/* champagne-gold rim behind the matte */}
        <mesh position={[0, 0, -0.035]} scale={[width + RIM * 2, photoH + RIM * 2, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.35} />
        </mesh>
      </group>
    </group>
  );
}
