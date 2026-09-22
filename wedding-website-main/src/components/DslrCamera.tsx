import { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { corridorCurve, CORRIDOR_PHOTOS } from './corridorPath';

/* ═══════════════════════════════════════════════════════════════
   THE WORKING DSLR — one realistic camera (metal body, glass lens,
   reflections from the HDRI stage) that leads the viewer down the
   SAME corridor spline, a breath ahead. At any scroll t it faces
   the photo whose clickT is next — and exactly at each photo's
   clickT its shutter button presses in, the mirror (hidden inside)
   flips, and the photo rack-focuses sharp. Blurred → click → sharp.

   Everything here is a pure function of scroll t (no time-based
   easing) so scrubbing the page back and forth never desyncs the
   shutter from the photo reveals.
   ═══════════════════════════════════════════════════════════════ */

const BODY_METAL = { color: '#1a1a1c', metalness: 0.85, roughness: 0.38 };
const BODY_LEATHER = { color: '#111112', metalness: 0.1, roughness: 0.85 };
const CHROME = { color: '#c9c9cd', metalness: 1.0, roughness: 0.22 };
const GOLD = { color: '#d4af37', metalness: 1.0, roughness: 0.3 };
const GLASS_DARK = { color: '#0a0d14', metalness: 0.9, roughness: 0.08 };

export default function DslrCamera() {
  const group = useRef<THREE.Group>(null);
  const inner = useRef<THREE.Group>(null); // aim/bob wrapper (yaw/pitch)
  const shutterBtn = useRef<THREE.Mesh>(null);
  const mirror = useRef<THREE.Mesh>(null);
  const lensGlass = useRef<THREE.Mesh>(null);
  const flashLamp = useRef<THREE.MeshStandardMaterial>(null);
  const irisBladesRef = useRef<THREE.Group>(null);

  const prefersReducedMotion = useAppStore((s) => s.prefersReducedMotion);

  // Scratch vectors (no per-frame allocation)
  const tmp = useMemo(
    () => ({ pos: new THREE.Vector3(), aim: new THREE.Vector3(), q: new THREE.Quaternion(), m: new THREE.Matrix4(), up: new THREE.Vector3(0, 1, 0) }),
    []
  );

  useFrame(({ clock }) => {
    const g = group.current;
    const inn = inner.current;
    if (!g || !inn) return;

    const t = useAppStore.getState().scrollProgress;
    const time = clock.getElapsedTime();

    // ── PATH: the DSLR leads the viewer by a fixed breath of scroll, flying a
    // PARALLEL OFFSET path (up and right of the corridor) so it works the frames
    // beside the viewer's sightline — visible at mid-distance, never blocking.
    const lead = 0.07;
    const dslrT = Math.min(t + lead, 1);
    corridorCurve.getPointAt(dslrT, tmp.pos);
    g.position.set(tmp.pos.x + 1.7, tmp.pos.y + 0.85, tmp.pos.z);
    // bob like it's being carried — handheld weight, never robotic
    if (!prefersReducedMotion) {
      g.position.y += Math.sin(time * 0.9) * 0.05;
      g.position.x += Math.cos(time * 0.7) * 0.03;
    }

    // ── AIM: face the next photo to be clicked (the first with clickT > dslrT).
    // The wrap-around case (past the last photo) aims down-corridor.
    const next = CORRIDOR_PHOTOS.find((p) => p.clickT > dslrT) ?? CORRIDOR_PHOTOS[CORRIDOR_PHOTOS.length - 1];
    tmp.aim.set(next.x, next.y, next.z);
    tmp.m.lookAt(tmp.aim, tmp.pos, tmp.up);
    tmp.q.setFromRotationMatrix(tmp.m);
    // Smooth the yaw/pitch toward the aim (weighted, never snappy)
    inn.quaternion.slerp(tmp.q, prefersReducedMotion ? 1 : 0.09);

    // ── SHUTTER: pressed exactly at the target photo's clickT.
    const shutterT = next.clickT;
    const press = THREE.MathUtils.smoothstep(t, shutterT - 0.012, shutterT + 0.006);
    if (shutterBtn.current) {
      shutterBtn.current.position.y = 0.315 - press * 0.02;
    }
    // Mirror flip: brief, mechanical, right at the press
    if (mirror.current) {
      mirror.current.rotation.z = press * 0.9;
    }
    // Aperture blades inside the lens open at the click (visible head-on)
    if (irisBladesRef.current) {
      irisBladesRef.current.scale.setScalar(0.15 + press * 0.85);
    }
    // Lens glass catches a breath of light at the click (not a flash — a glint)
    if (lensGlass.current) {
      const mat = lensGlass.current.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity = 0.12 + press * 0.55;
    }
    // The little red lamp warm-up on the front
    if (flashLamp.current) {
      flashLamp.current.emissiveIntensity = 0.15 + press * 1.4;
    }
  });

  return (
    <group ref={group} scale={0.82}>
      <group ref={inner}>
        {/* ORIENTATION: the aim quaternion faces -Z at the target photo; the lens
            is modeled along -X, so the body is rotated to point the glass forward. */}
        <group rotation={[0, -Math.PI / 2, 0]}>
        {/* ── BODY ── */}
        <RoundedBox args={[1.05, 0.68, 0.42]} radius={0.05} smoothness={5} castShadow>
          <meshStandardMaterial {...BODY_METAL} />
        </RoundedBox>
        {/* leather grip panels */}
        <RoundedBox args={[0.16, 0.6, 0.46]} radius={0.04} smoothness={4} position={[-0.47, 0, 0]}>
          <meshStandardMaterial {...BODY_LEATHER} />
        </RoundedBox>
        <RoundedBox args={[0.3, 0.24, 0.06]} radius={0.02} smoothness={4} position={[0.12, 0.44, 0.16]}>
          <meshStandardMaterial {...BODY_METAL} />
        </RoundedBox>

        {/* ── PRISM / VIEWFINDER HUMP ── */}
        <mesh position={[0, 0.42, 0]} castShadow>
          <boxGeometry args={[0.42, 0.22, 0.3]} />
          <meshStandardMaterial {...BODY_METAL} />
        </mesh>
        {/* brand prism top — brushed champagne accent stripe */}
        <mesh position={[0, 0.5, 0]}>
          <boxGeometry args={[0.36, 0.03, 0.26]} />
          <meshStandardMaterial {...GOLD} />
        </mesh>

        {/* ── SHUTTER BUTTON + DIALS ── */}
        <mesh ref={shutterBtn} position={[0.42, 0.315, 0.06]} castShadow>
          <cylinderGeometry args={[0.045, 0.05, 0.05, 24]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>
        <mesh position={[0.36, 0.33, -0.1]} castShadow>
          <cylinderGeometry args={[0.08, 0.08, 0.05, 32]} />
          <meshStandardMaterial {...CHROME} />
        </mesh>

        {/* ── LENS ── */}
        <group position={[-0.72, -0.02, 0]}>
          {/* barrel */}
          <mesh rotation={[0, 0, Math.PI / 2]} castShadow>
            <cylinderGeometry args={[0.27, 0.3, 0.5, 40]} />
            <meshStandardMaterial {...BODY_LEATHER} />
          </mesh>
          {/* focus ring — knurled chrome */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.12, 0, 0]}>
            <cylinderGeometry args={[0.305, 0.305, 0.14, 40]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* gold ring — the studio's signature accent */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.24, 0, 0]}>
            <cylinderGeometry args={[0.29, 0.29, 0.035, 40]} />
            <meshStandardMaterial {...GOLD} />
          </mesh>
          {/* front element */}
          <mesh position={[-0.28, 0, 0]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.24, 0.27, 0.08, 40]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
          {/* glass — dark, reflective, glints at the click */}
          <mesh ref={lensGlass} position={[-0.33, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <circleGeometry args={[0.22, 40]} />
            <meshStandardMaterial
              color={GLASS_DARK.color}
              metalness={GLASS_DARK.metalness}
              roughness={GLASS_DARK.roughness}
              emissive="#3a4a6a"
              emissiveIntensity={0.12}
            />
          </mesh>
          {/* aperture blades visible inside (open at the click) */}
          <group ref={irisBladesRef} position={[-0.3, 0, 0]} rotation={[0, 0, 0]}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <mesh key={i} position={[0, 0, 0]} rotation={[0, 0, (i * Math.PI) / 3]} scale={[1, 1, 1]}>
                <circleGeometry args={[0.13, 3]} />
                <meshStandardMaterial color="#08090c" metalness={0.7} roughness={0.5} side={THREE.DoubleSide} />
              </mesh>
            ))}
          </group>
          {/* lens hood */}
          <mesh rotation={[0, 0, Math.PI / 2]} position={[-0.4, 0, 0]}>
            <cylinderGeometry args={[0.31, 0.27, 0.12, 40, 1, true]} />
            <meshStandardMaterial {...BODY_LEATHER} side={THREE.DoubleSide} />
          </mesh>
        </group>

        {/* ── MIRROR BOX (flips at the click — visible through the mount gap) ── */}
        <mesh ref={mirror} position={[0.1, 0, -0.12]}>
          <boxGeometry args={[0.26, 0.3, 0.015]} />
          <meshStandardMaterial color="#d8d8dc" metalness={1} roughness={0.12} />
        </mesh>

        {/* ── STRAP LUGS ── */}
        {[-0.55, 0.55].map((x) => (
          <mesh key={x} position={[x, 0.22, 0]}>
            <torusGeometry args={[0.045, 0.012, 10, 20]} />
            <meshStandardMaterial {...CHROME} />
          </mesh>
        ))}

        {/* ── STATUS LAMP ── */}
        <mesh position={[0.3, 0.18, -0.22]}>
          <sphereGeometry args={[0.028, 16, 16]} />
          <meshStandardMaterial ref={flashLamp} color="#3a0505" emissive="#ff2a1a" emissiveIntensity={0.15} />
        </mesh>
        </group>
      </group>
    </group>
  );
}
