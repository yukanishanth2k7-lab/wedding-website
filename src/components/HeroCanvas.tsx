import { useMemo, useRef, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';

/* HERO 3D — true layered-depth cinematic scene (hero-only; speaks the site's language:
   damped film-camera rig like CameraRig, instanced additive dust like ParticleDust,
   ACES + sRGB + max-anisotropy textures, slow luxury damping everywhere).

   TRUE DEPTH: the photograph is split into co-registered planes — the full photo on
   the couple layer, pre-blurred atmosphere/venue plate behind, a mirrored & blurred
   "veil/dress" wash in front of the couple plane, and floral cards in the extreme
   foreground. All share the same optical center, so the camera can travel *through*
   them and the image reads as one photo pulled apart into 3D.

   SCROLL (hero-local 0→1, from the Hero section's own scroll-out):
   0–20%  push-in, particles flow toward the lens, rays rotate
   20–45% photo splits into depth (couple anchored, flowers faster, bg slower)
   45–70% camera travels through the photo, bokeh crosses the lens, richer rays
   70–100% layers peel away in Z; sandal veil (Hero.css) reveals the next section */

const EASE = 2.4; // shared exponential-damping rate — luxury film-camera inertia

const heroVtx = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

/* Photo fragment: gentle vignette + maroon ambient tint to marry the photo into
   the site's palette (deep maroon ambient tones), sRGB re-encode for ACES. */
const heroFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uOpacity;
  uniform float uSplit;   // 0..1 how far this layer has peeled in Z
  varying vec2 vUv;

  void main() {
    // Subtle depth-driven zoom of UVs so peeling layers keep optical coherence
    vec2 uv = (vUv - 0.5) * (1.0 - uSplit * 0.06) + 0.5;
    vec4 tex = texture2D(uMap, uv);

    // Elegant vignette + whisper of maroon ambient
    float vig = smoothstep(1.25, 0.35, distance(vUv, vec2(0.5)));
    vec3 col = tex.rgb * mix(0.82, 1.0, vig);
    col += vec3(0.09, 0.015, 0.025) * (1.0 - vig);

    gl_FragColor = vec4(col, tex.a * uOpacity);
    #include <colorspace_fragment>
  }
`;

function makePhotoMaterial(map: THREE.Texture, opacity: number) {
  return new THREE.ShaderMaterial({
    uniforms: {
      uMap: { value: map },
      uOpacity: { value: opacity },
      uSplit: { value: 0 },
    },
    vertexShader: heroVtx,
    fragmentShader: heroFrag,
    transparent: true,
  });
}

/* Film camera: hero-phase dolly + ≤4° mouse orbit, all exponentially damped */
function CameraRig() {
  const { camera } = useThree();
  const heroProgress = useAppStore((s) => s.heroProgress);
  const pos = useRef(new THREE.Vector3(0, 0, 7.4));
  const look = useRef(new THREE.Vector3());
  const target = useRef(new THREE.Vector3());

  useFrame((state, delta) => {
    const t = heroProgress;
    // 0–20%: tiny push-in; 45–70%: travel THROUGH the photo; 70–100%: past it
    const push = Math.min(t / 0.2, 1);
    const through = THREE.MathUtils.clamp((t - 0.45) / 0.25, 0, 1);
    const peel = THREE.MathUtils.clamp((t - 0.7) / 0.3, 0, 1);
    const z = 7.4 - push * 1.6 - through * 2.6 + peel * 1.2;
    const y = 0.1 + through * 0.15 - peel * 0.1;
    target.current.set(0, y, z);

    // Mouse: cinematic ≤4° virtual camera (0.38 rad-ish offsets ≈ 4° at this distance)
    const mx = (state.pointer.x || 0) * 0.38;
    const my = (state.pointer.y || 0) * 0.22;

    pos.current.x = THREE.MathUtils.damp(pos.current.x, target.current.x + mx, EASE, delta);
    pos.current.y = THREE.MathUtils.damp(pos.current.y, target.current.y + my, EASE, delta);
    pos.current.z = THREE.MathUtils.damp(pos.current.z, target.current.z, EASE, delta);
    camera.position.copy(pos.current);

    look.current.x = THREE.MathUtils.damp(look.current.x, mx * 0.55, EASE, delta);
    look.current.y = THREE.MathUtils.damp(look.current.y, my * 0.55, EASE, delta);
    camera.lookAt(look.current);
  });
  return null;
}

/* Full-resolution couple layer (primary). Anchored; gains subtle veil breathing. */
function CoupleLayer() {
  const map = useTexture('/gallery/wedding-1.jpg');
  const gl = useThree((s) => s.gl);
  useMemo(() => sharpenTexture(map, gl), [map, gl]);
  const mat = useMemo(() => makePhotoMaterial(map, 1), [map]);

  const ref = useRef<THREE.Mesh>(null);
  const heroProgress = useAppStore((s) => s.heroProgress);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = heroProgress;
    // Couple stays anchored until 70%, then eases slightly toward the lens (peel)
    const peel = THREE.MathUtils.clamp((t - 0.7) / 0.3, 0, 1);
    mat.uniforms.uSplit.value = peel;
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, peel * 1.4, EASE, delta);
    // Hair/veil alive: whisper of motion
    ref.current.position.y = Math.sin(state.clock.elapsedTime * 0.4) * 0.012;
  });

  return (
    <mesh ref={ref} material={mat}>
      <planeGeometry args={[6.7, 6.7]} />
    </mesh>
  );
}

/* Venue/atmosphere layer — pre-blurred plate, co-registered; separates early and
   drifts back through the whole sequence (slower than foreground = depth). */
function VenueLayer() {
  const map = useTexture('/gallery/hero/bg-atmosphere.jpg');
  const gl = useThree((s) => s.gl);
  useMemo(() => sharpenTexture(map, gl), [map, gl]);
  const mat = useMemo(() => makePhotoMaterial(map, 0.96), [map]);

  const ref = useRef<THREE.Mesh>(null);
  const heroProgress = useAppStore((s) => s.heroProgress);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((_state, delta) => {
    if (!ref.current) return;
    const t = heroProgress;
    const split = Math.min(t / 0.45, 1); // 0–45%: the photograph splits into depth
    mat.uniforms.uSplit.value = split;
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, -4.2 - split * 3.4, EASE, delta);
    ref.current.position.x = THREE.MathUtils.damp(ref.current.position.x, split * 0.9, EASE, delta);
  });

  return (
    <mesh ref={ref} position={[0, 0, -4.2]} material={mat}>
      <planeGeometry args={[14, 9.4]} />
    </mesh>
  );
}

/* Veil/dress layer — a mirrored, heavily blurred wash just in FRONT of the couple
   plane; reads as the veil catching depth. Moves opposite to background. */
function VeilLayer() {
  const map = useTexture('/gallery/hero/floral-left.jpg');
  const gl = useThree((s) => s.gl);
  useMemo(() => sharpenTexture(map, gl), [map, gl]);
  const mat = useMemo(() => makePhotoMaterial(map, 0.28), [map]);

  const ref = useRef<THREE.Mesh>(null);
  const heroProgress = useAppStore((s) => s.heroProgress);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = heroProgress;
    const through = THREE.MathUtils.clamp((t - 0.45) / 0.25, 0, 1);
    mat.uniforms.uSplit.value = through;
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, 1.1 + through * 1.8, EASE, delta);
    ref.current.position.x = 1.5 + Math.sin(state.clock.elapsedTime * 0.3) * 0.08;
  });

  return (
    <mesh ref={ref} position={[1.5, 0.2, 1.1]} material={mat}>
      <planeGeometry args={[5.4, 5.4]} />
    </mesh>
  );
}

/* Floral foreground — independent fast-moving depth cards */
function FloralCard({ url, position, rot, flip }: {
  url: string;
  position: [number, number, number];
  rot: number;
  flip?: boolean;
}) {
  const map = useTexture(url);
  const gl = useThree((s) => s.gl);
  useMemo(() => sharpenTexture(map, gl), [map, gl]);
  const mat = useMemo(() => makePhotoMaterial(map, 0.94), [map]);

  const ref = useRef<THREE.Mesh>(null);
  const heroProgress = useAppStore((s) => s.heroProgress);

  useEffect(() => () => mat.dispose(), [mat]);

  useFrame((state, delta) => {
    if (!ref.current) return;
    const t = heroProgress;
    // Foreground moves FASTER than everything (20%+ begins, strongest through 70%)
    const fast = THREE.MathUtils.clamp((t - 0.2) / 0.5, 0, 1);
    const dir = position[0] < 0 ? -1 : 1;
    mat.uniforms.uSplit.value = fast;
    ref.current.position.z = THREE.MathUtils.damp(ref.current.position.z, position[2] + fast * dir * 2.4, EASE, delta);
    ref.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 0.5 + position[0]) * 0.07;
    ref.current.rotation.z = rot + Math.sin(state.clock.elapsedTime * 0.3) * 0.02;
    if (flip) ref.current.scale.x = -1;
  });

  return (
    <mesh ref={ref} position={position} rotation={[0, 0, rot]} material={mat}>
      <planeGeometry args={[2.7, 3.4]} />
    </mesh>
  );
}

/* Thousands of gold particles — one instanced draw call, soft-glow sprite, natural
   non-looping motion, flowing TOWARD the lens; depth-aware sizes. */
function GoldDust({ count = 2200 }: { count?: number }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const heroProgress = useAppStore((s) => s.heroProgress);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  const { seeds, sprite } = useMemo(() => {
    // Soft radial glow sprite (canvas-generated, no asset dependency)
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255, 236, 190, 1)');
    g.addColorStop(0.35, 'rgba(228, 190, 110, 0.65)');
    g.addColorStop(1, 'rgba(212, 175, 55, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const seeds = Array.from({ length: count }, (_, i) => ({
      x: (((i * 37) % 97) / 97) * 15 - 7.5,
      y: (((i * 53) % 89) / 89) * 9 - 4.5,
      z: (((i * 11) % 83) / 83) * 7 - 2.5, // spans behind → in front of the couple plane
      speed: 0.12 + (((i * 7) % 13) / 13) * 0.3,
      drift: (((i * 17) % 11) / 11 - 0.5) * 0.5,
      offset: (i * 1.73) % (Math.PI * 2),
      scale: 0.02 + (((i * 29) % 17) / 17) * 0.055, // different sizes
    }));
    return { seeds, sprite: tex };
  }, [count]);

  useEffect(() => () => sprite.dispose(), [sprite]);

  useFrame((state) => {
    if (!mesh.current) return;
    const t = heroProgress;
    // Particles flow toward the viewer from 0% and accelerate through the split
    const flow = 0.8 + Math.min(t / 0.45, 1) * 1.6;
    const time = state.clock.elapsedTime * flow;
    for (let i = 0; i < count; i++) {
      const s = seeds[i];
      // Deterministic pseudo-random motion (no looping pattern), plus a slow
      // toward-camera drift that spans the depth of the whole layer stack
      const towardCam = (time * 0.12 + s.offset) % 9; // wraps naturally, non-obvious
      dummy.position.set(
        s.x + Math.cos(time * s.speed + s.offset) * 0.4 + s.drift * Math.sin(time * 0.1),
        s.y + Math.sin(time * s.speed * 0.75 + s.offset) * 0.95,
        s.z + towardCam - 1
      );
      dummy.scale.setScalar(s.scale * (0.8 + 0.35 * Math.sin(time * 1.7 + s.offset)));
      dummy.updateMatrix();
      mesh.current.setMatrixAt(i, dummy.matrix);
    }
    mesh.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, count]} frustumCulled={false}>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial
        map={sprite}
        color="#d4af37"
        transparent
        opacity={0.6}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </instancedMesh>
  );
}

/* Volumetric gold rays — additive cone fans, slow rotation (0–20%+), richer later */
function LightRays() {
  const group = useRef<THREE.Group>(null);
  const heroProgress = useAppStore((s) => s.heroProgress);
  const mats = useRef<THREE.MeshBasicMaterial[]>([]);

  useFrame((state, delta) => {
    const t = heroProgress;
    const richness = 0.3 + Math.min(t / 0.45, 1) * 0.35; // richer through 45–70%
    mats.current.forEach((m, i) => {
      if (!m) return;
      m.opacity = richness * (0.14 + i * 0.05) * (0.82 + 0.18 * Math.sin(state.clock.elapsedTime * 0.55 + i * 1.9));
    });
    // Light rays slowly rotate, always (begins at 0 — no scroll needed)
    if (group.current) {
      group.current.rotation.z = THREE.MathUtils.damp(
        group.current.rotation.z,
        Math.sin(state.clock.elapsedTime * 0.08) * 0.12 - t * 0.15,
        EASE,
        delta
      );
    }
  });

  return (
    <group ref={group} position={[1.8, 2.8, -1.5]}>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} rotation={[0, 0, -0.45 - i * 0.32]}>
          <coneGeometry args={[1.4 + i * 0.7, 7.5, 4, 1, true]} />
          <meshBasicMaterial
            ref={(m) => { if (m) mats.current[i] = m; }}
            color="#d4af37"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </group>
  );
}

/* Foreground bokeh — soft discs that cross IN FRONT of the lens (45–70%) */
function LensBokeh() {
  const group = useRef<THREE.Group>(null);
  const heroProgress = useAppStore((s) => s.heroProgress);

  const { discs, sprite } = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = c.height = 64;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
    g.addColorStop(0, 'rgba(244, 226, 184, 0.9)');
    g.addColorStop(0.8, 'rgba(227, 200, 119, 0.5)');
    g.addColorStop(1, 'rgba(227, 200, 119, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;

    const discs = Array.from({ length: 12 }, (_, i) => ({
      x0: -7 + i * 1.25,
      y: -2.4 + ((i * 7) % 9) * 0.55,
      z: 2.6 + ((i * 5) % 4) * 0.55, // right at/past the lens plane
      r: 0.3 + ((i * 3) % 5) * 0.16,
      speed: 0.08 + ((i * 5) % 6) * 0.045,
    }));
    return { discs, sprite: tex };
  }, []);

  useEffect(() => () => sprite.dispose(), [sprite]);

  useFrame((state) => {
    if (!group.current) return;
    const t = heroProgress;
    // Cross the lens mostly during 45–70% ("holographic" moment)
    const cross = THREE.MathUtils.clamp((t - 0.3) / 0.4, 0, 1);
    group.current.children.forEach((c, i) => {
      const d = discs[i];
      c.position.x = ((d.x0 + cross * 11 + state.clock.elapsedTime * d.speed) % 15) - 7.5;
      c.position.y = d.y + Math.sin(state.clock.elapsedTime * 0.35 + i) * 0.3;
      const m = (c as THREE.Mesh).material as THREE.MeshBasicMaterial;
      m.opacity = 0.1 + cross * 0.22;
    });
  });

  return (
    <group ref={group}>
      {discs.map((d, i) => (
        <mesh key={i} position={[d.x0, d.y, d.z]}>
          <circleGeometry args={[d.r, 24]} />
          <meshBasicMaterial
            map={sprite}
            color="#e3c877"
            transparent
            opacity={0.1}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      ))}
    </group>
  );
}

export default function HeroCanvas() {
  const isMobile = useAppStore((s) => s.isMobile);
  const dustCount = isMobile ? 900 : 2200; // mobile keeps 60 FPS with fewer particles

  return (
    <Canvas
      dpr={[1, 2]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, powerPreference: 'high-performance' }}
      camera={{ position: [0, 0, 7.4], fov: 42 }}
      style={{ position: 'absolute', inset: 0 }}
    >
      <CameraRig />
      <VenueLayer />
      <CoupleLayer />
      <VeilLayer />
      <FloralCard url="/gallery/hero/floral-left.jpg" position={[-4.2, 0.4, 0.7]} rot={0.14} />
      <FloralCard url="/gallery/hero/floral-right.jpg" position={[4.25, -0.25, 0.5]} rot={-0.12} flip />
      <LightRays />
      <GoldDust count={dustCount} />
      <LensBokeh />
    </Canvas>
  );
}
