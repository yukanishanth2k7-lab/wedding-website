import { EffectComposer, Bloom, DepthOfField, Vignette, Noise } from '@react-three/postprocessing';
import { useAppStore, usePrefersReducedMotion } from '../store';

export default function PostProcessing() {
  const isMobile = useAppStore((state) => state.isMobile);
  // A11Y: reduced motion → drop animated/flicker-adjacent passes (noise shimmer,
  // heavy bokeh breathing); keep only a static vignette for framing.
  const prefersReducedMotion = usePrefersReducedMotion();

  if (isMobile || prefersReducedMotion) {
    return (
      <EffectComposer multisampling={0}>
        <Vignette eskil={false} offset={0.1} darkness={0.85} />
      </EffectComposer>
    );
  }

  // FIX (blur): anything soft-focus by default reads as blur, not cinema. The DoF
  // is tuned so TAKEN photos stay crisp: focusDistance pins the focal plane at the
  // corridor photos' typical distance (~7 world units ≈ 0.107 normalized), with a
  // wide focalLength so most of the journey sits inside the in-focus zone. Bloom
  // only catches true speculars; vignette/noise stay subtle film texture.

  return (
    <EffectComposer multisampling={4}>
      <DepthOfField
        focusDistance={0.107}
        focalLength={0.28}
        bokehScale={1.2}
        height={480}
      />
      <Bloom
        luminanceThreshold={0.78}
        luminanceSmoothing={0.2}
        intensity={0.3}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.15} darkness={0.85} />
      <Noise opacity={0.025} />
    </EffectComposer>
  );
}
