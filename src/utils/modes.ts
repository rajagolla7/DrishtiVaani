import { ModeInfo } from '../types';

export const MODES: ModeInfo[] = [
  {
    id: 'medicine',
    name: {
      te: 'మందుల మోడ్',
      hi: 'दवा मोड',
      en: 'Medicine Mode',
    },
    iconName: 'Pill',
    description: {
      te: 'మందు పేరు, దేనికోసం, వాడే విధానం, గడువు తేదీ చదువుతుంది.',
      hi: 'दवा का नाम, उपयोग, खुराक और समाप्ति तिथि पढ़ता है।',
      en: 'Reads medicine name, purpose, dosage, and expiry date.',
    },
    sampleVoicePrompt: {
      te: 'ఈ మందు ఏమిటి? ఎప్పుడు వేసుకోవాలి?',
      hi: 'यह दवा किस लिए है? एक्सपायरी क्या है?',
      en: 'What is this medicine and when should I take it?',
    },
  },
  {
    id: 'bill',
    name: {
      te: 'బిల్లులు & పత్రాలు',
      hi: 'बिल और दस्तावेज़',
      en: 'Bills & Documents',
    },
    iconName: 'Receipt',
    description: {
      te: 'బిల్లు మొత్తం, చెల్లించాల్సిన చివరి తేదీ, పత్ర వివరాలు చెప్తుంది.',
      hi: 'बिल की राशि, देय तिथि और ज़रूरी जानकारी बताता है।',
      en: 'States amount due, due date, and necessary actions.',
    },
    sampleVoicePrompt: {
      te: 'ఎంత బిల్లు వచ్చింది? ఆఖరి తేదీ ఎప్పుడు?',
      hi: 'कितना बिल आया है और अंतिम तारीख क्या है?',
      en: 'How much is due and by what date?',
    },
  },
  {
    id: 'currency',
    name: {
      te: 'కరెన్సీ (నోట్లు & నాణాలు)',
      hi: 'करेंसी (रुपये)',
      en: 'Currency Identifier',
    },
    iconName: 'Banknote',
    description: {
      te: 'భారతీయ నోట్లు, నాణేలను గుర్తించి మొత్తం ఎంత అని చెప్తుంది.',
      hi: 'भारतीय नोटों और सिक्कों को पहचानकर कुल राशि बताता है।',
      en: 'Identifies Indian rupee notes/coins and calculates total.',
    },
    sampleVoicePrompt: {
      te: 'నా చేతిలో ఎన్ని రూపాయలు ఉన్నాయి?',
      hi: 'मेरे हाथ में कितने रुपये हैं?',
      en: 'How many rupees are in front of the camera?',
    },
  },
  {
    id: 'sign',
    name: {
      te: 'బోర్డులు & సంకేతాలు',
      hi: 'साइन और बोर्ड',
      en: 'Signs & Boards',
    },
    iconName: 'MapPin',
    description: {
      te: 'బస్సు బోర్డులు, దుకాణాల పేర్లు, రహదారి గుర్తులు చదువుతుంది.',
      hi: 'बस बोर्ड, दुकान के नाम और सड़क के बोर्ड पढ़ता है।',
      en: 'Reads bus route boards, shop signs, and street markers.',
    },
    sampleVoicePrompt: {
      te: 'ఈ బస్సు ఎక్కడికి వెళ్తుంది? ఆ షాప్ పేరు ఏమిటి?',
      hi: 'यह बस कहाँ जा रही है? बोर्ड पर क्या लिखा है?',
      en: 'Where does this bus go? What does the board say?',
    },
  },
  {
    id: 'general',
    name: {
      te: 'సాధారణ వివరణ',
      hi: 'सामान्य विवरण',
      en: 'General Vision',
    },
    iconName: 'Eye',
    description: {
      te: 'కెమెరా ముందున్న వస్తువులు, వ్యక్తులు, పరిసరాలను వివరిస్తుంది.',
      hi: 'कैमरे के सामने मौजूद वस्तुओं और परिवेश का वर्णन करता है।',
      en: 'Describes what is in front of the camera in simple words.',
    },
    sampleVoicePrompt: {
      te: 'నా ముందు ఏముంది? దారి ఎలా ఉంది?',
      hi: 'मेरे सामने क्या है?',
      en: 'What is directly in front of me?',
    },
  },
];
