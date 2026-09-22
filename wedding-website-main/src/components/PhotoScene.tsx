import { CORRIDOR_PHOTOS } from './corridorPath';
import IrisPhoto from './IrisPhoto';

/* PHOTO SCENE — the corridor of working frames. Each photo is an IrisPhoto:
   blurred until the DSLR's shutter fires for it, then rack-focus + aperture-
   iris wipe. The gold rim + matte now live INSIDE IrisPhoto (sized to each
   image's real aspect ratio) so frames drift and breathe with their photo. */
export default function PhotoScene() {
  return (
    <group>
      {CORRIDOR_PHOTOS.map((p) => (
        <IrisPhoto
          key={p.url}
          url={p.url}
          position={[p.x, p.y, p.z]}
          rotY={p.rotY}
          width={p.width}
          seed={p.seed}
          clickT={p.clickT}
        />
      ))}
    </group>
  );
}
