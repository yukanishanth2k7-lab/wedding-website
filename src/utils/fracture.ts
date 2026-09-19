import * as THREE from 'three';
import { Delaunay } from 'd3-delaunay';

// Simple seeded PRNG (Mulberry32)
function mulberry32(a: number) {
  return function() {
    var t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

// Normalized to 1x1 bounds ([-0.5, 0.5]) so it can be scaled by rect.width / rect.height
export function fracturePlane(shardsCount: number, seed: number) {
  const random = mulberry32(seed);
  
  // 1. Generate random seed points for Voronoi inside 1x1 box
  const points = new Float64Array(shardsCount * 2);
  const halfW = 0.5;
  const halfH = 0.5;
  
  for (let i = 0; i < shardsCount; i++) {
    // Relaxed points (avoid edges slightly for better interior shards, but d3-delaunay handles clipping well)
    points[i * 2] = (random() * 2 - 1) * halfW;
    points[i * 2 + 1] = (random() * 2 - 1) * halfH;
  }
  
  // 2. Compute Voronoi diagram for [-0.5, -0.5, 0.5, 0.5]
  const delaunay = new Delaunay(points);
  const voronoi = delaunay.voronoi([-halfW, -halfH, halfW, halfH]);
  
  // 3. Triangulate each Voronoi cell and build geometry attributes
  const positions: number[] = [];
  const uvs: number[] = [];
  const centroids: number[] = [];
  const scatterPositions: number[] = [];
  const axes: number[] = [];
  const edges: number[] = []; // 0 for centroid, 1 for perimeter
  
  // Z-spread for initial scattered state - very large to fly all over screen!
  // Since it's multiplied by the rect size in the shader (e.g. 400px), a value of 2 means 800px spread!
  const scatterSpreadZ = 2.0; 
  const scatterSpreadXY = 3.5; 
  
  for (let i = 0; i < shardsCount; i++) {
    const polygon = voronoi.cellPolygon(i);
    if (!polygon || polygon.length < 3) continue;
    
    // Calculate centroid of the polygon
    let cx = 0, cy = 0;
    // Note: d3-delaunay polygons are closed (first point == last point)
    const len = polygon.length - 1; 
    let area = 0;
    
    // Using standard polygon centroid formula
    for (let j = 0; j < len; j++) {
      const p1 = polygon[j];
      const p2 = polygon[j + 1];
      const a = p1[0] * p2[1] - p2[0] * p1[1];
      area += a;
      cx += (p1[0] + p2[0]) * a;
      cy += (p1[1] + p2[1]) * a;
    }
    area *= 0.5;
    cx = cx / (6 * area);
    cy = cy / (6 * area);
    
    // Fallback if centroid calculation fails (degenerate polygon)
    if (isNaN(cx) || isNaN(cy)) {
      cx = points[i * 2];
      cy = points[i * 2 + 1];
    }
    
    // Pre-calculate shard-specific random tumbling/scatter properties (normalized space)
    const sPosX = (random() - 0.5) * scatterSpreadXY;
    const sPosY = (random() - 0.5) * scatterSpreadXY;
    const sPosZ = (random() - 0.5) * scatterSpreadZ + 0.5; // Start slightly in front
    
    // Random rotation axis
    const axis = new THREE.Vector3(random() - 0.5, random() - 0.5, random() - 0.5).normalize();
    const speed = (random() * 5 + 3) * (random() > 0.5 ? 1 : -1); 
    axis.multiplyScalar(speed);
    
    // Triangulate by connecting centroid to perimeter edges
    for (let j = 0; j < len; j++) {
      const p1 = polygon[j];
      const p2 = polygon[j + 1];
      
      // Triangle: Centroid, P1, P2
      const triPoints = [
        [cx, cy, 0], // centroid (edge = 0)
        [p1[0], p1[1], 1], // perimeter (edge = 1)
        [p2[0], p2[1], 1]  // perimeter (edge = 1)
      ];
      
      for (let k = 0; k < 3; k++) {
        const [vx, vy, edgeFlag] = triPoints[k];
        
        positions.push(vx, vy, 0);
        // UV mapping mapping [-0.5, 0.5] to [0, 1]
        uvs.push((vx + 0.5), (vy + 0.5));
        
        centroids.push(cx, cy, 0);
        scatterPositions.push(sPosX, sPosY, sPosZ);
        axes.push(axis.x, axis.y, axis.z);
        edges.push(edgeFlag);
      }
    }
  }
  
  // 4. Construct BufferGeometry
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('aCentroid', new THREE.Float32BufferAttribute(centroids, 3));
  geometry.setAttribute('aScatterPos', new THREE.Float32BufferAttribute(scatterPositions, 3));
  geometry.setAttribute('aAxis', new THREE.Float32BufferAttribute(axes, 3));
  geometry.setAttribute('aEdge', new THREE.Float32BufferAttribute(edges, 1));
  
  geometry.computeVertexNormals();
  
  return geometry;
}
