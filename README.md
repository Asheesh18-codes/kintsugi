# Kintsugi

**A quiet place to practice what matters.**

Kintsugi is a relational rehearsal engine built for the softway LOVE x AI Innovation Challenge. It helps people prepare for difficult conversations — not by replacing them, but by creating a space to practice before they happen.

The name comes from the Japanese art of repairing broken pottery with gold. The cracks are not hidden. They become the strongest part.

---

## What It Does

1. **Context Entry** — Describe a difficult conversation: the situation, the person, and your emotional state (12 emotions — from Calm to Overwhelmed).

2. **Dynamic Roleplay Simulation** — An AI dynamically becomes the other person based on your context. It adapts its persona, emotional tone, and defensiveness level to your specific scenario — client anger, peer conflict, manager friction, or personal boundary.

3. **Relational Mirror** — After the conversation, the AI analyzes the actual transcript and reflects back:
   - **A Moment to Notice** — Where defensiveness or pressure appeared in your words
   - **The Other Side** — How the other person may have experienced the interaction
   - **A Way to Begin** — One vulnerability-based opening line to rebuild trust

4. **Retry or Restart** — Rehearse again with new awareness (fresh AI greeting), or start a completely new conversation.

---

## Application Flow

```
┌──────────────────┐
│   Entry Screen   │  Situation + Person + Emotion (12 states)
│   "Begin..."     │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Conversation    │  Dynamic AI roleplay
│  Screen          │  🎤 Voice input (STT)
│                  │  🔊 Voice output (TTS)
│  "Pause..."      │  ⚡ Practice mode indicator
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Relational      │  AI analyzes full transcript
│  Mirror Screen   │  3 reflection cards
│                  │  ⚡ Practice mode indicator
│ [Rehearse Again] │──→ Back to Conversation (fresh start)
│ [Start New]      │──→ Back to Entry Screen
└──────────────────┘
```

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  FRONTEND  (React + Vite + TypeScript)                          │
│                                                                 │
│  EntryScreen ──▶ ConversationScreen ──▶ RelationalMirrorScreen  │
│                  🎤 STT  🔊 TTS                                │
│                                                                 │
│  api.ts  →  timeout (12s/20s) + fallback + isFallback flag      │
└──────────────────────┬───────────────────────┬──────────────────┘
                       │                       │
                POST /api/simulate       POST /api/mirror
                       │                       │
┌──────────────────────┴───────────────────────┴──────────────────┐
│  BACKEND  (Express + TypeScript)                                │
│                                                                 │
│  Zod Validation → Dynamic Prompt Builder → OpenRouter AI Client │
│                                            5-model cascade      │
│                                            2 retries per model  │
│                                            in-character fallback│
│                      isFallback: true/false in every response   │
└─────────────────────────────────┬───────────────────────────────┘
                                  │
                         OpenRouter API
                  (Gemma · Trinity · Llama · Mistral · DeepSeek)
```

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

## Key Features

| Feature | Description |
|---------|-------------|
| **Dynamic Roleplay** | AI adapts its persona based on your context — works for any scenario, not just one hardcoded character |
| **12 Emotional States** | Calm, Frustrated, Concerned, Anxious, Uncertain, Angry, Guilty, Disappointed, Scared, Sad, Overwhelmed, Hopeful |
| **Voice Input (STT)** | Click 🎤 to speak — your words are transcribed into the chat input via Web Speech API |
| **Voice Output (TTS)** | AI responses are read aloud via Speech Synthesis — toggle 🔊 on/off |
| **Smart Fallbacks** | 3-tier resilience: server-side in-character fallback → client-side fallback → visible "Practice mode" indicator |
| **Practice Mode Indicator** | Gold banner appears when AI is unavailable — "⚡ Practice mode — using guided responses" |
| **Rehearse Again** | Resets conversation with a fresh AI greeting while keeping your context |
| **Dynamic Transcript Labels** | Mirror analysis uses your actual context (e.g., "You" / "Sarah") instead of hardcoded labels |
| **Model Cascade** | 5 AI models with automatic failover — Gemma 3 → Gemma 3n → Arcee Trinity → Llama → DeepSeek |
| **No API Key Required** | Server starts in fallback mode without a key — perfect for demos and development |

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, Framer Motion |
| Backend | Express, TypeScript, Zod validation |
| AI | OpenRouter API (5-model cascade with retry logic) |
| Voice | Browser Web Speech API — Speech-to-Text + Text-to-Speech |
| Architecture | Dynamic Roleplay Engine + Relational Mirror Engine |
| Stability | 12s/20s timeouts, 3-tier fallback, model cascade, `isFallback` flag, JSON safe parsing |

---

## Installation

### Prerequisites

- Node.js 18+
- npm
- An [OpenRouter](https://openrouter.ai/) API key (free tier works, optional for demo mode)

### 1. Clone the repository

```bash
git clone https://github.com/Asheesh18-codes/kintsugi.git
cd kintsugi
```

### 2. Create environment file

Create a `.env` file in the project root:

```
OPENROUTER_API_KEY=your-openrouter-api-key-here
```

> **Note:** The server will start without an API key and use fallback mode. A "Practice mode" banner will appear in the UI.

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
| `OPENROUTER_API_KEY` | No | Your OpenRouter API key. Free tier supported. Server runs in fallback mode without it. |
| `PORT` | No | Backend port. Defaults to `3001`. |

---

## Demo Mode & Fallback Strategy

Kintsugi has a **3-tier fallback system** to ensure the app never crashes:

### Tier 1 — Server-Side Fallback
If the AI API fails (rate limit, timeout, all models exhausted), the server returns **in-character fallback responses** with `isFallback: true`:
- Simulate: `"I... sorry, I zoned out for a second. Can you say that again?"`
- Mirror: Generic but meaningful reflection cards

### Tier 2 — Client-Side Fallback
If the server itself is unreachable (network failure), the frontend returns **prewritten demo responses** with `isFallback: true`.

### Tier 3 — Visible Indicator
When `isFallback: true` is detected, a gold banner appears:
- Conversation: `"⚡ Practice mode — AI is currently unavailable, using guided responses"`
- Mirror: `"⚡ Practice mode — showing a guided reflection while AI is unavailable"`

This ensures Kintsugi works on stage, offline, or under load — with full transparency.

---

## API Endpoints

### `POST /api/simulate`

Generates an in-character response during the practice conversation.

**Request body:**
```json
{
  "context": {
    "situation": "Team member missing deadlines due to burnout",
    "person": "Alex",
    "emotion": "Concerned"
  },
  "messages": [
    { "role": "user", "text": "Alex, I noticed some deadlines slipping recently." }
  ]
}
```

**Response:**
```json
{
  "reply": "Yeah... I know. Things have been a lot lately. I'm trying.",
  "isFallback": false
}
```

### `POST /api/mirror`

Analyzes the full conversation and returns a structured reflection.

**Request body:** Same shape as `/api/simulate`, with at least 2 messages.

**Response:**
```json
{
  "trigger": "The phrase 'slipping recently' may have carried implicit blame...",
  "empathyGap": "From Alex's perspective, this might have felt like...",
  "repair": "I've been noticing some changes and I'm concerned — not disappointed. What's going on for you?",
  "isFallback": false
}
```

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
│       │   ├── openrouter.ts     # 5-model cascade + retry logic
│       │   └── safety.ts         # Short-input guardrail
│       ├── prompts/
│       │   ├── simulateSystem.ts # Dynamic roleplay prompt builder
│       │   └── mirrorSystem.ts   # Relational Mirror system prompt
│       └── routes/
│           ├── simulate.ts       # POST /api/simulate + isFallback
│           └── mirror.ts         # POST /api/mirror + isFallback
│
└── frontend/                     # React + Vite frontend
    ├── package.json
    ├── vite.config.ts            # Dev proxy to backend
    ├── tailwind.config.ts
    └── src/
        ├── main.tsx
        ├── index.css             # Global styles, animations
        ├── lib/
        │   └── api.ts            # API client with ApiResult<T> + isFallback detection
        ├── pages/
        │   └── Index.tsx          # Screen state + Rehearse Again logic
        ├── components/
        │   ├── EntryScreen.tsx           # Context form (12 emotions)
        │   ├── ConversationScreen.tsx    # Chat UI + STT/TTS + fallback banner
        │   ├── RelationalMirrorScreen.tsx # Mirror cards + fallback banner
        │   ├── GoldGlow.tsx              # Visual effect
        │   ├── GrainOverlay.tsx          # Texture overlay
        │   └── ui/                       # shadcn/ui primitives
        └── assets/
            ├── kintsugi-logo.png
            └── kintsugi-shield.png
```

---

## Demo Scenario

Use this scenario for a live demo:

**Situation:**
> I am a team lead. One of my previously strong team members has started missing deadlines and using office time for personal projects. My client has lost trust in our delivery, and my manager has been having altercations with me about it. I need to address this directly but I also want to understand what's going on.

**Person:** `Ravi`

**Emotion:** `Frustrated`

**Suggested conversation starters:**
1. "Ravi, I wanted to talk about the project timelines. I've been hearing concerns from the client."
2. "Hey Ravi, I need to be honest — things aren't going well with delivery and I need to understand what's happening on your end."
3. "Ravi, I care about your work here. But I'm getting pressure from above and I need us to figure this out together."

---

## Demo Walkthrough

1. **Open the app.** You see the entry screen: "A quiet place to practice what matters."

2. **Enter context.** Paste the demo scenario, type "Ravi" as the person, select "Frustrated" as your emotion. Click "Begin When You're Ready."

3. **Practice the conversation.** Type or speak what you would actually say. Click 🎤 to use voice input. The AI responds as Ravi — slightly defensive, maybe overwhelmed, realistic.

4. **Listen to the AI.** Responses are spoken aloud via TTS (toggle 🔊 to control). Notice how Ravi's responses create realistic friction — not hostile, but not easy either.

5. **When ready**, click "Pause and Look Beneath the Surface." There is no conversation limit.

6. **Read your reflection.** Three cards appear with specific insights grounded in your actual words — not generic advice.

7. **Rehearse again** with new awareness, or **start fresh** with a new conversation.

> **Demo tip:** If you see the "⚡ Practice mode" banner, it means the AI API is rate-limited or unavailable. The demo still works with in-character fallback responses.

---

## Recent Updates

### v2.0 — Dynamic Engine & Smart Fallbacks

- **Dynamic Roleplay Prompt** — AI persona is now generated from user context instead of hardcoded "overwhelmed employee"
- **12 Emotional States** — Expanded from 5 mild emotions to 12 covering the full range
- **Smart Fallback System** — 3-tier: server fallback → client fallback → visible "Practice mode" banner
- **`isFallback` Flag** — Server includes `isFallback: true/false` in every response for transparent error handling
- **Fixed "Rehearse Again"** — Now resets conversation with fresh AI greeting instead of showing stale messages
- **Dynamic Transcript Labels** — Mirror analysis uses context-aware labels ("You" / person name) instead of "Manager/Employee"
- **Server Resilience** — No longer crashes without API key; starts in fallback mode with a warning
- **Voice I/O** — Speech-to-Text (🎤) and Text-to-Speech (🔊) via native Web Speech API

---

## Known Limitations

- **Free-tier AI models** produce lower quality responses than paid models. Occasional generic output is expected.
- **Rate limiting** on OpenRouter's free tier can cause model cascade to fall through to less capable models.
- **No conversation persistence.** Conversations are not saved between sessions.
- **Voice browser compatibility.** STT requires Chromium (Chrome, Edge). TTS works in all modern browsers.
- **English only.** No multi-language support yet.

---

## Future Roadmap

- Emotional prosody detection (tone analysis beyond words)
- Slack and Teams integration for in-context practice
- Team-level analytics (aggregated, anonymized — never individual scoring)
- Enterprise deployment with SSO and data isolation
- Custom scenario templates for onboarding and training
- Multi-language support
- Conversation history and progress tracking (opt-in only)

---

## Ethical Considerations

Kintsugi is designed with deliberate ethical constraints:

- **No emotional diagnosis.** The system never tells users what they feel or labels their emotional state.
- **No therapy claims.** This is a practice tool, not a clinical intervention.
- **No conversation storage.** Nothing is persisted, logged, or transmitted beyond the current session.
- **No empathy scoring.** There is no number or ranking attached to how someone communicates.
- **No automation.** The system does not generate messages for users to send.
- **Psychological safety.** Language is intentionally non-clinical and non-judgmental.

---

## Acknowledgments

Built for the **LOVE x AI Innovation Challenge**.

The name Kintsugi comes from the Japanese art of repairing broken pottery with gold lacquer — treating breakage not as something to hide, but as part of the object's history.

---

## License

MIT
