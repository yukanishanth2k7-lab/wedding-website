import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useAppStore } from '../store';

export default function ParticleDust() {
  const count = 20000;
  const meshRef = useRef<THREE.InstancedMesh>(null);
  const isMobile = useAppStore((state) => state.isMobile);
  
  // Use fewer particles on mobile
  const activeCount = isMobile ? 2000 : count;

  const dummy = useMemo(() => new THREE.Object3D(), []);
  const particles = useMemo(() => {
    const temp = [];
    for (let i = 0; i < count; i++) {
      const x = (Math.random() - 0.5) * 40;
      const y = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 100 - 20; // Spread along the Z axis
      const speed = 0.01 + Math.random() * 0.02;
      const offset = Math.random() * Math.PI * 2;
      temp.push({ x, y, z, speed, offset });
    }
    return temp;
  }, [count]);

  useFrame((state) => {
    if (!meshRef.current) return;
    
    const time = state.clock.elapsedTime;
    
    for (let i = 0; i < activeCount; i++) {
      const p = particles[i];
      // Slow drift
      const moveY = Math.sin(time * p.speed + p.offset) * 0.5;
      const moveX = Math.cos(time * p.speed + p.offset) * 0.5;
      
      dummy.position.set(p.x + moveX, p.y + moveY, p.z);
      dummy.scale.setScalar(0.05 + Math.sin(time * 2 + p.offset) * 0.02);
      dummy.updateMatrix();
      
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }
    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, activeCount]}>
      <planeGeometry args={[0.1, 0.1]} />
      {/* COLOR SWAP (flat tint only): dust #e6d5b8 -> maroon #5C0A1E; particle system logic untouched */}
      <meshBasicMaterial color="#5C0A1E" transparent opacity={0.4} depthWrite={false} blending={THREE.AdditiveBlending} />
    </instancedMesh>
  );
}
