import { GuidanceFeedback, DrishtiLanguage } from '../types';

export interface FrameAnalysisResult {
  brightness: number; // 0 - 255
  sharpness: number; // variance of Laplacian / edge gradient
  hasTextLikeFeatures: boolean;
  edgeDistribution: { top: number; bottom: number; left: number; right: number; center: number };
  feedback: GuidanceFeedback | null;
}

// Throttle guidance so user isn't spammed with spoken cues
let lastGuidanceTime = 0;
let lastGuidanceType = '';
let textInFrameNotified = false;

export function analyzeVideoFrame(
  video: HTMLVideoElement,
  offscreenCanvas: HTMLCanvasElement,
  language: DrishtiLanguage
): FrameAnalysisResult | null {
  if (!video || video.readyState < 2 || video.videoWidth === 0) {
    return null;
  }

  const ctx = offscreenCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;

  // Downscale for fast 15-30fps analysis (160x120)
  const width = 160;
  const height = 120;
  offscreenCanvas.width = width;
  offscreenCanvas.height = height;

  ctx.drawImage(video, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;

  let totalLuminance = 0;
  const gray = new Uint8Array(width * height);

  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Standard relative luminance: 0.299*R + 0.587*G + 0.114*B
    const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = lum;
    totalLuminance += lum;
  }

  const avgBrightness = totalLuminance / (width * height);

  // Simplified Sobel edge detection & distribution
  let totalEdgeMagnitude = 0;
  let topEdges = 0;
  let bottomEdges = 0;
  let leftEdges = 0;
  let rightEdges = 0;
  let centerEdges = 0;

  const hMid = height / 2;
  const wMid = width / 2;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Horizontal gradient
      const gx =
        -gray[idx - width - 1] + gray[idx - width + 1] +
        -2 * gray[idx - 1] + 2 * gray[idx + 1] +
        -gray[idx + width - 1] + gray[idx + width + 1];

      // Vertical gradient
      const gy =
        -gray[idx - width - 1] - 2 * gray[idx - width] - gray[idx - width + 1] +
        gray[idx + width - 1] + 2 * gray[idx + width] + gray[idx + width + 1];

      const mag = Math.abs(gx) + Math.abs(gy);
      if (mag > 65) {
        totalEdgeMagnitude += mag;

        if (y < hMid * 0.7) topEdges++;
        else if (y > hMid * 1.3) bottomEdges++;

        if (x < wMid * 0.7) leftEdges++;
        else if (x > wMid * 1.3) rightEdges++;

        if (y >= hMid * 0.6 && y <= hMid * 1.4 && x >= wMid * 0.6 && x <= wMid * 1.4) {
          centerEdges++;
        }
      }
    }
  }

  const edgeDensity = totalEdgeMagnitude / (width * height);
  const sharpness = edgeDensity;
  const hasTextLikeFeatures = edgeDensity > 18 && centerEdges > 60;

  const now = Date.now();
  let feedback: GuidanceFeedback | null = null;

  // Decide if we should emit a guidance cue (minimum 3.5 seconds cooldown between verbal cues)
  const canEmitGuidance = now - lastGuidanceTime > 3500;

  if (avgBrightness < 38) {
    if (canEmitGuidance && lastGuidanceType !== 'dark') {
      feedback = {
        type: 'dark',
        message: {
          te: 'చాలా చీకటిగా ఉంది, కొద్దిగా వెలుతురులో చూపించండి.',
          hi: 'बहुत अंधेरा है, थोड़ा प्रकाश में लाएं।',
          en: 'Too dark, find more light.',
        },
        shouldVibrate: true,
        timestamp: now,
      };
      lastGuidanceTime = now;
      lastGuidanceType = 'dark';
    }
  } else if (avgBrightness > 225) {
    if (canEmitGuidance && lastGuidanceType !== 'bright') {
      feedback = {
        type: 'bright',
        message: {
          te: 'ఎక్కువ కాంతి లేదా మెరుపు ఉంది, ఫోన్‌ను కొద్దిగా వంచండి.',
          hi: 'बहुत अधिक चमक है, फोन को थोड़ा झुकाएं।',
          en: 'Too much glare, tilt the phone slightly.',
        },
        shouldVibrate: false,
        timestamp: now,
      };
      lastGuidanceTime = now;
      lastGuidanceType = 'bright';
    }
  } else if (hasTextLikeFeatures) {
    // Text is clearly framed!
    if (!textInFrameNotified && canEmitGuidance) {
      feedback = {
        type: 'reading',
        message: {
          te: 'కదలకుండా పట్టుకోండి, చదువుతున్నాను...',
          hi: 'स्थिर रखें, अब पढ़ रहे हैं...',
          en: 'Hold steady, reading now...',
        },
        shouldVibrate: true,
        timestamp: now,
      };
      lastGuidanceTime = now;
      lastGuidanceType = 'reading';
      textInFrameNotified = true;

      // Haptic confirmation
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([60, 40, 60]);
        } catch (e) {
          // ignore
        }
      }
    }
  } else if (edgeDensity < 7 && avgBrightness > 60) {
    // Nothing close or in focus
    if (canEmitGuidance && lastGuidanceType !== 'closer') {
      feedback = {
        type: 'closer',
        message: {
          te: 'ఫోన్‌ను వస్తువుకు కొద్దిగా దగ్గరకు తీసుకురండి.',
          hi: 'फोन को वस्तु के थोड़ा करीब लाएं।',
          en: 'Move the phone closer.',
        },
        shouldVibrate: false,
        timestamp: now,
      };
      lastGuidanceTime = now;
      lastGuidanceType = 'closer';
      textInFrameNotified = false;
    }
  } else if (topEdges > centerEdges * 2.2 && topEdges > 100) {
    if (canEmitGuidance && lastGuidanceType !== 'tilt_up') {
      feedback = {
        type: 'closer',
        message: {
          te: 'ఫోన్‌ను కొద్దిగా పైకి ఎత్తండి.',
          hi: 'फोन को थोड़ा ऊपर उठाएं।',
          en: 'Tilt it up a little.',
        },
        shouldVibrate: false,
        timestamp: now,
      };
      lastGuidanceTime = now;
      lastGuidanceType = 'tilt_up';
    }
  }

  // Reset text notification if moved away
  if (edgeDensity < 10) {
    textInFrameNotified = false;
  }

  return {
    brightness: Math.round(avgBrightness),
    sharpness: Math.round(sharpness),
    hasTextLikeFeatures,
    edgeDistribution: {
      top: topEdges,
      bottom: bottomEdges,
      left: leftEdges,
      right: rightEdges,
      center: centerEdges,
    },
    feedback,
  };
}

export function triggerTactilePulse(pattern: number | number[] = 50) {
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(pattern);
    } catch (e) {
      // ignore
    }
  }
}
