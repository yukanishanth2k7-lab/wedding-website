import { useRef, useMemo, useEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useTexture } from '@react-three/drei';
import * as THREE from 'three';
import { sharpenTexture } from '../utils/textures';
import { fracturePlane } from '../utils/fracture';

const shatteredVertexShader = `
  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vEdge;
  varying vec3 vWorldNormal;

  attribute vec3 aCentroid;
  attribute vec3 aScatterPos;
  attribute vec3 aAxis;
  attribute float aEdge;

  uniform float uProgress;
  uniform float uExit;
  uniform float uHover;
  uniform float uTime;
  uniform vec2 uResolution; // Used to correct scatter physics against scaling

  mat4 rotationMatrix(vec3 axis, float angle) {
      axis = normalize(axis);
      float s = sin(angle);
      float c = cos(angle);
      float oc = 1.0 - c;
      
      return mat4(oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,  0.0,
                  oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,  0.0,
                  oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c,           0.0,
                  0.0,                                0.0,                                0.0,                                1.0);
  }

  vec3 rotateVector(vec3 v, vec3 axis, float angle) {
    mat4 m = rotationMatrix(axis, angle);
    return (m * vec4(v, 1.0)).xyz;
  }

  void main() {
    vUv = uv;
    vEdge = aEdge;
    
    // Base offset from centroid in 1x1 space
    vec3 localPos = position - aCentroid;
    
    // Independent tumbling (scaled by axis length which encodes speed)
    float speed = length(aAxis);
    vec3 rotAxis = speed > 0.0 ? normalize(aAxis) : vec3(0.0, 1.0, 0.0);
    float rotationAngle = speed * (1.0 - uProgress) * 5.0; 
    
    vec3 rotatedLocalPos = rotateVector(localPos, rotAxis, rotationAngle);
    
    // Calculate normal taking rotation into account
    vWorldNormal = rotateVector(normal, rotAxis, rotationAngle);
    vNormal = normalize(normalMatrix * vWorldNormal);
    
    float t = uProgress;
    // Quintic ease out for sharper snap and explosive start
    float easeProgress = 1.0 - pow(1.0 - t, 5.0);
    
    // The geometry is 1x1, but gets scaled by uResolution (e.g. 400x600) via mesh scale.
    // If we scatter by 1.0, it scatters 400px. This allows screen-wide explosive scatter!
    vec3 scatterState = aCentroid + aScatterPos + rotatedLocalPos;
    vec3 assembledState = aCentroid + localPos; 
    
    vec3 currentPos = mix(scatterState, assembledState, easeProgress);
    
    // Ripple (scale invariant via uResolution)
    float rippleX = currentPos.x * uResolution.x * 0.025;
    float rippleY = currentPos.y * uResolution.y * 0.025;
    float ripple = sin(rippleX + uTime * 2.5) * cos(rippleY + uTime * 2.5) * 0.03 * uHover;
    // Since scale affects z, we apply ripple before model view but keep it small
    currentPos.z += ripple;

    // Apply exit mechanics (melt down)
    if (uExit > 0.0) {
      float dropAmount = uExit * uExit * 0.5 * (1.0 + fract(aCentroid.x * 13.33));
      currentPos.y -= dropAmount;
      
      float stretch = 1.0 + uExit * 4.0;
      currentPos.y = aCentroid.y + (currentPos.y - aCentroid.y) * stretch;
    }
    
    vec4 mvPosition = modelViewMatrix * vec4(currentPos, 1.0);
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const shatteredFragmentShader = `
  uniform sampler2D uTexture;
  uniform float uHover;
  uniform float uSnap;
  uniform float uExit;
  uniform float uProgress;

  varying vec2 vUv;
  varying vec3 vNormal;
  varying vec3 vViewPosition;
  varying float vEdge;
  varying vec3 vWorldNormal;

  void main() {
    vec2 uv = vUv;
    
    vec4 texColor = texture2D(uTexture, uv);
    
    // HD Contrast & Professional Color Grading
    // Increase contrast by 30%
    texColor.rgb = mix(vec3(0.5), texColor.rgb, 1.30);
    
    // Saturation boost (approximate luminance)
    float luminance = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));
    texColor.rgb = mix(vec3(luminance), texColor.rgb, 1.20);
    
    // Subtle cinematic warmth
    texColor.rgb *= vec3(1.04, 0.97, 0.95); 
    
    if (uExit > 0.0) {
      vec4 sum = texColor;
      float spread = uExit * 0.05; 
      sum += texture2D(uTexture, clamp(uv + vec2(0.0, spread * 1.0), 0.0, 1.0));
      sum += texture2D(uTexture, clamp(uv + vec2(0.0, spread * 2.0), 0.0, 1.0));
      sum += texture2D(uTexture, clamp(uv - vec2(0.0, spread * 1.0), 0.0, 1.0));
      sum += texture2D(uTexture, clamp(uv - vec2(0.0, spread * 2.0), 0.0, 1.0));
      texColor = sum / 5.0;
      texColor.a *= (1.0 - uExit); 
    }
    
    vec3 flashColor = vec3(0.0);
    if (uSnap > 0.0 && vEdge > 0.8) {
      float edgeIntensity = smoothstep(0.8, 1.0, vEdge);
      // Sweep effect based on UV
      float sweep = sin(uv.x * 10.0 + uv.y * 10.0 - uSnap * 20.0) * 0.5 + 0.5;
      float flashPulse = pow(uSnap, 2.0) * edgeIntensity * 3.0 * sweep;
      flashColor = vec3(1.0, 0.9, 0.7) * flashPulse;
    }
    
    // Fix backface white shadow by flipping normal if viewed from behind
    vec3 normal = normalize(vNormal);
    if (!gl_FrontFacing) {
        normal = -normal;
    }
    
    vec3 viewDir = normalize(vViewPosition);
    float fresnelTerm = dot(viewDir, normal);
    fresnelTerm = clamp(1.0 - fresnelTerm, 0.0, 1.0);
    fresnelTerm = pow(fresnelTerm, 3.0);
    
    // Glass specular highlight
    vec3 lightDir = normalize(vec3(0.5, 0.5, 1.0));
    vec3 halfVector = normalize(lightDir + viewDir);
    float spec = pow(max(dot(normal, halfVector), 0.0), 80.0);
    // Only shine aggressively when scattered to look like thick broken glass
    vec3 specularColor = vec3(1.0) * spec * (1.0 - uProgress) * 1.2;
    
    vec3 fresnelColor = vec3(0.9, 0.83, 0.72) * fresnelTerm * (0.15 + uHover * 0.35);
    
    float scatterRim = (1.0 - uProgress) * fresnelTerm * 0.7;
    vec3 scatterColor = vec3(0.95, 0.95, 1.0) * scatterRim;
    
    // When scattered, lower opacity slightly for glass effect
    float alpha = texColor.a * mix(0.85, 1.0, uProgress);
    
    // Also darken the backface slightly for depth
    vec3 baseColor = gl_FrontFacing ? texColor.rgb : texColor.rgb * 0.6;
    
    vec3 finalColor = baseColor + fresnelColor + flashColor + scatterColor + specularColor;
    
    gl_FragColor = vec4(finalColor, alpha);
    #include <colorspace_fragment>
  }
`;

interface ShatteredImageProps {
  url: string;
  shardCount?: number;
  seed?: number;
  domTarget: () => HTMLElement | null;
}

export default function ShatteredImageReveal({
  url,
  shardCount = 20,
  seed = 42,
  domTarget,
}: ShatteredImageProps) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const texture = useTexture(url);
  const gl = useThree((state) => state.gl);
  const [hovered, setHovered] = useState(false);
  
  const snapTriggered = useRef(false);
  const snapTime = useRef(0);

  useEffect(() => {
    sharpenTexture(texture, gl);
  }, [texture, gl]);

  const geometry = useMemo(() => {
    return fracturePlane(shardCount, seed);
  }, [shardCount, seed]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uHover: { value: 0 },
      uTime: { value: 0 },
      uProgress: { value: 0 },
      uExit: { value: 0 },
      uSnap: { value: 0 },
      uResolution: { value: new THREE.Vector2(1, 1) },
    }),
    [texture]
  );

  useFrame((_state, delta) => {
    if (!materialRef.current || !meshRef.current) return;
    
    materialRef.current.uniforms.uTime.value += delta;
    
    const targetHover = hovered ? 1 : 0;
    materialRef.current.uniforms.uHover.value = THREE.MathUtils.damp(
      materialRef.current.uniforms.uHover.value,
      targetHover,
      2.5,
      delta
    );

    let targetProgress = 0;
    let targetExit = 0;

    const el = domTarget();
    if (el) {
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      const vw = window.innerWidth;
      
      meshRef.current.scale.set(rect.width, rect.height, 1);
      materialRef.current.uniforms.uResolution.value.set(rect.width, rect.height);
      
      const x = rect.left + rect.width / 2 - vw / 2;
      const y = -rect.top - rect.height / 2 + vh / 2;
      meshRef.current.position.set(x, y, 0);
      
      const top = rect.top;
      const bottom = rect.bottom;
      
      if (top > vh * 0.6) {
        targetProgress = THREE.MathUtils.clamp(1.0 - (top - vh * 0.6) / (vh * 0.4), 0, 1);
      } else {
        targetProgress = 1;
      }
      
      if (bottom < vh * 0.4) {
        targetExit = THREE.MathUtils.clamp((vh * 0.4 - bottom) / (vh * 0.4), 0, 1);
      }
    }
    
    const currentProg = materialRef.current.uniforms.uProgress.value;
    if (targetProgress > 0.9 && currentProg <= 0.9 && !snapTriggered.current) {
      snapTriggered.current = true;
      snapTime.current = 1.0; 
    } else if (targetProgress < 0.8) {
      snapTriggered.current = false;
    }
    
    if (snapTime.current > 0) {
      snapTime.current -= delta * 6.0; 
      if (snapTime.current < 0) snapTime.current = 0;
    }
    
    materialRef.current.uniforms.uProgress.value = THREE.MathUtils.damp(currentProg, targetProgress, 4.0, delta);
    materialRef.current.uniforms.uExit.value = targetExit;
    materialRef.current.uniforms.uSnap.value = snapTime.current;
  });

  return (
    <mesh
      ref={meshRef}
      geometry={geometry}
      onPointerOver={() => setHovered(true)}
      onPointerOut={() => setHovered(false)}
    >
      <shaderMaterial
        ref={materialRef}
        vertexShader={shatteredVertexShader}
        fragmentShader={shatteredFragmentShader}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent={true}
      />
    </mesh>
  );
}
