import React, { useRef, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Stars, PerspectiveCamera } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing';
import { ParticleTree } from './components/ParticleTree';
import { GeminiConstellation } from './components/GeminiConstellation';
import { MagicSpiral } from './components/MagicSpiral';
import { Snowflakes } from './components/Snowflakes';
import { PhotoGallery } from './components/PhotoGallery';
import { WishStar } from './components/WishStar';
import { HandController } from './components/HandController';
import { BackgroundMusic } from './components/BackgroundMusic';
import { SceneProvider, useScene } from './context/SceneContext';

const SceneContent: React.FC = () => {
    const { mode, toggleMode, focusedPhotoId, setMode, setFocusedPhotoId } = useScene();

    // Handle background click to exit focus
    const handleBackgroundClick = () => {
        if (mode === 'FOCUS') {
            setMode('GALAXY');
            setFocusedPhotoId(null);
        }
    };

    return (
        <>
             <PerspectiveCamera makeDefault position={[0, 2, 25]} fov={45} />
            
            {/* Controls - Disable during focus mode for cinematic feel */}
            <OrbitControls 
                enablePan={false} 
                enableZoom={mode !== 'FOCUS'} 
                maxPolarAngle={Math.PI / 1.8} 
                minDistance={10} 
                maxDistance={40}
                autoRotate={mode === 'TREE'} // Only rotate automatically in tree mode
                autoRotateSpeed={0.5}
                enabled={mode !== 'FOCUS'}
            />

            {/* Lighting */}
            <ambientLight intensity={0.2} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#ffdddd" />

            {/* Content Group */}
            <group position={[0, -4, 0]} onClick={(e) => e.stopPropagation()}>
                <ParticleTree />
                <MagicSpiral />
                <Snowflakes />
                <PhotoGallery />
                <WishStar />
            </group>
            
            <GeminiConstellation />

            {/* Background Stars */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

            {/* Post Processing */}
            <EffectComposer disableNormalPass>
                <Bloom 
                    luminanceThreshold={0.5} 
                    mipmapBlur 
                    intensity={0.6} 
                    radius={0.5}
                    levels={9}
                />
                <Vignette eskil={false} offset={0.1} darkness={1.1} />
            </EffectComposer>
            
            {/* Invisible plane to catch background clicks */}
            <mesh visible={false} scale={[100, 100, 1]} position={[0, 0, -10]} onClick={handleBackgroundClick}>
                 <planeGeometry />
            </mesh>
        </>
    );
};

const UIOverlay: React.FC<{ isCameraReady: boolean, setIsCameraReady: (v: boolean) => void }> = ({ isCameraReady, setIsCameraReady }) => {
    const { mode, toggleMode, uploadPhoto, triggerWish } = useScene();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [wishText, setWishText] = useState("");
    const [showCamera, setShowCamera] = useState(false);

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadPhoto(file);
        }
    };

    const handleWishSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (wishText.trim()) {
            triggerWish();
            setWishText("");
            // Optional: Show a toast or feedback
        }
    };
    
    return (
        <>
            {showCamera && <HandController onLoadingChange={(ready) => setIsCameraReady(ready)} />}

            {/* Background Music Control */}
            <BackgroundMusic />

            <div className="absolute inset-0 z-20 pointer-events-none flex flex-col items-center justify-between py-8 px-6">
                {/* Header */}
                <div className="text-center mt-4">
                    <h1 className="font-serif-elegant text-4xl md:text-6xl text-white tracking-widest font-thin drop-shadow-[0_0_15px_rgba(255,255,255,0.8)] opacity-90 transition-all duration-1000">
                        {mode === 'TREE' ? '朦朦，圣诞快乐' : '浩瀚星辰，唯你闪耀'}
                    </h1>
                    <p className="mt-2 text-pink-200 text-opacity-80 font-serif tracking-widest text-xs md:text-sm uppercase">
                        Merry Christmas
                    </p>
                </div>

                {/* Main Interactive Layer */}
                <div className="w-full flex flex-col md:flex-row items-end justify-between gap-6 pointer-events-auto">
                    
                    {/* Left: Controls */}
                    <div className="flex flex-col gap-4 items-start">
                         {/* Hidden File Input */}
                        <input 
                            type="file" 
                            ref={fileInputRef} 
                            onChange={handleFileChange} 
                            accept="image/*" 
                            className="hidden" 
                        />
                         
                         <div className="flex gap-3">
                             <button 
                                onClick={handleUploadClick}
                                className="glass-panel px-6 py-2 rounded-full text-pink-100 font-serif tracking-widest hover:bg-white hover:bg-opacity-10 transition-all duration-300 text-xs"
                            >
                                UPLOAD MEMORY
                            </button>
                             <button 
                                onClick={toggleMode}
                                className="glass-panel px-6 py-2 rounded-full text-white font-serif tracking-widest hover:bg-white hover:bg-opacity-10 transition-all duration-300 text-xs"
                            >
                                {mode === 'TREE' ? 'SCATTER' : 'GATHER'}
                            </button>
                         </div>

                         {/* Magic Mode Toggle */}
                         <div className="flex items-center gap-2">
                            <span className="text-xs text-white opacity-50 font-serif">MAGIC MODE</span>
                            <button 
                                onClick={() => setShowCamera(!showCamera)}
                                className={`w-10 h-5 rounded-full flex items-center px-1 transition-colors duration-300 ${showCamera ? 'bg-pink-500' : 'bg-gray-600'}`}
                            >
                                <div className={`w-3 h-3 bg-white rounded-full transform transition-transform duration-300 ${showCamera ? 'translate-x-5' : ''}`} />
                            </button>
                         </div>
                         {showCamera && !isCameraReady && (
                             <span className="text-xs text-pink-300 animate-pulse">Initializing Magic Hand...</span>
                         )}
                    </div>

                    {/* Right: Wish Input */}
                    <div className="w-full md:w-96 glass-panel p-4 rounded-xl">
                        <form onSubmit={handleWishSubmit} className="flex flex-col gap-2">
                            <label className="text-xs text-pink-200 opacity-70 font-serif tracking-widest uppercase">Make a Wish</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={wishText}
                                    onChange={(e) => setWishText(e.target.value)}
                                    placeholder="Best wishes to Yu Menglong" 
                                    className="glass-input w-full rounded-lg px-3 py-2 text-sm font-light tracking-wide placeholder:italic"
                                />
                                <button type="submit" className="bg-white bg-opacity-10 hover:bg-opacity-20 text-white rounded-lg px-3 transition-colors">
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                                    </svg>
                                </button>
                            </div>
                        </form>
                    </div>

                </div>
            </div>
        </>
    );
}

const App: React.FC = () => {
  const [isCameraReady, setIsCameraReady] = useState(false);

  return (
    <SceneProvider>
        <div className="relative w-full h-screen bg-black overflow-hidden">
        {/* Background Gradient */}
        <div 
            className="absolute inset-0 z-0 pointer-events-none"
            style={{
            background: 'radial-gradient(circle at center, #0a0a2a 0%, #000005 100%)'
            }}
        />

        <UIOverlay isCameraReady={isCameraReady} setIsCameraReady={setIsCameraReady} />

        {/* 3D Scene */}
        <Canvas className="z-10" dpr={[1, 2]} shadows>
            <SceneContent />
        </Canvas>
        </div>
    </SceneProvider>
  );
};

export default App;