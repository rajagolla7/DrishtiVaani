export type DrishtiMode = 'auto' | 'medicine' | 'bill' | 'currency' | 'sign' | 'general';

export type DrishtiLanguage = 'te' | 'hi' | 'en';

export type AppState =
  | 'idle' // waiting for initial single tap to start audio/camera
  | 'starting' // requesting permissions, connecting
  | 'listening' // listening to user voice or monitoring camera
  | 'processing' // reading / analyzing frame
  | 'speaking' // speaking response out loud
  | 'error';

export interface GuidanceFeedback {
  type: 'dark' | 'bright' | 'closer' | 'further' | 'steady' | 'aligned' | 'reading' | 'none';
  message: {
    te: string;
    hi: string;
    en: string;
  };
  shouldVibrate: boolean;
  timestamp: number;
}

export interface ModeInfo {
  id: DrishtiMode;
  name: {
    te: string;
    hi: string;
    en: string;
  };
  iconName: string;
  description: {
    te: string;
    hi: string;
    en: string;
  };
  sampleVoicePrompt: {
    te: string;
    hi: string;
    en: string;
  };
}
