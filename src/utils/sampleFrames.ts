import { DrishtiMode } from '../types';

/**
 * Generates high-fidelity visual sample test frames for all 5 modes.
 * Ensures the app works 100% reliably in any environment, desktop,
 * emulator, or iframe without webcam access.
 */
export function generateSampleFrameDataUrl(mode: DrishtiMode): string {
  const canvas = document.createElement('canvas');
  canvas.width = 800;
  canvas.height = 600;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  // Background
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 800, 600);

  if (mode === 'medicine') {
    // Medicine Blister Strip
    ctx.fillStyle = '#e2e8f0';
    ctx.roundRect(100, 80, 600, 440, 24);
    ctx.fill();

    // Red warning header band
    ctx.fillStyle = '#dc2626';
    ctx.roundRect(100, 80, 600, 70, [24, 24, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('SCHEDULE H PRESCRIPTION DRUG', 140, 125);

    // Medicine Title
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('PARACETAMOL & IBUPROFEN IP', 130, 200);

    ctx.fillStyle = '#2563eb';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText('Brand: Combiflam Plus 650mg', 130, 245);

    // Dosage & Use
    ctx.fillStyle = '#1e293b';
    ctx.font = '22px sans-serif';
    ctx.fillText('Composition: Paracetamol IP 650mg, Ibuprofen IP 400mg', 130, 290);
    ctx.fillText('Usage: For fever, body ache, severe headache and pain.', 130, 325);
    ctx.fillText('Dosage: 1 tablet after meals twice daily, or as directed by doctor.', 130, 360);

    // Expiry & Dates
    ctx.fillStyle = '#097969';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Mfg Date: 03/2025    Exp Date: 02/2028', 130, 410);
    ctx.fillText('Batch No: C893240    MRP: ₹ 48.50', 130, 445);

    // Caution
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'italic 18px sans-serif';
    ctx.fillText('Warning: Taking more than daily dose may cause serious liver damage.', 130, 490);
  } else if (mode === 'bill') {
    // Utility Electricity Bill
    ctx.fillStyle = '#ffffff';
    ctx.roundRect(120, 50, 560, 500, 16);
    ctx.fill();
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 4;
    ctx.stroke();

    // Header
    ctx.fillStyle = '#0369a1';
    ctx.fillRect(120, 50, 560, 65);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('TGSPDCL - ELECTRICITY CONSUMER BILL', 150, 92);

    ctx.fillStyle = '#0f172a';
    ctx.font = '20px sans-serif';
    ctx.fillText('Consumer No: 040-9284-5510', 150, 150);
    ctx.fillText('Consumer Name: K. Rama Rao', 150, 185);
    ctx.fillText('Billing Month: October 2026', 150, 220);
    ctx.fillText('Units Consumed: 184 kWh', 150, 255);

    // Highlight Box for Amount Due
    ctx.fillStyle = '#fef08a';
    ctx.roundRect(150, 280, 500, 110, 12);
    ctx.fill();
    ctx.strokeStyle = '#ca8a04';
    ctx.stroke();

    ctx.fillStyle = '#854d0e';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('TOTAL AMOUNT PAYABLE (మొత్తం చెల్లించాల్సింది):', 170, 315);
    ctx.fillStyle = '#b91c1c';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('₹ 1,480.00', 170, 365);

    // Due Date
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('DUE DATE (ఆఖరి తేదీ): 28-OCT-2026', 150, 430);
    ctx.font = '20px sans-serif';
    ctx.fillText('Amount After Due Date: ₹ 1,580.00', 150, 465);
    ctx.fillStyle = '#475569';
    ctx.font = '16px sans-serif';
    ctx.fillText('Action: Pay at MeeSeva or UPI to avoid disconnection.', 150, 510);
  } else if (mode === 'currency') {
    // Indian Currency Notes & Coins
    // ₹500 Note
    ctx.fillStyle = '#999988';
    ctx.roundRect(80, 80, 420, 210, 14);
    ctx.fill();
    ctx.strokeStyle = '#555544';
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESERVE BANK OF INDIA (భారతీయ రిజర్వ్ బ్యాంక్)', 100, 120);
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('₹ 500', 100, 180);
    ctx.font = '18px sans-serif';
    ctx.fillText('FIVE HUNDRED RUPEES (ఐదు వందల రూపాయలు)', 100, 220);
    ctx.fillText('Mahatma Gandhi Series - 500', 100, 255);

    // ₹100 Note
    ctx.fillStyle = '#c4b5fd';
    ctx.roundRect(260, 260, 440, 210, 14);
    ctx.fill();
    ctx.strokeStyle = '#7c3aed';
    ctx.stroke();

    ctx.fillStyle = '#1e293b';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('RESERVE BANK OF INDIA', 290, 300);
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText('₹ 100', 290, 360);
    ctx.font = '18px sans-serif';
    ctx.fillText('ONE HUNDRED RUPEES (నూరు రూపాయలు)', 290, 400);

    // ₹20 Coin
    ctx.beginPath();
    ctx.arc(180, 420, 55, 0, Math.PI * 2);
    ctx.fillStyle = '#d97706';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(180, 420, 40, 0, Math.PI * 2);
    ctx.fillStyle = '#fef3c7';
    ctx.fill();
    ctx.fillStyle = '#78350f';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('₹20', 160, 430);

    // Total Banner
    ctx.fillStyle = '#15803d';
    ctx.roundRect(180, 500, 440, 65, 12);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('TOTAL: 1x₹500 + 1x₹100 + 1x₹20 = ₹620', 200, 542);
  } else if (mode === 'sign') {
    // Bus destination board & Shop sign
    ctx.fillStyle = '#1e3a8a';
    ctx.roundRect(80, 60, 640, 200, 18);
    ctx.fill();
    ctx.strokeStyle = '#fbbf24';
    ctx.lineWidth = 6;
    ctx.stroke();

    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('TSRTC ROUTE 218D (ఎక్స్‌ప్రెస్)', 110, 120);

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 38px sans-serif';
    ctx.fillText('SECUNDERABAD ⇄ PATANCHERU', 110, 175);
    ctx.font = '22px sans-serif';
    ctx.fillText('via Paradise, Begumpet, Kukatpally, Miyapur', 110, 220);

    // Shop Board
    ctx.fillStyle = '#15803d';
    ctx.roundRect(80, 300, 640, 220, 18);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px sans-serif';
    ctx.fillText('APOLLO PHARMACY & CLINIC', 110, 360);
    ctx.font = '28px sans-serif';
    ctx.fillText('అపోలో ఫార్మసీ - 24 గంటలు తెరిచి ఉంటుంది', 110, 410);
    ctx.fillStyle = '#fef08a';
    ctx.font = '22px sans-serif';
    ctx.fillText('All Medicines, Healthcare & Baby Care Products Available', 110, 460);
  } else {
    // General surroundings scene
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 800, 600);

    // Floor and Wall
    ctx.fillStyle = '#334155';
    ctx.fillRect(0, 320, 800, 280);

    // Open Doorway
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(100, 100, 180, 360);
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 4;
    ctx.strokeRect(100, 100, 180, 360);
    ctx.fillStyle = '#38bdf8';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Open Exit Doorway', 110, 85);

    // Sofa Chair
    ctx.fillStyle = '#b45309';
    ctx.roundRect(400, 220, 260, 200, 16);
    ctx.fill();
    ctx.fillStyle = '#fbbf24';
    ctx.font = 'bold 20px sans-serif';
    ctx.fillText('Armchair (2 meters ahead)', 420, 205);

    // Coffee table
    ctx.fillStyle = '#78350f';
    ctx.roundRect(320, 420, 340, 120, 12);
    ctx.fill();
    ctx.fillStyle = '#fef08a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('Low coffee table with water bottle & key set', 330, 410);
  }

  return canvas.toDataURL('image/jpeg', 0.9);
}
