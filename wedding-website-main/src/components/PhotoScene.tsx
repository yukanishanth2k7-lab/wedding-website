import { CORRIDOR_PHOTOS } from './corridorPath';
import IrisPhoto from './IrisPhoto';

/* PHOTO SCENE — the corridor of working frames. Each photo is an IrisPhoto:
   blurred until the DSLR's shutter fires for it, then rack-focus + iris wipe.
   A thin gold frame edge backs each plane so it reads as a hung print. */
export default function PhotoScene() {
  return (
    <group>
      {CORRIDOR_PHOTOS.map((p) => (
        <group key={p.url} position={[p.x, p.y, p.z]}>
          <IrisPhoto url={p.url} position={[0, 0, 0]} rotY={p.rotY} width={p.width} seed={p.seed} clickT={p.clickT} />
          {/* gold frame edge: a slightly larger dark plane behind the photo */}
          <mesh position={[0, 0, -0.02]} rotation={[0, p.rotY, 0]}>
            <planeGeometry args={[p.width + 0.14, p.width / 1.5 + 0.14]} />
            <meshStandardMaterial color="#0c0c0d" metalness={0.6} roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, -0.015]} rotation={[0, p.rotY, 0]}>
            <planeGeometry args={[p.width + 0.08, p.width / 1.5 + 0.08]} />
            <meshStandardMaterial color="#d4af37" metalness={1} roughness={0.35} />
          </mesh>
        </group>
      ))}
    </group>
  );
}
