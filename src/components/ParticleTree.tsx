import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Octahedron, Sparkles } from '@react-three/drei';
import * as THREE from 'three';
import { useScene } from '../context/SceneContext';

const COUNT = 4000;
const TREE_HEIGHT = 14;
const BASE_RADIUS = 5.5;

// Colors
const COLOR_PINK = new THREE.Color('#B03060'); 
const COLOR_BLUE_WHITE = new THREE.Color('#507090');

const createCircleTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 32;
  const ctx = canvas.getContext('2d');
  
  if (ctx) {
    const grad = ctx.createRadialGradient(16, 16, 0, 16, 16, 16);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');
    grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.5)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 32, 32);
  }
  return new THREE.CanvasTexture(canvas);
};

export const ParticleTree: React.FC = () => {
  const { mode } = useScene();
  const pointsRef = useRef<THREE.Points>(null);
  const topStarRef = useRef<THREE.Group>(null);
  const particleTexture = useMemo(() => createCircleTexture(), []);

  // Pre-calculate positions for both states: TREE and GALAXY
  const [treePositions, galaxyPositions, colors, sizes] = useMemo(() => {
    const treePos = new Float32Array(COUNT * 3);
    const galaxyPos = new Float32Array(COUNT * 3);
    const cols = new Float32Array(COUNT * 3);
    const sz = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      // --- TREE STATE (Cone Spiral) ---
      const y = Math.random() * TREE_HEIGHT;
      const hNorm = y / TREE_HEIGHT;
      const r = BASE_RADIUS * Math.pow(1 - hNorm, 1.2);
      const theta = Math.random() * Math.PI * 2;
      
      // Volume distribution for tree
      const dist = Math.sqrt(Math.random()) * r;
      const spiralOffset = y * 0.8; 
      
      treePos[i * 3] = dist * Math.cos(theta + spiralOffset);
      treePos[i * 3 + 1] = y - TREE_HEIGHT / 2;
      treePos[i * 3 + 2] = dist * Math.sin(theta + spiralOffset);

      // --- GALAXY STATE (Dispersed Nebula / Flow Field) ---
      // Spread them out into a large oblate spheroid (disk-like)
      const galaxyRadius = 25 + Math.random() * 15;
      const galaxyTheta = Math.random() * Math.PI * 2;
      const galaxyPhi = Math.acos((Math.random() * 2) - 1);
      
      // Flatten the sphere to make it more like a galaxy disk
      galaxyPos[i * 3] = galaxyRadius * Math.sin(galaxyPhi) * Math.cos(galaxyTheta);
      galaxyPos[i * 3 + 1] = (galaxyRadius * Math.sin(galaxyPhi) * Math.sin(galaxyTheta)) * 0.4; // Flatten Y
      galaxyPos[i * 3 + 2] = galaxyRadius * Math.cos(galaxyPhi);

      // --- COLORS & SIZES ---
      const brightness = 0.9 - (hNorm * 0.5);
      const isPink = Math.random() > 0.5;
      const baseColor = isPink ? COLOR_PINK : COLOR_BLUE_WHITE;
      
      cols[i * 3] = baseColor.r * brightness;
      cols[i * 3 + 1] = baseColor.g * brightness;
      cols[i * 3 + 2] = baseColor.b * brightness;

      const sizeFactor = 1.0 - (hNorm * 0.3);
      sz[i] = (Math.random() * 0.15 + 0.05) * sizeFactor;
    }

    return [treePos, galaxyPos, cols, sz];
  }, []);

  // Use a buffer for current positions to interpolate manually
  const currentPositions = useMemo(() => new Float32Array(treePositions), [treePositions]);

  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    
    if (!pointsRef.current) return;

    const positionsAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
    
    // Physics Parameters
    const lerpFactor = 0.03; // Smoothness of transition
    const driftSpeed = 0.02; // Speed of the "Galaxy" flow

    for (let i = 0; i < COUNT; i++) {
      const idx = i * 3;
      
      // Determine target based on mode
      // If Focus mode, we still behave like Galaxy for background particles
      const isTree = mode === 'TREE';
      const tx = isTree ? treePositions[idx] : galaxyPositions[idx];
      const ty = isTree ? treePositions[idx + 1] : galaxyPositions[idx + 1];
      const tz = isTree ? treePositions[idx + 2] : galaxyPositions[idx + 2];

      // Interpolate current position towards target
      currentPositions[idx] += (tx - currentPositions[idx]) * lerpFactor;
      currentPositions[idx + 1] += (ty - currentPositions[idx + 1]) * lerpFactor;
      currentPositions[idx + 2] += (tz - currentPositions[idx + 2]) * lerpFactor;

      // Add Procedural Flow / Curl Noise approximation when in Galaxy/Focus mode
      if (!isTree) {
        // Simple trigonometric flow field
        const noiseX = Math.sin(t * 0.5 + currentPositions[idx + 1] * 0.1);
        const noiseY = Math.cos(t * 0.3 + currentPositions[idx] * 0.1);
        const noiseZ = Math.sin(t * 0.4 + currentPositions[idx + 1] * 0.1);

        currentPositions[idx] += noiseX * driftSpeed;
        currentPositions[idx + 1] += noiseY * driftSpeed * 0.5;
        currentPositions[idx + 2] += noiseZ * driftSpeed;
      }
    }

    // Update geometry
    positionsAttr.array.set(currentPositions);
    positionsAttr.needsUpdate = true;

    // Rotation logic
    if (mode === 'TREE') {
        pointsRef.current.rotation.y += 0.002;
    } else {
        // Slower rotation in galaxy mode
        pointsRef.current.rotation.y += 0.0005;
    }
    
    // Star topper animation/visibility
    if (topStarRef.current) {
        topStarRef.current.rotation.y = -t * 0.5;
        
        // Scale down star in galaxy mode
        const targetScale = mode === 'TREE' ? 1 : 0.01;
        topStarRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.05);
    }
  });

  return (
    <group>
      <Points ref={pointsRef} positions={currentPositions} colors={colors} sizes={sizes}>
        <PointMaterial
          map={particleTexture}
          transparent
          vertexColors
          opacity={0.8}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation={true}
          toneMapped={false}
          alphaTest={0.01}
        />
      </Points>

      {/* Tree Topper (Only visible in TREE mode conceptually, scaled down via code above) */}
      <group position={[0, TREE_HEIGHT / 2, 0]} ref={topStarRef}>
        <Octahedron args={[0.3, 0]}>
          <meshBasicMaterial color="#FFFFA0" toneMapped={false} />
        </Octahedron>
        <Octahedron args={[0.6, 0]}>
          <meshBasicMaterial color="#FFD700" wireframe transparent opacity={0.3} toneMapped={false} />
        </Octahedron>
        <Sparkles count={15} scale={1.5} size={3} speed={0.4} opacity={0.6} color="#FFFFE0" />
        <pointLight distance={5} intensity={1} color="#FFFFA0" decay={2} />
      </group>
    </group>
  );
};