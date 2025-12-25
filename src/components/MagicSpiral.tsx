import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial } from '@react-three/drei';
import * as THREE from 'three';
import { useScene } from '../context/SceneContext';

const SPIRAL_HEIGHT = 14;
const SPIRAL_RADIUS = 7.0;
const PARTICLE_COUNT = 800; 

const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const grad = ctx.createRadialGradient(8, 8, 0, 8, 8, 8);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 16, 16);
  }
  return new THREE.CanvasTexture(canvas);
};

export const MagicSpiral: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const texture = useMemo(() => createGlowTexture(), []);
  const { mode, spiralBoost, setSpiralBoost } = useScene();

  // Create base spiral positions
  const basePositions = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const t = i / PARTICLE_COUNT; 
      const y = (t * SPIRAL_HEIGHT) - (SPIRAL_HEIGHT / 2);
      const r = SPIRAL_RADIUS * (1 - ((y + SPIRAL_HEIGHT/2) / SPIRAL_HEIGHT) * 0.5);
      const theta = t * Math.PI * 6; 
      
      const randomOffset = 0.2;
      const rx = (Math.random() - 0.5) * randomOffset;
      const ry = (Math.random() - 0.5) * randomOffset;
      const rz = (Math.random() - 0.5) * randomOffset;

      pos[i * 3] = r * Math.cos(theta) + rx;
      pos[i * 3 + 1] = y + ry;
      pos[i * 3 + 2] = r * Math.sin(theta) + rz;
    }
    return pos;
  }, []);

  const currentPositions = useMemo(() => new Float32Array(basePositions), [basePositions]);

  useFrame((state) => {
    if (!pointsRef.current) return;
    const time = state.clock.getElapsedTime();
    const positionsAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;

    const expansion = mode === 'TREE' ? 1.0 : 4.0; 
    const lerpSpeed = 0.02;

    for(let i=0; i<PARTICLE_COUNT; i++) {
        const idx = i*3;
        const bx = basePositions[idx];
        const by = basePositions[idx+1];
        const bz = basePositions[idx+2];

        const tx = bx * expansion;
        const ty = by + (mode === 'TREE' ? 0 : Math.sin(time + i)*2);
        const tz = bz * expansion;

        currentPositions[idx] += (tx - currentPositions[idx]) * lerpSpeed;
        currentPositions[idx+1] += (ty - currentPositions[idx+1]) * lerpSpeed;
        currentPositions[idx+2] += (tz - currentPositions[idx+2]) * lerpSpeed;
    }

    positionsAttr.needsUpdate = true;
    
    // Rotation logic with Boost
    // Base speed = 0.3. Boost can add up to 2.0.
    const currentSpeed = 0.3 + (spiralBoost * 5.0);
    pointsRef.current.rotation.y += currentSpeed * 0.016; // approx per frame

    // Decay boost
    if (spiralBoost > 0) {
        setSpiralBoost(Math.max(0, spiralBoost - 0.01));
    }
  });

  return (
    <group>
      <Points ref={pointsRef} positions={currentPositions}>
        <PointMaterial
          map={texture}
          color="#FFFFFF"
          size={0.15}
          sizeAttenuation={true}
          transparent={true}
          opacity={mode === 'TREE' ? 0.6 : 0.2}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          toneMapped={false}
        />
      </Points>
    </group>
  );
};