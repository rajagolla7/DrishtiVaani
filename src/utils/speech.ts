import { DrishtiLanguage, DrishtiMode } from '../types';

let currentAudioElement: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;
let serverTtsDisabled = false;

// Speech synthesis with server Gemini TTS fallback to Web Speech
export async function speakAssistantMessage(
  text: string,
  language: DrishtiLanguage,
  onStart?: () => void,
  onEnd?: () => void,
  preferLocalSpeech = false
): Promise<void> {
  // Stop any ongoing speech
  stopAllSpeech();

  if (!text || text.trim().length === 0) {
    if (onEnd) onEnd();
    return;
  }

  if (onStart) onStart();

  // If server TTS quota was exhausted or client requested local speech, speak immediately with Web Speech
  if (preferLocalSpeech || serverTtsDisabled) {
    speakWithWebSpeech(text, language, onEnd);
    return;
  }

  // Try server Gemini TTS first for natural voice
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1400);

    const response = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, language }),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      if (data.fallback || !data.success) {
        // Server signaled quota reached or fallback needed
        serverTtsDisabled = true;
        speakWithWebSpeech(text, language, onEnd);
        return;
      }

      if (data.audioBase64) {
        const audioUrl = `data:${data.mimeType || 'audio/wav'};base64,${data.audioBase64}`;
        const audio = new Audio(audioUrl);
        currentAudioElement = audio;

        audio.onended = () => {
          currentAudioElement = null;
          if (onEnd) onEnd();
        };
        audio.onerror = () => {
          currentAudioElement = null;
          speakWithWebSpeech(text, language, onEnd);
        };

        await audio.play();
        return;
      }
    } else {
      serverTtsDisabled = true;
    }
  } catch (e) {
    // Fast fallback to Web Speech API
  }

  // Browser Web Speech fallback
  speakWithWebSpeech(text, language, onEnd);
}

function getBestVoiceForLanguage(langCode: string): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;

  // 1. Exact match e.g. "te-IN" or "hi-IN"
  const exact = voices.find((v) => v.lang.toLowerCase() === langCode.toLowerCase());
  if (exact) return exact;

  // 2. Prefix match e.g. "te" or "hi"
  const prefix = voices.find((v) => v.lang.toLowerCase().startsWith(langCode.slice(0, 2).toLowerCase()));
  if (prefix) return prefix;

  // 3. Indian voice fallback
  const indian = voices.find((v) => v.lang.toLowerCase().includes('in'));
  if (indian) return indian;

  return voices.find((v) => v.default) || voices[0] || null;
}

function speakWithWebSpeech(text: string, language: DrishtiLanguage, onEnd?: () => void) {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    if (onEnd) onEnd();
    return;
  }

  try {
    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    activeUtterance = utterance;

    const langCode = language === 'te' ? 'te-IN' : language === 'hi' ? 'hi-IN' : 'en-US';
    utterance.lang = langCode;
    utterance.rate = 0.95; // slightly slower for enhanced clarity
    utterance.pitch = 1.0;

    const matchedVoice = getBestVoiceForLanguage(langCode);
    if (matchedVoice) {
      utterance.voice = matchedVoice;
    }

    utterance.onend = () => {
      activeUtterance = null;
      if (onEnd) onEnd();
    };

    utterance.onerror = (e) => {
      activeUtterance = null;
      if (onEnd) onEnd();
    };

    window.speechSynthesis.speak(utterance);
  } catch (e) {
    if (onEnd) onEnd();
  }
}

export function stopAllSpeech() {
  if (currentAudioElement) {
    try {
      currentAudioElement.pause();
      currentAudioElement.currentTime = 0;
    } catch (e) {
      // ignore
    }
    currentAudioElement = null;
  }

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      // ignore
    }
  }
  activeUtterance = null;
}

export function isCurrentlySpeaking(): boolean {
  return (
    (currentAudioElement !== null && !currentAudioElement.paused) ||
    (typeof window !== 'undefined' && 'speechSynthesis' in window && window.speechSynthesis.speaking)
  );
}

// Voice Command Parser
export interface ParsedVoiceCommand {
  type:
    | 'previous_question'
    | 'nav_start'
    | 'nav_where_am_i'
    | 'nav_how_far'
    | 'nav_stop'
    | 'nav_take_back'
    | 'confirm_yes'
    | 'confirm_no'
    | 'fraud_check'
    | 'memory_save'
    | 'memory_recall'
    | 'memory_clear'
    | 'medicine_pair'
    | 'scheme_explain'
    | 'family_share'
    | 'form_helper'
    | 'emergency'
    | 'language'
    | 'repeat'
    | 'help'
    | 'read'
    | 'query';
  destination?: string;
  language?: DrishtiLanguage;
  targetRole?: string;
  saveLabel?: string;
  query?: string;
  rawText: string;
}

export function parseSpokenInput(transcript: string): ParsedVoiceCommand {
  const clean = transcript.trim().toLowerCase();

  // 1. PREVIOUS QUESTION QUERY
  if (
    clean.includes('previous question') ||
    clean.includes('last question') ||
    clean.includes('what was my previous') ||
    clean.includes('what is my previous') ||
    clean.includes('what did i just ask') ||
    clean.includes('what did i ask earlier') ||
    clean.includes('what did i ask') ||
    clean.includes('what was my question') ||
    clean.includes('what is my question') ||
    clean.includes('what question did i ask') ||
    clean.includes('మునుపటి ప్రశ్న') ||
    clean.includes('నా మునుపటి ప్రశ్న') ||
    clean.includes('ఇందాక ఏమి అడిగాను') ||
    clean.includes('నేను ఇందాక ఏమి అడిగాను') ||
    clean.includes('చివరి ప్రశ్న') ||
    clean.includes('నా చివరి ప్రశ్న') ||
    clean.includes('నా ప్రశ్న ఏమిటి') ||
    clean.includes('నేను ఏమి అడిగాను') ||
    clean.includes('క్రితం ప్రశ్న') ||
    clean.includes('पिछला सवाल') ||
    clean.includes('मेरा पिछला सवाल') ||
    clean.includes('पहले क्या पूछा था') ||
    clean.includes('मैंने पहले क्या पूछा') ||
    clean.includes('मेरा सवाल क्या था')
  ) {
    return { type: 'previous_question', rawText: transcript };
  }

  // 2. WALKING NAVIGATION CONTROLS
  // 2a. Where am I?
  if (
    clean.includes('where am i') ||
    clean.includes('where i am') ||
    clean.includes('నేను ఎక్కడ ఉన్నాను') ||
    clean.includes('ఎక్కడ ఉన్నాను') ||
    clean.includes('నేను ఎక్కడున్నాను') ||
    clean.includes('मैं कहाँ हूँ')
  ) {
    return { type: 'nav_where_am_i', rawText: transcript };
  }

  // 2b. How far is left?
  if (
    clean.includes('how far is left') ||
    clean.includes('how far left') ||
    clean.includes('how far') ||
    clean.includes('how much distance') ||
    clean.includes('how much time left') ||
    clean.includes('ఇంకా ఎంత దూరం') ||
    clean.includes('ఎంత దూరం ఉంది') ||
    clean.includes('ఎంత సమయం పడుతుంది') ||
    clean.includes('कितनी दूर है') ||
    clean.includes('कितना रास्ता बचा है')
  ) {
    return { type: 'nav_how_far', rawText: transcript };
  }

  // 2c. Take me back (reverse route)
  if (
    clean.includes('take me back') ||
    clean.includes('go back') ||
    clean.includes('reverse route') ||
    clean.includes('వెనక్కి తీసుకెళ్లు') ||
    clean.includes('మళ్ళీ వెనక్కి') ||
    clean.includes('తిరిగి వెళ్ళు') ||
    clean.includes('వాపస్') ||
    clean.includes('वापस ले चलो')
  ) {
    return { type: 'nav_take_back', rawText: transcript };
  }

  // 2d. Stop / Cancel navigation
  if (
    clean.includes('stop navigation') ||
    clean.includes('cancel navigation') ||
    clean.includes('end navigation') ||
    clean.includes('stop walking') ||
    clean.includes('దారి ఆపు') ||
    clean.includes('నావిగేషన్ ఆపు') ||
    clean.includes('రద్దు చేయి') ||
    clean.includes('నేవిగేషన్ బంద్ చేయి') ||
    clean.includes('नेविगेशन रोको') ||
    clean.includes('रास्ता दिखाना बंद करो')
  ) {
    return { type: 'nav_stop', rawText: transcript };
  }

  // 2e. Navigation confirmation: Yes / Start
  if (
    clean === 'yes' ||
    clean === 'start' ||
    clean === 'yeah' ||
    clean === 'sure' ||
    clean === 'okay' ||
    clean === 'ok' ||
    clean === 'అవును' ||
    clean === 'హా' ||
    clean === 'సరే' ||
    clean === 'ప్రారంభించు' ||
    clean === 'స్టార్ట్' ||
    clean === 'చెప్పు' ||
    clean === 'हाँ' ||
    clean === 'शुरू करो' ||
    clean.includes('start navigation') ||
    clean.includes('shall i start')
  ) {
    return { type: 'confirm_yes', rawText: transcript };
  }

  // 2f. Navigation confirmation: No / Cancel
  if (
    clean === 'no' ||
    clean === 'nope' ||
    clean === 'cancel' ||
    clean === 'stop' ||
    clean === 'వద్దు' ||
    clean === 'ఆపు' ||
    clean === 'వద్దు ఆపు' ||
    clean === 'రద్దు' ||
    clean === 'नहीं' ||
    clean === 'मत करो'
  ) {
    return { type: 'confirm_no', rawText: transcript };
  }

  // 2g. Walking Navigation Start Intent (Detect destination query)
  const navPatterns = [
    /(?:take me to|walk to|navigate to|guide me to|directions to|walking route to|i want to go to|how to reach|how do i get to)\s+(.+)/i,
    /(?:నుండి\s+)?(.+?)(?:\s*కి|\s*కు|\s*దగ్గరకు)?\s*(?:ఎలా వెళ్ళాలి|దారి చూపు|దారి చెప్పు|తీసుకెళ్లు|దారి చూపించు|వెళ్ళాలి)/i,
    /(?:मुझे\s+)?(.+?)\s*(?:जाना है|ले चलो|का रास्ता बताओ|का रास्ता दिखाओ|की दिशा बताओ)/i,
  ];

  for (const pattern of navPatterns) {
    const match = transcript.match(pattern);
    if (match && match[1] && match[1].trim().length > 2) {
      let dest = match[1].trim();
      // clean trailing punctuation or filler words
      dest = dest.replace(/[?.!,]/g, '').trim();
      return { type: 'nav_start', destination: dest, rawText: transcript };
    }
  }

  // 2. EMERGENCY (Top priority for safety)
  if (
    clean.includes('emergency') ||
    clean.includes('i am lost') ||
    clean.includes('lost') ||
    clean.includes('ఎమర్జెన్సీ') ||
    clean.includes('నేను దారి తప్పాను') ||
    clean.includes('దారి తప్పాను') ||
    clean.includes('ఆపద') ||
    clean.includes('ఇమర్జెన్సీ') ||
    clean.includes('इमरजेंसी') ||
    clean.includes('रास्ता भटक गया') ||
    clean.includes('बचाओ') ||
    (clean.includes('help') && (clean.includes('call') || clean.includes('lost') || clean.includes('danger')))
  ) {
    return { type: 'emergency', rawText: transcript };
  }

  // 3. SCAM AND FRAUD CHECK
  if (
    clean.includes('is this real') ||
    clean.includes('is this fake') ||
    clean.includes('is this a scam') ||
    clean.includes('can i trust this') ||
    clean.includes('is it safe') ||
    clean.includes('scam') ||
    clean.includes('fraud') ||
    clean.includes('నిజమా') ||
    clean.includes('ఫేక్') ||
    clean.includes('మోసమా') ||
    clean.includes('నమ్మవచ్చా') ||
    clean.includes('మోసం') ||
    clean.includes('నమ్మొచ్చా') ||
    clean.includes('क्या यह असली है') ||
    clean.includes('क्या यह नकली है') ||
    clean.includes('क्या यह फ्रॉड है') ||
    clean.includes('क्या यह सच है')
  ) {
    return { type: 'fraud_check', rawText: transcript };
  }

  // 3. MEDICINE PAIR CHECK
  if (
    clean.includes('together') ||
    clean.includes('with this tablet') ||
    clean.includes('take both') ||
    clean.includes('కలిపి వేసుకోవచ్చా') ||
    clean.includes('ఈ రెండూ వేసుకోవచ్చా') ||
    clean.includes('కలిపి తాగవచ్చా') ||
    clean.includes('కలిపి మింగవచ్చా') ||
    clean.includes('ఒకేసారి వేసుకోవచ్చా') ||
    clean.includes('साथ में ले सकते हैं') ||
    clean.includes('दोनों दवाइयां')
  ) {
    return { type: 'medicine_pair', rawText: transcript };
  }

  // 4. SCHEME AND NOTICE EXPLAINER
  if (
    clean.includes('explain this notice') ||
    clean.includes('am i eligible') ||
    clean.includes('what do i need to do') ||
    clean.includes('scheme') ||
    clean.includes('notice') ||
    clean.includes('ఈ నోటీసు ఏమిటి') ||
    clean.includes('నేను అర్హుడనా') ||
    clean.includes('నేను ఏం చేయాలి') ||
    clean.includes('ఈ పథకం గురించి') ||
    clean.includes('పథకం') ||
    clean.includes('నోటీసు') ||
    clean.includes('నోటీస్') ||
    clean.includes('क्या मैं योग्य हूँ') ||
    clean.includes('नोटिस समझाइए') ||
    clean.includes('योजना')
  ) {
    return { type: 'scheme_explain', rawText: transcript };
  }

  // 5. FAMILY SHARE
  if (
    clean.includes('send this to') ||
    clean.includes('share this with') ||
    clean.includes('send to my son') ||
    clean.includes('send to my daughter') ||
    clean.includes('share with family') ||
    clean.includes('మా అబ్బాయికి పంపించు') ||
    clean.includes('మా అమ్మాయికి పంపించు') ||
    clean.includes('మా ఇంట్లో వారికి') ||
    clean.includes('కుటుంబానికి పంపించు') ||
    clean.includes('షేర్ చేయి') ||
    clean.includes('పంపించు') ||
    clean.includes('परिवार को भेजो') ||
    clean.includes('बेटे को भेजो') ||
    clean.includes('बेटी को भेजो')
  ) {
    let role = 'family';
    if (clean.includes('son') || clean.includes('అబ్బాయి') || clean.includes('కొడుకు') || clean.includes('బేటా')) role = 'son';
    else if (clean.includes('daughter') || clean.includes('అమ్మాయి') || clean.includes('కూతురు') || clean.includes('బేటీ')) role = 'daughter';
    else if (clean.includes('wife') || clean.includes('భార్య') || clean.includes('పత్ని')) role = 'wife';
    return { type: 'family_share', targetRole: role, rawText: transcript };
  }

  // 6. FORM HELPER
  if (
    clean.includes('fill this form') ||
    clean.includes('where do i sign') ||
    clean.includes('form helper') ||
    clean.includes('sign here') ||
    clean.includes('next field') ||
    clean.includes('ఫారమ్ నింపడానికి') ||
    clean.includes('ఎక్కడ సంతకం పెట్టాలి') ||
    clean.includes('సంతకం ఎక్కడ') ||
    clean.includes('ఫారమ్ చదువు') ||
    clean.includes('తర్వాత గడి') ||
    clean.includes('form') ||
    clean.includes('फॉर्म भरने में') ||
    clean.includes('कहाँ साइन करना है')
  ) {
    return { type: 'form_helper', rawText: transcript };
  }

  // 7. VOICE MEMORY: Clear / Forget
  if (
    clean.includes('delete that') ||
    clean.includes('forget everything') ||
    clean.includes('delete my saved') ||
    clean.includes('అన్నీ మర్చిపో') ||
    clean.includes('దాన్ని తొలగించు') ||
    clean.includes('సేవ్ చేసినవి డిలీట్') ||
    clean.includes('డిలీట్ చేయి') ||
    clean.includes('सब भूल जाओ') ||
    clean.includes('हटा दो')
  ) {
    return { type: 'memory_clear', rawText: transcript };
  }

  // 8. VOICE MEMORY: Save
  if (
    clean.includes('save this as') ||
    clean.includes('save this') ||
    clean.includes('remember this') ||
    clean.includes('దీన్ని గుర్తుపెట్టుకో') ||
    clean.includes('గుర్తుపెట్టుకో') ||
    clean.includes('సేవ్ చేయి') ||
    clean.includes('దాచిపెట్టు') ||
    clean.includes('దీన్ని దాచు') ||
    clean.includes('इसे याद रखो') ||
    clean.includes('इसे सेव करो')
  ) {
    // Extract optional label after "save this as" or "సేవ్ చేయి"
    let label = '';
    const asMatch = clean.match(/(?:save this as|save as|పేరుతో సేవ్ చేయి|గా సేవ్ చేయి)\s+(.+)/);
    if (asMatch) label = asMatch[1];
    return { type: 'memory_save', saveLabel: label, rawText: transcript };
  }

  // 9. VOICE MEMORY: Recall
  if (
    clean.includes('what did i scan') ||
    clean.includes('when does my medicine expire') ||
    clean.includes('find my electricity bill') ||
    clean.includes('find my bill') ||
    clean.includes('yesterday') ||
    clean.includes('నా మందుల గడువు ఎప్పుడు') ||
    clean.includes('నా కరెంట్ బిల్లు ఎంత') ||
    clean.includes('నిన్న ఏమి స్కాన్ చేశాను') ||
    clean.includes('నేను సేవ్ చేసినవి') ||
    clean.includes('సేవ్ చేసిన బిల్లు') ||
    clean.includes('సేవ్ చేసిన మందు') ||
    clean.includes('मेरी दवाई कब एक्सपायर') ||
    clean.includes('मेरा बिल कितना है')
  ) {
    return { type: 'memory_recall', query: transcript, rawText: transcript };
  }

  // 10. Language switch commands
  if (
    clean.includes('english లో') ||
    clean.includes('speak english') ||
    clean.includes('in english') ||
    clean.includes('ఇంగ్లీష్')
  ) {
    return { type: 'language', language: 'en', rawText: transcript };
  }
  if (
    clean.includes('hindi') ||
    clean.includes('హిందీ') ||
    clean.includes('हिंदी') ||
    clean.includes('speak hindi')
  ) {
    return { type: 'language', language: 'hi', rawText: transcript };
  }
  if (
    clean.includes('telugu') ||
    clean.includes('తెలుగు') ||
    clean.includes('speak telugu') ||
    clean.includes('తెలుగులో చెప్పు')
  ) {
    return { type: 'language', language: 'te', rawText: transcript };
  }

  // 11. Repeat commands
  if (
    clean.includes('repeat') ||
    clean.includes('మళ్ళీ చెప్పు') ||
    clean.includes('మళ్ళీ') ||
    clean.includes('మల్ల చెప్పు') ||
    clean.includes('మరోసారి') ||
    clean.includes('fir se') ||
    clean.includes('phir se') ||
    clean.includes('dobara')
  ) {
    return { type: 'repeat', rawText: transcript };
  }

  // 12. Help commands
  if (
    clean.includes('help') ||
    clean.includes('what can you do') ||
    clean.includes('నువ్వు ఏమి చేయగలవు') ||
    clean.includes('ఎలా వాడాలి') ||
    clean.includes('సహాయం ఎలా') ||
    clean.includes('guide')
  ) {
    return { type: 'help', rawText: transcript };
  }

  // 13. Trigger snapshot reading
  if (
    clean.includes('read') ||
    clean.includes('చదువు') ||
    clean.includes('చూడు') ||
    clean.includes('చెప్పు') ||
    clean.includes('dekho') ||
    clean.includes('batao')
  ) {
    return { type: 'read', rawText: transcript };
  }

  // 14. General user question
  return { type: 'query', query: transcript, rawText: transcript };
}
