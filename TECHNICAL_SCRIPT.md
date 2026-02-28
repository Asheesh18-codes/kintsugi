# Kintsugi AI — Technical Presentation Script

> **How to use:** Open `technical-diagrams.html` in your browser alongside this script. Each section below maps to a specific diagram. Scroll to the matching diagram as you speak.

---

## 📊 Diagram 01 — User Flow

> "Let me walk you through how a user experiences Kintsugi."

> "It starts at the **Entry Screen** — three simple inputs: what's the situation, who's the person, and how are you feeling. We give them **12 emotional states** to choose from — not just 'good' or 'bad,' but specific ones like Guilty, Overwhelmed, Scared, Hopeful."

> "When they click 'Begin,' they enter the **Conversation Screen**. This is the core — a live roleplay where the AI dynamically plays the other person. Users can type or **speak using the mic button** — STT via Web Speech API. The AI responds in text and **reads it aloud** via TTS."

> "Each message hits `POST /api/simulate` — context + full message history goes to our backend, the AI generates a response, and it comes back."

> "When they're ready, they click 'Pause and Look Beneath the Surface' — that transitions to the **Mirror Screen**. Three reflection cards appear analyzing their actual conversation."

> "From there, two choices: **Rehearse Again** — which resets the conversation with a fresh AI greeting but keeps the same context — or **Start New** — back to the entry screen for a completely different scenario."

> "The whole thing is a single-page React app. **Framer Motion** handles all screen transitions — no page reloads, no routing."

---

## 📊 Diagram 02 — System Architecture

> "Now let's look at how this is built."

> "**Frontend** is React 18, TypeScript, Vite. Three main components: EntryScreen, ConversationScreen, RelationalMirrorScreen. Everything flows through `api.ts` — our API client that handles timeouts, fallbacks, and a custom type called `ApiResult<T>` which wraps every response with an `isFallback` boolean."

> "**Backend** is Express with TypeScript. Two routes: `/api/simulate` for the roleplay and `/api/mirror` for the analysis. Every request goes through **Zod schema validation** — we validate the full shape of context objects, message arrays, and emotion values before anything touches the AI."

> "The key piece is the **Dynamic Prompt Builder** — `simulateSystem.ts`. It takes the user's context and constructs a system prompt at runtime. So the AI becomes whoever the user described — a client, a manager, a teammate — without any code changes."

> "At the bottom is **OpenRouter** — our AI gateway. We use a **5-model cascade**: Gemma 3, Gemma 3n, Arcee Trinity, Llama 4, DeepSeek V3. All free tier. Let me show you how that works..."

---

## 📊 Diagram 03 — Model Cascade

> "This is probably the most important engineering decision in the project."

> "We don't rely on a single AI model. Free-tier models have unpredictable rate limits — a model that worked 5 minutes ago might return a 429 right now."

> "So we built a **cascade**. When `chatCompletion()` is called, it tries Gemma 3 first. If that fails — 429, 5xx, timeout — it retries once with a **2-second backoff**. If the retry fails, it moves to Gemma 3n. Same pattern — try, retry, next."

> "Each model gets **2 attempts** with exponential backoff. That's 5 models × 2 attempts = **10 total chances** for a successful response."

> "If ALL 10 attempts fail — which is rare — the server returns an **in-character fallback**. Not an error message. Something like: 'I... sorry, I zoned out for a second. Can you say that again?' — it *sounds like the character*. The conversation isn't broken."

> "Worst-case latency is about 30 seconds if everything fails. In practice, one model responds within 2-5 seconds."

---

## 📊 Diagram 04 — 3-Tier Fallback System

> "Reliability was a first-class concern. We have three layers of protection."

> "**Tier 1 — Server fallback.** If all AI models fail, the backend returns an in-character response with `isFallback: true` in the JSON. The simulate route returns natural-sounding lines. The mirror route returns generic but meaningful reflections."

> "**Tier 2 — Client fallback.** If the server itself is unreachable — crashed, network failure, CORS issue — the frontend catches the error in `api.ts` and returns prewritten demo data, also with `isFallback: true`."

> "**Tier 3 — Visible indicator.** When `isFallback` is true, a gold banner appears: 'Practice mode — AI is currently unavailable, using guided responses.' The user knows, but the experience continues."

> "The key design decision: we use a **single boolean flag** — `isFallback` — that flows from server response through `api.ts` into the UI components. It's checked using a generic `ApiResult<T>` type, so every component knows at the type level whether the data is real."

> "The server also **starts without an API key** — it logs a warning and runs in full fallback mode. So you can demo the entire app with zero configuration."

---

## 📊 Diagram 05 — Dynamic Prompt Generation

> "Early in development, the AI always played the same character — an 'overwhelmed employee.' That broke when users described a client scenario or a manager scenario."

> "We solved this with `buildSimulateSystemPrompt()`. It takes three inputs from the user's context: situation, person, and emotion."

> "It generates four things in the system prompt:
> - **Identity** — 'You are {person}' — the AI becomes whoever the user named
> - **Situation** — described from the other person's point of view
> - **Emotional Tone** — calibrated to the user's stated emotion. If they said 'frustrated,' the AI becomes slightly defensive. If 'anxious,' it becomes cautious.
> - **Hard Rules** — stay in character, respond in 1-3 sentences, never give advice, never escalate to hostility, never break the fourth wall"

> "This means Kintsugi handles ANY relationship scenario — client anger, peer conflict, performance review, personal boundary — with the exact same code. No templates, no scenario configs. Just a prompt builder."

---

## 📊 Diagram 06 — Mirror Analysis Pipeline

> "After the conversation, the Relational Mirror analyzes the full transcript."

> "The pipeline starts by formatting all messages with **dynamic labels** — 'You' for the user and the actual person's name from context. Not hardcoded 'Manager/Employee.'"

> "That transcript, plus the original situation and emotion, gets sent to the AI with a specialized mirror system prompt."

> "The AI returns raw text. We first **strip markdown code fences** — models often wrap JSON in triple backticks. Then we **parse** the JSON and **validate** it against a Zod schema. The schema expects three fields: `moment_to_notice`, `the_other_side`, `a_way_to_begin`."

> "If parsing succeeds, we **map the keys** to frontend-friendly names: `trigger`, `empathyGap`, `repair` — and return with `isFallback: false`."

> "If parsing fails — malformed JSON, missing fields, extra text — we return a **fallback reflection** with `isFallback: true`. The user still sees meaningful content, never a crash."

> "The three cards are rendered with color-coded borders: red for trigger, yellow for empathy gap, gold for repair."

---

## Closing Summary

> "To summarize the tech: TypeScript end-to-end, 5-model AI cascade with 10 retry attempts, 3-tier fallback with transparent practice mode, dynamic prompt generation for unlimited scenarios, native browser voice I/O, and Zod validation at every boundary. Zero errors in TypeScript, zero crashes in production, zero configuration needed for demo."

---

## Quick Q&A Prep

**Q: Why OpenRouter instead of OpenAI?**
> "Single API, multiple model providers. Free tier gives us 5 models. If one is rate-limited, we cascade to the next. With OpenAI, one rate limit breaks everything."

**Q: Why not LangChain?**
> "Our AI layer is ~120 lines. Model cascade, retry, fetch. No framework overhead, no abstraction over simple HTTP calls. Easier to debug."

**Q: How is this different from ChatGPT?**
> "ChatGPT gives advice. Kintsugi gives practice. The AI stays in character, creates friction, and then the Mirror reflects your own patterns back — not answers."

**Q: What about prompt injection?**
> "System prompt has hard rules. Zod validates all input shapes. Safety guardrail handles edge-case short messages. No system prompt is exposed to the user."

**Q: What would you change for production?**
> "Paid-tier models for quality, Redis for rate limiting, SSO for enterprise, conversation persistence with opt-in encryption. Architecture already supports all of it."
