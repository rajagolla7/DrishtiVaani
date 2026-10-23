import React from 'react';
import { motion } from 'motion/react';
import { AppState, DrishtiLanguage } from '../types';
import { Mic, Volume2, Loader2, Sparkles, AlertCircle } from 'lucide-react';

interface CentralOrbProps {
  state: AppState;
  statusText: string;
  subText?: string;
  language: DrishtiLanguage;
  onClick: () => void;
}

export const CentralOrb: React.FC<CentralOrbProps> = ({
  state,
  statusText,
  subText,
  language,
  onClick,
}) => {
  // Determine color and glow styles based on app state
  const getOrbVisuals = () => {
    switch (state) {
      case 'idle':
        return {
          bg: 'bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-400',
          shadow: 'shadow-[0_0_60px_rgba(245,158,11,0.6)]',
          border: 'border-4 border-yellow-300',
          icon: <Sparkles className="w-16 h-16 text-black" strokeWidth={2.5} />,
          pulse: { scale: [1, 1.05, 1], transition: { repeat: Infinity, duration: 2 } },
        };
      case 'starting':
      case 'processing':
        return {
          bg: 'bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-500',
          shadow: 'shadow-[0_0_70px_rgba(6,182,212,0.7)]',
          border: 'border-4 border-cyan-300',
          icon: <Loader2 className="w-16 h-16 text-white animate-spin" strokeWidth={2.5} />,
          pulse: { scale: [1, 1.03, 1], transition: { repeat: Infinity, duration: 1 } },
        };
      case 'listening':
        return {
          bg: 'bg-gradient-to-tr from-emerald-600 via-emerald-500 to-teal-400',
          shadow: 'shadow-[0_0_80px_rgba(16,185,129,0.8)]',
          border: 'border-4 border-emerald-200',
          icon: <Mic className="w-16 h-16 text-black animate-pulse" strokeWidth={2.8} />,
          pulse: {
            scale: [1, 1.12, 1],
            transition: { repeat: Infinity, duration: 1.4, ease: 'easeInOut' as const },
          },
        };
      case 'speaking':
        return {
          bg: 'bg-gradient-to-tr from-amber-500 via-yellow-400 to-orange-400',
          shadow: 'shadow-[0_0_90px_rgba(250,204,21,0.9)]',
          border: 'border-4 border-white',
          icon: <Volume2 className="w-16 h-16 text-black" strokeWidth={3} />,
          pulse: {
            scale: [1, 1.15, 1.02, 1.18, 1],
            transition: { repeat: Infinity, duration: 1.2 },
          },
        };
      case 'error':
        return {
          bg: 'bg-gradient-to-tr from-rose-700 via-red-600 to-rose-500',
          shadow: 'shadow-[0_0_60px_rgba(239,68,68,0.7)]',
          border: 'border-4 border-rose-300',
          icon: <AlertCircle className="w-16 h-16 text-white" strokeWidth={2.5} />,
          pulse: { scale: [1, 1.02, 1], transition: { repeat: 1, duration: 0.3 } },
        };
    }
  };

  const visuals = getOrbVisuals();

  return (
    <div className="flex flex-col items-center justify-center p-4 select-none pointer-events-none">
      {/* Outer ripple rings for visual contrast and feedback */}
      <div className="relative flex items-center justify-center">
        {state === 'listening' && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.8 }}
              animate={{ scale: 1.6, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, ease: 'easeOut' }}
              className="absolute w-44 h-44 rounded-full border-4 border-emerald-400"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 1.9, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 2, delay: 0.5, ease: 'easeOut' }}
              className="absolute w-44 h-44 rounded-full border-2 border-emerald-300"
            />
          </>
        )}

        {state === 'speaking' && (
          <>
            <motion.div
              initial={{ scale: 1, opacity: 0.9 }}
              animate={{ scale: 1.7, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.3, ease: 'easeOut' }}
              className="absolute w-44 h-44 rounded-full border-4 border-yellow-300"
            />
            <motion.div
              initial={{ scale: 1, opacity: 0.7 }}
              animate={{ scale: 2.1, opacity: 0 }}
              transition={{ repeat: Infinity, duration: 1.3, delay: 0.3, ease: 'easeOut' }}
              className="absolute w-44 h-44 rounded-full border-2 border-amber-400"
            />
          </>
        )}

        {/* The Central Interactive Orb */}
        <motion.div
          animate={visuals.pulse}
          className={`w-44 h-44 rounded-full flex flex-col items-center justify-center transition-all duration-300 cursor-pointer ${visuals.bg} ${visuals.shadow} ${visuals.border}`}
          aria-label={statusText}
        >
          {visuals.icon}
          <span className="text-xs font-bold tracking-widest text-black/80 mt-2 uppercase">
            DrishtiVaani
          </span>
        </motion.div>
      </div>

      {/* Prominent high-contrast status text (32px+ for low-vision accessibility) */}
      <div className="mt-8 text-center max-w-sm px-4">
        <h2
          className="text-3xl sm:text-4xl font-black tracking-tight text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] leading-tight"
          aria-live="polite"
        >
          {statusText}
        </h2>
        {subText && (
          <p className="mt-2 text-lg sm:text-xl font-semibold text-slate-200 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
            {subText}
          </p>
        )}
      </div>
    </div>
  );
};
