# DrishtiVaani (దృష్టివాణి / दृष्टिवाणी)

> **Voice-First Assistive Vision & Navigation Companion for the Visually Impaired**  
> Designed for blind, low-vision, and low-literacy individuals to independently navigate the physical world, read everyday objects, detect scams, and manage daily tasks using natural speech.

---

## 🌟 Philosophy: Eyes-Free, Zero-Clutter UI

Traditional mobile apps rely on dense menus, buttons, and visual cards that are difficult or impossible for visually impaired users to operate. 

**DrishtiVaani removes all visual complexity:**
- **Single Tactile Circle**: The screen displays a single, large pulsating circle and a subtle high-contrast status line.
- **100% Voice-Controlled**: Every feature activates purely through natural spoken dialogue in **Telugu (తెలుగు)**, **Hindi (हिंदी)**, or **English**.
- **Instant Camera & Sensors**: Opens directly to the environment camera on mobile devices or webcam on laptops without requiring mode selections.
- **Haptic & Audio Feedback**: Spoken audio confirmation for all interactions.

---

## 🚀 Key Capabilities

### 1. 🚶 Voice-Guided Walking Navigation (Google Maps Platform)
- **Natural Destination Search**: Powered by Google Places API (New) — say *"Take me to Benz Circle"*, *"Nearest medical store"*, or *"ఇక్కడి నుండి బస్ స్టాప్‌కి ఎలా వెళ్ళాలి"*.
- **Pedestrian Routing**: Computes turn-by-turn walking routes with Google Routes API v2, estimating steps, distance, and duration.
- **Safety Warnings**: Alerts before busy road crossings: *"A road crossing is coming up. Stop and listen for traffic. Ask someone nearby if you are not sure."*
- **Camera Obstacle Detection**: Periodically scans the walking path for hazards (poles, open drains, stairs, parked vehicles) and speaks short, prioritized alerts.
- **In-Route Commands**:
  - *"Where am I?"* — Describes current street or nearest landmark.
  - *"How far is left?"* — Reports remaining distance and estimated time.
  - *"Repeat"* — Repeats the last walking instruction.
  - *"Take me back"* — Reverses the route to return home.
  - *"Stop"* / *"Cancel"* — Ends navigation after confirmation.

### 2. 👁️ Real-World Reading & Object Identification
- Point the camera at any medicine strip, utility bill, cash banknote, pantry item, or street sign.
- Ask questions naturally: *"What is this tablet?"*, *"Read the expiry date"*, *"How much money is this note?"*, *"నా చేతిలో ఏముంది?"*.

### 3. 🛡️ Scam & Fraud Check
- Triggers on phrases like *"Is this real?"*, *"Can I trust this?"*, or *"Is this a scam?"*.
- Inspects SMS messages, letters, utility bills, and UPI payment QR codes for phishing, urgent threats, mismatched merchant names, or bank credential requests.

### 4. 🧠 Voice Memory (Private & Local)
- Save details hands-free: *"Save this as my electricity bill"*, *"Remember my blood pressure medicine"*.
- Recall anytime: *"What did I scan yesterday?"*, *"When does my medicine expire?"*.
- Data is stored securely in browser `localStorage` and can be cleared with *"Forget everything"*.

### 5. 💊 Medicine Pair Safety Check
- Ask *"Can I take these two medicines together?"*.
- The app prompts you to show the first and second medicine packages, reading both labels and alerting to known interaction warnings.

### 6. 📜 Scheme & Notice Explainer
- Ask *"Explain this notice"*, *"Am I eligible?"*, or *"What do I need to do?"*.
- Breaks down dense official notices, pension updates, or government schemes into 2–3 clear action steps.

### 7. 💬 Conversation History Recall
- Ask *"What was my previous question?"* (or *"నా మునుపటి ప్రశ్న ఏమిటి?"* / *"मेरा पिछला सवाल क्या था?"*) to review the last query and answer.

### 8. 🆘 Emergency SOS & Family Share
- Say *"Emergency"*, *"I am lost"*, or *"Send this to my family"*.
- Immediately captures GPS location and surroundings to prepare an emergency SMS/WhatsApp dispatch.

---

## 🎛️ Touch Controls

| Gesture | Action |
| :--- | :--- |
| **Single Tap** | Starts listening to your voice and captures camera view |
| **Tap While Speaking** | Instantly stops audio playback |
| **Double Tap** | Repeats the last spoken answer |

---

## 🗣️ Voice Command Cheat Sheet

| Intent | English | Telugu (తెలుగు) | Hindi (हिंदी) |
| :--- | :--- | :--- | :--- |
| **Walking Navigation** | *"Take me to railway station"* | *"రైల్వే స్టేషన్‌కి ఎలా వెళ్ళాలి"* | *"रेलवे स्टेशन ले चलो"* |
| **Obstacle/Where Am I** | *"Where am I?"* / *"How far is left?"* | *"నేను ఎక్కడ ఉన్నాను?"* | *"मैं कहाँ हूँ?"* |
| **Read / Identify** | *"What is in my hand?"* | *"ఇది ఏమిటి?"* | *"यह क्या है?"* |
| **Scam Check** | *"Is this a scam?"* | *"ఇది మోసమా?"* | *"क्या यह धोखा है?"* |
| **Voice Memory** | *"Save this as my power bill"* | *"ఇది కరెంట్ బిల్లుగా దాచు"* | *"इसे बिजली बिल नाम से सेव करो"* |
| **Medicine Pair** | *"Can I take these together?"* | *"ఈ రెండు మందులు కలిపి వేసుకోవచ్చా?"* | *"क्या मैं इन दोनों को साथ ले सकता हूँ?"* |
| **Notice Explainer** | *"Explain this notice"* | *"ఈ నోటీసును వివరించండి"* | *"यह नोटिस समझाओ"* |
| **Previous Question** | *"What was my previous question?"* | *"నా మునుపటి ప్రశ్న ఏమిటి?"* | *"मेरा पिछला सवाल क्या था?"* |
| **Emergency SOS** | *"Emergency, I am lost"* | *"సహాయం చేయండి, నేను దారితప్పాను"* | *"मदद करो, मैं खो गया हूँ"* |

---

## 🏗️ Technical Architecture

- **Frontend**: React 19, TypeScript, Tailwind CSS, HTML5 Geolocation API, Web Speech API (`window.speechSynthesis`), MediaDevices API.
- **Backend**: Express on Node.js / `tsx`, `@google/genai` TypeScript SDK.
- **Vision & Intelligence**: Gemini Vision models (`gemini-flash-latest`, `gemini-3.8-flash`) with dynamic failover.
- **Navigation APIs**: Google Maps Platform:
  - **Places API (New)**: `places:searchText` for geo-search and destination resolution.
  - **Routes API v2**: `directions/v2:computeRoutes` (`travelMode: "WALK"`) for step-by-step pedestrian routes and road crossing detection.
- **Speech Engine**: Gemini Flash TTS with real-time automatic fallback to browser native Web Speech API to guarantee zero voice interruption on quota exhaustion.

---

## ⚙️ Installation & Setup

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/your-username/drishtivaani.git
cd drishtivaani
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` (note: `.env` is ignored by git to protect credentials):
```bash
cp .env.example .env
```
Fill in the required configuration:
```env
# Gemini API Key (Required for vision and reasoning)
GEMINI_API_KEY="YOUR_GEMINI_API_KEY"

# Google Maps Platform Key (Required for walking navigation)
GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"
VITE_GOOGLE_MAPS_API_KEY="YOUR_GOOGLE_MAPS_API_KEY"

# App URL
APP_URL="http://localhost:3000"
```

### 3. Run Development Server
```bash
npm run dev
```
The app will be accessible at `http://localhost:3000`.

### 4. Build for Production
```bash
npm run build
npm run start
```

---

## 🔒 Privacy & Safety Notice

1. **Safety First**: DrishtiVaani is an assistive navigation aid. It does **not** replace a white cane, guide dog, or physical orientation and mobility skills. GPS accuracy can vary by 10–15 meters.
2. **Medical Advice**: Medicine checks are informational extracts from labels; always consult a licensed doctor or pharmacist for medical advice.
3. **Privacy**: Images are processed in real time for analysis and are **not** permanently retained or stored on external servers. Voice memory entries are stored solely in the user's local browser memory.

---

## 📄 License & Attribution

- Built with Google Maps Platform and Gemini AI.
- Solution ID: `gmp_mcp_codeassist_v1_aistudio`
- License: [Apache 2.0](LICENSE)
