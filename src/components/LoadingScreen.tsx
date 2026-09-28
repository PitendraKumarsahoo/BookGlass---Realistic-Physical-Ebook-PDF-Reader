import React, { useState, useEffect } from 'react';

interface LoadingScreenProps {
  fileName?: string;
}

export const LoadingScreen: React.FC<LoadingScreenProps> = ({ fileName }) => {
  const [phase, setPhase] = useState<string>('Preparing your book...');

  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase('Binding pages & analyzing structure...');
    }, 450);

    const t2 = setTimeout(() => {
      setPhase('Opening pages to your reading desk...');
    }, 950);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#090a0f] text-stone-200">
      {/* Soft ambient center lamp glow */}
      <div className="absolute w-96 h-96 rounded-full bg-amber-500/10 blur-[100px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center max-w-sm px-6 text-center">
        {/* Animated opening book icon */}
        <div className="relative w-20 h-16 mb-8 perspective-[800px]">
          {/* Left book wing */}
          <div className="absolute left-0 top-0 w-10 h-16 bg-stone-800 border border-stone-700/60 rounded-l-md shadow-lg origin-right animate-pulse flex items-center justify-end pr-1">
            <div className="w-[1px] h-12 bg-stone-700" />
          </div>

          {/* Right book wing */}
          <div className="absolute right-0 top-0 w-10 h-16 bg-stone-100 border border-stone-300 rounded-r-md shadow-2xl origin-left flex items-center pl-1">
            <div className="w-[1px] h-12 bg-stone-300" />
          </div>

          {/* Flipping middle page */}
          <div
            className="absolute left-10 top-0 w-10 h-16 bg-amber-50 border border-amber-200/80 rounded-r-md shadow-xl origin-left"
            style={{
              animation: 'flipPage 1.2s cubic-bezier(0.4, 0, 0.2, 1) infinite alternate',
            }}
          />

          {/* Spine crease */}
          <div className="absolute left-1/2 top-0 -translate-x-1/2 w-1.5 h-16 bg-stone-900 shadow-md" />
        </div>

        <h3 className="font-serif text-xl tracking-wide text-stone-100 mb-2 font-medium">
          {phase}
        </h3>

        {fileName && (
          <p className="text-xs text-stone-400 font-sans truncate max-w-xs mb-6">
            {fileName}
          </p>
        )}

        {/* Minimal progress line */}
        <div className="w-48 h-1 bg-stone-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-600 via-amber-400 to-amber-200 rounded-full"
            style={{
              animation: 'loadingProgress 1.4s ease-in-out infinite',
            }}
          />
        </div>
      </div>

      <style>{`
        @keyframes flipPage {
          0% {
            transform: rotateY(0deg);
          }
          100% {
            transform: rotateY(-175deg);
          }
        }
        @keyframes loadingProgress {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(100%);
          }
        }
      `}</style>
    </div>
  );
};
