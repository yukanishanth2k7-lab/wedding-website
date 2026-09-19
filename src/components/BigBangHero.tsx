import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

gsap.registerPlugin(ScrollTrigger);

interface BigBangHeroProps {
  heroImage: string;
  galleryImages: string[];
  targetSelector: string;
  density?: number;
  className?: string;
  style?: React.CSSProperties;
}

const vertexShader = `
uniform float uProgress;
uniform float uTime;
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
    
    // Add ambient drift using uTime even when not scrolling
    float driftX = sin(uTime * 0.5 + position.y * 0.01) * 20.0;
    float driftY = cos(uTime * 0.4 + position.x * 0.01) * 20.0;
    vec3 drift = vec3(driftX, driftY, 0.0) * mix(0.1, 1.0, uProgress); // more drift when exploded
    
    // Add organic turbulence based on original position and progress
    float noise1 = snoise(position * 0.005 + uProgress * 2.0);
    float noise2 = snoise(position * 0.005 + uProgress * 2.0 + 100.0);
    float noise3 = snoise(position * 0.005 + uProgress * 2.0 + 200.0);
    
    vec3 turbulence = vec3(noise1, noise2, noise3) * 300.0 * uProgress;
    
    // Big Bang Explosion Ease (extremely fast initial burst, slow drift after)
    float easeProgress = uProgress < 0.2 
        ? 1.0 - pow(1.0 - (uProgress * 5.0), 3.0) 
        : 1.0 + (uProgress - 0.2) * 0.2; // slow expansion after initial burst
    
    vec3 currentPosition = mix(position, targetPosition + turbulence, easeProgress) + drift;
    
    vec4 mvPosition = modelViewMatrix * vec4(currentPosition, 1.0);
    
    // Size attenuation
    gl_PointSize = 3.0 * (1000.0 / -mvPosition.z);
    
    // Shrink slightly as they explode, but pulse with time
    float pulse = (sin(uTime * 2.0 + position.x) * 0.5 + 0.5) * 0.5 + 0.5;
    gl_PointSize *= mix(1.0, 0.1 * pulse, min(1.0, uProgress * 2.0));
    
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
    
    float alpha = smoothstep(0.5, 0.1, dist);
    
    // Fade out as progress approaches 1
    alpha *= mix(1.0, 0.0, smoothstep(0.5, 1.0, uProgress));
    
    // Big Bang Flash: boost color intensity dramatically at the start of explosion
    float flash = mix(1.0, 5.0, max(0.0, 1.0 - abs(uProgress - 0.1) * 10.0));
    vec3 finalColor = vColor * flash;
    
    gl_FragColor = vec4(finalColor, alpha);
}
`;

export default function BigBangHero({
  heroImage,
  galleryImages,
  targetSelector,
  density = 2,
  className = '',
  style = {},
}: BigBangHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  
  const pointsRef = useRef<THREE.Points | null>(null);
  const materialRef = useRef<THREE.ShaderMaterial | null>(null);
  const backgroundPlanesRef = useRef<THREE.Mesh[]>([]);
  
  const requestRef = useRef<number | null>(null);
  const currentProgress = useRef<number>(0);
  const isVisible = useRef<boolean>(false);
  const lastFrameTime = useRef<number>(0);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, 1, 10, 8000);
    camera.position.z = 1000;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ 
      antialias: false,
      powerPreference: 'high-performance',
      alpha: true,
      preserveDrawingBuffer: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
    
    const w = containerRef.current.clientWidth;
    const h = containerRef.current.clientHeight;
    renderer.setSize(w, h);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Setup PostProcessing (Bloom)
    const renderPass = new RenderPass(scene, camera);
    const composer = new EffectComposer(renderer);
    composer.addPass(renderPass);
    
    // Half resolution bloom for performance
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 1.5, 0.4, 0.85);
    bloomPass.threshold = 0.2;
    bloomPass.strength = 0.0; // Init to 0, dynamically animated
    bloomPass.radius = 1.0;
    composer.addPass(bloomPass);
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    const handleResize = () => {
      if (!containerRef.current || !renderer || !camera || !composer) return;
      const rw = containerRef.current.clientWidth;
      const rh = containerRef.current.clientHeight;
      renderer.setSize(rw, rh);
      composer.setSize(rw, rh);
      camera.aspect = rw / rh;
      if (rh > 0) {
        camera.position.z = (rh / 2) / Math.tan((camera.fov / 2) * (Math.PI / 180));
      }
      camera.updateProjectionMatrix();
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    let isCancelled = false;

    // Load Background Gallery Images
    const textureLoader = new THREE.TextureLoader();
    const bgGroup = new THREE.Group();
    scene.add(bgGroup);
    
    galleryImages.forEach((imgUrl, idx) => {
      textureLoader.load(imgUrl, (texture) => {
        if (isCancelled) return;
        texture.colorSpace = THREE.SRGBColorSpace;
        const planeGeo = new THREE.PlaneGeometry(1600, 900); // Fixed base aspect, scale later
        const planeMat = new THREE.MeshBasicMaterial({ 
          map: texture, 
          transparent: true, 
          opacity: 0,
          depthWrite: false 
        });
        const mesh = new THREE.Mesh(planeGeo, planeMat);
        
        // Stagger them in Z space so they parallax
        mesh.position.z = -1000 - (idx * 500); 
        
        // Random slight X/Y offset
        mesh.position.x = (Math.random() - 0.5) * 400;
        mesh.position.y = (Math.random() - 0.5) * 200;
        
        // Save initial scale/pos for Ken Burns effect
        mesh.userData = {
          baseZ: mesh.position.z,
          baseX: mesh.position.x,
          baseY: mesh.position.y,
          speed: 0.1 + Math.random() * 0.1
        };
        
        bgGroup.add(mesh);
        backgroundPlanesRef.current.push(mesh);
      });
    });

    // Load Hero Image & Build Particles
    const img = new Image();
    img.crossOrigin = 'anonymous';
    
    img.onload = () => {
      if (isCancelled) return;
      
      const buildParticles = () => {
        if (isCancelled) return;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        const maxParticles = 60000;
        let scale = Math.sqrt(maxParticles / (img.width * img.height));
        if (scale > 1) scale = 1; 
        
        const cw = Math.floor(img.width * scale);
        const ch = Math.floor(img.height * scale);
        
        canvas.width = cw;
        canvas.height = ch;
        ctx.drawImage(img, 0, 0, cw, ch);
        const imgData = ctx.getImageData(0, 0, cw, ch).data;
        
        const positions = [];
        const colors = [];
        const targetPositions = [];
        
        for (let y = 0; y < ch; y += density) {
          for (let x = 0; x < cw; x += density) {
            const i = (y * cw + x) * 4;
            if (imgData[i + 3] < 128) continue;
            
            const r = imgData[i] / 255;
            const g = imgData[i + 1] / 255;
            const b = imgData[i + 2] / 255;
            
            const pX = (x - cw / 2);
            const pY = -(y - ch / 2);
            const pZ = 0;
            
            positions.push(pX, pY, pZ);
            colors.push(r, g, b);
            
            const angle = Math.atan2(pY, pX);
            const dist = Math.sqrt(pX * pX + pY * pY);
            
            // Big Bang: massive explosion distance
            const explosionDist = dist + Math.random() * 1500 + 800;
            const tX = Math.cos(angle) * explosionDist;
            const tY = Math.sin(angle) * explosionDist;
            
            // Extreme Z scatter (some fly at camera, some fly far away)
            const tZ = (Math.random() - 0.5) * 3000;
            
            targetPositions.push(tX, tY, tZ);
          }
        }
        
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        geometry.setAttribute('targetPosition', new THREE.Float32BufferAttribute(targetPositions, 3));
        
        geometry.computeBoundingSphere();
        if (geometry.boundingSphere) geometry.boundingSphere.radius *= 10; 

        const material = new THREE.ShaderMaterial({
          vertexShader,
          fragmentShader,
          uniforms: {
            uProgress: { value: 0.0 },
            uTime: { value: 0.0 }
          },
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });
        
        materialRef.current = material;

        const points = new THREE.Points(geometry, material);
        points.scale.set(1 / scale, 1 / scale, 1);
        
        scene.add(points);
        pointsRef.current = points;
        
        setupScrollTrigger();
      };
      
      if ('requestIdleCallback' in window) {
        (window as any).requestIdleCallback(buildParticles);
      } else {
        setTimeout(buildParticles, 1);
      }
    };
    img.src = heroImage;

    let scrollTriggerInst: ScrollTrigger | null = null;

    const setupScrollTrigger = () => {
      if (isCancelled) return;
      
      const targetElement = document.querySelector(targetSelector);
      if (!targetElement) return;
      
      scrollTriggerInst = ScrollTrigger.create({
        trigger: targetElement,
        start: 'top top',
        end: '+=150%', // Extend scroll distance so explosion has time to breathe
        scrub: true,
        pin: true,     // Pin the section in place while the explosion happens
        onUpdate: (self) => {
          currentProgress.current = self.progress;
          
          // Animate Bloom strength (spike at 10% progress)
          if (bloomPassRef.current) {
            // Flash heavily at explosion start, then fade
            const flash = Math.max(0, 1.0 - Math.abs(self.progress - 0.1) * 10.0);
            bloomPassRef.current.strength = flash * 3.0;
          }
          
          // Animate background planes opacity and parallax
          backgroundPlanesRef.current.forEach((mesh, i) => {
            const mat = mesh.material as THREE.MeshBasicMaterial;
            // Planes fade in staggered after particles clear (progress > 0.3)
            const startFade = 0.3 + (i * 0.1);
            const opacity = Math.min(1, Math.max(0, (self.progress - startFade) * 2.0));
            mat.opacity = opacity;
            
            // Scroll Parallax (pull them slightly forward as we scroll)
            mesh.position.z = mesh.userData.baseZ + (self.progress * 800);
          });
        }
      });
    };

    // IntersectionObserver to pause rendering when offscreen
    const io = new IntersectionObserver((entries) => {
      isVisible.current = entries[0].isIntersecting;
    }, { threshold: 0 });
    io.observe(containerRef.current);

    // Render loop with continuous time and 90fps cap
    const renderLoop = (time: number) => {
      requestRef.current = requestAnimationFrame(renderLoop);
      
      if (!isVisible.current) return;
      
      if (time - lastFrameTime.current < 11.1) return;
      lastFrameTime.current = time;

      const timeSec = time * 0.001;

      if (materialRef.current) {
        materialRef.current.uniforms.uProgress.value = currentProgress.current;
        materialRef.current.uniforms.uTime.value = timeSec;
      }

      // Ambient Ken Burns drift for background images
      backgroundPlanesRef.current.forEach((mesh) => {
        // Slow continuous scale pulse
        const s = 1.0 + Math.sin(timeSec * mesh.userData.speed) * 0.05;
        mesh.scale.set(s, s, 1);
        
        // Slow continuous pan
        mesh.position.x = mesh.userData.baseX + Math.sin(timeSec * mesh.userData.speed * 0.5) * 20;
        mesh.position.y = mesh.userData.baseY + Math.cos(timeSec * mesh.userData.speed * 0.7) * 20;
      });

      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    
    requestRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isCancelled = true;
      window.removeEventListener('resize', handleResize);
      io.disconnect();
      
      if (requestRef.current !== null) cancelAnimationFrame(requestRef.current);
      if (scrollTriggerInst) scrollTriggerInst.kill();
      
      if (rendererRef.current && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
        rendererRef.current.dispose();
      }
      if (composerRef.current) composerRef.current.dispose();
      
      if (pointsRef.current) {
        pointsRef.current.geometry.dispose();
        (pointsRef.current.material as THREE.Material).dispose();
      }
      backgroundPlanesRef.current.forEach(mesh => {
        mesh.geometry.dispose();
        (mesh.material as THREE.Material).dispose();
      });
    };
  }, [heroImage, galleryImages, targetSelector, density]);

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
