const FAMILY_CONTACTS_KEY = 'drishtivaani_family_contacts';

export function getSavedFamilyContact(role: string): string | null {
  try {
    const raw = localStorage.getItem(FAMILY_CONTACTS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    return map[role.toLowerCase()] || map['default'] || null;
  } catch (e) {
    return null;
  }
}

export function saveFamilyContact(role: string, contactNumber: string): void {
  try {
    const raw = localStorage.getItem(FAMILY_CONTACTS_KEY);
    const map = raw ? JSON.parse(raw) : {};
    map[role.toLowerCase()] = contactNumber.trim();
    localStorage.setItem(FAMILY_CONTACTS_KEY, JSON.stringify(map));
  } catch (e) {
    // ignore
  }
}

/**
 * Prepares shareable message using Web Share API or WhatsApp / SMS pre-filled link
 */
export async function shareScanWithFamily(
  summary: string,
  role = 'family',
  language: 'te' | 'hi' | 'en'
): Promise<string> {
  const shareText = `DrishtiVaani Scan Summary:\n${summary}\n(Shared from DrishtiVaani Assistive App)`;

  if (typeof navigator !== 'undefined' && (navigator as any).share) {
    try {
      await (navigator as any).share({
        title: 'DrishtiVaani Scan',
        text: shareText,
      });
    } catch (e) {
      // User cancelled or share dismissed
    }
  } else {
    // Fallback: Open WhatsApp / SMS link
    const encoded = encodeURIComponent(shareText);
    const waUrl = `https://wa.me/?text=${encoded}`;
    try {
      window.open(waUrl, '_blank');
    } catch (e) {
      // ignore
    }
  }

  const roleTextTe =
    role.includes('son') || role.includes('అబ్బాయి')
      ? 'మీ అబ్బాయికి'
      : role.includes('daughter') || role.includes('అమ్మాయి')
      ? 'మీ అమ్మాయికి'
      : role.includes('wife') || role.includes('భార్య')
      ? 'మీ భార్యకు'
      : 'మీ కుటుంబ సభ్యులకు';

  const roleTextHi =
    role.includes('son') || role.includes('बेटा')
      ? 'आपके बेटे के लिए'
      : role.includes('daughter') || role.includes('बेटी')
      ? 'आपकी बेटी के लिए'
      : 'आपके परिवार के लिए';

  return language === 'te'
    ? `${roleTextTe} సందేశం సిద్ధం చేశాను.`
    : language === 'hi'
    ? `मैंने ${roleTextHi} संदेश तैयार कर दिया है।`
    : `I have prepared the message for your ${role}.`;
}
