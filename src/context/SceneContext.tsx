import React, { createContext, useContext, useState, ReactNode } from 'react';
import { AppMode, PhotoData } from '../types';

// Initial Mock Data - Empty by default
const INITIAL_PHOTOS: PhotoData[] = [];

interface SceneContextType {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  focusedPhotoId: number | null;
  setFocusedPhotoId: (id: number | null) => void;
  toggleMode: () => void;
  photos: PhotoData[];
  uploadPhoto: (file: File) => void;
  
  // Wish System
  isWishActive: boolean;
  triggerWish: () => void;
  spiralBoost: number; // 0 to 1
  setSpiralBoost: (val: number) => void;
  completeWish: () => void;
}

const SceneContext = createContext<SceneContextType | undefined>(undefined);

export const SceneProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mode, setMode] = useState<AppMode>('TREE');
  const [focusedPhotoId, setFocusedPhotoId] = useState<number | null>(null);
  const [photos, setPhotos] = useState<PhotoData[]>(INITIAL_PHOTOS);
  
  // Wish State
  const [isWishActive, setIsWishActive] = useState(false);
  const [spiralBoost, setSpiralBoost] = useState(0);

  const toggleMode = () => {
    if (mode === 'TREE') {
      setMode('GALAXY');
    } else if (mode === 'GALAXY') {
      setMode('TREE');
      setFocusedPhotoId(null);
    } else if (mode === 'FOCUS') {
      setMode('GALAXY');
      setFocusedPhotoId(null);
    }
  };

  const uploadPhoto = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        const newUrl = e.target.result as string;
        
        setPhotos(prev => {
          const newPhoto: PhotoData = {
            id: Date.now(),
            url: newUrl,
            title: 'New Memory'
          };
          const newPhotos = [newPhoto, ...prev].slice(0, 12);
          return newPhotos;
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const triggerWish = () => {
    if (isWishActive) return;
    setIsWishActive(true);
    setSpiralBoost(0);
  };

  const completeWish = () => {
    setIsWishActive(false);
    // Spiral boost will be decayed in the component, or we can set it to start decaying here
  };

  return (
    <SceneContext.Provider value={{ 
      mode, setMode, focusedPhotoId, setFocusedPhotoId, toggleMode, photos, uploadPhoto,
      isWishActive, triggerWish, spiralBoost, setSpiralBoost, completeWish
    }}>
      {children}
    </SceneContext.Provider>
  );
};

export const useScene = () => {
  const context = useContext(SceneContext);
  if (!context) {
    throw new Error('useScene must be used within a SceneProvider');
  }
  return context;
};