import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Text3D, Billboard, Center } from '@react-three/drei';
import * as THREE from 'three';

interface FloatingTextProps {
  text: string;
  position: [number, number, number];
  fontSize?: number;
  color?: string;
  speed?: number;
  floatAmplitude?: number;
}

export default function FloatingText({
  text,
  position,
  fontSize = 1.2,
  color = '#F1E6D8', // Champagne gold / Ivory from art direction
  speed = 1.0,
  floatAmplitude = 0.2,
}: FloatingTextProps) {
  const groupRef = useRef<THREE.Group>(null);

  // Floating animation so the text feels alive in the void
  useFrame((state) => {
    if (groupRef.current) {
      const time = state.clock.getElapsedTime();
      // Drastically increase the float amplitude so it's completely obvious
      groupRef.current.position.y = position[1] + Math.sin(time * speed * 2.0) * (floatAmplitude * 3.0);

      // Add noticeable rotation wobble on the Z axis (like it's rocking slightly)
      groupRef.current.rotation.z = Math.sin(time * speed * 1.5) * 0.15;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {/* Billboard ensures the text plane always rotates to face the camera lens perfectly */}
      <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
        {/* Center ensures the geometry's origin is exactly in the middle so it rotates correctly */}
        <Center>
          {/* Swapped to Text3D for true extruded geometry with depth */}
          <Text3D
            font="https://raw.githubusercontent.com/mrdoob/three.js/master/examples/fonts/gentilis_regular.typeface.json"
            size={fontSize}
            height={0.2} // This is the 3D extrusion depth
            curveSegments={12}
            bevelEnabled
            bevelThickness={0.02}
            bevelSize={0.02}
            bevelOffset={0}
            bevelSegments={5}
          >
            {text}
            {/* Custom emissive material passed to the Text3D geometry */}
            <meshStandardMaterial
              attach="material"
              color={color}
              emissive={color}
              emissiveIntensity={0.2}
              roughness={0.2}
              metalness={0.8}
              side={THREE.DoubleSide}
            />
          </Text3D>
        </Center>
      </Billboard>
    </group>
  );
}
