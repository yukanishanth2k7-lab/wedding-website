import { useMemo, useRef, useState, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';

/* ═══════════════════════════════════════════════════════════════
   HERO PHOTO — blur → FLASH → crystal clear, the spec verbatim.

   LOAD: the photograph sits fully visible but with a heavy gaussian
   defocus (≈22px class) and slightly reduced contrast. After ~1.05s
   a DSLR flash fires (the working camera is off-stage deep in the
   corridor — the burst reads as light from outside the frame, like
   a real photographer's flash): pure white burst + warm bloom +
   brief exposure glow, 0.20s. AT THE FLASH PEAK the blur is removed
   instantly — no fade, no dissolve, no image swap; the flash itself
   is the transition. A short HD detail settle (fabric, jewelry,
   skin, decorative lights) rides in right after, then rests.

   SCROLL: unchanged behavior — the photo pushes in ~6% and fades as
   the corridor takes over. Framing: the plane sits on the resting
   camera's view ray (rest yaw + offset) so it fills the viewport
   edge-to-edge, faces held in frame by the top-biased crop.
   ═══════════════════════════════════════════════════════════════ */

const FLASH_AT = 1.05;   // spec: 0.8–1.2s after load
const FLASH_LEN = 0.2;   // spec: 0.18–0.22s burst
const HD_LEN = 0.55;     // HD detail settle after the burst

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uSharp;   // 0 = blurred (waiting), 1 = crystal clear (snaps in one frame)
  uniform float uFlash;   // 0 = quiet, 1 = flash burst at full brightness
  uniform float uHd;      // HD detail settle pulse, 0 → 1 → 0 after the reveal
  uniform float uFade;    // overall dim on scroll-out
  varying vec2 vUv;

  // TRUE DEFOCUS: separable 13-tap gaussian — a real out-of-focus look.
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

  // WARM CINEMATIC GRADE: gentle S-contrast, warm highlights, natural skin.
  vec3 grade(vec3 c) {
    c = mix(vec3(0.5), c, 1.24);
    float l = dot(c, vec3(0.299, 0.587, 0.114));
    c = mix(vec3(l), c, 1.12);
    c *= vec3(1.05, 0.97, 0.93);
    return c;
  }

  // HD DETAIL SETTLE: local-contrast micro-boost after the reveal.
  vec3 hdDetail(vec2 uv, vec3 base, float amount) {
    vec3 lo = blurred(uv, 0.005);
    return base + (base - lo) * amount;
  }

  void main() {
    vec2 uv = vUv;

    // waiting state: LIGHT elegant defocus + barely-reduced contrast —
    // clearly "not taken yet" without reading as mush.
    float blurR = (1.0 - uSharp) * 0.0032;
    vec3 soft = blurred(uv, blurR);
    soft = mix(vec3(dot(soft, vec3(0.299, 0.587, 0.114))), soft, 0.92);
    soft = grade(soft) * 0.97;

    vec3 sharp = grade(texture2D(uTexture, uv).rgb);
    sharp = hdDetail(uv, sharp, 0.28 + uHd * 0.55);

    // THE FLASH IS THE TRANSITION: uSharp snaps 0→1 at the burst peak.
    vec3 color = mix(soft, sharp, uSharp);

    // pure white burst + warm bloom halo + exposure glow + flare wash
    float bloom = uFlash * uFlash;
    color = mix(color, vec3(1.12, 1.08, 1.0), bloom * 0.92);
    color += vec3(1.0, 0.92, 0.72) * uFlash * 0.35;
    color += vec3(0.9, 0.8, 0.55) * bloom * uFlash * 0.18;

    gl_FragColor = vec4(color * uFade, 1.0);
    #include <colorspace_fragment>
  }
`;

// ── REST FRAMING ── the plane sits on the resting camera's view ray
const REST_YAW = 0.15;
const REST_X = -0.82;
const FOCUS_V = 0.60;  // image line (uv, from bottom) held mid-screen — the couple
const OVERSCAN = 1.15;

export default function HeroPhoto() {
  const meshRef = useRef<THREE.Mesh>(null);
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const texture = useTexture('/gallery/wedding-2.jpg'); // 4th luxeweddings gallery frame, full-quality original
  const gl = useThree((s) => s.gl);
  const size = useThree((s) => s.size);
  const prefersReducedMotion = useAppStore((s) => s.prefersReducedMotion);

  // LOAD CLOCK: the blur → flash → clear sequence is time-based from mount
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
    const aspect = img && img.width && img.height ? img.width / img.height : 0.667; // wedding-2: 1200×1800
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
      uSharp: { value: 0 },
      uFlash: { value: 0 },
      uHd: { value: 0 },
      uFade: { value: 1 },
    }),
    [texture]
  );

  useFrame(() => {
    const mesh = meshRef.current;
    const mat = matRef.current;
    if (!mesh || !mat) return;
    const t = useAppStore.getState().scrollProgress;

    // ── THE LOAD SEQUENCE (time-based; reduced motion: sharp immediately) ──
    if (prefersReducedMotion) {
      mat.uniforms.uSharp.value = 1;
      mat.uniforms.uFlash.value = 0;
      mat.uniforms.uHd.value = 0;
    } else {
      const e = (performance.now() - bornAt) / 1000;
      mat.uniforms.uSharp.value = e >= FLASH_AT ? 1 : 0;
      const fd = e - FLASH_AT;
      mat.uniforms.uFlash.value = fd >= 0 && fd < FLASH_LEN ? Math.exp(-fd / (FLASH_LEN * 0.34)) : 0;
      const hd = THREE.MathUtils.clamp((fd - FLASH_LEN) / HD_LEN, 0, 1);
      mat.uniforms.uHd.value = hd < 1 ? Math.sin(hd * Math.PI) : 0;
    }

    // ── SCROLL OUT: quiet push-in + fade (unchanged behavior) ──
    mat.uniforms.uFade.value = 1 - THREE.MathUtils.smoothstep(t, 0.09, 0.125);
    mesh.visible = mat.uniforms.uFade.value > 0.01;
    const zoom = 1 + THREE.MathUtils.smoothstep(t, 0, 0.12) * 0.06;
    mesh.scale.set(fitted.w * zoom, fitted.h * zoom, 1);
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
