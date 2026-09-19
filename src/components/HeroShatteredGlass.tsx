import { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { useAppStore } from '../store';
import { sharpenTexture } from '../utils/textures';

const vertexShader = `
  uniform float uProgress;
  varying vec2 vUv;

  float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // Shatter displacement driven by scroll progress (starts assembled, shatters on scroll)
    float randX = random(uv) * 2.0 - 1.0;
    float randY = random(uv + 1.0) * 2.0 - 1.0;
    float randZ = random(uv + 2.0) * 2.0 - 1.0;

    // As we scroll down, uProgress increases from 0. 
    // We want shatterStrength to be 0 at the start, and 1 by the time we scroll to 0.05 (much faster, ~1-2 scrolls).
    float shatterStrength = smoothstep(0.0, 0.05, uProgress);
    float assembleFactor = 1.0 - shatterStrength;

    // Lessen the explosion intensity so the flying pieces are a bit tighter/smaller
    pos.x += randX * 1.5 * shatterStrength;
    pos.y += randY * 1.5 * shatterStrength;
    pos.z += randZ * 3.0 * shatterStrength;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform sampler2D uTexture;
  uniform float uProgress;
  uniform vec2 uResolution;
  uniform float uImageAspect;
  uniform float uOverscan;
  varying vec2 vUv;

  void main() {
    // object-fit: cover logic for the fragment shader so it never stretches
    float screenAspect = uResolution.x / uResolution.y;
    vec2 uv = vUv;
    float scaleX = 1.0;
    float scaleY = 1.0;
    
    if (screenAspect > uImageAspect) {
      scaleY = uImageAspect / screenAspect;
    } else {
      scaleX = screenAspect / uImageAspect;
    }
    
    // First, apply object-fit cover scaling
    vec2 coverUv = (uv - 0.5) * vec2(scaleX, scaleY) + 0.5;

    // Second, scale the UVs by the overscan amount so the image perfectly fits the SCREEN, 
    // rather than zooming in to fill the oversized 3D plane.
    vec2 finalUv = (coverUv - 0.5) * uOverscan + 0.5;

    // Fix edge artifacts by clamping UVs
    vec4 texColor = texture2D(uTexture, clamp(finalUv, 0.0, 1.0));

    // Dialed into the sweet spot (0.05) to match vertex shader so it shatters much quicker on scroll
    float shatterStrength = smoothstep(0.0, 0.05, uProgress);
    float assembleFactor = 1.0 - shatterStrength;

    vec3 glassColor = vec3(0.9, 0.9, 0.95);
    vec3 finalColor = mix(texColor.rgb + (glassColor * 0.12 * shatterStrength), texColor.rgb, assembleFactor);

    gl_FragColor = vec4(finalColor, texColor.a);
    // FIX (blur): sRGB re-encode before ACES tone mapping so the hero photo keeps
    // its true contrast instead of the washed, milky "blurry" look.
    #include <colorspace_fragment>
  }
`;

export default function HeroShatteredGlass() {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const gl = useThree((state) => state.gl);
  const size = useThree((state) => state.size);
  const scrollProgress = useAppStore((state) => state.scrollProgress);

  // IMAGE SOURCE SWAP: Unsplash placeholder -> real studio original (largest available
  // from the source: 1280x1600, self-hosted). NOTE: rights must be confirmed before publishing.
  const texture = useTexture('/gallery/wedding-1.jpg');

  // FIX (blur): sRGB + max anisotropy + mipmaps on the hero texture too.
  useEffect(() => {
    sharpenTexture(texture, gl);
  }, [texture, gl]);

  // Mathematically calculate the exact world-space size of the screen at Z=0 for a camera at Z=10 with FOV=45
  const cameraDistance = 10;
  const fov = 45;
  const exactHeight = 2 * cameraDistance * Math.tan((fov / 2) * (Math.PI / 180));
  const exactWidth = exactHeight * (size.width / size.height);

  // Oversize the plane slightly (1.2x) to cover edge gaps from camera rig spline anticipation.
  const overscan = 1.2;
  const planeWidth = exactWidth * overscan;
  const planeHeight = exactHeight * overscan;
  
  // Dynamically read the true aspect ratio of the loaded image to prevent wrong letterboxing
  const image = texture.image as HTMLImageElement | undefined;
  const uImageAspect = (image && image.width && image.height) ? image.width / image.height : 1.0;

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uProgress: { value: 0 },
      uResolution: { value: new THREE.Vector2(planeWidth, planeHeight) },
      uImageAspect: { value: uImageAspect }, 
      uOverscan: { value: overscan },
    }),
    [texture, planeWidth, planeHeight, uImageAspect, overscan]
  );

  useFrame(() => {
    if (materialRef.current) {
      materialRef.current.uniforms.uProgress.value = scrollProgress;
      materialRef.current.uniforms.uResolution.value.set(planeWidth, planeHeight);
    }
  });

  return (
    <group position={[0, 0, 5]}>
      {/* Centered at 0,0 and oversized slightly to cover the full screen bounds safely */}
      <mesh position={[0, 0, -5]}>
        {/* High segment count so vertices displace uniquely */}
        <planeGeometry args={[planeWidth, planeHeight, 96, 96]} />
        <shaderMaterial
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
          transparent
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
