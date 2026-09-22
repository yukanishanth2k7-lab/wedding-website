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

  // FIX (blur): anything soft-focus by default reads as blur, not cinema — so bokeh
  // scale drops 4 -> 1.4 and bloom intensity drops 1.2 -> 0.35 with a higher threshold
  // so only true speculars glow. Vignette lightened 1.2 -> 0.85 and noise halved to keep
  // film texture without milking the blacks.

  return (
    <EffectComposer multisampling={4}>
      <DepthOfField
        focusDistance={0.015}
        focalLength={0.05} // tighter falloff so the subject stays crisp and only far edges soften
        bokehScale={1.4}
        height={480}
      />
      <Bloom
        luminanceThreshold={0.75} // was 0.5 — only real highlights glow now
        luminanceSmoothing={0.2}
        intensity={0.35}
        mipmapBlur
      />
      <Vignette eskil={false} offset={0.15} darkness={0.85} />
      <Noise opacity={0.025} />
    </EffectComposer>
  );
}
