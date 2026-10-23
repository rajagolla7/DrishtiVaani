import React from 'react';
import { DrishtiMode, DrishtiLanguage } from '../types';
import { MODES } from '../utils/modes';
import { ChevronLeft, ChevronRight, Pill, Receipt, Banknote, MapPin, Eye } from 'lucide-react';

interface ModeSelectorProps {
  currentMode: DrishtiMode;
  language: DrishtiLanguage;
  onSelectMode: (mode: DrishtiMode) => void;
  onNextMode: () => void;
  onPrevMode: () => void;
}

export const ModeSelector: React.FC<ModeSelectorProps> = ({
  currentMode,
  language,
  onSelectMode,
  onNextMode,
  onPrevMode,
}) => {
  const currentIndex = MODES.findIndex((m) => m.id === currentMode);
  const activeMode = MODES[currentIndex] || MODES[0];

  const getModeIcon = (id: DrishtiMode) => {
    switch (id) {
      case 'medicine':
        return <Pill className="w-8 h-8 text-amber-300" strokeWidth={2.5} />;
      case 'bill':
        return <Receipt className="w-8 h-8 text-cyan-300" strokeWidth={2.5} />;
      case 'currency':
        return <Banknote className="w-8 h-8 text-emerald-300" strokeWidth={2.5} />;
      case 'sign':
        return <MapPin className="w-8 h-8 text-orange-300" strokeWidth={2.5} />;
      case 'general':
      default:
        return <Eye className="w-8 h-8 text-purple-300" strokeWidth={2.5} />;
    }
  };

  return (
    <div
      className="w-full max-w-md mx-auto px-4 py-2"
      role="region"
      aria-label="Active mode selection"
    >
      <div className="bg-slate-900/90 border-2 border-yellow-400/80 rounded-2xl p-3 shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur-md">
        <div className="flex items-center justify-between">
          {/* Previous Mode Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onPrevMode();
            }}
            aria-label="Previous mode"
            className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-yellow-300 active:scale-95 active:bg-yellow-400 active:text-black focus:outline-none focus:ring-4 focus:ring-yellow-400 transition"
          >
            <ChevronLeft className="w-8 h-8" />
          </button>

          {/* Active Mode Display */}
          <div className="flex-1 flex items-center justify-center space-x-3 px-2 text-center">
            {getModeIcon(activeMode.id)}
            <div>
              <div className="text-xs font-bold text-yellow-400 tracking-wider uppercase">
                {language === 'te' ? 'ప్రస్తుత మోడ్' : language === 'hi' ? 'सक्रिय मोड' : 'Active Mode'} ({currentIndex + 1}/5)
              </div>
              <div className="text-2xl font-black text-white leading-tight">
                {activeMode.name[language]}
              </div>
            </div>
          </div>

          {/* Next Mode Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onNextMode();
            }}
            aria-label="Next mode"
            className="w-14 h-14 rounded-xl bg-slate-800 border border-slate-600 flex items-center justify-center text-yellow-300 active:scale-95 active:bg-yellow-400 active:text-black focus:outline-none focus:ring-4 focus:ring-yellow-400 transition"
          >
            <ChevronRight className="w-8 h-8" />
          </button>
        </div>

        {/* Short mode description */}
        <p className="mt-2 text-sm text-center font-medium text-amber-200/90 leading-snug">
          {activeMode.description[language]}
        </p>

        {/* Mode dots indicator */}
        <div className="flex justify-center items-center gap-2 mt-2" aria-hidden="true">
          {MODES.map((m, idx) => (
            <button
              key={m.id}
              onClick={(e) => {
                e.stopPropagation();
                onSelectMode(m.id);
              }}
              className={`h-2.5 rounded-full transition-all ${
                idx === currentIndex ? 'w-8 bg-yellow-400' : 'w-2.5 bg-slate-700'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
