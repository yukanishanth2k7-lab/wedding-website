import { EffectComposer, Bloom, Vignette, Noise } from '@react-three/postprocessing';
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

  // FIX (final): the DepthOfField pass is REMOVED entirely — every corridor
  // photo runs its own in-shader focus story (blurred → flash → crystal
  // clear), and a screen-space DoF re-softens the very photos the reveal
  // just sharpened. What remains: bloom for the flash/speculars only,
  // vignette + noise as quiet film texture. Pure-HD end state, always.
  return (
    <EffectComposer multisampling={4}>
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
