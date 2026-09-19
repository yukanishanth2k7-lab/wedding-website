import { Environment, MeshReflectorMaterial, Sparkles, SoftShadows, ContactShadows, Lightformer } from '@react-three/drei';
import { useAppStore } from '../store';

export default function EnvironmentSetup() {
  const isMobile = useAppStore((state) => state.isMobile);

  return (
    <>
      {/* COLOR SWAP (flat tint only): scene bg/fog #1a0505 -> sandal #F1E6D8 to match the new theme;
          fog distances, lights, and all environment structure unchanged */}
      <color attach="background" args={['#F1E6D8']} />
      <fog attach="fog" args={['#F1E6D8', 10, 40]} />

      {/* FIX (cheap 3D): PCSS soft shadows — hard-edged shadow maps are the #2 "cheap"
          tell after flat lighting. Kept off mobile (shader cost). */}
      {!isMobile && <SoftShadows size={40} samples={12} focus={0.8} />}

      {/* FIX (cheap 3D): night HDRI supplies image-based lighting + real reflections on
          metallic/rough surfaces. The old ambient(0.2) + directional(1.5) combo left every
          material looking flat-shaded. environmentIntensity tints it to match the scene. */}
      <Environment preset="night" environmentIntensity={0.35} />

      {/* Warm key + cool rim so the champagne/maroon palette reads under the HDRI,
          not just from it — directional shadows still ground the objects. */}
      <directionalLight
        position={[10, 20, 10]}
        intensity={1.1}
        color="#fff2dd"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
        shadow-camera-far={80}
        shadow-bias={-0.0004}
      />
      <spotLight position={[-10, 10, -30]} angle={0.3} penumbra={1} intensity={1.2} color="#e6d5b8" />
      {/* FIX (cheap 3D): emissive Lightformers enrich the env map with warm "chandelier"
          reflections so highlights have structure instead of one uniform gray sheen. */}
      {!isMobile && (
        <>
          {/* COLOR SWAP (flat tints only): warm panel #e6d5b8 -> white #FFFFFF, accent panel #5b1414 -> maroon #5C0A1E;
              positions/intensities unchanged */}
          <Lightformer form="rect" intensity={1.5} color="#FFFFFF" scale={[6, 3, 1]} position={[-8, 6, -18]} target={[0, 0, 0]} />
          <Lightformer form="rect" intensity={1.0} color="#5C0A1E" scale={[6, 3, 1]} position={[9, 4, -22]} target={[0, 0, 0]} />
        </>
      )}

      {/* Reflective marble floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -5, -30]} receiveShadow>
        <planeGeometry args={[100, 200]} />
        {/* FIX (cheap 3D): roughness 1 + metalness 0.5 = dead, oily mirror. Real polished
            stone is a low-roughness DIELECTRIC — slight blur, no metal tint. */}
        <MeshReflectorMaterial
          blur={[280, 60]}
          resolution={isMobile ? 512 : 1024}
          mixBlur={0.9}
          mixStrength={12}
          roughness={0.35}
          metalness={0.05}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.4}
          color="#FFFFFF" /* COLOR SWAP (flat tint): floor base #2a0a0a -> white marble; reflector params untouched */
          mirror={0.55}
        />
      </mesh>

      {/* FIX (cheap 3D): baked-style contact shadow under the gallery cluster grounds
          the frames without needing real-time shadow casters on planes. */}
      <ContactShadows position={[0, -4.9, -30]} opacity={0.35} scale={28} blur={2.6} far={6} color="#000000" frames={1} />

      {/* Distant volumetric dust — COLOR SWAP (flat tint): motes #e6d5b8 -> maroon #5C0A1E so they stay visible on sandal */}
      {!isMobile && (
        <Sparkles count={400} scale={[60, 30, 100]} size={2} speed={0.15} opacity={0.12} color="#5C0A1E" position={[0, 0, -30]} />
      )}
    </>
  );
}
