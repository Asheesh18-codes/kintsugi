# Kintsugi — Technical Documentation

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [AI Prompt Engineering](#ai-prompt-engineering)
5. [Stability Layer](#stability-layer)
6. [Human-First Design Principles](#human-first-design-principles)
7. [Data Flow](#data-flow)

---

## Architecture Overview

Kintsugi is a two-service application: a React frontend served by Vite's dev server, and an Express backend that handles AI interactions through OpenRouter.

```
┌──────────────────────┐        ┌──────────────────────┐        ┌─────────────────┐
│                      │  /api  │                      │  HTTPS │                 │
│   React Frontend     │───────>│   Express Backend    │───────>│   OpenRouter    │
│   (Vite, port 8080)  │<───────│   (port 3001)        │<───────│   (Free Tier)   │
│                      │  JSON  │                      │  JSON  │                 │
└──────────────────────┘        └──────────────────────┘        └─────────────────┘
                                                                   │
                                                          ┌────────┴────────┐
                                                          │  Model Cascade  │
                                                          │  Gemma 12B      │
                                                          │  Gemma 3n       │
                                                          │  Arcee Trinity  │
                                                          │  Llama 3.3 70B  │
                                                          │  Mistral Small  │
                                                          └─────────────────┘
```

The frontend never communicates directly with OpenRouter. All AI calls are proxied through the Express backend, which handles prompt construction, safety guardrails, response parsing, and fallback logic.

---

## Frontend Architecture

### State Management

The application uses React's built-in `useState` with state lifted to the root page component (`Index.tsx`). No external state library is needed — the data model is intentionally simple.

```
Index.tsx (root)
├── screen: "entry" | "conversation" | "mirror"
├── context: { situation, person, emotion }
└── messages: Array<{ role: "user" | "ai", text: string }>
```

Three screen components receive state as props:

| Component | Receives | Does |
|-----------|----------|------|
| `EntryScreen` | `onBegin` callback | Collects context, triggers screen transition |
| `ConversationScreen` | `context`, `messages`, `setMessages`, `onRevealMirror` | Manages chat input, calls simulate API, enforces limits |
| `RelationalMirrorScreen` | `context`, `messages`, `onTryAgain`, `onStartNew` | Calls mirror API on mount, displays reflection cards |

### Screen Transitions

Transitions use Framer Motion's `AnimatePresence` with `mode="wait"` — each screen fades/slides out before the next enters. This prevents visual overlap and creates a calm, deliberate pace.

```
Entry → handleBegin() → sets context + initial AI greeting → Conversation
Conversation → onRevealMirror() → Mirror
Mirror → onTryAgain() → Conversation (same context, same messages)
Mirror → onStartNew() → Entry (full reset)
```

### API Client (`lib/api.ts`)

The API client wraps every fetch call with:

- **8-second `AbortController` timeout**: If the backend doesn't respond in 8 seconds, the request is aborted.
- **Demo fallback**: If any API call fails for any reason (network error, timeout, bad response), prewritten demo data is returned instead. The caller never receives an error.

This means `fetchSimulateResponse()` and `fetchMirrorAnalysis()` always resolve successfully. The UI components don't need error states.

### Interaction Guards

| Guard | Location | Behavior |
|-------|----------|----------|
| Empty input prevention | `ConversationScreen` | Blank sends trigger a horizontal shake animation; no API call is made |
| Duplicate click prevention | `ConversationScreen` | `if (isLoading) return` at the top of `handleSend` |
| Button disabling | `ConversationScreen` | Send, Mic, and Mirror buttons disabled during `isLoading` |
| Conversation limit | `ConversationScreen` | After 3 user messages, input is replaced with a prompt to use the Mirror |
| Mirror button guard | `ConversationScreen` | Mirror button disabled until user has sent at least 2 messages |
| Mirror action guards | `RelationalMirrorScreen` | Rehearse Again and Begin New buttons disabled during loading |

---

## Backend Architecture

### Server Entry (`src/index.ts`)

Express server on port 3001 with two route modules and a health check:

```
POST /api/simulate  →  routes/simulate.ts
POST /api/mirror    →  routes/mirror.ts
GET  /api/health    →  { status: "ok" }
```

CORS is enabled. JSON body parsing is limited to 50KB.

### Route: `/api/simulate`

1. Validates request body with Zod (context + messages array).
2. Constructs system prompt: base roleplay prompt + conversation-specific context.
3. Applies safety guardrail: messages under 10 characters get a wrapper instructing the AI to respond naturally to brief input.
4. Maps frontend message format (`user`/`ai`) to OpenAI format (`user`/`assistant`).
5. Calls `chatCompletion()` — the model cascade client.
6. **On LLM failure**: Returns a random in-character fallback reply (one of 5 prewritten responses that sound like a distracted or processing person).

### Route: `/api/mirror`

1. Validates request body with Zod (context + at least 2 messages).
2. Formats messages as a labeled transcript (`Manager: ... / Employee: ...`).
3. Sends system prompt + transcript to `chatCompletion()`.
4. **On LLM failure**: Returns prewritten fallback reflection (200, not 500).
5. Strips markdown code fences if the model wrapped its JSON response.
6. Parses JSON with `try/catch`. **On parse failure**: Returns prewritten fallback reflection.
7. Validates response shape with Zod (`moment_to_notice`, `the_other_side`, `a_way_to_begin`).
8. Maps keys to frontend format (`trigger`, `empathyGap`, `repair`).

### OpenRouter Client (`src/lib/openrouter.ts`)

The client implements a **model cascade** — it tries multiple free models in order until one responds:

```
1. google/gemma-3-12b-it:free
2. google/gemma-3n-e4b-it:free
3. arcee-ai/trinity-large-preview:free
4. meta-llama/llama-3.3-70b-instruct:free
5. mistralai/mistral-small-3.1-24b-instruct:free
```

Each model gets 2 retry attempts with exponential backoff (2s, 4s). The following conditions trigger a retry:

- HTTP 429 (rate limited)
- HTTP 500+ (server error)
- Empty response content

Non-retryable errors (HTTP 400, 402, 404) skip to the next model immediately.

Total worst-case latency: 5 models x 2 retries x 4s max delay = ~40 seconds before giving up. In practice, the first available model usually responds in 2-5 seconds.

### Safety Guardrail (`src/lib/safety.ts`)

Messages shorter than 10 characters receive a wrapper that tells the AI to stay in character and respond with natural confusion — like a real person who didn't quite hear what was said. This prevents gibberish or meta-responses to inputs like "hi" or "ok".

---

## AI Prompt Engineering

### Roleplay Engine (`simulateSystem.ts`)

The roleplay prompt creates a specific character: an overwhelmed but caring employee who has been missing deadlines. The prompt enforces:

**Character constraints:**
- Recently missed deadlines
- Previously performed well
- Currently feeling overwhelmed
- Slightly defensive but not hostile
- Still cares about their work

**Behavioral constraints:**
- Do not resolve issues quickly
- Do not immediately agree
- Do not escalate aggressively
- Do not give advice to the manager
- Do not break character or acknowledge being AI
- Silence, short answers, and deflection are valid

**Emotional calibration:**
- 30% defensive
- 40% tired or overwhelmed
- 30% open but cautious

**Output constraint:** Return only the employee's reply. No explanation, analysis, formatting, or labels.

This calibration creates "believable friction" — the AI doesn't fight the user, but it doesn't capitulate either. The user has to work for connection, which gives the Relational Mirror something meaningful to analyze.

### Relational Mirror (`mirrorSystem.ts`)

The mirror prompt produces a structured JSON reflection. It opens with identity framing:

```
Your role is not to judge.
Your role is not to diagnose.
Your role is not to score.
Your role is to gently reflect what may be happening beneath the surface.
```

**Three output fields:**

| Field | Purpose | Language Pattern |
|-------|---------|-----------------|
| `moment_to_notice` | Where defensiveness or protection appeared | "There may have been a moment where..." |
| `the_other_side` | How the employee may have experienced it | "From their perspective..." |
| `a_way_to_begin` | One improved opening line | A direct quote the user could speak aloud |

**Anti-patterns explicitly forbidden:**
- Therapy jargon ("boundaries", "safe space", "holding space")
- Corporate clichés ("feedback sandwich", "growth opportunity")
- Blame assignment ("you were wrong")
- General advice
- Scoring or rating

**Specificity enforcement:** The prompt requires the model to reference specific words, actions, or shifts from the actual conversation transcript. Generic reflections are explicitly marked as invalid.

**Why this wins:** Most AI tools say "You demonstrated low empathy." Kintsugi says "There may have been a moment where..." The difference is the system scaffolds judgment rather than replacing it. It invites reflection rather than delivering a verdict.

---

## Stability Layer

Stability was prioritized because this is a live hackathon demo application. A single crash, freeze, or error modal on stage would undermine the entire product narrative. The system is engineered so that **nothing the user sees can break**.

### Defense-in-Depth Strategy

```
Layer 1: Frontend timeout (8s AbortController)
    ↓ fails
Layer 2: Frontend demo fallback (prewritten replies/mirror)
    ↑ catches everything

Layer 1: Backend model cascade (5 models, 2 retries each)
    ↓ fails
Layer 2: Backend in-character fallback (simulate) or safe reflection (mirror)
    ↓ fails
Layer 3: Frontend demo fallback catches backend 500s too
```

### Specific Protections

| Failure Mode | Protection | User Experience |
|-------------|-----------|----------------|
| API takes > 8 seconds | `AbortController` timeout | Demo reply returns instantly |
| All 5 models rate limited | Model cascade exhaustion | Server returns fallback → or frontend demo data |
| Model returns empty content | Retry within cascade | Transparent to user |
| Model returns invalid JSON (mirror) | `try/catch` on `JSON.parse` | Safe fallback reflection (200 OK) |
| Model returns truncated JSON | Markdown fence stripping + parse guard | Safe fallback reflection |
| Network completely down | Frontend `fetch` throws | Demo data returned, no error shown |
| Server not running | Frontend `fetch` throws | Demo data returned, no error shown |
| User sends blank message | Input shake animation | No API call made |
| User clicks Send rapidly | `isLoading` guard | Second click ignored |
| User clicks Mirror too early | Minimum 2-exchange gate | Button disabled with low opacity |
| User exceeds conversation limit | 3-exchange maximum | Input replaced with Mirror prompt |
| Loading state transition | Button disabling | Mirror actions disabled until data loads |

### Demo Fallback Data

The frontend carries prewritten data that activates automatically on any failure:

**Simulate fallback** (3 rotating replies):
- "Yeah... I hear what you're saying. I just feel like there's been a lot going on that I haven't had a chance to explain."
- "I appreciate you bringing this up. I've been wanting to talk about it too, but I wasn't sure how to start."
- "Look, I know things haven't been perfect. I'm not making excuses, but there's more to the picture than it might seem."

**Mirror fallback:**
- Trigger: "There may have been a moment where the urgency in your words overshadowed the concern beneath them..."
- Empathy Gap: "From their side, this may have felt like being measured rather than understood..."
- Repair: "I've been thinking about how that conversation landed for you, and I realize I may have led with worry instead of curiosity..."

These are indistinguishable from live AI responses during a demo.

---

## Human-First Design Principles

Kintsugi is built around the LOVE x AI challenge principles. Here is how each is implemented:

### Embrace Discomfort

The roleplay engine is calibrated to create friction, not resolution. The simulated employee pushes back gently, deflects, and doesn't agree easily. The user has to sit with the discomfort of a conversation that isn't going smoothly — because real conversations don't go smoothly.

The system never rewards the user for "getting it right." There is no success state. There is only practice.

### Prioritize Relationships

The Relational Mirror never scores communication quality. It does not say "your empathy was 6/10." It reflects what happened between two people. The repair suggestion is always relational — it opens a door rather than delivering a technique.

The language "A Way to Begin" deliberately frames repair as a starting point, not a fix.

### Practice Empathetic Curiosity

The mirror's language models empathetic curiosity. It says "There may have been..." rather than "You did..." It asks the user to consider the other person's experience, not to judge their own performance.

The repair line is always written as a question or an invitation, never as a statement or instruction.

### Be Effective

The system constrains conversations to 3 exchanges maximum. This prevents users from spiraling into long debates with an AI. The constraint pushes users toward the Mirror — toward reflection — rather than letting them exhaust themselves in simulation.

Short, focused practice with structured reflection is more effective than unlimited roleplay.

### Why No Scoring

Quantifying empathy creates the wrong incentive. If users see a number, they will optimize for the number rather than the relationship. The moment you score communication, you turn a human practice into a performance metric. Kintsugi deliberately avoids this.

### Why Non-Clinical Language

Clinical language ("low emotional awareness," "defensive communication pattern") creates distance between the user and their experience. It makes the system feel like an evaluator rather than a mirror. Kintsugi uses everyday language — the kind of words a thoughtful friend would use — because that is the tone that invites genuine reflection.

---

## Data Flow

### Full Request Lifecycle: Simulate

```
1. User types message → handleSend()
2. Guard checks: isLoading? empty? limit reached?
3. User message added to local state immediately
4. Loading indicator ("thinking...") appears
5. fetchSimulateResponse(context, allMessages) called
   ├── fetch() with 8s AbortController
   ├── POST /api/simulate via Vite proxy
   │   ├── Zod validates request body
   │   ├── System prompt constructed (base + context)
   │   ├── Safety guardrail applied to last message
   │   ├── chatCompletion() → model cascade
   │   │   ├── Try google/gemma-3-12b-it:free (2 attempts)
   │   │   ├── Try google/gemma-3n-e4b-it:free (2 attempts)
   │   │   ├── ...
   │   │   └── All failed → throw
   │   ├── Success → res.json({ reply })
   │   └── Failure → res.json({ reply: fallbackReply })
   ├── Success → return reply string
   └── Any failure → return demo reply string
6. AI message added to local state
7. Loading indicator removed
8. Chat auto-scrolls to bottom
```

### Full Request Lifecycle: Mirror

```
1. User clicks "Pause and Look Beneath the Surface"
2. Screen transitions to Mirror
3. RelationalMirrorScreen mounts → useEffect fires
4. Loading skeleton appears with "reflection takes a moment" text
5. fetchMirrorAnalysis(context, allMessages) called
   ├── fetch() with 8s AbortController
   ├── POST /api/mirror via Vite proxy
   │   ├── Zod validates request body
   │   ├── Messages formatted as transcript
   │   ├── chatCompletion() → model cascade
   │   ├── Response: strip code fences → JSON.parse → Zod validate
   │   │   ├── Parse success → res.json({ trigger, empathyGap, repair })
   │   │   └── Parse failure → res.json(FALLBACK_REFLECTION)
   │   └── LLM failure → res.json(FALLBACK_REFLECTION)
   ├── Success → return MirrorData
   └── Any failure → return DEMO_MIRROR
6. Mirror cards animate in (staggered 0.25s delays)
7. Action buttons become enabled
```

---

## Development

### Running in development

```bash
# Terminal 1: Backend with hot reload
cd server && npm run dev

# Terminal 2: Frontend with HMR
cd frontend && npm run dev
```

The backend uses `tsx watch` for hot reload on file changes. The frontend uses Vite's HMR. The Vite dev server proxies `/api` requests to `localhost:3001`.

### Type checking

```bash
# Check both projects
cd server && npx tsc --noEmit
cd frontend && npx tsc --noEmit
```

### Production build

```bash
cd frontend && npx vite build
# Output: frontend/dist/
```

The backend can be compiled with `cd server && npm run build` (outputs to `server/dist/`), then run with `npm start`.
