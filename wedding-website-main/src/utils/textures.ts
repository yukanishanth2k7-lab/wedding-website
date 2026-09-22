import * as THREE from 'three';
import { useThree } from '@react-three/fiber';
import { useEffect } from 'react';

/**
 * Sharpen a texture for on-screen display:
 * - sRGB colorSpace so colors decode correctly under ACES tone mapping (washed-out color reads as blur)
 * - max anisotropy so grazing-angle planes (the tilted gallery frames) stay crisp
 * - generateMipmaps so downscaling is filtered, not aliased/soft
 *
 * WHY: default-loaded textures are linear + anisotropy 1, which is the #1 cause of
 * "blurry 3D images" even when the source file is large.
 */
export function sharpenTexture(
  texture: THREE.Texture,
  renderer: THREE.WebGLRenderer,
  // e.g. 4:6 world-units plane seen full-screen at 1080p is ~1500px wide;
  // source is 2000px+, so maxAnisotropy + mipmaps carry the rest. Bump ratio if you add zoom.
  maxAnisotropyHint?: number
): THREE.Texture {
  texture.colorSpace = THREE.SRGBColorSpace; // correct sRGB decode — prevents washed-out, hazy color
  texture.generateMipmaps = true; // proper trilinear downscale filtering instead of shimmer/softness
  texture.minFilter = THREE.LinearMipmapLinearFilter; // smooth mipchain sampling
  texture.magFilter = THREE.LinearFilter; // crisp magnification
  texture.anisotropy =
    maxAnisotropyHint ?? renderer.capabilities.getMaxAnisotropy(); // keeps tilted planes sharp to the edges
  texture.needsUpdate = true;
  return texture;
}

/** Hook form: call inside a component that already has useTexture results. */
export function useSharpenedTextures(textures: THREE.Texture[]): void {
  const gl = useThree((state) => state.gl);
  useEffect(() => {
    const max = gl.capabilities.getMaxAnisotropy();
    for (const t of textures) {
      sharpenTexture(t, gl, max);
    }
  }, [gl, textures]);
}
