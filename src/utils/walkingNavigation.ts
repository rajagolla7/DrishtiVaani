import { DrishtiLanguage } from '../types';

export interface RouteStep {
  stepIndex: number;
  instruction: string;
  maneuver: string;
  distanceMeters: number;
  durationSeconds: number;
  isCrossing: boolean;
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

export interface WalkingRoute {
  destinationName: string;
  destinationAddress: string;
  totalDistanceMeters: number;
  totalDurationSeconds: number;
  hasMainRoadCrossing: boolean;
  steps: RouteStep[];
  originLat: number;
  originLng: number;
  destinationLat: number;
  destinationLng: number;
}

export type NavStatus =
  | 'idle'
  | 'awaiting_start_confirmation'
  | 'awaiting_stop_confirmation'
  | 'active'
  | 'arrived';

export interface NavigationSession {
  status: NavStatus;
  route: WalkingRoute | null;
  currentStepIndex: number;
  lastSpokenInstruction: string;
  totalWalkedMeters: number;
  announcedHalfway: boolean;
  lastHazardAlertTime: number;
  gpsWatchId: number | null;
  lastLatitude: number;
  lastLongitude: number;
  lastAccuracy: number;
}

// Global in-memory navigation session
export const currentNavSession: NavigationSession = {
  status: 'idle',
  route: null,
  currentStepIndex: 0,
  lastSpokenInstruction: '',
  totalWalkedMeters: 0,
  announcedHalfway: false,
  lastHazardAlertTime: 0,
  gpsWatchId: null,
  lastLatitude: 0,
  lastLongitude: 0,
  lastAccuracy: 0,
};

// Haversine formula to compute distance in meters between two coordinates
export function computeDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371e3; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

// Format meters to approximate steps and distance
export function formatDistanceForVoice(meters: number, language: DrishtiLanguage): string {
  const steps = Math.round(meters / 0.75); // approx 0.75m per step
  if (language === 'te') {
    if (meters < 100) return `సుమారు ${steps} అడుగులు`;
    if (meters < 1000) return `${meters} మీటర్లు (సుమారు ${steps} అడుగులు)`;
    return `${(meters / 1000).toFixed(1)} కిలోమీటర్లు`;
  }
  if (language === 'hi') {
    if (meters < 100) return `लगभग ${steps} कदम`;
    return `${meters} मीटर`;
  }
  if (meters < 100) return `about ${steps} steps`;
  if (meters < 1000) return `${meters} meters (about ${steps} steps)`;
  return `${(meters / 1000).toFixed(1)} kilometers`;
}

// Format duration
export function formatDurationForVoice(seconds: number, language: DrishtiLanguage): string {
  const mins = Math.max(1, Math.round(seconds / 60));
  if (language === 'te') return `సుమారు ${mins} నిమిషాలు`;
  if (language === 'hi') return `लगभग ${mins} मिनट`;
  return `about ${mins} minutes`;
}

// Clean HTML tags and standardize directions
export function cleanRouteInstruction(raw: string): string {
  return raw
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Searches destination via Places API and computes route via Routes API v2
 */
export async function planWalkingRoute(
  destinationQuery: string,
  userLocation: { latitude: number; longitude: number },
  language: DrishtiLanguage
): Promise<{
  success: boolean;
  route?: WalkingRoute;
  summaryMessage?: string;
  errorMessage?: string;
}> {
  try {
    // 1. Search destination place
    const placeRes = await fetch('/api/navigation/find-place', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: destinationQuery,
        location: userLocation,
        language,
      }),
    });

    if (!placeRes.ok) {
      const err = await placeRes.json().catch(() => ({}));
      throw new Error(err.error || 'Failed to find place');
    }

    const placeData = await placeRes.json();
    const candidate = placeData.places?.[0];

    if (!candidate || !candidate.lat || !candidate.lng) {
      const notFoundMsg =
        language === 'te'
          ? 'ఆ స్థలం వివరాలు దొరకలేదు. దయచేసి పేరును మళ్ళీ స్పష్టంగా చెప్పండి.'
          : language === 'hi'
          ? 'उस जगह की जानकारी नहीं मिली। कृपया दोबारा बोलें।'
          : 'I could not find that place, please say it again.';
      return { success: false, errorMessage: notFoundMsg };
    }

    // 2. Compute walking route
    const routeRes = await fetch('/api/navigation/route', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        origin: { latitude: userLocation.latitude, longitude: userLocation.longitude },
        destination: { latitude: candidate.lat, longitude: candidate.lng },
        language,
      }),
    });

    if (!routeRes.ok) {
      throw new Error('Failed to compute walking route');
    }

    const routeData = await routeRes.json();
    const route = routeData.route;

    if (!route || !route.steps || route.steps.length === 0) {
      const noRouteMsg =
        language === 'te'
          ? 'ఆ ప్రదేశానికి నడిచే దారి దొరకలేదు.'
          : language === 'hi'
          ? 'उस जगह के लिए पैदल रास्ता नहीं मिला।'
          : 'Could not find a walking route to that location.';
      return { success: false, errorMessage: noRouteMsg };
    }

    const walkingRoute: WalkingRoute = {
      destinationName: candidate.name,
      destinationAddress: candidate.address,
      totalDistanceMeters: route.distanceMeters,
      totalDurationSeconds: route.durationSeconds,
      hasMainRoadCrossing: route.hasMainRoadCrossing,
      steps: route.steps,
      originLat: userLocation.latitude,
      originLng: userLocation.longitude,
      destinationLat: candidate.lat,
      destinationLng: candidate.lng,
    };

    currentNavSession.route = walkingRoute;
    currentNavSession.status = 'awaiting_start_confirmation';
    currentNavSession.currentStepIndex = 0;
    currentNavSession.announcedHalfway = false;

    // Compose mandatory pre-start summary:
    // Distance + Estimated walking time + Road crossing alert + Mandatory cane safety disclaimer + "Shall I start?"
    const distText = formatDistanceForVoice(walkingRoute.totalDistanceMeters, language);
    const timeText = formatDurationForVoice(walkingRoute.totalDurationSeconds, language);

    let crossingText = '';
    if (walkingRoute.hasMainRoadCrossing) {
      crossingText =
        language === 'te'
          ? 'ఈ దారిలో ఒక ప్రధాన రహదారి దాటాల్సి ఉంటుంది. '
          : language === 'hi'
          ? 'इस रास्ते में एक मुख्य सड़क पार करनी होगी। '
          : 'This route includes a main road crossing. ';
    }

    const safetyDisclaimer =
      language === 'te'
        ? 'నేను దారి చెప్పగలను, కానీ దయచేసి మీ వాకింగ్ స్టిక్ లేదా సహాయకుడిని ఉపయోగించండి, జాగ్రత్తగా నడవండి. నేను వాటికి ప్రత్యామ్నాయం కాదు.'
        : language === 'hi'
        ? 'मैं दिशा बता सकता हूँ, लेकिन कृपया अपनी छड़ी का उपयोग करें और सावधान रहें। मैं उनका विकल्प नहीं हूँ।'
        : 'I can help with directions, but please use your cane or guide and stay careful. I do not replace them.';

    const startQuestion =
      language === 'te'
        ? 'దారి చూపించడం ప్రారంభించమంటారా?'
        : language === 'hi'
        ? 'क्या मैं रास्ता बताना शुरू करूँ?'
        : 'Shall I start?';

    const summaryMessage =
      language === 'te'
        ? `${candidate.name} కు దూరం ${distText}, నడవడానికి ${timeText} పడుతుంది. ${crossingText}${safetyDisclaimer} ${startQuestion}`
        : language === 'hi'
        ? `${candidate.name} की दूरी ${distText} है, पैदल चलने में ${timeText} लगेगा। ${crossingText}${safetyDisclaimer} ${startQuestion}`
        : `Distance to ${candidate.name} is ${distText}, walking time ${timeText}. ${crossingText}${safetyDisclaimer} ${startQuestion}`;

    return {
      success: true,
      route: walkingRoute,
      summaryMessage,
    };
  } catch (err: any) {
    console.error('Walking navigation error:', err);
    const genericErr =
      language === 'te'
        ? 'దారి కనుగొనడంలో సమస్య వచ్చింది. దయచేసి స్థలం పేరును మళ్ళీ చెప్పండి.'
        : language === 'hi'
        ? 'रास्ता खोजने में समस्या आई। कृपया दोबारा बोलें।'
        : 'Could not calculate walking route. Please try again.';
    return { success: false, errorMessage: genericErr };
  }
}

/**
 * Confirms start of walking guidance
 */
export function confirmAndStartWalkingNavigation(
  language: DrishtiLanguage,
  onInstruction: (text: string) => void
): void {
  const session = currentNavSession;
  if (!session.route || session.route.steps.length === 0) return;

  session.status = 'active';
  session.currentStepIndex = 0;

  const firstStep = session.route.steps[0];
  const firstInstruction = formatStepInstruction(firstStep, language);
  session.lastSpokenInstruction = firstInstruction;

  onInstruction(firstInstruction);
}

/**
 * Format a turn-by-turn instruction with steps and crossing warnings
 */
export function formatStepInstruction(step: RouteStep, language: DrishtiLanguage): string {
  const clean = cleanRouteInstruction(step.instruction);
  const dist = formatDistanceForVoice(step.distanceMeters, language);

  let warning = '';
  if (step.isCrossing) {
    warning =
      language === 'te'
        ? 'ముందు రోడ్డు దాటాల్సి ఉంటుంది. ఆగి వాహనాల శబ్దాలను జాగ్రత్తగా వినండి. సందేహం ఉంటే దగ్గరలో ఉన్న వారి సహాయం తీసుకోండి. '
        : language === 'hi'
        ? 'आगे सड़क पार करनी होगी। रुकें और ट्रैफिक की आवाज सुनें। '
        : 'A road crossing is coming up. Stop and listen for traffic. Ask someone nearby if you are not sure. ';
  }

  if (language === 'te') {
    return `${warning}${dist}: ${clean}`;
  }
  if (language === 'hi') {
    return `${warning}${dist}: ${clean}`;
  }
  return `${warning}In ${dist}: ${clean}`;
}

/**
 * Handles GPS location update during active navigation
 */
export function handleLiveLocationUpdate(
  pos: GeolocationPosition,
  language: DrishtiLanguage,
  onAlert: (text: string) => void
): void {
  const session = currentNavSession;
  if (session.status !== 'active' || !session.route) return;

  const lat = pos.coords.latitude;
  const lng = pos.coords.longitude;
  const accuracy = pos.coords.accuracy;

  session.lastLatitude = lat;
  session.lastLongitude = lng;
  session.lastAccuracy = accuracy;

  // Weak GPS check (> 35m)
  if (accuracy > 35) {
    const weakGpsMsg =
      language === 'te'
        ? 'GPS సిగ్నల్ బలహీనంగా ఉంది. దయచేసి కాసేపు ఆగి వేచి ఉండండి.'
        : language === 'hi'
        ? 'जीपीएस सिग्नल कमजोर है। कृपया थोड़ा रुकें।'
        : 'GPS signal is weak, please stop moving until it improves.';
    onAlert(weakGpsMsg);
    return;
  }

  const steps = session.route.steps;
  const currentStep = steps[session.currentStepIndex];
  if (!currentStep) return;

  // Distance to end of current step
  const distToEndOfStep = computeDistanceMeters(lat, lng, currentStep.endLat, currentStep.endLng);

  // Distance to destination
  const distToDest = computeDistanceMeters(
    lat,
    lng,
    session.route.destinationLat,
    session.route.destinationLng
  );

  // 1. Arrival check (within 15m of destination or completed last step)
  if (distToDest <= 18 || (session.currentStepIndex === steps.length - 1 && distToEndOfStep <= 12)) {
    session.status = 'arrived';
    const arrivalMsg =
      language === 'te'
        ? `మీరు గమ్యస్థానం ${session.route.destinationName} చేరుకున్నారు.`
        : language === 'hi'
        ? `आप अपने गंतव्य ${session.route.destinationName} पर पहुंच गए हैं।`
        : `You have reached your destination, ${session.route.destinationName}.`;
    session.lastSpokenInstruction = arrivalMsg;
    onAlert(arrivalMsg);
    return;
  }

  // 2. Advance to next step when within 14 meters of current step waypoint
  if (distToEndOfStep <= 14 && session.currentStepIndex < steps.length - 1) {
    session.currentStepIndex += 1;
    const nextStep = steps[session.currentStepIndex];
    const instruction = formatStepInstruction(nextStep, language);
    session.lastSpokenInstruction = instruction;
    onAlert(instruction);
    return;
  }

  // 3. Halfway progress confirmation
  if (!session.announcedHalfway && distToDest <= session.route.totalDistanceMeters * 0.5) {
    session.announcedHalfway = true;
    const halfwayMsg =
      language === 'te'
        ? 'మీరు సగం దూరం చేరుకున్నారు.'
        : language === 'hi'
        ? 'आप आधा रास्ता तय कर चुके हैं।'
        : 'You are halfway there.';
    onAlert(halfwayMsg);
  }
}

/**
 * Voice: "Where am I?"
 */
export function getWhereAmISpoken(language: DrishtiLanguage): string {
  const session = currentNavSession;
  if (!session.route) {
    return language === 'te'
      ? 'ప్రస్తుతం నావిగేషన్ యాక్టివ్‌గా లేదు.'
      : language === 'hi'
      ? 'वर्तमान में नेविगेशन सक्रिय नहीं है।'
      : 'Navigation is not active.';
  }

  const currentStep = session.route.steps[session.currentStepIndex];
  const stepName = currentStep ? cleanRouteInstruction(currentStep.instruction) : session.route.destinationName;

  return language === 'te'
    ? `మీరు ప్రస్తుతం ${stepName} వైపు వెళ్తున్నారు. గమ్యస్థానం: ${session.route.destinationName}.`
    : language === 'hi'
    ? `आप अभी ${stepName} के रास्ते पर हैं। गंतव्य: ${session.route.destinationName}।`
    : `You are currently on route near: ${stepName}. Destination is ${session.route.destinationName}.`;
}

/**
 * Voice: "How far is left?"
 */
export function getRemainingDistanceSpoken(language: DrishtiLanguage): string {
  const session = currentNavSession;
  if (!session.route) {
    return language === 'te'
      ? 'ప్రస్తుతం నావిగేషన్ నడవడం లేదు.'
      : language === 'hi'
      ? 'नेविगेशन चालू नहीं है।'
      : 'Navigation is not active.';
  }

  let remainingMeters = 0;
  for (let i = session.currentStepIndex; i < session.route.steps.length; i++) {
    remainingMeters += session.route.steps[i].distanceMeters;
  }

  const distText = formatDistanceForVoice(remainingMeters, language);
  const timeText = formatDurationForVoice(Math.round(remainingMeters / 1.3), language);

  return language === 'te'
    ? `ఇంకా ${distText} దూరం మిగిలి ఉంది. సుమారు ${timeText} పడుతుంది.`
    : language === 'hi'
    ? `अभी ${distText} बाकी है, लगभग ${timeText} लगेगा।`
    : `${distText} remaining, about ${timeText} left.`;
}

/**
 * Voice: "Take me back" (Reverses origin and destination)
 */
export async function reverseWalkingRoute(
  language: DrishtiLanguage
): Promise<{ success: boolean; message: string }> {
  const session = currentNavSession;
  if (!session.route) {
    return {
      success: false,
      message:
        language === 'te'
          ? 'వెనక్కి వెళ్ళడానికి మునుపటి దారి లేదు.'
          : 'No previous route to reverse.',
    };
  }

  const reversedOrigin = {
    latitude: session.lastLatitude || session.route.destinationLat,
    longitude: session.lastLongitude || session.route.destinationLng,
  };

  const plan = await planWalkingRoute(
    'starting point',
    reversedOrigin,
    language
  );

  if (plan.success && plan.route) {
    session.route = plan.route;
    session.status = 'active';
    session.currentStepIndex = 0;
    const firstInstr = formatStepInstruction(plan.route.steps[0], language);
    const startMsg =
      language === 'te'
        ? `మొదటి స్థానానికి తిరిగి వెళ్ళడానికి దారి సిద్ధం చేశాను. ${firstInstr}`
        : `Route back to starting point ready. ${firstInstr}`;
    return { success: true, message: startMsg };
  }

  return {
    success: false,
    message:
      language === 'te'
        ? 'వెనక్కి వెళ్ళే దారి కనుగొనలేకపోయాను.'
        : 'Could not calculate return route.',
  };
}

/**
 * Voice: "Stop" or "Cancel"
 */
export function stopWalkingNavigation(language: DrishtiLanguage): string {
  const session = currentNavSession;
  session.status = 'idle';
  session.route = null;
  session.currentStepIndex = 0;

  return language === 'te'
    ? 'నావిగేషన్ ముగించబడింది.'
    : language === 'hi'
    ? 'नेविगेशन समाप्त हो गया है।'
    : 'Walking navigation ended.';
}
