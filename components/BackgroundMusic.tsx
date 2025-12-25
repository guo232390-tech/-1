import React, { useEffect, useRef, useState } from 'react';

// Using a reliable public domain (CC BY 3.0) source: Kevin MacLeod - Silent Night
// It has a serene, atmospheric quality fitting the starry night theme.
const MUSIC_URL = "https://upload.wikimedia.org/wikipedia/commons/e/e5/Kevin_MacLeod_-_Silent_Night.ogg";

export const BackgroundMusic: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0; // Start at 0 for fade-in

    // Try to play automatically
    const playPromise = audio.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          setIsPlaying(true);
          fadeIn(audio);
        })
        .catch((error) => {
          console.log("Autoplay prevented. Waiting for interaction.");
          // Add global listener for first interaction
          const handleInteraction = () => {
            if (!hasInteracted) {
              audio.play();
              setIsPlaying(true);
              fadeIn(audio);
              setHasInteracted(true);
              window.removeEventListener('click', handleInteraction);
              window.removeEventListener('keydown', handleInteraction);
            }
          };
          window.addEventListener('click', handleInteraction);
          window.addEventListener('keydown', handleInteraction);
        });
    }

    return () => {
      // Cleanup usually handled by browser, but good practice
    };
  }, []);

  const fadeIn = (audio: HTMLAudioElement) => {
    let vol = 0;
    const interval = setInterval(() => {
      if (vol < 0.4) { // Max volume 0.4 to keep it subtle
        vol += 0.01;
        audio.volume = vol;
      } else {
        clearInterval(interval);
      }
    }, 100);
  };

  const togglePlay = () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    setIsPlaying(!isPlaying);
  };

  return (
    <div className="fixed bottom-6 left-6 z-50 pointer-events-auto">
      <audio ref={audioRef} src={MUSIC_URL} loop crossOrigin="anonymous" />
      
      <button 
        onClick={togglePlay}
        className={`
            group flex items-center justify-center w-10 h-10 rounded-full 
            glass-panel border border-white border-opacity-20
            hover:bg-white hover:bg-opacity-10 transition-all duration-500
            ${isPlaying ? 'animate-pulse-slow' : 'opacity-60'}
        `}
        title={isPlaying ? "Mute Music" : "Play Music"}
      >
        {isPlaying ? (
          /* Playing Icon (Sound Waves) */
          <div className="flex gap-0.5 items-end h-3">
             <div className="w-0.5 bg-pink-200 animate-[music-bar_1s_ease-in-out_infinite]" style={{animationDelay: '0s', height: '40%'}}></div>
             <div className="w-0.5 bg-pink-200 animate-[music-bar_1.2s_ease-in-out_infinite]" style={{animationDelay: '0.2s', height: '100%'}}></div>
             <div className="w-0.5 bg-pink-200 animate-[music-bar_0.8s_ease-in-out_infinite]" style={{animationDelay: '0.4s', height: '60%'}}></div>
             <div className="w-0.5 bg-pink-200 animate-[music-bar_1.1s_ease-in-out_infinite]" style={{animationDelay: '0.1s', height: '80%'}}></div>
          </div>
        ) : (
          /* Muted Icon */
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-white opacity-70">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
          </svg>
        )}
      </button>

      <style>{`
        @keyframes music-bar {
          0%, 100% { height: 30%; opacity: 0.5; }
          50% { height: 100%; opacity: 1; }
        }
        .animate-pulse-slow {
            animation: pulse-glow 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
        }
        @keyframes pulse-glow {
            0%, 100% { box-shadow: 0 0 0 0px rgba(255, 192, 203, 0); }
            50% { box-shadow: 0 0 10px 2px rgba(255, 192, 203, 0.2); }
        }
      `}</style>
    </div>
  );
};
