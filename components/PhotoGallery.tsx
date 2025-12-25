import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Image, RoundedBox } from '@react-three/drei';
import * as THREE from 'three';
import { useScene } from '../context/SceneContext';
import { PhotoData } from '../types';

const TREE_HEIGHT = 12;
const BASE_RADIUS = 5;

// Crystal Material Props for the frame
const GLASS_MATERIAL_PROPS = {
  transmission: 0.9,
  thickness: 0.5,
  roughness: 0.05,
  metalness: 0.1,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  ior: 1.5,
  color: '#ffffff'
};

const PhotoFrame: React.FC<{ 
  data: PhotoData; 
  index: number; 
  total: number;
}> = ({ data, index, total }) => {
  const meshRef = useRef<THREE.Group>(null);
  const { mode, setMode, focusedPhotoId, setFocusedPhotoId } = useScene();
  const isFocused = focusedPhotoId === data.id;

  // 1. Calculate Tree Position (Spiral)
  const treeTransform = useMemo(() => {
    const safeTotal = total || 1;
    const y = ((index + 0.5) / safeTotal) * (TREE_HEIGHT * 0.7) - (TREE_HEIGHT / 2) + 1; 
    const hNorm = (y + TREE_HEIGHT/2) / TREE_HEIGHT;
    const r = BASE_RADIUS * Math.pow(1 - hNorm, 0.8) + 0.5; 
    const theta = index * (Math.PI * 2 / 1.618); 
    
    const pos = new THREE.Vector3(r * Math.cos(theta), y, r * Math.sin(theta));
    const rot = new THREE.Euler(0, -theta - Math.PI / 2, 0);
    const quat = new THREE.Quaternion().setFromEuler(rot);
    
    return { pos, quat };
  }, [index, total]);

  // 2. Calculate Galaxy Position (Random floating)
  const galaxyTransform = useMemo(() => {
    const r = 10 + Math.random() * 10;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.random() * Math.PI;
    
    const pos = new THREE.Vector3(
      r * Math.sin(phi) * Math.cos(theta),
      (Math.random() - 0.5) * 10,
      r * Math.sin(phi) * Math.sin(theta)
    );
    const rot = new THREE.Euler(Math.random(), Math.random(), Math.random());
    const quat = new THREE.Quaternion().setFromEuler(rot);

    return { pos, quat };
  }, []);

  // Helpers for animation
  const targetPos = useMemo(() => new THREE.Vector3(), []);
  const targetQuat = useMemo(() => new THREE.Quaternion(), []);
  const dummyObj = useMemo(() => new THREE.Object3D(), []);

  useFrame((state) => {
    if (!meshRef.current) return;

    let targetScaleValue = 1.0;

    if (mode === 'FOCUS' && isFocused) {
      // --- FOCUS MODE: Position relative to Camera ---
      const camera = state.camera;
      
      // 1. Calculate World Position in front of camera
      const direction = new THREE.Vector3();
      camera.getWorldDirection(direction);
      const worldTargetPos = camera.position.clone().add(direction.multiplyScalar(10));
      
      // 2. Calculate World Rotation to face camera
      dummyObj.position.copy(worldTargetPos);
      dummyObj.lookAt(camera.position);
      const worldTargetQuat = dummyObj.quaternion.clone();

      // 3. Convert World to Local Space
      // This is crucial because the parent group (PhotoGallery) might be rotated (from Tree mode).
      if (meshRef.current.parent) {
          const parent = meshRef.current.parent;
          
          // Position: Transforms world vector to local
          targetPos.copy(worldTargetPos);
          parent.worldToLocal(targetPos);
          
          // Rotation: parentInverse * worldRot
          const parentWorldQuat = new THREE.Quaternion();
          parent.getWorldQuaternion(parentWorldQuat);
          targetQuat.copy(parentWorldQuat.invert().multiply(worldTargetQuat));
      } else {
          targetPos.copy(worldTargetPos);
          targetQuat.copy(worldTargetQuat);
      }

      // Magnify
      targetScaleValue = 2.0;

    } else if (mode === 'TREE') {
      // --- TREE MODE ---
      targetPos.copy(treeTransform.pos);
      targetQuat.copy(treeTransform.quat);
      targetScaleValue = 0.8;

    } else {
      // --- GALAXY MODE ---
      const t = state.clock.getElapsedTime();
      
      // Add floating motion to the base galaxy position
      targetPos.copy(galaxyTransform.pos);
      targetPos.y += Math.sin(t + index) * 0.05; 
      
      // Keep rotation subtle
      const baseQuat = galaxyTransform.quat;
      targetQuat.copy(baseQuat);
      
      targetScaleValue = 1.0;
    }

    // Smooth Interpolation
    // Position
    meshRef.current.position.lerp(targetPos, 0.08);
    // Rotation
    meshRef.current.quaternion.slerp(targetQuat, 0.08);
    // Scale
    const currentScale = meshRef.current.scale.x;
    const nextScale = THREE.MathUtils.lerp(currentScale, targetScaleValue, 0.08);
    meshRef.current.scale.setScalar(nextScale);
  });

  const handleClick = (e: any) => {
    e.stopPropagation();
    if (mode === 'FOCUS' && isFocused) {
      setMode('GALAXY');
      setFocusedPhotoId(null);
    } else {
      setMode('FOCUS');
      setFocusedPhotoId(data.id);
    }
  };

  return (
    <group ref={meshRef}>
      {/* 
        Design: A floating glass block with gold accents 
      */}

      {/* 1. The Glass Body (Crystal Frame) */}
      <RoundedBox args={[3.4, 4.4, 0.1]} radius={0.1} smoothness={4} onClick={handleClick}>
        <meshPhysicalMaterial 
          {...GLASS_MATERIAL_PROPS} 
          toneMapped={false}
        />
      </RoundedBox>

      {/* 2. Inner Gold Border / Rim Light */}
      <mesh position={[0, 0, -0.01]}>
         <planeGeometry args={[3.5, 4.5]} />
         <meshBasicMaterial color="#FFD700" transparent opacity={0.3} toneMapped={false} />
      </mesh>
      
      {/* 3. The Photo itself */}
      <Image 
        url={data.url} 
        scale={[3, 4]} 
        position={[0, 0, 0.06]}
        transparent 
        onClick={handleClick}
        side={THREE.DoubleSide}
      />
      
      {/* 4. Decorative accent */}
      <mesh position={[0, -2.1, 0.06]}>
         <boxGeometry args={[3, 0.05, 0.02]} />
         <meshBasicMaterial color="#ffffff" transparent opacity={0.8} />
      </mesh>
    </group>
  );
};

export const PhotoGallery: React.FC = () => {
  const ref = useRef<THREE.Group>(null);
  const { mode, photos } = useScene();

  useFrame((state) => {
    if (ref.current && mode === 'TREE') {
        ref.current.rotation.y = state.clock.getElapsedTime() * 0.05;
    }
  });

  if (!photos || photos.length === 0) return null;

  return (
    <group ref={ref}>
      {photos.map((photo, i) => (
        <PhotoFrame key={photo.id} data={photo} index={i} total={photos.length} />
      ))}
    </group>
  );
};
