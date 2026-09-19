import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

interface ParticleExplosionProps {
  imageUrl: string;
  targetSelector: string; // The DOM element to attach the scroll trigger to
  density?: number; // Lower is denser. Default 2
  className?: string;
  style?: React.CSSProperties;
}

const vertexShader = `
uniform float uProgress;
attribute vec3 targetPosition;
attribute vec3 color;
varying vec3 vColor;

// Simplex 3D Noise 
vec4 permute(vec4 x){return mod(((x*34.0)+1.0)*x, 289.0);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}

float snoise(vec3 v){ 
  const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
  const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i  = floor(v + dot(v, C.yyy) );
  vec3 x0 = v - i + dot(i, C.xxx) ;

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min( g.xyz, l.zxy );
  vec3 i2 = max( g.xyz, l.zxy );

  vec3 x1 = x0 - i1 + 1.0 * C.xxx;
  vec3 x2 = x0 - i2 + 2.0 * C.xxx;
  vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;

  i = mod(i, 289.0 ); 
  vec4 p = permute( permute( permute( 
             i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0 )) 
           + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));

  float n_ = 1.0/7.0; // N=7
  vec3  ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z *ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_ );

  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4( x.xy, y.xy );
  vec4 b1 = vec4( x.zw, y.zw );

  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;

  vec3 p0 = vec3(a0.xy,h.x);
  vec3 p1 = vec3(a0.zw,h.y);
  vec3 p2 = vec3(a1.xy,h.z);
  vec3 p3 = vec3(a1.zw,h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), 
                                dot(p2,x2), dot(p3,x3) ) );
}

void main() {
    vColor = color;
    
    // Add organic turbulence based on original position and progress
    float noise1 = snoise(position * 0.005 + uProgress * 2.0);
    float noise2 = snoise(position * 0.005 + uProgress * 2.0 + 100.0);
    float noise3 = snoise(position * 0.005 + uProgress * 2.0 + 200.0);
    
    vec3 turbulence = vec3(noise1, noise2, noise3) * 150.0 * uProgress;
    
    // Custom easing for smooth burst outward
    float easeProgress = uProgress < 0.5 ? 4.0 * uProgress * uProgress * uProgress : 1.0 - pow(-2.0 * uProgress + 2.0, 3.0) / 2.0;
    
    vec3 currentPosition = mix(position, targetPosition + turbulence, easeProgress);
    
    vec4 mvPosition = modelViewMatrix * vec4(currentPosition, 1.0);
    
    // Size attenuation so closer particles are larger
    gl_PointSize = 2.0 * (1000.0 / -mvPosition.z);
    
    // Shrink slightly as they explode
    gl_PointSize *= mix(1.0, 0.1, easeProgress);
    
    gl_Position = projectionMatrix * mvPosition;
}
`;

const fragmentShader = `
varying vec3 vColor;
uniform float uProgress;

void main() {
    // Circular particle
    float dist = distance(gl_PointCoord, vec2(0.5));
    if (dist > 0.5) discard;
    
    // Soft glowing edge
    float alpha = smoothstep(0.5, 0.1, dist);
    
    // Fade out as progress approaches 1
    alpha *= mix(1.0, 0.0, pow(uProgress, 2.0));
    
    gl_FragColor = vec4(vColor, alpha);
}
`;

export default function ParticleExplosion({
  imageUrl,
  targetSelector,
  density = 2,
  className = '',
  style = {},
}: ParticleExplosionProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const requestRef = useRef<number | null>(null);
  
  // To track when we need to render
  const lastRenderedProgress = useRef<number>(-1);
  const currentProgress = useRef<number>(0);
  const isSettled = useRef<boolean>(true);
  const lastFrameTime = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    // Setup Three.js
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 10, 5000);
    // Position camera so 1 unit = 1 pixel roughly
    camera.position.z = 1000;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false, // Performance constraint
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5)); // Clamp DPI
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      renderer.setSize(w, h);
      camera.aspect = w / h;
      
      // Update camera distance to maintain 1 unit = 1 pixel mapping at z=0
      if (h > 0) {
        camera.position.z = (h / 2) / Math.tan((camera.fov / 2) * (Math.PI / 180));
      }
      camera.updateProjectionMatrix();
      
      // Force render on resize
      isSettled.current = false;
    };
    
    window.addEventListener('resize', handleResize);
    // Initial size calculation
    handleResize();

    // Load Image and build geometry in idle time
    let isCancelled = false;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = imageUrl;
    
    img.onload = () => {
      if (isCancelled) return;
      
      const buildParticles = () => {
        if (isCancelled) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Target ~50k particles max for desktop
        const maxParticles = 50000;
        let scale = Math.sqrt(maxParticles / (img.width * img.height));
        if (scale > 1) scale = 1; 
        
        const w = Math.floor(img.width * scale);
        const h = Math.floor(img.height * scale);
        
        canvas.width = w;
        canvas.height = h;
        ctx.drawImage(img, 0, 0, w, h);
        const imgData = ctx.getImageData(0, 0, w, h).data;
        
        const positions = [];
        const colors = [];
        const targetPositions = [];
        
        // We iterate based on density parameter (e.g. 2 means every 2nd pixel)
        for (let y = 0; y < h; y += density) {
          for (let x = 0; x < w; x += density) {
            const i = (y * w + x) * 4;
            // Skip highly transparent pixels
            if (imgData[i + 3] < 128) continue;
            
            const r = imgData[i] / 255;
            const g = imgData[i + 1] / 255;
            const b = imgData[i + 2] / 255;
            
            // Center the coordinate system
            const pX = (x - w / 2);
            const pY = -(y - h / 2);
            const pZ = 0;
            
            positions.push(pX, pY, pZ);
            colors.push(r, g, b);
            
            // Radial explosion target
            const angle = Math.atan2(pY, pX);
            const dist = Math.sqrt(pX * pX + pY * pY);
            
            // Explode outwards, further from center = travels further
            const explosionDist = dist + Math.random() * 600 + 400;
            const tX = Math.cos(angle) * explosionDist;
            const tY = Math.sin(angle) * explosionDist;
            
            // Add Z variance (forward/backward scatter)
            const tZ = (Math.random() - 0.5) * 800;
            
            targetPositions.push(tX, tY, tZ);
          }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('targetPosition', new THREE.Float32BufferAttribute(targetPositions, 3));
        
        // Bounding sphere optimization to avoid recomputing every frame
        geometry.computeBoundingSphere();
        // Since particles explode, make the bounding sphere artificially large
        if (geometry.boundingSphere) {
           geometry.boundingSphere.radius *= 5; 
        }

        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uProgress: { value: 0.0 }
          },
          transparent: true,
          blending: THREE.AdditiveBlending, // Premium glow
          depthWrite: false, // Don't write to depth buffer for additive blending
        });
        
        materialRef.current = material;

        const points = new THREE.Points(geometry, material);
        // Do not use frustumCulled = false unconditionally. We rely on the inflated bounding sphere.
        
        // Scale points up to compensate for downsampling
        points.scale.set(1 / scale, 1 / scale, 1);
        
        scene.add(points);
        pointsRef.current = points;
        
        // Force a render now that particles are built
        isSettled.current = false;
        
        // Setup GSAP ScrollTrigger once particles are ready
        setupScrollTrigger();
      };
      
      // Use requestIdleCallback to not block main thread
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(buildParticles);
      } else {
        setTimeout(buildParticles, 1);
      }
    };

    let scrollTriggerInst: ScrollTrigger | null = null;

    const setupScrollTrigger = () => {
      if (isCancelled) return;
      
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) {
        console.warn(`ParticleExplosion: Target element '${targetSelector}' not found.`);
        return;
      }
      
      scrollTriggerInst = ScrollTrigger.create({
        trigger: targetElement,
        start: 'top top',
        end: 'bottom top', // Scrub over the full section exit
        scrub: true,
        onUpdate: (self) => {
          currentProgress.current = self.progress;
          isSettled.current = false; // Wake up the render loop
        }
      });
    };

    // Manual custom render loop with FPS throttling (90fps target -> ~11ms frame budget)
    const renderLoop = (time: number) => {
      requestRef.current = requestAnimationFrame(renderLoop);
      
      // If no change and we have settled, skip rendering to save CPU/GPU
      if (isSettled.current) return;
      
      // Throttle to max 90fps (~11.1ms)
      if (time - lastFrameTime.current < 11.1) return;
      lastFrameTime.current = time;

      // Update uniform
      if (materialRef.current) {
        materialRef.current.uniforms.uProgress.value = currentProgress.current;
      }

      // Check if settled
      if (Math.abs(lastRenderedProgress.current - currentProgress.current) < 0.001) {
        isSettled.current = true;
      } else {
        lastRenderedProgress.current = currentProgress.current;
      }

      renderer.render(scene, camera);
    };
    
    requestRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      if (requestRef.current !== null) {
        cancelAnimationFrame(requestRef.current);
      }
      if (scrollTriggerInst) {
        scrollTriggerInst.kill();
      }
      
      // Cleanup Three.js resources
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (pointsRef.current) {
        pointsRef.current.geometry.dispose();
        (pointsRef.current.material as THREE.Material).dispose();
      }
    };
  }, [imageUrl, targetSelector, density]);

  return (
    <div 
      ref={containerRef} 
      className={className}
      style={{ 
        position: 'absolute', 
        top: 0, 
        left: 0, 
        width: '100%', 
        height: '100%', 
        pointerEvents: 'none',
        zIndex: 10,
        ...style 
      }} 
    />
  );
}
