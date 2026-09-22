import { Environment, Sparkles, SoftShadows, Lightformer } from '@react-three/drei';
import { useAppStore, usePrefersReducedMotion } from '../store';

/* CHARCOAL CORRIDOR — the environment for the restored photo-corridor flight.
   No floor: the camera flies a spline that dives to y≈-3.5 while frames hang
   from y≈-5 to +2, so the stage is an open charcoal void (like the original
   build), with fog tuned so corridor photos emerge from the dark as you
   approach — the same reveal the shattered-glass assemble animation plays on.
   Reduced motion / mobile: lightweight variant, no drifting motes. */
export default function EnvironmentSetup() {
  const isMobile = useAppStore((state) => state.isMobile);
  const prefersReducedMotion = usePrefersReducedMotion();
  const lowPower = isMobile || prefersReducedMotion;

  return (
    <>
      <color attach="background" args={['#131313']} />
      {/* Fog tuned to the corridor: photos begin assembling ~15 units out, so the
          far wall of the void stays ~60 units deep — frames surface from black. */}
      <fog attach="fog" args={['#131313', 16, 62]} />

      {!lowPower && <SoftShadows size={40} samples={12} focus={0.8} />}

      <Environment preset="night" environmentIntensity={0.32} />

      {/* Champagne key + warm fill — the product-shoot triangle */}
      <directionalLight
        position={[8, 14, 8]}
        intensity={1.15}
        color="#ffe9c4"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-12}
        shadow-camera-right={12}
        shadow-camera-top={12}
        shadow-camera-bottom={-12}
        shadow-camera-far={60}
        shadow-bias={-0.0004}
      />
      <spotLight position={[-9, 7, 4]} angle={0.45} penumbra={1} intensity={0.7} color="#d4af37" />
      {/* Deep-corridor accents so mid/late gallery frames catch warm light too */}
      <spotLight position={[0, 6, -30]} angle={0.55} penumbra={1} intensity={0.65} color="#d4af37" />
      <spotLight position={[0, 5, -58]} angle={0.6} penumbra={1} intensity={0.55} color="#8a6d1f" />

      {!lowPower && (
        <>
          <Lightformer form="rect" intensity={1.4} color="#fff3da" scale={[7, 3, 1]} position={[-8, 6, -14]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.9} color="#d4af37" scale={[6, 2.4, 1]} position={[9, 4, -16]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={0.8} color="#d4af37" scale={[8, 3, 1]} position={[0, 5, -46]} target={[0, 0, -30]} />
        </>
      )}

      {/* Gold motes along the whole flight path — faint, premium; removed under
          reduced motion. Spread follows the corridor (z 5 → -75). */}
      {!lowPower && (
        <Sparkles count={220} scale={[26, 18, 84]} size={2} speed={0.12} opacity={0.16} color="#d4af37" position={[0, 0, -30]} />
      )}
    </>
  );
}
