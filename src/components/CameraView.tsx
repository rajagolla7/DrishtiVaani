import React, { useRef, useEffect, useState } from 'react';
import { DrishtiLanguage, GuidanceFeedback } from '../types';
import { AlertTriangle } from 'lucide-react';

interface CameraViewProps {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  isStreaming: boolean;
  guidance: GuidanceFeedback | null;
  language: DrishtiLanguage;
  onCameraReady?: () => void;
  onError?: (err: string) => void;
}

export const CameraView: React.FC<CameraViewProps> = ({
  videoRef,
  isStreaming,
  guidance,
  language,
  onCameraReady,
  onError,
}) => {
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Directly open camera on both laptops (webcam) and phones (back camera)
  useEffect(() => {
    let active = true;

    async function initCamera() {
      if (!isStreaming) return;

      try {
        let stream: MediaStream | null = null;

        // Try environment camera first (phones)
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
          });
        } catch (envErr) {
          // Fall back directly to default webcam (laptops, desktops, front cameras)
          stream = await navigator.mediaDevices.getUserMedia({
            audio: false,
            video: true,
          });
        }

        if (!active) {
          stream?.getTracks().forEach((t) => t.stop());
          return;
        }

        mediaStreamRef.current = stream;
        if (videoRef.current && stream) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(console.error);
        }

        if (onCameraReady) onCameraReady();
      } catch (err: any) {
        console.warn('Camera access issue:', err);
        if (onError) {
          onError(err.name === 'NotAllowedError' ? 'permission_denied' : 'camera_unavailable');
        }
      }
    }

    initCamera();

    return () => {
      active = false;
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, [isStreaming]);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden bg-black pointer-events-none">
      {/* Live Camera Video Feed (Direct from laptop webcam or phone camera) */}
      <video
        ref={videoRef}
        playsInline
        muted
        autoPlay
        className="w-full h-full object-cover opacity-60 filter contrast-125"
      />

      {/* High-Contrast Vignette for Eyes-Free Screen Readability */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-slate-950/70" />

      {/* Yellow Target Reticle for Centering Objects */}
      <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
        <div className="w-72 h-72 sm:w-84 sm:h-84 border-2 border-yellow-400/40 rounded-3xl relative">
          <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-yellow-400 rounded-tl-xl" />
          <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-yellow-400 rounded-tr-xl" />
          <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-yellow-400 rounded-bl-xl" />
          <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-yellow-400 rounded-br-xl" />
        </div>
      </div>

      {/* Voice Camera Guidance Alert (Only when camera frame needs adjustment) */}
      {guidance && (
        <div className="absolute top-24 left-0 right-0 px-4 flex justify-center z-20 pointer-events-none">
          <div className="bg-amber-500 text-black font-extrabold px-6 py-2.5 rounded-full text-base sm:text-lg shadow-[0_0_25px_rgba(245,158,11,0.9)] flex items-center space-x-3 border-2 border-white animate-bounce">
            <AlertTriangle className="w-6 h-6 text-black flex-shrink-0" />
            <span>{guidance.message[language]}</span>
          </div>
        </div>
      )}
    </div>
  );
};
