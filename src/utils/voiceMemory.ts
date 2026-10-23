export interface SavedScan {
  id: string;
  timestamp: number;
  dateStr: string;
  label: string;
  summary: string;
  rawText: string;
  category: string;
  expiry?: string;
  amount?: string;
}

const STORAGE_KEY = 'drishtivaani_voice_memory';

export function getSavedScans(): SavedScan[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

export function saveScanToMemory(
  label: string,
  fullText: string,
  category = 'general'
): SavedScan {
  const scans = getSavedScans();
  const now = new Date();

  // Extract expiry if present
  let expiryMatch = fullText.match(/(?:గడువు|ఎక్స్‌పైరీ|exp(?:iry)?|exp\s*date)[\s:]*([0-9]{1,2}[\/\-][0-9]{2,4}|[A-Za-z]{3}\s*[0-9]{2,4})/i);
  let amountMatch = fullText.match(/(?:రూపాయలు|మొత్తం|₹|rs\.?|inr)\s*([0-9,]+(?:\.[0-9]{2})?)/i);

  const cleanLabel = label.trim() || `${category} - ${now.toLocaleDateString()}`;

  const newScan: SavedScan = {
    id: `scan_${Date.now()}`,
    timestamp: Date.now(),
    dateStr: now.toLocaleDateString(),
    label: cleanLabel,
    summary: fullText.slice(0, 160),
    rawText: fullText,
    category,
    expiry: expiryMatch ? expiryMatch[1] : undefined,
    amount: amountMatch ? amountMatch[1] : undefined,
  };

  scans.unshift(newScan);
  // Keep up to 50 saved scans
  const trimmed = scans.slice(0, 50);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.warn('Memory save failed:', e);
  }

  return newScan;
}

export function searchVoiceMemory(query: string, language: 'te' | 'hi' | 'en'): string {
  const scans = getSavedScans();
  if (scans.length === 0) {
    return language === 'te'
      ? 'మీరు ఇంతవరకు ఎలాంటి వివరాలనూ సేవ్ చేయలేదు. దేనినైనా స్కాన్ చేసి "దీన్ని సేవ్ చేయి" అని చెప్పండి.'
      : language === 'hi'
      ? 'आपने अभी तक कुछ भी सेव नहीं किया है। कुछ भी स्कैन करके "इसे सेव करो" कहें।'
      : 'You have not saved anything yet. Scan something and say "save this".';
  }

  const q = query.toLowerCase();

  // Expiry check query
  if (q.includes('expire') || q.includes('గడువు') || q.includes('ఎక్స్‌పైరీ') || q.includes('ఎప్పుడు')) {
    const medScans = scans.filter((s) => s.expiry || s.category === 'medicine' || s.rawText.includes('గడువు'));
    if (medScans.length > 0) {
      const top = medScans[0];
      return language === 'te'
        ? `మీరు సేవ్ చేసిన ${top.label} గడువు తేదీ: ${top.expiry || 'తేదీ వివరాలు లేవు'}.`
        : language === 'hi'
        ? `आपकी ${top.label} की एक्सपायरी तारीख: ${top.expiry || 'तारीख उपलब्ध नहीं है'}।`
        : `Your saved ${top.label} expiry date is: ${top.expiry || 'not specified'}.`;
    }
  }

  // Bill amount check query
  if (q.includes('bill') || q.includes('బిల్లు') || q.includes('కరెంట్') || q.includes('ఎంత') || q.includes('డబ్బు')) {
    const billScans = scans.filter((s) => s.amount || s.category === 'bill' || s.rawText.includes('బిల్లు'));
    if (billScans.length > 0) {
      const top = billScans[0];
      return language === 'te'
        ? `మీరు సేవ్ చేసిన ${top.label} మొత్తం: ₹${top.amount || 'మొత్తం వివరాలు లేవు'}. ${top.summary}`
        : language === 'hi'
        ? `आपका सेव किया गया ${top.label} राशि: ₹${top.amount || 'राशि उपलब्ध नहीं'}।`
        : `Your saved ${top.label} amount is ₹${top.amount || 'not found'}.`;
    }
  }

  // Yesterday / Recent query
  if (q.includes('yesterday') || q.includes('నిన్న') || q.includes('చివరి') || q.includes('recent') || q.includes('లాస్ట్')) {
    const top = scans[0];
    return language === 'te'
      ? `మీరు ఇటీవల సేవ్ చేసినవి: "${top.label}". వివరాలు: ${top.summary}`
      : language === 'hi'
      ? `आपने हाल ही में सेव किया था: "${top.label}". विवरण: ${top.summary}`
      : `Your most recent saved scan is: "${top.label}". Details: ${top.summary}`;
  }

  // Generic keyword search
  const found = scans.find(
    (s) =>
      s.label.toLowerCase().includes(q) ||
      s.rawText.toLowerCase().includes(q) ||
      s.category.toLowerCase().includes(q)
  );

  if (found) {
    return language === 'te'
      ? `సేవ్ చేసిన సమాచారం దొరికింది: ${found.label}. ${found.rawText}`
      : language === 'hi'
      ? `मिली जानकारी: ${found.label}। ${found.rawText}`
      : `Found saved scan: ${found.label}. ${found.rawText}`;
  }

  // Fallback: list last 2 saved labels
  const labels = scans.slice(0, 3).map((s) => s.label).join(', ');
  return language === 'te'
    ? `మీరు అడిగిన పేరుతో సమాచారం దొరకలేదు. మీ వద్ద సేవ్ చేసినవి: ${labels}.`
    : language === 'hi'
    ? `वह जानकारी नहीं मिली। आपकी सेव की गई वस्तुएं हैं: ${labels}।`
    : `Could not find that exact scan. You have saved: ${labels}.`;
}

export function clearVoiceMemory(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    // ignore
  }
}
