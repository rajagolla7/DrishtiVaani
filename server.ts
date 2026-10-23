import express from 'express';
import http from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI, Modality, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = parseInt(process.env.PORT || '3000', 10);
const apiKey = process.env.GEMINI_API_KEY || '';

if (!apiKey) {
  console.warn('Warning: GEMINI_API_KEY environment variable is not set.');
}

const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

const app = express();
app.use(express.json({ limit: '25mb' }));

// Resilient Gemini generator that automatically cascades across models if one hits a temporary 503/429
async function generateWithResilientFallback(params: any): Promise<any> {
  const models = [
    'gemini-flash-lite-latest',
    'gemini-flash-latest',
    'gemini-3.8-flash',
    'gemini-3.1-flash-lite',
  ];

  let lastError: any = null;

  for (const model of models) {
    try {
      const config = { ...params.config };
      if (model === 'gemini-3.8-flash') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.LOW };
      } else if (model === 'gemini-3.1-flash-lite') {
        config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
      }

      const res = await ai.models.generateContent({
        ...params,
        model,
        config,
      });

      if (res && res.text) {
        return res;
      }
    } catch (err: any) {
      lastError = err;
      // brief pause before next candidate
      await new Promise((r) => setTimeout(r, 150));
    }
  }

  throw lastError || new Error('All vision models temporarily unavailable');
}

// Master assistive prompt that automatically detects the content without needing manual mode selection
function getAutomaticAssistivePrompt(language: string): string {
  const langRules = {
    te: 'Respond in spoken Telugu (తెలుగు) using simple, everyday natural conversational sentences. Keep sentences short, warm, and easy to understand for listening without looking at the screen.',
    hi: 'Respond in conversational Hindi (हिंदी) using simple, spoken sentences. Avoid overly heavy Sanskritized terms.',
    en: 'Respond in clear, simple spoken English. Keep sentences short and direct.',
  }[language] || 'Respond in natural spoken Telugu (తెలుగు).';

  return `You are DrishtiVaani (దృష్టివాణి), a smart eyes-free assistive vision and voice companion for blind, visually impaired, and low-literacy users.
Look at the camera view and the user's question.
You MUST AUTOMATICALLY IDENTIFY what is in front of the camera and explain it with absolute clarity:

SPECIALIZED CAPABILITY RULES:

1. SCAM AND FRAUD CHECK (User asks: "is this real?", "is this fake?", "can I trust this?", "is this a scam?"):
   - Inspect the camera view (printed bill, SMS on phone, letter, lottery message, QR code, notice).
   - Check for fraud red flags: threats of immediate disconnection ("light will be cut in 2 hours"), requests for OTP / banking passwords / PIN, mismatched logos or fake URLs, unrealistic prizes or cash gifts.
   - You MUST answer with one of these clear verdicts:
     - "ఇది సురక్షితంగా కనిపిస్తోంది" / "This looks safe"
     - "ఇది అనుమానాస్పదంగా కనిపిస్తోంది, ఎవరికీ డబ్బులు చెల్లించవద్దు లేదా OTP వివరాలు చెప్పవద్దు" / "This looks suspicious, do not pay or share any details"
     - "నేను ఖచ్చితంగా చెప్పలేను, దయచేసి మీకు తెలిసిన లేదా నమ్మకమైన వారిని అడిగి తెలుసుకోండి" / "I can't be sure, please ask someone you trust"
   - Explain the reason in 1-2 simple sentences. Never claim 100% certainty; always allow for uncertainty.

2. MEDICINE PAIR CHECK (User asks: "can I take these together?", "is it safe with this tablet?"):
   - Read the labels of the medicines in frame.
   - Report only commonly known printed interaction precautions (e.g., duplicate paracetamol, taking multiple painkillers, NSAID warnings). Do NOT diagnose or change medical doses.
   - MANDATORY SAFETY ENDING: Always end with: "దయచేసి డాక్టర్ లేదా ఫార్మసిస్ట్‌ను సంప్రదించి నిర్ధారించుకోండి." (or "Please confirm with a doctor or pharmacist.").

3. SCHEME AND NOTICE EXPLAINER (User asks: "explain this notice", "am I eligible?", "what do I need to do?"):
   - Read the government order, welfare scheme, or municipal notice.
   - Explain in simple terms: 1) What it is, 2) Who is eligible, 3) Which documents to carry (Aadhaar, ration card, etc.), 4) Deadline / last date, 5) Next immediate step.
   - If key details are missing to confirm eligibility, do not guess; ask the user ONE short question instead.

4. FORM HELPER (User asks: "help me fill this form", "where do I sign?"):
   - Look at the form in frame. Describe where the next empty field or signature line is located (e.g., "సంతకం పెట్టవలసిన బాక్స్ పేజీ కింద కుడివైపు మూలలో ఉంది" / "The signature box is at the bottom right corner").
   - Tell the user what needs to be written there.

5. MEDICINE MODE (General medicine strip or bottle):
   - Medicine name (Brand & Generic), usage in simple words, dosage printed on label, expiry date.
   - MANDATORY SAFETY ENDING: "దయచేసి డాక్టర్ లేదా ఫార్మసిస్ట్‌ను సంప్రదించి నిర్ధారించుకోండి."

6. BILL OR DOCUMENT (Bills, receipts, invoices):
   - Document type, Total amount due (స్పష్టంగా మొత్తం చెప్పండి), Due date, Action needed.

7. INDIAN CURRENCY:
   - Identify each rupee note (₹10, ₹20, ₹50, ₹100, ₹200, ₹500) and coin, and state the grand total.

8. SIGNS AND BOARDS:
   - Read bus route number, destination, or shop name.

9. GENERAL SCENE:
   - Describe obstacles, pathways, and doors directly in front.

CAMERA GUIDANCE RULE:
- If the image is blurry, too dark, or the label is cut off, start with a 1-sentence camera tip (e.g., "ఫోన్‌ను కొద్దిగా దగ్గరకు తీసుకురండి" or "వెలుతురులో చూపించండి").
- Do NOT use phrases like "as you can see".
- Keep every answer short, calm, and conversational for audio playback.

LANGUAGE REQUIREMENT:
${langRules}`;
}

// 1. Analyze Frame Endpoint (Automatic Classification & Vision)
app.post('/api/analyze-frame', async (req, res) => {
  try {
    const {
      image,
      language = 'te',
      userQuery = '',
      previousQuestion = '',
      previousAnswer = '',
    } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const systemPrompt = getAutomaticAssistivePrompt(language);
    let promptText = userQuery
      ? `User voice question: "${userQuery}". Look at the image, answer the user's question directly, and explain the key details.`
      : `Examine this camera view. Automatically identify what is in front of the camera (medicine, bill, currency, sign, or object) and explain it clearly according to your role.`;

    if (previousQuestion) {
      promptText += `\nConversation context:\nPrevious user question: "${previousQuestion}"\nPrevious assistant answer: "${previousAnswer}"`;
    }

    const response = await generateWithResilientFallback({
      contents: {
        parts: [
          {
            inlineData: {
              data: base64Data,
              mimeType,
            },
          },
          {
            text: promptText,
          },
        ],
      },
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.35,
      },
    });

    const responseText = response.text || '';

    // Quick camera guidance cue extraction
    let cameraGuidance = '';
    const lower = responseText.toLowerCase();
    if (lower.includes('చీకటి') || lower.includes('dark') || lower.includes('light')) {
      cameraGuidance = language === 'te' ? 'వెలుతురు సరిపోవడం లేదు' : 'Too dark, find more light';
    } else if (lower.includes('దగ్గర') || lower.includes('closer')) {
      cameraGuidance = language === 'te' ? 'ఫోన్‌ను కొద్దిగా దగ్గరకు తీసుకురండి' : 'Move the phone closer';
    } else if (lower.includes('కదలకుండా') || lower.includes('steady')) {
      cameraGuidance = language === 'te' ? 'కదలకుండా పట్టుకోండి' : 'Hold steady';
    }

    // Determine detected category
    let detectedCategory = 'general';
    if (
      lower.includes('మందు') ||
      lower.includes('మాత్ర') ||
      lower.includes('tablet') ||
      lower.includes('medicine') ||
      lower.includes('paracetamol') ||
      lower.includes('డాక్టర్')
    ) {
      detectedCategory = 'medicine';
    } else if (
      lower.includes('బిల్లు') ||
      lower.includes('రసీదు') ||
      lower.includes('bill') ||
      lower.includes('amount') ||
      lower.includes('due date')
    ) {
      detectedCategory = 'bill';
    } else if (
      lower.includes('రూపాయ') ||
      lower.includes('నోటు') ||
      lower.includes('కరెన్సీ') ||
      lower.includes('rupee') ||
      lower.includes('coin')
    ) {
      detectedCategory = 'currency';
    } else if (
      lower.includes('బోర్డు') ||
      lower.includes('బస్సు') ||
      lower.includes('సైన్') ||
      lower.includes('sign') ||
      lower.includes('route')
    ) {
      detectedCategory = 'sign';
    }

    res.json({
      success: true,
      text: responseText,
      guidance: cameraGuidance,
      category: detectedCategory,
      language,
    });
  } catch (err: any) {
    console.error('Error in /api/analyze-frame:', err);
    res.status(500).json({
      error: 'Failed to analyze frame',
      message: err?.message || 'Internal Server Error',
    });
  }
});

const mapsApiKey = process.env.VITE_GOOGLE_MAPS_API_KEY || process.env.GOOGLE_MAPS_API_KEY || '';

// 2. Google Places Search for Walking Navigation
app.post('/api/navigation/find-place', async (req, res) => {
  try {
    const { query, location, language = 'te' } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }

    const langCode = language === 'te' ? 'te' : language === 'hi' ? 'hi' : 'en';

    const reqBody: any = {
      textQuery: query,
      languageCode: langCode,
    };

    if (location && location.latitude && location.longitude) {
      reqBody.locationBias = {
        circle: {
          center: {
            latitude: location.latitude,
            longitude: location.longitude,
          },
          radius: 8000.0,
        },
      };
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsApiKey,
        'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location',
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify(reqBody),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Places API error:', response.status, errText);
      return res.status(response.status).json({ error: 'Failed to search place' });
    }

    const data = await response.json();
    const places = (data.places || []).slice(0, 3).map((p: any) => ({
      name: p.displayName?.text || '',
      address: p.formattedAddress || '',
      lat: p.location?.latitude,
      lng: p.location?.longitude,
    }));

    res.json({ success: true, places });
  } catch (err: any) {
    console.error('Error finding place:', err);
    res.status(500).json({ error: 'Failed to search place', message: err?.message });
  }
});

// 3. Google Routes API v2 for Walking Directions
app.post('/api/navigation/route', async (req, res) => {
  try {
    const { origin, destination, language = 'te' } = req.body;
    if (!origin || !destination) {
      return res.status(400).json({ error: 'Origin and destination are required' });
    }

    const langCode = language === 'te' ? 'te' : language === 'hi' ? 'hi' : 'en';

    const response = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': mapsApiKey,
        'X-Goog-FieldMask':
          'routes.duration,routes.distanceMeters,routes.legs.steps.navigationInstruction,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.startLocation,routes.legs.steps.endLocation,routes.legs.steps.localizedValues',
        'X-Goog-Maps-Solution-ID': 'gmp_mcp_codeassist_v1_aistudio',
      },
      body: JSON.stringify({
        origin: {
          location: {
            latLng: {
              latitude: origin.latitude || origin.lat,
              longitude: origin.longitude || origin.lng,
            },
          },
        },
        destination: {
          location: {
            latLng: {
              latitude: destination.latitude || destination.lat,
              longitude: destination.longitude || destination.lng,
            },
          },
        },
        travelMode: 'WALK',
        languageCode: langCode,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.warn('Routes API error:', response.status, errText);
      return res.status(response.status).json({ error: 'Failed to compute route' });
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) {
      return res.status(404).json({ error: 'No walking route found' });
    }

    const distanceMeters = route.distanceMeters || 0;
    const durationSeconds =
      parseInt((route.duration || '0s').replace('s', ''), 10) || Math.round(distanceMeters / 1.3);

    const rawSteps = route.legs?.[0]?.steps || [];
    let hasMainRoadCrossing = false;

    const steps = rawSteps.map((s: any, idx: number) => {
      const instruction = s.navigationInstruction?.instructions || '';
      const maneuver = s.navigationInstruction?.maneuver || 'STRAIGHT';
      const stepDistMeters = s.distanceMeters || 0;
      const stepDurationSec =
        parseInt((s.staticDuration || '0s').replace('s', ''), 10) || Math.round(stepDistMeters / 1.3);

      const isCrossing =
        instruction.toLowerCase().includes('cross') ||
        instruction.toLowerCase().includes('road') ||
        instruction.includes('దాట') ||
        instruction.includes('రహదారి') ||
        instruction.includes('पार');

      if (isCrossing) hasMainRoadCrossing = true;

      return {
        stepIndex: idx,
        instruction,
        maneuver,
        distanceMeters: stepDistMeters,
        durationSeconds: stepDurationSec,
        isCrossing,
        startLat: s.startLocation?.latLng?.latitude,
        startLng: s.startLocation?.latLng?.longitude,
        endLat: s.endLocation?.latLng?.latitude,
        endLng: s.endLocation?.latLng?.longitude,
      };
    });

    res.json({
      success: true,
      route: {
        distanceMeters,
        durationSeconds,
        hasMainRoadCrossing,
        steps,
      },
    });
  } catch (err: any) {
    console.error('Error computing route:', err);
    res.status(500).json({ error: 'Failed to compute route', message: err?.message });
  }
});

// 4. Real-time Camera Walking Hazard Scanner
app.post('/api/navigation/hazard-check', async (req, res) => {
  try {
    const { image, language = 'te' } = req.body;
    if (!image) {
      return res.status(400).json({ error: 'Image required' });
    }

    const base64Data = image.replace(/^data:image\/\w+;base64,/, '');
    const mimeType = image.startsWith('data:image/png') ? 'image/png' : 'image/jpeg';

    const prompt = `You are a walking safety scanner for a blind user holding their phone while walking.
Look at what is directly in front:
Check for physical obstacles:
- Poles, pillars, road barriers, or parked two-wheelers/cars directly in the path.
- Ground drop-offs: open drains, potholes, stairs, steps, or high curbs.
- Low-hanging branches or sign boards.
- Bus boards or landmarks.
RULES:
1. If the path is clear: return ONLY "CLEAR".
2. If camera view is pitch dark or completely blocked: return in 1 sentence.
3. If an immediate hazard exists: warn in ONE very short, calm sentence (5-8 words max) with direction:
   - Telugu: "ముందు ఎడమవైపు స్తంభం ఉంది" / "ముందు మెట్లు ఉన్నాయి" / "దారిలో బండి నిలిపి ఉంది"
   - Hindi: "सामने बाईं ओर खंभा है" / "आगे सीढ़ियां हैं"
   - English: "A pole is ahead on your left" / "Stairs ahead" / "A vehicle is parked on the path"
Language required: ${language === 'te' ? 'Telugu' : language === 'hi' ? 'Hindi' : 'English'}`;

    const response = await generateWithResilientFallback({
      contents: {
        parts: [
          { inlineData: { data: base64Data, mimeType } },
          { text: prompt },
        ],
      },
      config: {
        temperature: 0.15,
      },
    });

    const text = (response.text || '').trim();
    if (text === 'CLEAR' || text.toUpperCase().includes('CLEAR')) {
      return res.json({ success: true, hazard: null });
    }

    res.json({ success: true, hazard: text });
  } catch (err: any) {
    res.json({ success: true, hazard: null });
  }
});

// Track if server TTS quota is exhausted so we don't spam the API with 429s
let ttsQuotaExhausted = false;

// 2. High Quality Speech Generation via Gemini TTS
app.post('/api/tts', async (req, res) => {
  try {
    const { text, language = 'te' } = req.body;
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required for TTS' });
    }

    // If quota was already exhausted, immediately respond with fallback signal
    if (ttsQuotaExhausted) {
      return res.json({ success: false, fallback: true, reason: 'quota_exhausted' });
    }

    const voiceName = language === 'te' ? 'Kore' : language === 'hi' ? 'Kore' : 'Zephyr';

    const speechPrompt =
      language === 'te'
        ? `Speak clearly in Telugu with natural warm intonation: ${text}`
        : language === 'hi'
        ? `Speak clearly in Hindi with natural warm intonation: ${text}`
        : `Speak clearly and warmly: ${text}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash-lite-tts',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: speechPrompt,
              speechMetadata: {
                style: 'Gentle, supportive, accessible screen reader',
              },
            },
          ],
        },
      ],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (base64Audio) {
      return res.json({
        success: true,
        audioBase64: base64Audio,
        mimeType: 'audio/wav',
      });
    }

    return res.json({ success: false, fallback: true });
  } catch (err: any) {
    if (
      err?.status === 429 ||
      err?.message?.includes('429') ||
      err?.message?.includes('quota') ||
      err?.message?.includes('RESOURCE_EXHAUSTED')
    ) {
      ttsQuotaExhausted = true;
      console.log('[TTS] Cloud TTS daily free-tier limit reached (10/day). Gracefully switching to client Web Speech API fallback.');
    } else {
      console.warn('[TTS] Cloud TTS temporarily unavailable, using client fallback:', err?.message || err);
    }

    return res.json({
      success: false,
      fallback: true,
      reason: ttsQuotaExhausted ? 'quota_exhausted' : 'unavailable',
    });
  }
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server for Gemini Live API real-time streaming
const wss = new WebSocketServer({ server, path: '/live' });

wss.on('connection', async (clientWs: WebSocket) => {
  console.log('[Live WS] Client connected to DrishtiVaani Live');
  let liveSession: any = null;
  let currentLanguage = 'te';

  async function startLiveSession(language: string) {
    if (liveSession) {
      try {
        await liveSession.close();
      } catch (e) {
        // ignore
      }
      liveSession = null;
    }

    try {
      const systemInstruction = `${getAutomaticAssistivePrompt(language)}
You are in a live, real-time voice and video conversation with a visually impaired user.
The user speaks to you and streams camera frames.
Provide immediate, warm, and concise spoken answers.
Automatically identify whether the user is showing medicine, bills, currency, signs, or everyday scenes.
Always speak directly back in audio.`;

      liveSession = await ai.live.connect({
        model: 'gemini-3.8-live',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: language === 'en' ? 'Zephyr' : 'Kore' },
            },
          },
          systemInstruction,
          outputAudioTranscription: {},
        },
        callbacks: {
          onmessage: (message: any) => {
            // Forward audio parts to client
            const parts = message.serverContent?.modelTurn?.parts || [];
            for (const part of parts) {
              const audio = part.inlineData?.data;
              if (audio && clientWs.readyState === WebSocket.OPEN) {
                clientWs.send(JSON.stringify({ type: 'audio', audio }));
              }
            }

            // Forward real-time transcription text
            const transcript = message.serverContent?.outputAudioTranscription?.text;
            if (transcript && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'transcript', text: transcript }));
            }

            // Turn complete
            if ((message.serverContent?.generationComplete || message.serverContent?.turnComplete) && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'turnComplete' }));
            }

            // Interrupted
            if (message.serverContent?.interrupted && clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'interrupted' }));
            }
          },
          onerror: (err: any) => {
            console.error('[Live WS] Gemini Live Error:', err);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'error', message: err?.message || 'Live session error' }));
            }
          },
          onclose: () => {
            console.log('[Live WS] Gemini Live closed');
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(JSON.stringify({ type: 'closed' }));
            }
          },
        },
      });

      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({ type: 'ready', language }));
      }
    } catch (err: any) {
      console.warn('[Live WS] Live API connection unavailable, falling back to smart snapshot vision:', err);
      if (clientWs.readyState === WebSocket.OPEN) {
        clientWs.send(JSON.stringify({
          type: 'fallback',
          message: 'Using smart snapshot vision.',
        }));
      }
    }
  }

  // Handle messages from client
  clientWs.on('message', async (data: Buffer | string) => {
    try {
      const parsed = JSON.parse(data.toString());

      if (parsed.type === 'init') {
        currentLanguage = parsed.language || 'te';
        await startLiveSession(currentLanguage);
      } else if (parsed.type === 'config') {
        if (parsed.language) currentLanguage = parsed.language;
        await startLiveSession(currentLanguage);
      } else if (parsed.type === 'audio' && parsed.audio && liveSession) {
        liveSession.sendRealtimeInput({
          audio: {
            data: parsed.audio,
            mimeType: 'audio/pcm;rate=16000',
          },
        });
      } else if (parsed.type === 'video' && parsed.image && liveSession) {
        const cleanBase64 = parsed.image.replace(/^data:image\/\w+;base64,/, '');
        liveSession.sendRealtimeInput({
          video: {
            data: cleanBase64,
            mimeType: 'image/jpeg',
          },
        });
      } else if (parsed.type === 'text' && parsed.text && liveSession) {
        liveSession.sendRealtimeInput({
          text: parsed.text,
        });
      }
    } catch (e: any) {
      console.error('[Live WS] Error processing client message:', e);
    }
  });

  clientWs.on('close', async () => {
    console.log('[Live WS] Client disconnected');
    if (liveSession) {
      try {
        await liveSession.close();
      } catch (e) {}
    }
  });
});

// Mount Vite middleware in development or serve dist in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DrishtiVaani server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
