import { useMemo, useRef, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';
import { PHOTO_FLASH, PHOTO_HD_SETTLE } from './corridorPath';

/* ═══════════════════════════════════════════════════════════════
   IRIS PHOTO — the blur → FLASH → crystal-clear reveal.

   The spec, implemented literally:

   • Every photo loads FULLY VISIBLE with a heavy gaussian defocus
     (≈22px class) and slightly reduced contrast. Composition never
     changes — only clarity does.
   • When the DSLR's shutter fires for it (its clickT), the flash
     pops: pure white burst, bloom halo, a brief exposure glow.
   • AT THE PEAK of the flash the blur is removed INSTANTLY — the
     flash itself is the transition. No fade, no dissolve, no iris
     wipe, no image swap: one sample clock crosses zero and the
     sharp full-quality image is simply THERE, mid-flash.
   • Immediately after the reveal, a short HD settle enhances local
     contrast (fabric, jewelry, skin, flowers) before resting.

   The blur state is a function of TIME-SINCE-LOAD (photos sit blurred
   from birth), while the click timing stays a pure function of scroll
   t — scrubbing back and forth replays the same deterministic story.
   ═══════════════════════════════════════════════════════════════ */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  uniform float uTime;
  uniform float uSharp;      // 0 = waiting/blurred, 1 = clicked/clear
  uniform float uSeed;

  void main() {
    vUv = uv;
    vec3 pos = position;
    // Alive-at-rest: an almost imperceptible breathing so frames never
    // read as static textures. Scaled per-photo by seed.
    float breath = sin(uTime * 0.6 + uSeed) * 0.012 * (1.0 - uSharp * 0.5);
    pos.z += breath;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uSharp;      // 0 = fully blurred (waiting), 1 = crystal clear
  uniform float uFlash;      // 0 = quiet, 1 = flash burst at full brightness
  uniform float uHd;         // 0 = settled, 1 = right-after-reveal (HDR boost)
  uniform float uSeed;
  varying vec2 vUv;

  // ── TRUE DEFOCUS: separable 13-tap gaussian (x then y) — a real camera
  // out-of-focus look. uSharp crosses 0→1 in ONE frame at the flash peak.
  vec3 blurred(vec2 uv, float radius) {
    vec3 result = texture2D(uTexture, uv).rgb;
    if (radius >= 0.0005) {
      result += (texture2D(uTexture, uv + vec2(0.0, radius * 1.4118)) .rgb
              + texture2D(uTexture, uv - vec2(0.0, radius * 1.4118)) .rgb) * 0.2967931837316281;
      result += (texture2D(uTexture, uv + vec2(0.0, radius * 3.2942)) .rgb
              + texture2D(uTexture, uv - vec2(0.0, radius * 3.2942)) .rgb) * 0.0944565457367937;
      result += (texture2D(uTexture, uv + vec2(0.0, radius * 5.1766)) .rgb
              + texture2D(uTexture, uv - vec2(0.0, radius * 5.1766)) .rgb) * 0.0103813624011481;
      result += (texture2D(uTexture, uv + vec2(radius * 1.4118, 0.0)) .rgb
              + texture2D(uTexture, uv - vec2(radius * 1.4118, 0.0)) .rgb) * 0.14839659186581405;
      result += (texture2D(uTexture, uv + vec2(radius * 3.2942, 0.0)) .rgb
              + texture2D(uTexture, uv - vec2(radius * 3.2942, 0.0)) .rgb) * 0.04722827286839685;
      result += (texture2D(uTexture, uv + vec2(radius * 5.1766, 0.0)) .rgb
              + texture2D(uTexture, uv - vec2(radius * 5.1766, 0.0)) .rgb) * 0.00519068120057405;
    }
    return result;
  }

  // ── WARM CINEMATIC GRADE: gentle S-contrast, warm highlights, protected
  // skin-tone mids — the high-end film-frame look.
  vec3 grade(vec3 c) {
    c = mix(vec3(0.5), c, 1.24);
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 1.12);
    c *= vec3(1.05, 0.97, 0.93);
    return c;
  }

  // ── HD DETAIL SETTLE: local-contrast micro-boost (unsharp mask against the
  // heavy blur) that rides in just after the reveal — fabric weave, jewelry
  // facets, skin texture and decorative lights pop, then relax to natural.
  vec3 hdDetail(vec2 uv, vec3 base, float amount) {
    vec3 lo = blurred(uv, 0.006);
    return base + (base - lo) * amount;
  }

  void main() {
    vec2 uv = vUv;

    // Pre-click state: a LIGHT, elegant defocus — clearly "not taken yet"
    // without turning the frame to mush — and barely-touched contrast.
    float blurR = (1.0 - uSharp) * 0.0055;
    vec3 soft = blurred(uv, blurR);
    soft = mix(vec3(dot(soft, vec3(0.299, 0.587, 0.114))), soft, 0.92); // near-full contrast
    soft = grade(soft) * 0.97;

    vec3 sharp = grade(texture2D(uTexture, uv).rgb);
    // Perceptual crispness: a small PERMANENT unsharp so fabric/jewelry edges
    // always read tack-sharp, plus the stronger pulse that rides the reveal.
    sharp = hdDetail(uv, sharp, 0.28 + uHd * 0.55);

    // THE TRANSITION IS THE FLASH: uSharp crosses in a single frame, so this
    // mix snaps soft→sharp at the burst peak. No crossfade, no wipe.
    vec3 color = mix(soft, sharp, uSharp);

    // ── FLASH: pure white burst + warm bloom halo + exposure glow, 0.20s.
    float bloom = uFlash * uFlash;
    color = mix(color, vec3(1.12, 1.08, 1.0), bloom * 0.92);         // white core
    color += vec3(1.0, 0.92, 0.72) * uFlash * 0.35;                  // warm exposure glow
    color += vec3(0.9, 0.8, 0.55) * bloom * uFlash * 0.18;           // soft lens-flare wash

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
      uSharp: { value: 0 },
      uFlash: { value: 0 },
      uHd: { value: 0 },
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

    // A11Y: reduced motion — frames are static, sharp, no flash choreography.
    if (prefersReducedMotion) {
      drift.position.set(position[0], position[1], position[2]);
      drift.rotation.set(0, rotY, 0);
      breath.position.z = 0;
      mat.uniforms.uSharp.value = 1;
      mat.uniforms.uFlash.value = 0;
      mat.uniforms.uHd.value = 0;
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

    // ── THE CLICK SYNC — the flash itself is the transition:
    //   clickT − 0.055…clickT : the photo sits in heavy blur (22px class,
    //                           reduced contrast) — it holds this state from
    //                           birth, so late-arriving frames are already
    //                           "waiting to be taken"
    //   clickT (shutter)      : uFlash snaps to 1 (pure white burst) and
    //                           uSharp snaps to 1 IN THE SAME FRAME — the
    //                           image is crystal-clear at the flash's peak
    //   clickT…+PHOTO_FLASH   : burst decays (0.18–0.22s spec window)
    //   +PHOTO_FLASH…+HD      : uHd rides the HD detail settle, then rests
    const clickDelta = t - clickT;
    mat.uniforms.uSharp.value = clickDelta >= 0 ? 1 : 0;
    const flash = clickDelta >= 0 && clickDelta < PHOTO_FLASH ? Math.exp(-clickDelta / (PHOTO_FLASH * 0.34)) : 0;
    mat.uniforms.uFlash.value = flash;
    const hdRaw = THREE.MathUtils.clamp((clickDelta - PHOTO_FLASH) / PHOTO_HD_SETTLE, 0, 1);
    mat.uniforms.uHd.value = hdRaw < 1 ? Math.sin(hdRaw * Math.PI) : 0;
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
