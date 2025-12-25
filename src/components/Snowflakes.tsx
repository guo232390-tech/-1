import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 200;

// Create a hexagonal texture procedurally
const createHexagonTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    const r = 14;
    const cx = 16;
    const cy = 16;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i;
      const x = cx + r * Math.cos(angle);
      const y = cy + r * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
  }
  const tex = new THREE.CanvasTexture(canvas);
  return tex;
};

export const Snowflakes: React.FC = () => {
  const pointsRef = useRef<THREE.Points>(null);
  const texture = useMemo(() => createHexagonTexture(), []);

  // Initial positions and randomness
  const [positions, randomness] = useMemo(() => {
    const pos = new Float32Array(COUNT * 3);
    const rand = new Float32Array(COUNT * 3); // Store velocity/sway data
    
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 30; // X spread
      pos[i * 3 + 1] = (Math.random() - 0.5) * 30; // Y spread
      pos[i * 3 + 2] = (Math.random() - 0.5) * 30; // Z spread

      rand[i * 3] = Math.random(); // speed factor
      rand[i * 3 + 1] = Math.random(); // sway offset
      rand[i * 3 + 2] = Math.random(); // unused
    }
    return [pos, rand];
  }, []);

  useFrame((state) => {
    if (!pointsRef.current) return;

    const positionsAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    const posArray = positionsAttr.array as Float32Array;
    const time = state.clock.getElapsedTime();

    for (let i = 0; i < COUNT; i++) {
      const speed = 0.05 + randomness[i * 3] * 0.05;
      const sway = randomness[i * 3 + 1];
      
      // Move down
      posArray[i * 3 + 1] -= speed;

      // Reset to top if too low
      if (posArray[i * 3 + 1] < -15) {
        posArray[i * 3 + 1] = 15;
      }

      // Gentle wobble (sway)
      posArray[i * 3] += Math.sin(time + sway * 10) * 0.01;
      posArray[i * 3 + 2] += Math.cos(time + sway * 10) * 0.01;
    }

    positionsAttr.needsUpdate = true;
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        map={texture}
        color="#AADDFF" // Very slight blue tint for snow
        transparent
        opacity={0.8}
        size={0.4}
        sizeAttenuation
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};