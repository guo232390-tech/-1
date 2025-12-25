import React, { useMemo } from 'react';
import { Line, Sphere } from '@react-three/drei';
import { Vector3 } from 'three';
import { ConstellationPoint, StarConnection } from '../types';

// Approximate shape of Gemini (The Twins)
// Coordinates normalized relative to a center point
const STARS: ConstellationPoint[] = [
  { x: -1.5, y: 3.0, z: 0 },  // 0: Castor (Head)
  { x: 1.5, y: 2.8, z: 0 },   // 1: Pollux (Head)
  { x: -1.2, y: 1.5, z: 0 },  // 2: Body left upper
  { x: 1.3, y: 1.4, z: 0 },   // 3: Body right upper
  { x: -1.0, y: 0.0, z: 0 },  // 4: Waist left
  { x: 1.0, y: -0.2, z: 0 },  // 5: Waist right
  { x: -1.8, y: -1.5, z: 0 }, // 6: Leg left 1
  { x: -0.5, y: -1.8, z: 0 }, // 7: Leg left 2
  { x: 0.8, y: -1.6, z: 0 },  // 8: Leg right 1
  { x: 2.0, y: -1.4, z: 0 },  // 9: Leg right 2
];

const CONNECTIONS: StarConnection[] = [
  { start: 0, end: 2 }, { start: 2, end: 4 }, { start: 4, end: 6 }, { start: 4, end: 7 }, // Castor side
  { start: 1, end: 3 }, { start: 3, end: 5 }, { start: 5, end: 8 }, { start: 5, end: 9 }, // Pollux side
  { start: 2, end: 3 }, // Connecting arms/shoulder roughly
];

export const GeminiConstellation: React.FC = () => {
  const scale = 5;
  const positionOffset = new Vector3(0, 10, -20); // Position high up in the background
  
  const points = useMemo(() => {
    return STARS.map(s => new Vector3(s.x * scale, s.y * scale, s.z).add(positionOffset));
  }, [positionOffset]);

  return (
    <group>
      {/* Render Stars */}
      {points.map((pos, idx) => (
        <Sphere key={idx} args={[0.15, 16, 16]} position={pos}>
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </Sphere>
      ))}

      {/* Render Connections */}
      {CONNECTIONS.map((conn, idx) => (
        <Line
          key={idx}
          points={[points[conn.start], points[conn.end]]}
          color="#4B5E85" // Deep blue-ish connection
          lineWidth={1}
          transparent
          opacity={0.3}
        />
      ))}
    </group>
  );
};