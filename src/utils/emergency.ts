const EMERGENCY_CONTACT_KEY = 'drishtivaani_emergency_contact';

export function getEmergencyContact(): string | null {
  try {
    return localStorage.getItem(EMERGENCY_CONTACT_KEY);
  } catch (e) {
    return null;
  }
}

export function saveEmergencyContact(contact: string): void {
  try {
    localStorage.setItem(EMERGENCY_CONTACT_KEY, contact.trim());
  } catch (e) {
    // ignore
  }
}

/**
 * Triggers emergency broadcast:
 * - Gets live location
 * - Constructs SMS/call link with GPS maps URL
 * - Speaks immediate reassurance
 */
export async function triggerEmergencyFlow(
  language: 'te' | 'hi' | 'en'
): Promise<{ reassuranceMessage: string; mapsUrl?: string; contact?: string }> {
  const contact = getEmergencyContact() || '112';

  let locationText = '';
  let mapsUrl = '';

  try {
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          timeout: 4000,
          enableHighAccuracy: true,
        });
      });
      const lat = position.coords.latitude;
      const lng = position.coords.longitude;
      mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
      locationText = `My current live location: ${mapsUrl}`;
    }
  } catch (e) {
    // Geolocation unavailable or denied
  }

  const alertBody = encodeURIComponent(
    `EMERGENCY ALERT: I need immediate assistance! ${locationText} (Sent via DrishtiVaani Assistive App)`
  );

  // Trigger SMS or phone intent
  try {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      window.location.href = `sms:${contact}?body=${alertBody}`;
    }
  } catch (e) {
    console.warn('Emergency link trigger:', e);
  }

  const reassuranceMessage =
    language === 'te'
      ? 'మీ కుటుంబ సభ్యులను సంప్రదిస్తున్నాను. మీరు ఉన్న చోటే ఉండండి.'
      : language === 'hi'
      ? 'मैं आपके परिवार से संपर्क कर रहा हूँ। आप जहाँ हैं वहीं रहें।'
      : 'I am contacting your family. Stay where you are.';

  return { reassuranceMessage, mapsUrl, contact };
}
