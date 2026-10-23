/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  DrishtiLanguage,
  AppState,
  GuidanceFeedback,
} from './types';
import {
  LiveAudioPlayer,
  floatTo16BitPCMBase64,
  playAccessibilityChime,
  unlockAudioContext,
} from './utils/audio';
import {
  analyzeVideoFrame,
  triggerTactilePulse,
} from './utils/cameraAnalysis';
import {
  speakAssistantMessage,
  stopAllSpeech,
  isCurrentlySpeaking,
  parseSpokenInput,
} from './utils/speech';
import {
  saveScanToMemory,
  searchVoiceMemory,
  clearVoiceMemory,
} from './utils/voiceMemory';
import { triggerEmergencyFlow } from './utils/emergency';
import { shareScanWithFamily } from './utils/familyShare';
import {
  currentNavSession,
  planWalkingRoute,
  confirmAndStartWalkingNavigation,
  handleLiveLocationUpdate,
  getWhereAmISpoken,
  getRemainingDistanceSpoken,
  reverseWalkingRoute,
  stopWalkingNavigation,
} from './utils/walkingNavigation';
import { CentralOrb } from './components/CentralOrb';
import { CameraView } from './components/CameraView';
import { HelpModal } from './components/HelpModal';
import {
  HelpCircle,
  Globe,
  RotateCcw,
  Volume2,
} from 'lucide-react';

export default function App() {
  // Core state
  const [appState, setAppState] = useState<AppState>('idle');
  const [currentLanguage, setCurrentLanguage] = useState<DrishtiLanguage>('te');
  const [statusText, setStatusText] = useState<string>('ప్రారంభించడానికి తాకండి');
  const [subText, setSubText] = useState<string>('Tap anywhere on screen to start');
  const [lastSpokenResponse, setLastSpokenResponse] = useState<string>('');
  const [guidance, setGuidance] = useState<GuidanceFeedback | null>(null);
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  const [isLiveActive, setIsLiveActive] = useState<boolean>(false);
  const [recognizedUserText, setRecognizedUserText] = useState<string>('');
  const [detectedCategory, setDetectedCategory] = useState<string>('auto');

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const offscreenCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const liveAudioPlayerRef = useRef<LiveAudioPlayer | null>(null);
  const micStreamRef = useRef<MediaStream | null>(null);
  const micAudioContextRef = useRef<AudioContext | null>(null);
  const micProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const speechRecognitionRef = useRef<any>(null);

  // Gesture & interaction tracking
  const lastTapRef = useRef<number>(0);
  const lastTouchTimeRef = useRef<number>(0);
  const isProcessingRef = useRef<boolean>(false);
  const analysisAbortControllerRef = useRef<AbortController | null>(null);
  const isWaitingForVoiceRef = useRef<boolean>(false);
  const voiceTimeoutRef = useRef<any>(null);
  const pendingConfirmationRef = useRef<'clear_memory' | null>(null);
  const questionHistoryRef = useRef<Array<{ question: string; answer: string; timestamp: number }>>([]);
  const lastSpokenResponseRef = useRef<string>('');
  const navWatchIdRef = useRef<number | null>(null);
  const hazardScanIntervalRef = useRef<any>(null);
  const currentLanguageRef = useRef<DrishtiLanguage>(currentLanguage);
  const appStateRef = useRef<AppState>(appState);
  const detectedCategoryRef = useRef<string>(detectedCategory);

  // Sync refs
  useEffect(() => {
    currentLanguageRef.current = currentLanguage;
  }, [currentLanguage]);

  useEffect(() => {
    lastSpokenResponseRef.current = lastSpokenResponse;
  }, [lastSpokenResponse]);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  useEffect(() => {
    detectedCategoryRef.current = detectedCategory;
  }, [detectedCategory]);

  // Init canvas for guidance analysis
  useEffect(() => {
    const canvas = document.createElement('canvas');
    offscreenCanvasRef.current = canvas;
  }, []);

  // Localized default status display
  const updateStatusDisplay = useCallback(
    (state: AppState, overrideStatus?: string, overrideSub?: string) => {
      setAppState(state);
      appStateRef.current = state;

      if (overrideStatus) {
        setStatusText(overrideStatus);
        setSubText(overrideSub || '');
        return;
      }

      const lang = currentLanguageRef.current;
      switch (state) {
        case 'idle':
          setStatusText(
            lang === 'te'
              ? 'ప్రారంభించడానికి తాకండి'
              : lang === 'hi'
              ? 'शुरू करने के लिए टैप करें'
              : 'Tap anywhere to start'
          );
          setSubText(
            lang === 'te'
              ? 'కెమెరా మరియు వాయిస్ మొదలవుతాయి'
              : lang === 'hi'
              ? 'कैमरा और आवाज शुरू होंगे'
              : 'Camera & voice will start'
          );
          break;
        case 'starting':
          setStatusText(
            lang === 'te'
              ? 'కనెక్ట్ అవుతోంది...'
              : lang === 'hi'
              ? 'कनेक्ट हो रहा है...'
              : 'Connecting...'
          );
          setSubText(
            lang === 'te'
              ? 'దయచేసి వేచి ఉండండి'
              : lang === 'hi'
              ? 'कृपया प्रतीक्षा करें'
              : 'Please wait'
          );
          break;
        case 'listening':
          setStatusText(
            lang === 'te'
              ? 'వింటున్నాను...'
              : lang === 'hi'
              ? 'सुन रहा हूँ...'
              : 'Listening...'
          );
          setSubText(
            lang === 'te'
              ? 'ఏదైనా అడగండి లేదా కెమెరా చూపించండి'
              : lang === 'hi'
              ? 'कुछ भी पूछें या कैमरा दिखाएं'
              : 'Ask a question or point camera'
          );
          break;
        case 'processing':
          setStatusText(
            lang === 'te'
              ? 'విశ్లేషిస్తున్నాను...'
              : lang === 'hi'
              ? 'जांच कर रहा हूँ...'
              : 'Analyzing...'
          );
          setSubText(
            lang === 'te'
              ? 'దయచేసి కదలకుండా ఉండండి'
              : lang === 'hi'
              ? 'कृपया स्थिर रखें'
              : 'Please hold steady'
          );
          break;
        case 'speaking':
          setStatusText(
            lang === 'te'
              ? 'చెబుతున్నాను...'
              : lang === 'hi'
              ? 'बोल रहा हूँ...'
              : 'Speaking...'
          );
          setSubText(
            lang === 'te'
              ? 'ఆపడానికి ఎక్కడైనా తాకండి'
              : lang === 'hi'
              ? 'रोकने के लिए टैप करें'
              : 'Tap anywhere to stop'
          );
          break;
        case 'error':
          setStatusText(
            lang === 'te'
              ? 'మళ్ళీ ప్రయత్నించండి'
              : lang === 'hi'
              ? 'पुनः प्रयास करें'
              : 'Please try again'
          );
          setSubText(
            lang === 'te'
              ? 'స్క్రీన్‌పై మరోసారి తట్టండి'
              : lang === 'hi'
              ? 'स्क्रीन पर फिर से टैप करें'
              : 'Tap screen to retry'
          );
          break;
      }
    },
    []
  );

  // Directly capture high-resolution frame from live video
  const captureCurrentFrame = useCallback((): string | null => {
    if (videoRef.current && videoRef.current.readyState >= 2 && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = Math.min(video.videoWidth || 1280, 1280);
      canvas.height = Math.min(video.videoHeight || 720, 720);
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.85);
      }
    }
    return null;
  }, []);

  // Repeat last spoken response
  const repeatLastAnswer = useCallback(() => {
    const text = lastSpokenResponseRef.current;
    if (!text) {
      const msg =
        currentLanguageRef.current === 'te'
          ? 'ఇంకా ఏ సమాచారం రికార్డు కాలేదు. కెమెరాను దేనిపైకైనా చూపించి నన్ను ప్రశ్న అడగండి.'
          : currentLanguageRef.current === 'hi'
          ? 'अभी तक कोई जानकारी नहीं पढ़ी गई है। कृपया वस्तु की ओर कैमरा करें।'
          : 'No information read yet. Point the camera at something and ask.';
      speakAssistantMessage(msg, currentLanguageRef.current);
      return;
    }

    triggerTactilePulse([60, 40, 60]);
    playAccessibilityChime('read');
    updateStatusDisplay('speaking', 'మళ్ళీ చెబుతున్నాను...');
    speakAssistantMessage(
      text,
      currentLanguageRef.current,
      () => updateStatusDisplay('speaking', 'మళ్ళీ చెబుతున్నాను...'),
      () => updateStatusDisplay('listening')
    );
  }, [updateStatusDisplay]);

  // Language switching helper
  const switchLanguage = useCallback(
    (newLang: DrishtiLanguage) => {
      setCurrentLanguage(newLang);
      currentLanguageRef.current = newLang;
      triggerTactilePulse([50, 50]);
      playAccessibilityChime('modeSwitch');

      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(
          JSON.stringify({
            type: 'config',
            language: newLang,
          })
        );
      }

      const announcement =
        newLang === 'te'
          ? 'భాష తెలుగుకు మార్చబడింది.'
          : newLang === 'hi'
          ? 'भाषा हिंदी में बदल दी गई है।'
          : 'Language changed to English.';

      updateStatusDisplay('speaking', announcement);
      speakAssistantMessage(
        announcement,
        newLang,
        () => updateStatusDisplay('speaking', announcement),
        () => updateStatusDisplay('listening')
      );
    },
    [updateStatusDisplay]
  );

  // AUTOMATIC VISION & QUESTION ANSWERING
  const performSmartAnalysis = useCallback(
    async (userQuestion = '') => {
      // Cancel previous pending request immediately to minimize latency and prevent overlapping responses
      if (analysisAbortControllerRef.current) {
        analysisAbortControllerRef.current.abort();
        analysisAbortControllerRef.current = null;
      }

      const controller = new AbortController();
      analysisAbortControllerRef.current = controller;
      isProcessingRef.current = true;
      isWaitingForVoiceRef.current = false;
      if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);

      triggerTactilePulse(50);
      playAccessibilityChime('read');
      updateStatusDisplay('processing');

      try {
        const frameData = captureCurrentFrame();
        if (!frameData) {
          // If frame is still initializing, gently inform by voice
          const msg =
            currentLanguageRef.current === 'te'
              ? 'కెమెరా చిత్రం అందలేదు. దయచేసి కెమెరా అనుమతిని సరిచూసి మళ్ళీ ప్రయత్నించండి.'
              : currentLanguageRef.current === 'hi'
              ? 'कैमरा चित्र उपलब्ध नहीं है। कृपया कैमरा अनुमति जांचें।'
              : 'Camera frame not available. Please check camera permission and try again.';
          speakAssistantMessage(msg, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        const history = questionHistoryRef.current;
        const lastEntry = history.length > 0 ? history[history.length - 1] : null;

        const res = await fetch('/api/analyze-frame', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            image: frameData,
            language: currentLanguageRef.current,
            userQuery: userQuestion,
            previousQuestion: lastEntry ? lastEntry.question : '',
            previousAnswer: lastEntry ? lastEntry.answer : '',
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          throw new Error('Analysis request failed');
        }

        const data = await res.json();
        // If superseded by a newer request while awaiting, bail out silently
        if (controller.signal.aborted) return;

        const responseText = data.text || '';
        const category = data.category || 'auto';

        // Record question & answer in conversation history
        if (userQuestion && userQuestion.trim().length > 0) {
          questionHistoryRef.current.push({
            question: userQuestion.trim(),
            answer: responseText,
            timestamp: Date.now(),
          });
          if (questionHistoryRef.current.length > 15) {
            questionHistoryRef.current.shift();
          }
        }

        setDetectedCategory(category);
        detectedCategoryRef.current = category;
        setLastSpokenResponse(responseText);
        lastSpokenResponseRef.current = responseText;

        // Tactile pulse confirmation that reading is ready
        triggerTactilePulse([80, 40, 80]);

        // Speak the answer aloud
        const previewText = responseText.slice(0, 45) + '...';
        updateStatusDisplay('speaking', previewText);
        await speakAssistantMessage(
          responseText,
          currentLanguageRef.current,
          () => updateStatusDisplay('speaking', previewText),
          () => updateStatusDisplay('listening')
        );
      } catch (err: any) {
        // Silently ignore aborted requests when user initiated a new command
        if (err?.name === 'AbortError' || controller.signal.aborted) {
          return;
        }

        console.error('Smart analysis error:', err);
        playAccessibilityChime('error');
        updateStatusDisplay('error');

        const errMsg =
          currentLanguageRef.current === 'te'
            ? 'క్షమించండి, వివరాలు చదవడం సాధ్యం కాలేదు. దయచేసి మళ్ళీ ప్రయత్నించండి.'
            : currentLanguageRef.current === 'hi'
            ? 'माफ़ कीजिए, पढ़ने में समस्या आई। कृपया पुनः प्रयास करें।'
            : 'I could not connect, please try again.';

        speakAssistantMessage(errMsg, currentLanguageRef.current, undefined, () =>
          updateStatusDisplay('listening')
        );
      } finally {
        if (analysisAbortControllerRef.current === controller) {
          analysisAbortControllerRef.current = null;
          isProcessingRef.current = false;
        }
      }
    },
    [captureCurrentFrame, updateStatusDisplay]
  );

  // Walking Navigation Live Tracking
  const stopLiveWalkingTracking = useCallback(() => {
    if (navWatchIdRef.current !== null && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(navWatchIdRef.current);
      navWatchIdRef.current = null;
    }
    if (hazardScanIntervalRef.current) {
      clearInterval(hazardScanIntervalRef.current);
      hazardScanIntervalRef.current = null;
    }
  }, []);

  const startLiveWalkingTracking = useCallback(() => {
    stopLiveWalkingTracking();

    const onStepAlert = (instructionText: string) => {
      triggerTactilePulse([60, 40, 60]);
      updateStatusDisplay('speaking', instructionText.slice(0, 45) + '...');
      speakAssistantMessage(
        instructionText,
        currentLanguageRef.current,
        () => updateStatusDisplay('speaking', instructionText.slice(0, 45) + '...'),
        () => updateStatusDisplay('listening')
      );
    };

    // 1. Confirm and speak first step
    confirmAndStartWalkingNavigation(currentLanguageRef.current, onStepAlert);

    // 2. Track GPS position with watchPosition
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          handleLiveLocationUpdate(pos, currentLanguageRef.current, onStepAlert);
        },
        (err) => console.warn('watchPosition error:', err),
        { enableHighAccuracy: true, maximumAge: 2000, timeout: 5000 }
      );
      navWatchIdRef.current = watchId;
    }

    // 3. Periodic Camera Awareness Hazard Scanner while walking (every 3.5s)
    hazardScanIntervalRef.current = setInterval(async () => {
      if (
        currentNavSession.status === 'active' &&
        !isCurrentlySpeaking() &&
        !isProcessingRef.current
      ) {
        const frameData = captureCurrentFrame();
        if (frameData) {
          try {
            const hRes = await fetch('/api/navigation/hazard-check', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                image: frameData,
                language: currentLanguageRef.current,
              }),
            });
            if (hRes.ok) {
              const hData = await hRes.json();
              if (hData.hazard && !isCurrentlySpeaking()) {
                triggerTactilePulse(80);
                speakAssistantMessage(
                  hData.hazard,
                  currentLanguageRef.current,
                  undefined,
                  undefined,
                  true
                );
              }
            }
          } catch (e) {
            // ignore
          }
        }
      }
    }, 3500);
  }, [captureCurrentFrame, stopLiveWalkingTracking, updateStatusDisplay]);

  // DISPATCHER FOR ALL 7 VOICE FEATURES (Silent seamless intent switching)
  const handleVoiceIntent = useCallback(
    async (transcript: string) => {
      const cmd = parseSpokenInput(transcript);
      console.log('[Voice Intent Detected]:', cmd.type, transcript);

      // Handle pending confirmation for deletion
      if (pendingConfirmationRef.current === 'clear_memory') {
        const lower = transcript.toLowerCase();
        if (
          lower.includes('అవును') ||
          lower.includes('yes') ||
          lower.includes('హా') ||
          lower.includes('చేయి') ||
          lower.includes('डिलीट')
        ) {
          clearVoiceMemory();
          pendingConfirmationRef.current = null;
          const msg =
            currentLanguageRef.current === 'te'
              ? 'సేవ్ చేసిన వివరాలన్నీ తొలగించబడ్డాయి.'
              : currentLanguageRef.current === 'hi'
              ? 'सभी सेव की गई जानकारी हटा दी गई है।'
              : 'All saved scans have been deleted.';
          speakAssistantMessage(msg, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        } else {
          pendingConfirmationRef.current = null;
          const msg =
            currentLanguageRef.current === 'te'
              ? 'రద్దు చేయబడింది.'
              : currentLanguageRef.current === 'hi'
              ? 'रद्द कर दिया गया।'
              : 'Cancelled.';
          speakAssistantMessage(msg, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }
      }

      switch (cmd.type) {
        // 0. PREVIOUS QUESTION
        case 'previous_question': {
          const history = questionHistoryRef.current;
          if (history.length > 0) {
            const lastEntry = history[history.length - 1];
            const answerMsg =
              currentLanguageRef.current === 'te'
                ? `మీరు ఇందాక అడిగిన ప్రశ్న: "${lastEntry.question}". నేను ఇచ్చిన సమాధానం: "${lastEntry.answer}".`
                : currentLanguageRef.current === 'hi'
                ? `आपका पिछला सवाल था: "${lastEntry.question}"। मेरा जवाब था: "${lastEntry.answer}"।`
                : `Your previous question was: "${lastEntry.question}". My answer was: "${lastEntry.answer}".`;

            setLastSpokenResponse(answerMsg);
            lastSpokenResponseRef.current = answerMsg;
            updateStatusDisplay('speaking', answerMsg.slice(0, 45) + '...');
            speakAssistantMessage(answerMsg, currentLanguageRef.current, undefined, () =>
              updateStatusDisplay('listening')
            );
          } else {
            const noQuestionMsg =
              currentLanguageRef.current === 'te'
                ? 'మీరు ఇంతకుముందు ఎలాంటి ప్రశ్నా అడగలేదు. నన్ను ఏదైనా ప్రశ్న అడగవచ్చు.'
                : currentLanguageRef.current === 'hi'
                ? 'आपने इससे पहले कोई सवाल नहीं पूछा है।'
                : 'You have not asked any previous questions yet. Point the camera at something and ask me a question.';

            setLastSpokenResponse(noQuestionMsg);
            lastSpokenResponseRef.current = noQuestionMsg;
            updateStatusDisplay('speaking', noQuestionMsg.slice(0, 45) + '...');
            speakAssistantMessage(noQuestionMsg, currentLanguageRef.current, undefined, () =>
              updateStatusDisplay('listening')
            );
          }
          return;
        }

        // WALKING NAVIGATION: START ROUTE PLANNING
        case 'nav_start': {
          const dest = cmd.destination || '';
          if (!dest) {
            const askMsg =
              currentLanguageRef.current === 'te'
                ? 'మీరు ఎక్కడికి వెళ్ళాలనుకుంటున్నారో స్థలం పేరు చెప్పండి.'
                : currentLanguageRef.current === 'hi'
                ? 'आप कहाँ जाना चाहते हैं, उस जगह का नाम बताइए।'
                : 'Where would you like to walk to? Please tell me the place name.';
            speakAssistantMessage(askMsg, currentLanguageRef.current, undefined, () =>
              updateStatusDisplay('listening')
            );
            return;
          }

          updateStatusDisplay('processing', 'దారి వెతుకుతున్నాను...', 'Finding walking route...');
          triggerTactilePulse([50, 50]);

          if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
            const noGpsMsg =
              currentLanguageRef.current === 'te'
                ? 'GPS అందుబాటులో లేదు.'
                : 'GPS is not available on this device.';
            speakAssistantMessage(noGpsMsg, currentLanguageRef.current, undefined, () =>
              updateStatusDisplay('listening')
            );
            return;
          }

          navigator.geolocation.getCurrentPosition(
            async (pos) => {
              const userLoc = {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              };

              const plan = await planWalkingRoute(dest, userLoc, currentLanguageRef.current);
              if (plan.success && plan.summaryMessage) {
                setLastSpokenResponse(plan.summaryMessage);
                lastSpokenResponseRef.current = plan.summaryMessage;
                updateStatusDisplay('speaking', plan.summaryMessage.slice(0, 45) + '...');
                speakAssistantMessage(plan.summaryMessage, currentLanguageRef.current, undefined, () =>
                  updateStatusDisplay('listening')
                );
              } else {
                const failMsg = plan.errorMessage || 'Could not find a walking route.';
                speakAssistantMessage(failMsg, currentLanguageRef.current, undefined, () =>
                  updateStatusDisplay('listening')
                );
              }
            },
            (err) => {
              console.warn('Geolocation error:', err);
              const gpsErrMsg =
                currentLanguageRef.current === 'te'
                  ? 'మీ లొకేషన్ తెలుసుకోలేకపోయాను. దయచేసి GPS అనుమతించండి.'
                  : currentLanguageRef.current === 'hi'
                  ? 'आपकी लोकेशन नहीं मिल सकी। कृपया जीपीएस ऑन करें।'
                  : 'Could not access your location. Please check GPS permissions.';
              speakAssistantMessage(gpsErrMsg, currentLanguageRef.current, undefined, () =>
                updateStatusDisplay('listening')
              );
            },
            { enableHighAccuracy: true, timeout: 6000 }
          );
          return;
        }

        // WALKING NAVIGATION: CONFIRM YES
        case 'confirm_yes': {
          if (currentNavSession.status === 'awaiting_start_confirmation') {
            triggerTactilePulse([80, 40, 80]);
            playAccessibilityChime('start');
            startLiveWalkingTracking();
            return;
          }
          break;
        }

        // WALKING NAVIGATION: CONFIRM NO
        case 'confirm_no': {
          if (currentNavSession.status === 'awaiting_start_confirmation') {
            currentNavSession.status = 'idle';
            currentNavSession.route = null;
            const cancelMsg =
              currentLanguageRef.current === 'te'
                ? 'దారి రద్దు చేయబడింది.'
                : currentLanguageRef.current === 'hi'
                ? 'रास्ता रद्द कर दिया गया।'
                : 'Route cancelled.';
            updateStatusDisplay('listening');
            speakAssistantMessage(cancelMsg, currentLanguageRef.current);
            return;
          }
          break;
        }

        // WALKING NAVIGATION: WHERE AM I?
        case 'nav_where_am_i': {
          const spoken = getWhereAmISpoken(currentLanguageRef.current);
          speakAssistantMessage(spoken, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // WALKING NAVIGATION: HOW FAR IS LEFT?
        case 'nav_how_far': {
          const spoken = getRemainingDistanceSpoken(currentLanguageRef.current);
          speakAssistantMessage(spoken, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // WALKING NAVIGATION: TAKE ME BACK
        case 'nav_take_back': {
          updateStatusDisplay('processing', 'వెనక్కి దారి సిద్ధం చేస్తున్నాను...');
          const result = await reverseWalkingRoute(currentLanguageRef.current);
          speakAssistantMessage(result.message, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // WALKING NAVIGATION: STOP NAVIGATION
        case 'nav_stop': {
          stopLiveWalkingTracking();
          const spoken = stopWalkingNavigation(currentLanguageRef.current);
          speakAssistantMessage(spoken, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // 1. EMERGENCY
        case 'emergency': {
          triggerTactilePulse([100, 50, 100, 50, 150]);
          playAccessibilityChime('error');
          updateStatusDisplay('speaking', 'ఎమర్జెన్సీ అలర్ట్...');
          const result = await triggerEmergencyFlow(currentLanguageRef.current);
          speakAssistantMessage(result.reassuranceMessage, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // 2. SCAM AND FRAUD CHECK
        case 'fraud_check': {
          performSmartAnalysis(transcript);
          return;
        }

        // 3. MEDICINE PAIR CHECK
        case 'medicine_pair': {
          performSmartAnalysis(transcript);
          return;
        }

        // 4. SCHEME AND NOTICE EXPLAINER
        case 'scheme_explain': {
          performSmartAnalysis(transcript);
          return;
        }

        // 5. FAMILY SHARE
        case 'family_share': {
          if (!lastSpokenResponseRef.current) {
            const noScanMsg =
              currentLanguageRef.current === 'te'
                ? 'పంపించడానికి ముందు దేనినైనా స్కాన్ చేయండి.'
                : currentLanguageRef.current === 'hi'
                ? 'भेजने से पहले कुछ स्कैन करें।'
                : 'Please scan something before sharing.';
            speakAssistantMessage(noScanMsg, currentLanguageRef.current, undefined, () =>
              updateStatusDisplay('listening')
            );
            return;
          }
          const confirmation = await shareScanWithFamily(
            lastSpokenResponseRef.current,
            cmd.targetRole || 'family',
            currentLanguageRef.current
          );
          speakAssistantMessage(confirmation, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // 6. FORM HELPER
        case 'form_helper': {
          performSmartAnalysis(transcript);
          return;
        }

        // 7. VOICE MEMORY: Save
        case 'memory_save': {
          if (!lastSpokenResponseRef.current) {
            const noMsg =
              currentLanguageRef.current === 'te'
                ? 'సేవ్ చేయడానికి ముందు కెమెరా చూపించి స్కాన్ చేయండి.'
                : currentLanguageRef.current === 'hi'
                ? 'सेव करने से पहले कृपया कुछ स्कैन करें।'
                : 'Please scan something first before saving.';
            speakAssistantMessage(noMsg, currentLanguageRef.current, undefined, () =>
              updateStatusDisplay('listening')
            );
            return;
          }
          const saved = saveScanToMemory(
            cmd.saveLabel || '',
            lastSpokenResponseRef.current,
            detectedCategoryRef.current
          );
          const confirmMsg =
            currentLanguageRef.current === 'te'
              ? `దీన్ని "${saved.label}" గా సేవ్ చేశాను.`
              : currentLanguageRef.current === 'hi'
              ? `मैंने इसे "${saved.label}" के रूप में सेव कर लिया है।`
              : `Saved this as "${saved.label}".`;
          speakAssistantMessage(confirmMsg, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // 8. VOICE MEMORY: Recall
        case 'memory_recall': {
          const recallAnswer = searchVoiceMemory(cmd.query || transcript, currentLanguageRef.current);
          setLastSpokenResponse(recallAnswer);
          lastSpokenResponseRef.current = recallAnswer;
          speakAssistantMessage(recallAnswer, currentLanguageRef.current, undefined, () =>
            updateStatusDisplay('listening')
          );
          return;
        }

        // 9. VOICE MEMORY: Clear
        case 'memory_clear': {
          pendingConfirmationRef.current = 'clear_memory';
          const askMsg =
            currentLanguageRef.current === 'te'
              ? 'మీరు సేవ్ చేసిన వివరాలను తొలగించాలనుకుంటున్నారా? అవును లేదా వద్దు అని చెప్పండి.'
              : currentLanguageRef.current === 'hi'
              ? 'क्या आप सेव की गई जानकारी हटाना चाहते हैं? हाँ या ना बोलें।'
              : 'Are you sure you want to delete your saved scans? Say yes or no.';
          speakAssistantMessage(askMsg, currentLanguageRef.current);
          return;
        }

        // 10. Language switch
        case 'language': {
          if (cmd.language) switchLanguage(cmd.language);
          return;
        }

        // 11. Repeat
        case 'repeat': {
          repeatLastAnswer();
          return;
        }

        // 12. Help
        case 'help': {
          setIsHelpOpen(true);
          return;
        }

        // 13. General Query or Reading
        default: {
          performSmartAnalysis(transcript);
          return;
        }
      }
    },
    [performSmartAnalysis, repeatLastAnswer, switchLanguage, updateStatusDisplay]
  );

  // Setup Web Speech recognition for voice command parsing
  const setupSpeechRecognition = useCallback(() => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      console.log('Web Speech Recognition not supported in this browser.');
      return;
    }

    try {
      if (speechRecognitionRef.current) {
        try {
          speechRecognitionRef.current.stop();
        } catch (e) {}
      }

      const recognition = new SpeechRec();
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.lang =
        currentLanguageRef.current === 'te'
          ? 'te-IN'
          : currentLanguageRef.current === 'hi'
          ? 'hi-IN'
          : 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        console.log('[Voice Heard]:', transcript);
        setRecognizedUserText(transcript);
        handleVoiceIntent(transcript);
      };

      recognition.onerror = (e: any) => {
        if (e.error !== 'no-speech') {
          console.warn('SpeechRecognition error:', e.error);
        }
      };

      recognition.onend = () => {
        if (appStateRef.current !== 'idle' && speechRecognitionRef.current) {
          try {
            recognition.start();
          } catch (e) {}
        }
      };

      recognition.start();
      speechRecognitionRef.current = recognition;
    } catch (e) {
      console.warn('Could not start SpeechRecognition:', e);
    }
  }, [handleVoiceIntent]);

  // Connect to Gemini Live WebSocket & Audio Streaming
  const startLiveConnection = useCallback(async () => {
    try {
      if (!liveAudioPlayerRef.current) {
        liveAudioPlayerRef.current = new LiveAudioPlayer((isPlaying) => {
          if (isPlaying) {
            setAppState('speaking');
          } else {
            setAppState('listening');
          }
        });
      }
      liveAudioPlayerRef.current.unlock();

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/live`;
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setIsLiveActive(true);
        ws.send(
          JSON.stringify({
            type: 'init',
            language: currentLanguageRef.current,
          })
        );
      };

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'audio' && msg.audio) {
            liveAudioPlayerRef.current?.playChunk(msg.audio);
          } else if (msg.type === 'transcript' && msg.text) {
            setStatusText(msg.text);
            setLastSpokenResponse((prev) => (prev ? prev + ' ' + msg.text : msg.text));
          } else if (msg.type === 'turnComplete') {
            setAppState('listening');
          } else if (msg.type === 'interrupted') {
            liveAudioPlayerRef.current?.stopAll();
            setAppState('listening');
          } else if (msg.type === 'fallback') {
            setIsLiveActive(false);
          }
        } catch (e) {
          console.error('Error handling WS message:', e);
        }
      };

      ws.onerror = () => setIsLiveActive(false);
      ws.onclose = () => setIsLiveActive(false);

      // Microphone capture for live stream
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
            echoCancellation: true,
            noiseSuppression: true,
          },
        });
        micStreamRef.current = stream;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const inputCtx = new AudioCtx({ sampleRate: 16000 });
        micAudioContextRef.current = inputCtx;

        const source = inputCtx.createMediaStreamSource(stream);
        const processor = inputCtx.createScriptProcessor(4096, 1, 1);
        micProcessorRef.current = processor;

        source.connect(processor);
        processor.connect(inputCtx.destination);

        processor.onaudioprocess = (e) => {
          if (
            wsRef.current &&
            wsRef.current.readyState === WebSocket.OPEN &&
            !liveAudioPlayerRef.current?.isPlaying()
          ) {
            const inputData = e.inputBuffer.getChannelData(0);
            const base64Audio = floatTo16BitPCMBase64(inputData);
            wsRef.current.send(
              JSON.stringify({
                type: 'audio',
                audio: base64Audio,
              })
            );
          }
        };
      } catch (micErr) {
        // Microphone stream error
      }
    } catch (err) {
      setIsLiveActive(false);
    }
  }, []);

  // Periodic video frame streamer to Live API
  useEffect(() => {
    if (appState === 'idle' || !isLiveActive) return;

    const interval = setInterval(() => {
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        const frameData = captureCurrentFrame();
        if (frameData) {
          wsRef.current.send(
            JSON.stringify({
              type: 'video',
              image: frameData,
            })
          );
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [appState, isLiveActive, captureCurrentFrame]);

  // Real-time camera brightness and focus analysis loop
  useEffect(() => {
    if (appState === 'idle') return;

    const interval = setInterval(() => {
      if (videoRef.current && offscreenCanvasRef.current) {
        const result = analyzeVideoFrame(
          videoRef.current,
          offscreenCanvasRef.current,
          currentLanguageRef.current
        );

        if (result && result.feedback) {
          setGuidance(result.feedback);

          const guidanceText = result.feedback.message[currentLanguageRef.current];
          if (!isCurrentlySpeaking() && !liveAudioPlayerRef.current?.isPlaying()) {
            speakAssistantMessage(
              guidanceText,
              currentLanguageRef.current,
              undefined,
              undefined,
              true
            );
          }
        } else {
          setGuidance(null);
        }
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [appState]);

  // UNIVERSAL SINGLE TAP TO START
  const handleStartApp = useCallback(() => {
    if (appStateRef.current !== 'idle') return;

    // Immediately unlock browser audio
    unlockAudioContext();
    liveAudioPlayerRef.current?.unlock();

    triggerTactilePulse([50, 30, 50]);
    playAccessibilityChime('start');
    updateStatusDisplay('starting');

    // 1. Spoken welcome in Telugu (default)
    const welcomeMessage = {
      te: 'దృష్టివాణికి స్వాగతం. మీ కెమెరాను దేనిపైకైనా చూపించి నన్ను ప్రశ్న అడగండి.',
      hi: 'दृष्टिवाणी में आपका स्वागत है। अपने कैमरे को किसी वस्तु की ओर करें और मुझसे सवाल पूछें।',
      en: 'Welcome to DrishtiVaani. Point your camera at something and ask me a question.',
    }[currentLanguageRef.current];

    // Speak welcome immediately
    updateStatusDisplay('speaking', 'దృష్టివాణికి స్వాగతం...');
    speakAssistantMessage(
      welcomeMessage,
      currentLanguageRef.current,
      () => updateStatusDisplay('speaking', 'దృష్టివాణికి స్వాగతం...'),
      () => updateStatusDisplay('listening')
    );

    // Concurrently start live connection and speech recognition without blocking
    startLiveConnection();
    setupSpeechRecognition();
  }, [setupSpeechRecognition, startLiveConnection, updateStatusDisplay]);

  // Handle Touch End (Primary Mobile Event)
  const handleScreenTouchEnd = (e: React.TouchEvent) => {
    lastTouchTimeRef.current = Date.now();

    const now = Date.now();
    const isDoubleTap = now - lastTapRef.current < 350;
    lastTapRef.current = now;

    if (isDoubleTap) {
      repeatLastAnswer();
      return;
    }

    handleUniversalTap();
  };

  // Click handler (Desktop Mouse Only)
  const handleScreenClick = (e: React.MouseEvent) => {
    if (Date.now() - lastTouchTimeRef.current < 450) {
      return;
    }
    handleUniversalTap();
  };

  // Universal Single Tap Logic
  const handleUniversalTap = () => {
    unlockAudioContext();
    liveAudioPlayerRef.current?.unlock();

    if (appStateRef.current === 'idle') {
      handleStartApp();
      return;
    }

    if (appStateRef.current === 'speaking' || isCurrentlySpeaking()) {
      // Interrupt ongoing speech and cancel pending analysis immediately
      if (analysisAbortControllerRef.current) {
        analysisAbortControllerRef.current.abort();
        analysisAbortControllerRef.current = null;
      }
      stopAllSpeech();
      liveAudioPlayerRef.current?.stopAll();
      triggerTactilePulse(30);
      updateStatusDisplay('listening');
      return;
    }

    // Single Tap while listening:
    triggerTactilePulse([40, 40]);
    playAccessibilityChime('listen');

    const promptText =
      currentLanguageRef.current === 'te'
        ? 'వింటున్నాను... మాట్లాడండి'
        : currentLanguageRef.current === 'hi'
        ? 'सुन रहा हूँ... बोलिए'
        : 'Listening... speak now';

    updateStatusDisplay('listening', promptText);
    isWaitingForVoiceRef.current = true;

    if (voiceTimeoutRef.current) clearTimeout(voiceTimeoutRef.current);

    // If user doesn't speak a question within 2.5s, automatically analyze whatever is in the camera view!
    voiceTimeoutRef.current = setTimeout(() => {
      if (isWaitingForVoiceRef.current) {
        performSmartAnalysis('');
      }
    }, 2500);
  };

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-slate-950 text-white font-sans select-none flex flex-col justify-between"
      onTouchEnd={handleScreenTouchEnd}
      onClick={handleScreenClick}
      role="application"
      aria-label="DrishtiVaani Smart Assistive Vision"
    >
      {/* 1. Live Camera View (Direct from Laptop Webcam or Phone Camera with zero extra buttons) */}
      <CameraView
        videoRef={videoRef}
        isStreaming={appState !== 'idle'}
        guidance={guidance}
        language={currentLanguage}
      />

      {/* 2. Top Header Bar (Pristine Voice & Accessibility Controls) */}
      <header className="relative z-30 w-full pt-4 px-4 flex items-center justify-between pointer-events-auto">
        {/* Brand Badge */}
        <div className="flex items-center space-x-2 bg-slate-900/90 border border-yellow-400/60 px-3.5 py-1.5 rounded-full shadow-lg">
          <div className="w-3.5 h-3.5 rounded-full bg-emerald-400 animate-ping" />
          <h1 className="text-xl font-black text-yellow-300 tracking-wider">
            దృష్టివాణి
          </h1>
          <span className="text-xs font-bold text-slate-300 uppercase tracking-widest pl-1">
            DrishtiVaani
          </span>
        </div>

        {/* Top Controls: Repeat, Language Toggle, and Help */}
        <div className="flex items-center space-x-2">
          {/* Repeat Button */}
          {lastSpokenResponse && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                repeatLastAnswer();
              }}
              aria-label="Repeat last answer"
              className="w-12 h-12 rounded-full bg-slate-900/90 border-2 border-yellow-400 text-yellow-300 flex items-center justify-center shadow-lg active:scale-95"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          )}

          {/* Language Toggle Button (Telugu -> Hindi -> English) */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextLang: DrishtiLanguage =
                currentLanguage === 'te' ? 'hi' : currentLanguage === 'hi' ? 'en' : 'te';
              switchLanguage(nextLang);
            }}
            aria-label={`Current language ${
              currentLanguage === 'te'
                ? 'Telugu'
                : currentLanguage === 'hi'
                ? 'Hindi'
                : 'English'
            }. Tap to switch language.`}
            className="h-12 px-3.5 rounded-full bg-slate-900/90 border-2 border-yellow-400 text-yellow-300 flex items-center space-x-2 font-bold text-base shadow-lg active:scale-95"
          >
            <Globe className="w-5 h-5 text-yellow-400" />
            <span>
              {currentLanguage === 'te'
                ? 'తెలుగు'
                : currentLanguage === 'hi'
                ? 'हिंदी'
                : 'English'}
            </span>
          </button>

          {/* Help Button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsHelpOpen(true);
            }}
            aria-label="Open voice help guide"
            className="w-12 h-12 rounded-full bg-yellow-400 text-black flex items-center justify-center font-bold shadow-lg active:scale-95"
          >
            <HelpCircle className="w-7 h-7" />
          </button>
        </div>
      </header>

      {/* 3. Center Hero: The One Large Pulsing Interactive Orb & Status Line */}
      <div className="relative z-20 flex-1 flex flex-col items-center justify-center pointer-events-none">
        <CentralOrb
          state={appState}
          statusText={statusText}
          subText={subText}
          language={currentLanguage}
          onClick={handleUniversalTap}
        />
      </div>

      {/* 4. Bottom Eyes-Free Guidance Line */}
      <footer className="relative z-30 w-full pb-4 px-4 pointer-events-auto flex flex-col items-center">
        {/* Live speech transcription if user spoke */}
        {recognizedUserText && (
          <div className="mb-2 px-4 py-1.5 rounded-full bg-black/85 border border-yellow-400/60 text-sm text-yellow-300 flex items-center space-x-2">
            <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="truncate max-w-xs font-semibold">"{recognizedUserText}"</span>
          </div>
        )}

        {/* Eyes-Free Audio Gesture Reminder */}
        <div className="bg-slate-900/95 border-2 border-yellow-400/80 rounded-2xl p-3 shadow-xl backdrop-blur-md w-full max-w-sm text-center">
          <p className="text-base font-extrabold text-white leading-snug">
            {currentLanguage === 'te'
              ? 'స్క్రీన్‌పై 1 సారి తట్టి మాట్లాడండి | 2 సార్లు తట్టి మళ్ళీ వినండి'
              : currentLanguage === 'hi'
              ? 'स्क्रीन पर 1 बार टैप करके बोलें | 2 बार टैप करके दोबारा सुनें'
              : 'Tap once to ask or read | Double-tap to repeat'}
          </p>
        </div>

        {/* Required Assistive Disclaimer */}
        <div className="mt-2 text-center max-w-sm">
          <p className="text-[11px] font-semibold text-yellow-400/80 drop-shadow-[0_1px_4px_rgba(0,0,0,0.9)]">
            {currentLanguage === 'te'
              ? 'గమనిక: ఈ యాప్ సహాయక సాధనం మాత్రమే. ఇది నిపుణుల లేదా వైద్యుల సలహాకు ప్రత్యామ్నాయం కాదు.'
              : currentLanguage === 'hi'
              ? 'यह ऐप एक सहायक उपकरण है और पेशेवर सलाह का स्थान नहीं लेता है।'
              : 'This app is an assistive tool and does not replace professional advice.'}
          </p>
        </div>
      </footer>

      {/* 5. Accessible Spoken Voice Help Modal */}
      <HelpModal
        isOpen={isHelpOpen}
        language={currentLanguage}
        onClose={() => setIsHelpOpen(false)}
      />
    </main>
  );
}
