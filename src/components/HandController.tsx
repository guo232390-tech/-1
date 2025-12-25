import React, { useEffect, useRef, useState } from 'react';
import { useScene } from '../context/SceneContext';
import { HandGesture } from '../types';

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export const HandController: React.FC<{ onLoadingChange: (loading: boolean) => void }> = ({ onLoadingChange }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const { setMode, mode } = useScene();
  const [lastGesture, setLastGesture] = useState<HandGesture>('NONE');
  
  // Debounce logic
  const gestureFramesRef = useRef(0);
  const currentStableGestureRef = useRef<HandGesture>('NONE');

  useEffect(() => {
    if (!window.Hands || !window.Camera) {
      console.error("MediaPipe scripts not loaded");
      return;
    }

    const hands = new window.Hands({
      locateFile: (file: string) => {
        return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
      }
    });

    hands.setOptions({
      maxNumHands: 1,
      modelComplexity: 1,
      minDetectionConfidence: 0.7,
      minTrackingConfidence: 0.7
    });

    hands.onResults((results: any) => {
      onLoadingChange(false); // First result means it's ready
      
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0];
        const detected = detectGesture(landmarks);

        // Simple debounce: Require 5 consecutive frames of same gesture
        if (detected === currentStableGestureRef.current) {
             gestureFramesRef.current++;
        } else {
             currentStableGestureRef.current = detected;
             gestureFramesRef.current = 0;
        }

        if (gestureFramesRef.current > 5) {
            setLastGesture(detected);
            handleModeSwitch(detected);
        }
        
        // Optional: Map hand x position to camera rotation if in GALAXY mode
        // This would require passing a ref to OrbitControls or updating a value in Context
        // Leaving basic logic here:
        // const x = landmarks[9].x; // Middle finger root
        // if (mode === 'GALAXY') { ... }
      }
    });

    if (videoRef.current) {
      const camera = new window.Camera(videoRef.current, {
        onFrame: async () => {
          await hands.send({ image: videoRef.current! });
        },
        width: 640,
        height: 480
      });
      camera.start();
    }

    return () => {
       hands.close();
    };
  }, []);

  const handleModeSwitch = (gesture: HandGesture) => {
    if (gesture === 'FIST' && mode !== 'TREE') {
        setMode('TREE');
    } else if (gesture === 'OPEN_PALM' && mode === 'TREE') {
        setMode('GALAXY');
    }
  };

  const detectGesture = (landmarks: any[]): HandGesture => {
    // 0: WRIST
    // 8: INDEX_FINGER_TIP
    // 12: MIDDLE_FINGER_TIP
    // 16: RING_FINGER_TIP
    // 20: PINKY_TIP
    
    // Simple heuristic: If tips are closer to wrist than their PIP joints, it's curled.
    const wrist = landmarks[0];
    
    // Check if fingers are extended
    // Tip y < Pip y (assuming hand is upright, but coordinates are normalized 0-1)
    // Better: Distance check.
    
    const isFingerExtended = (tipIdx: number, pipIdx: number) => {
        // Calculate distance to wrist
        const dTip = Math.hypot(landmarks[tipIdx].x - wrist.x, landmarks[tipIdx].y - wrist.y);
        const dPip = Math.hypot(landmarks[pipIdx].x - wrist.x, landmarks[pipIdx].y - wrist.y);
        return dTip > dPip; // Extended if tip is further from wrist
    };

    const indexExt = isFingerExtended(8, 6);
    const middleExt = isFingerExtended(12, 10);
    const ringExt = isFingerExtended(16, 14);
    const pinkyExt = isFingerExtended(20, 18);

    // Thumb is tricky, ignore for simple Fist/Palm
    if (!indexExt && !middleExt && !ringExt && !pinkyExt) {
        return 'FIST';
    }
    
    if (indexExt && middleExt && ringExt && pinkyExt) {
        return 'OPEN_PALM';
    }

    return 'NONE';
  };

  return (
    <div className="absolute top-4 right-4 z-50 opacity-0 pointer-events-none">
       {/* Hidden video element for processing */}
      <video ref={videoRef} className="w-32 h-24" playsInline muted></video>
    </div>
  );
};