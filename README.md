# Kintsugi

**A quiet place to practice what matters.**

Kintsugi is a relational rehearsal engine built for the LOVE x AI Innovation Challenge. It helps people prepare for difficult workplace conversations — not by replacing them, but by creating a space to practice before they happen.

The name comes from the Japanese art of repairing broken pottery with gold. The cracks are not hidden. They become the strongest part.

---

## What It Does

1. **Context Entry** — The user describes a difficult conversation they need to have: the situation, the person, and how they feel.

2. **Roleplay Simulation** — An AI simulates the other person in the conversation. It responds with realistic emotion — defensiveness, tiredness, caution — not instant agreement or escalation. The goal is believable friction, not conflict resolution.

3. **Relational Mirror** — After the practice conversation, the system reflects back three things:
   - **A Moment to Notice** — Where defensiveness or pressure may have appeared in the user's language.
   - **The Other Side** — How the other person may have experienced the interaction.
   - **A Way to Begin** — One improved opening line grounded in vulnerability and curiosity.

4. **Retry** — The user can rehearse again with new awareness, or start a completely new conversation.

---

## What It Does Not Do

- Diagnose users
- Provide therapy or clinical advice
- Score or rank empathy
- Replace real human conversation
- Automate communication
- Store or transmit conversations

It scaffolds human judgment. It does not replace it.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Express, TypeScript, Zod validation |
| AI | OpenRouter API (Gemma, Llama, Mistral — free tier with model cascade) |
| Voice | Browser Web Speech API — Text-to-Speech + Speech-to-Text |
| Architecture | Roleplay Engine + Relational Mirror Engine |
| Stability | 8s timeout, demo fallback, model cascade, JSON safe parsing |

---

## Installation

### Prerequisites

- Node.js 18+
- npm
- An [OpenRouter](https://openrouter.ai/) API key (free tier works)

### 1. Clone the repository

```bash
git clone https://github.com/your-username/kintsugi.git
cd kintsugi
```

### 2. Create environment file

Create a `.env` file in the project root:

```
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

### 3. Install dependencies

```bash
# Backend
cd server
npm install

# Frontend
cd ../frontend
npm install
```

### 4. Start the application

Open two terminal windows:

**Terminal 1 — Backend (port 3001):**
```bash
cd server
npm run dev
```

**Terminal 2 — Frontend (port 8080):**
```bash
cd frontend
npm run dev
```

Open `http://localhost:8080` in your browser.

The frontend proxies `/api` requests to the backend automatically via Vite's dev server.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENROUTER_API_KEY` | Yes | Your OpenRouter API key. Free tier supported. |
| `PORT` | No | Backend port. Defaults to `3001`. |

---

## Demo Mode

If the API is unavailable — network failure, rate limiting, or no API key — the application automatically switches to demo mode:

- **Conversation**: Prewritten in-character replies cycle through naturally.
- **Mirror**: A prewritten reflection is returned with all three insight cards.
- **No error is shown to the user.** The experience continues seamlessly.

This ensures Kintsugi works on stage, offline, or under load — without any configuration.

---

## Folder Structure

```
kintsugi/
├── .env                          # API keys (not committed)
├── .env.example                  # Template for environment setup
├── .gitignore
│
├── server/                       # Express backend
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── index.ts              # Server entry point (port 3001)
│       ├── lib/
│       │   ├── openrouter.ts     # Model cascade + retry logic
│       │   └── safety.ts         # Short-input guardrail
│       ├── prompts/
│       │   ├── simulateSystem.ts # Roleplay engine system prompt
│       │   └── mirrorSystem.ts   # Relational Mirror system prompt
│       └── routes/
│           ├── simulate.ts       # POST /api/simulate
│           └── mirror.ts         # POST /api/mirror
│
└── frontend/                     # React + Vite frontend
    ├── package.json
    ├── vite.config.ts            # Dev proxy to backend
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx
        ├── index.css             # Global styles, animations
        ├── lib/
        │   └── api.ts            # API client with timeout + demo fallback
        ├── pages/
        │   └── Index.tsx          # Screen state management
        ├── components/
        │   ├── EntryScreen.tsx           # Context entry form
        │   ├── ConversationScreen.tsx    # Practice conversation UI + STT/TTS
        │   ├── RelationalMirrorScreen.tsx # Mirror reflection cards
        │   ├── GoldGlow.tsx              # Visual effect
        │   ├── GrainOverlay.tsx          # Texture overlay
        │   └── ui/                       # shadcn/ui primitives
        └── assets/
            ├── kintsugi-logo.png
            └── kintsugi-shield.png
```

---

## API Endpoints

### `POST /api/simulate`

Generates an in-character employee response during the practice conversation.

**Request body:**
```json
{
  "context": {
    "situation": "Team member missing deadlines",
    "person": "Alex",
    "emotion": "frustrated"
  },
  "messages": [
    { "role": "user", "text": "Alex, I noticed some deadlines slipping recently." }
  ]
}
```

**Response:**
```json
{
  "reply": "Yeah... I know. Things have been a lot lately."
}
```

### `POST /api/mirror`

Analyzes the full conversation and returns a structured reflection.

**Request body:** Same shape as `/api/simulate`, with at least 2 messages.

**Response:**
```json
{
  "trigger": "There may have been a moment where...",
  "empathyGap": "From their perspective, this might have felt...",
  "repair": "I've been thinking about our conversation, and..."
}
```

---

## Demo Walkthrough

1. **Open the app.** You see the entry screen: "A quiet place to practice what matters."

2. **Enter context.** Describe the situation, the person you need to talk to, and how you're feeling. Click "Begin When You're Ready."

3. **Practice the conversation.** Type or speak what you would actually say to this person. Click the 🎤 mic button to use voice input — your speech is transcribed into the text field (you still press Send manually). The AI responds as a realistic employee — not hostile, not agreeable, but human. Slightly defensive. A little tired. Cautious.

4. **Listen to the AI.** AI responses are spoken aloud via Text-to-Speech (on by default). Click the 🔊 volume icon to toggle voice on/off. Speech is cancelled automatically when you open the Mirror.

5. **When ready**, click "Pause and Look Beneath the Surface." There is no conversation limit — practice as long as you need.

6. **Read your reflection.** Three cards appear:
   - A moment where your language may have carried more weight than you intended.
   - How it might have felt from the other side.
   - One opening line you could try instead.

7. **Rehearse again** with this new awareness, or **start fresh** with a new conversation.

---

## Future Roadmap

- Emotional prosody detection (tone analysis beyond words)
- Slack and Teams integration for in-context practice
- Team-level analytics (aggregated, anonymized — never individual scoring)
- Enterprise deployment with SSO and data isolation
- Culture wall: anonymized visualization of what teams are practicing
- Multi-language support
- Custom scenario templates for onboarding and training

---

## Known Limitations

- **Free-tier AI models** produce lower quality responses than paid models. Occasional generic or repetitive output is expected.
- **Rate limiting** on OpenRouter's free tier can cause delays. The model cascade and demo fallback mitigate this but don't eliminate it.
- **Single scenario type.** Currently designed for manager-employee conversations. Other relationship types (peer, client, report) are not yet supported.
- **No conversation persistence.** Conversations are not saved between sessions.
- **Voice browser compatibility.** Speech-to-Text requires a Chromium-based browser (Chrome, Edge). Text-to-Speech works in all modern browsers. Both features gracefully hide when unsupported.
- **English only.** No multi-language support yet.

---

## Ethical Considerations

Kintsugi is designed with deliberate ethical constraints:

- **No emotional diagnosis.** The system never tells users what they feel or labels their emotional state. It reflects; it does not classify.
- **No therapy claims.** This is a practice tool, not a clinical intervention. It does not replace professional support.
- **No conversation storage.** Nothing the user types is persisted, logged, or transmitted beyond the current session.
- **No empathy scoring.** There is no number, rating, or ranking attached to how someone communicates. Quantifying empathy would undermine the purpose.
- **No automation.** The system does not generate messages for users to send. It helps them think about what to say — they still have to say it themselves.
- **Psychological safety.** Language is intentionally non-clinical, non-judgmental, and non-directive. The system says "There may have been a moment where..." — never "You were wrong."

---

## Acknowledgments

Built for the **LOVE x AI Innovation Challenge**.

The name Kintsugi comes from the Japanese art of repairing broken pottery with gold lacquer — treating breakage not as something to hide, but as part of the object's history. The philosophy: what is broken can become more beautiful for having been broken.

---

## License

MIT
