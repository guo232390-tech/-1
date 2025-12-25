import React, { useRef, useState, useMemo, useEffect } from 'react';
import { useFrame } from '@react-three/fiber';
import { Points } from '@react-three/drei';
import * as THREE from 'three';
import { useScene } from '../context/SceneContext';

const TREE_HEIGHT = 14;
const BASE_RADIUS = 5.5;
const PARTICLE_COUNT = 600; 

// Generate a high-quality glow texture procedurally
const createGlowTexture = () => {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    // Soft glow gradient
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, 'rgba(255, 255, 255, 1)');     // Center White
    grad.addColorStop(0.2, 'rgba(255, 240, 200, 0.8)'); // Inner Gold
    grad.addColorStop(0.5, 'rgba(255, 215, 0, 0.2)');   // Outer Gold
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');           // Transparent Edge
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  return tex;
};

export const WishStar: React.FC = () => {
  const { isWishActive, completeWish, setSpiralBoost } = useScene();
  
  const pointsRef = useRef<THREE.Points>(null);
  const coreRef = useRef<THREE.Sprite>(null);
  const lightRef = useRef<THREE.PointLight>(null);

  // Animation State
  const [phase, setPhase] = useState(0); 
  const startTimeRef = useRef(0);
  const headPosition = useRef(new THREE.Vector3(0, -100, 0)); // Start hidden
  
  // Shared Texture
  const texture = useMemo(() => createGlowTexture(), []);

  // Particle Logic Data
  const particleData = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }).map(() => ({
      life: 0,
      velocity: new THREE.Vector3(),
    }));
  }, []);
  
  // Geometry Buffers
  const [positions, sizes] = useMemo(() => {
    const pos = new Float32Array(PARTICLE_COUNT * 3);
    const sz = new Float32Array(PARTICLE_COUNT);
    // Initialize off-screen
    pos.fill(0); 
    pos.fill(-9999, 0, PARTICLE_COUNT * 3); // Move way off screen
    return [pos, sz];
  }, []);

  useFrame((state) => {
    if (!isWishActive) {
      if (phase !== 0) {
        setPhase(0);
        headPosition.current.set(0, -9999, 0);
      }
      return;
    }

    const t = state.clock.getElapsedTime();

    // --- 1. Animation Sequence Logic (Head Movement) ---
    
    // Start Sequence
    if (phase === 0) {
      setPhase(1);
      startTimeRef.current = t;
      headPosition.current.set(5, -5, 15); 
    }

    // Phase 1: Fly to Top
    if (phase === 1) {
      const elapsed = t - startTimeRef.current;
      const duration = 2.0;
      const progress = Math.min(elapsed / duration, 1);
      
      const target = new THREE.Vector3(0, TREE_HEIGHT / 2 + 1, 0);
      const start = new THREE.Vector3(5, -5, 15);
      
      // Parabolic Arc
      headPosition.current.lerpVectors(start, target, Math.pow(progress, 0.5));
      
      if (progress >= 1) {
        setPhase(2);
        startTimeRef.current = t;
      }
    }

    // Phase 2: Spiral Down
    if (phase === 2) {
      const elapsed = t - startTimeRef.current;
      const duration = 3.5; 
      const p = Math.min(elapsed / duration, 1);

      setSpiralBoost(Math.min(p * 1.5, 1));

      const y = (TREE_HEIGHT / 2 + 1) - (p * (TREE_HEIGHT + 2));
      const hNorm = 1 - p;
      const radius = 5.5 * Math.pow(1 - hNorm, 1.2) * (1 - hNorm) + 0.5; 
      const revolutions = 5;
      const theta = p * Math.PI * 2 * revolutions;

      headPosition.current.x = radius * Math.cos(theta);
      headPosition.current.z = radius * Math.sin(theta);
      headPosition.current.y = y;

      if (p >= 1) {
        completeWish();
        setPhase(0);
        headPosition.current.set(0, -9999, 0);
      }
    }

    // --- 2. Visual Updates (Core & Light) ---
    if (coreRef.current) {
        coreRef.current.position.copy(headPosition.current);
        const pulse = 1 + Math.sin(t * 20) * 0.2;
        coreRef.current.scale.set(1.5 * pulse, 1.5 * pulse, 1);
        coreRef.current.material.opacity = phase === 0 ? 0 : 1;
    }
    if (lightRef.current) {
        lightRef.current.position.copy(headPosition.current);
    }

    // --- 3. Particle System Update (The Trail) ---
    if (pointsRef.current) {
        const posAttr = pointsRef.current.geometry.attributes.position as THREE.BufferAttribute;
        const sizeAttr = pointsRef.current.geometry.attributes.size as THREE.BufferAttribute;
        // We will update the colors attribute dynamically to handle fade out
        const colorAttr = pointsRef.current.geometry.attributes.color as THREE.BufferAttribute;

        const particlesToEmit = 10; 
        let emittedCount = 0;

        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const data = particleData[i];

            // Decrease life
            data.life -= 0.02 + Math.random() * 0.03;

            // Emit new particle logic
            if (data.life <= 0) {
                if (emittedCount < particlesToEmit && phase !== 0) {
                    data.life = 1.0;
                    
                    // Spawn at head position
                    posAttr.setXYZ(i, headPosition.current.x, headPosition.current.y, headPosition.current.z);
                    
                    // Random velocity spread
                    const spread = 0.3;
                    data.velocity.set(
                        (Math.random() - 0.5) * spread,
                        (Math.random() - 0.5) * spread,
                        (Math.random() - 0.5) * spread
                    );
                    
                    emittedCount++;
                } else {
                    // "Hide" dead particles
                    sizeAttr.setX(i, 0);
                    // Also move them away to be safe
                    posAttr.setXYZ(i, 0, -9999, 0);
                    continue;
                }
            }

            // Update Physics
            const px = posAttr.getX(i);
            const py = posAttr.getY(i);
            const pz = posAttr.getZ(i);

            data.velocity.y -= 0.005; // Gravity
            data.velocity.multiplyScalar(0.96); // Drag

            posAttr.setXYZ(i, px + data.velocity.x, py + data.velocity.y, pz + data.velocity.z);

            // Update Size & Color based on life
            // Smooth fade out
            const lifeFactor = Math.max(0, data.life);
            
            // Size shrinks
            sizeAttr.setX(i, lifeFactor * 0.8);

            // Color: Fade from White/Gold -> Orange -> Invisible(Black)
            // Since we use AdditiveBlending, Black = Transparent
            colorAttr.setXYZ(
                i,
                1.0 * lifeFactor,      // R
                0.8 * lifeFactor,      // G (Gold tint)
                0.2 * lifeFactor       // B
            );
        }

        posAttr.needsUpdate = true;
        sizeAttr.needsUpdate = true;
        colorAttr.needsUpdate = true;
    }
  });

  // Init buffer for colors
  const colors = useMemo(() => {
     const arr = new Float32Array(PARTICLE_COUNT * 3);
     // Initialize to 0 (invisible/black) until spawned
     arr.fill(0);
     return arr;
  }, []);

  return (
    <group>
      {/* 1. Particle Trail */}
      <Points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={PARTICLE_COUNT}
            array={positions}
            itemSize={3}
          />
           <bufferAttribute
            attach="attributes-size"
            count={PARTICLE_COUNT}
            array={sizes}
            itemSize={1}
          />
           <bufferAttribute
            attach="attributes-color"
            count={PARTICLE_COUNT}
            array={colors}
            itemSize={3}
          />
        </bufferGeometry>
        {/* Standard ThreeJS PointsMaterial with proper settings for glow */}
        <pointsMaterial
          map={texture}
          transparent={true}
          opacity={1.0}
          vertexColors={true} // Enable vertex colors for per-particle fading
          sizeAttenuation={true}
          blending={THREE.AdditiveBlending} // CRITICAL: Makes it glow against black background
          depthWrite={false} // CRITICAL: Prevents z-fighting artifacts
        />
      </Points>

      {/* 2. Glowing Core Sprite */}
      <sprite ref={coreRef} position={[0, -9999, 0]}>
        <spriteMaterial 
            map={texture} 
            color="#FFFFA0" 
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            transparent={true}
        />
      </sprite>

      {/* 3. Light Source */}
      <pointLight ref={lightRef} distance={8} decay={2} color="#FFD700" intensity={1.5} />
    </group>
  );
};