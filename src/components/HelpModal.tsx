import React, { useEffect } from 'react';
import { DrishtiLanguage } from '../types';
import { X, Sparkles, Mic, ShieldAlert } from 'lucide-react';
import { speakAssistantMessage, stopAllSpeech } from '../utils/speech';

interface HelpModalProps {
  isOpen: boolean;
  language: DrishtiLanguage;
  onClose: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({ isOpen, language, onClose }) => {
  useEffect(() => {
    if (isOpen) {
      const helpText = {
        te: `దృష్టివాణి వాయిస్ గైడ్: మీరు కెమెరా ముందు ఏదైనా వస్తువును లేదా కాగితాన్ని ఉంచి ఈ విధంగా ప్రశ్నలు అడగవచ్చు:
1. మోసాల తనిఖీ: 'ఇది నిజమా?', లేదా 'ఇది మోసమా?' అని అడగండి.
2. వాయిస్ మెమరీ: 'దీన్ని సేవ్ చేయి' అని చెప్పండి, లేదా 'నా మందుల గడువు ఎప్పుడు?', 'నా కరెంట్ బిల్లు ఎంత?' అని అడగండి.
3. మందుల కలయిక: 'ఈ రెండు మందులు కలిపి వేసుకోవచ్చా?' అని అడగండి.
4. ప్రభుత్వ పథకాలు: 'ఈ నోటీసు ఏమిటి?', 'నేను అర్హుడనా?' అని అడగండి.
5. కుటుంబానికి షేర్: 'మా అబ్బాయికి పంపించు' అని చెప్పండి.
6. ఫారమ్ హెల్పర్: 'ఎక్కడ సంతకం పెట్టాలి?' అని అడగండి.
7. అత్యవసరం: 'ఎమర్జెన్సీ' లేదా 'సహాయం చేయి' అని చెప్పండి.
స్క్రీన్‌పై 1 సారి తట్టి మాట్లాడండి. 2 సార్లు తట్టి మళ్ళీ వినండి.`,
        hi: `दृष्टिवाणी वॉयस गाइड: आप कैमरे के सामने कोई भी वस्तु रखकर ये सवाल पूछ सकते हैं:
1. फ्रॉड चेक: 'क्या यह असली है?' या 'क्या यह फ्रॉड है?' पूछें।
2. वॉयस मेमोरी: 'इसे सेव करो' बोलें, या 'मेरी दवाई कब एक्सपायर होगी?', 'मेरा बिल कितना है?' पूछें।
3. दो दवाइयों की जांच: 'क्या इन्हें साथ में ले सकते हैं?' पूछें।
4. सरकारी नोटिस: 'यह नोटिस समझाइए', या 'क्या मैं योग्य हूँ?' पूछें।
5. परिवार को शेयर: 'मेरे बेटे को भेजो' बोलें।
6. फॉर्म भरना: 'कहाँ साइन करना है?' पूछें।
7. इमरजेंसी: 'इमरजेंसी' या 'मदद करो' बोलें।
स्क्रीन पर 1 बार टैप करके बोलें, और 2 बार टैप करके दोबारा सुनें।`,
        en: `DrishtiVaani Voice Guide: Hold anything in front of the camera and ask naturally:
1. Fraud Check: "Is this real?" or "Is this a scam?"
2. Voice Memory: "Save this", or ask "When does my medicine expire?", "Find my electricity bill".
3. Medicine Pair: "Can I take these together?"
4. Notices & Schemes: "Explain this notice" or "Am I eligible?"
5. Family Share: "Send this to my son" or "Share with my family".
6. Form Helper: "Where do I sign?" or "Help me fill this form".
7. Emergency: "Emergency" or "Help".
Tap once to speak or read. Double-tap to repeat.`,
      }[language];

      speakAssistantMessage(helpText, language);
    } else {
      stopAllSpeech();
    }
  }, [isOpen, language]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 flex flex-col p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div className="max-w-lg mx-auto w-full my-auto bg-slate-900 border-4 border-yellow-400 rounded-3xl p-6 shadow-[0_0_50px_rgba(250,204,21,0.5)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-700 pb-4 mb-4">
          <div className="flex items-center space-x-3">
            <Sparkles className="w-8 h-8 text-yellow-400" />
            <h2 id="help-title" className="text-2xl sm:text-3xl font-black text-yellow-300">
              {language === 'te' ? 'సహాయం & వాయిస్ గైడ్' : language === 'hi' ? 'सहायता गाइड' : 'Help & Voice Guide'}
            </h2>
          </div>
          <button
            onClick={() => {
              stopAllSpeech();
              onClose();
            }}
            aria-label="Close help"
            className="w-12 h-12 rounded-2xl bg-yellow-400 text-black flex items-center justify-center font-bold text-2xl active:scale-95"
          >
            <X className="w-7 h-7" />
          </button>
        </div>

        {/* Voice Features List */}
        <div className="space-y-4 text-white text-base">
          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-amber-300 flex items-center gap-2">
              <Mic className="w-5 h-5" />
              {language === 'te' ? 'వాయిస్ ప్రశ్నలు (Voice Questions)' : 'Voice Questions'}
            </h3>
            <ul className="mt-2 space-y-2 text-sm text-slate-200">
              <li>
                <strong className="text-yellow-300">మోసం తనిఖీ:</strong> "ఇది నిజమా?", "ఇది ఫేక్ ఆ?"
              </li>
              <li>
                <strong className="text-emerald-300">వాయిస్ మెమరీ:</strong> "దీన్ని సేవ్ చేయి", "నా మందుల గడువు ఎప్పుడు?"
              </li>
              <li>
                <strong className="text-cyan-300">మందుల కలయిక:</strong> "ఈ రెండు మాత్రలు కలిపి వేసుకోవచ్చా?"
              </li>
              <li>
                <strong className="text-orange-300">పథకాలు & నోటీసులు:</strong> "ఈ నోటీసు ఏమిటి?", "నేను అర్హుడనా?"
              </li>
              <li>
                <strong className="text-purple-300">కుటుంబానికి షేర్:</strong> "మా అబ్బాయికి పంపించు"
              </li>
              <li>
                <strong className="text-blue-300">ఫారమ్ నింపడం:</strong> "ఎక్కడ సంతకం పెట్టాలి?"
              </li>
              <li>
                <strong className="text-rose-400">అత్యవసరం:</strong> "ఎమర్జెన్సీ", "నేను దారి తప్పాను"
              </li>
            </ul>
          </div>

          <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
            <h3 className="text-lg font-bold text-yellow-300">
              {language === 'te' ? 'చేతి సంజ్ఞలు (Gestures)' : 'Gestures'}
            </h3>
            <p className="mt-1 text-slate-200 text-sm">
              • <strong>1 సారి తట్టండి:</strong> ప్రశ్న అడగడానికి లేదా కెమెరా ముందున్నది చదవడానికి.
              <br />
              • <strong>2 సార్లు తట్టండి (Double-Tap):</strong> చివరి సమాధానం మళ్ళీ వినడానికి.
              <br />
              • <strong>మాట్లాడుతున్నప్పుడు తట్టండి:</strong> వెంటనే వాయిస్ ఆపడానికి.
            </p>
          </div>

          <div className="bg-amber-950/60 border border-amber-500/60 p-3 rounded-xl flex items-start gap-2.5">
            <ShieldAlert className="w-6 h-6 text-amber-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-200">
              {language === 'te'
                ? 'గమనిక: ఈ యాప్ సహాయక సాధనం మాత్రమే. ఇది వైద్యుల లేదా చట్టపరమైన నిపుణుల సలహాకు ప్రత్యామ్నాయం కాదు.'
                : 'Disclaimer: This app is an assistive tool and does not replace professional medical or legal advice.'}
            </p>
          </div>
        </div>

        {/* Big Close Button */}
        <button
          onClick={() => {
            stopAllSpeech();
            onClose();
          }}
          className="mt-5 w-full py-3.5 rounded-2xl bg-yellow-400 text-black text-xl font-black uppercase tracking-wider active:scale-95 shadow-lg"
        >
          {language === 'te' ? 'ముగించు (Close)' : 'Close Help'}
        </button>
      </div>
    </div>
  );
};
