# Kintsugi AI — Technical Presentation Script

> **Purpose:** Use this script when explaining the technical architecture, design decisions, and engineering behind Kintsugi. This is NOT a demo script — it's for answering "How did you build this?" and "Why these choices?"

---

## 1. Opening — The Engineering Challenge (30 seconds)

> "The core technical challenge was: how do you make an AI that creates *realistic emotional friction* — not a chatbot that agrees with you, not a hostile adversary, but something that feels like talking to *a real person having a bad day*. And how do you make it reliable enough to work live — even when AI APIs fail."

---

## 2. Architecture Overview (2 minutes)

> "Let me walk you through the architecture."

### Frontend
> "The frontend is **React 18 with TypeScript**, built on **Vite** for fast HMR during development. We use **Framer Motion** for screen transitions — the entry screen fades into the conversation screen, which slides into the mirror. It's not just cosmetic — the transitions give users a moment to shift their mental state between phases."

> "For styling, it's **Tailwind CSS** with **shadcn/ui** components. The design is intentionally dark and quiet — this is a reflective space, not a productivity dashboard."

### Backend
> "The backend is **Express with TypeScript**. Every request goes through **Zod schema validation** — we validate the full shape of context objects, message arrays, and emotion enums before anything hits the AI. If the body is malformed, we return a 400 with specific error details."

### AI Layer
> "We use **OpenRouter** as our AI gateway. The key engineering decision here is the **5-model cascade with retry logic**."

---

## 3. The Model Cascade — Deep Dive (2 minutes)

> "This is probably the most important engineering decision in the project."

> "We don't rely on a single AI model. We have a **cascade of 5 models**, all on free tier:
> 1. Google Gemma 3 12B
> 2. Google Gemma 3n E4B  
> 3. Arcee Trinity Large
> 4. Meta Llama 4 Scout
> 5. DeepSeek V3 Free
>
> Each model gets **2 retry attempts** with exponential backoff (2 seconds, then 4 seconds). If a model returns a 429 (rate limit) or 5xx (server error), we log it and move to the next model. If ALL models and ALL retries fail, the server returns an **in-character fallback response** — not an error."

> "Why in-character? Because if the AI says 'I... sorry, I zoned out for a second. Can you say that again?' — that *sounds like the character*. The user's immersion isn't broken. They can continue the conversation naturally."

> "The total worst-case latency is about 30 seconds if every model fails before hitting fallback. In practice, at least one model responds within 2-5 seconds."

---

## 4. The Dynamic Prompt System (2 minutes)

> "Early in development, the roleplay prompt was hardcoded — the AI always played an 'overwhelmed employee.' That's a problem because users can describe *any* scenario — a client, a spouse, a manager, a teammate."

> "We solved this with a **dynamic prompt builder**. The function `buildSimulateSystemPrompt(context)` takes the user's situation, person, and emotion, and constructs a complete system prompt on the fly."

> "Here's what the prompt does:
> - Sets the AI's **identity** to the person the user named
> - Describes the **situation** from that person's perspective  
> - Calibrates **emotional tone** based on the user's stated emotion — if the user says 'frustrated,' the AI becomes slightly defensive; if 'anxious,' the AI becomes cautious
> - Enforces **hard rules**: stay in character, never break the fourth wall, never give advice, never agree too easily, never escalate to hostility
> - Limits response length to **1-3 sentences** — real people don't monologue"

> "This means Kintsugi works for ANY relationship scenario without any code changes — you just type a different context."

---

## 5. The Relational Mirror Engine (2 minutes)

> "After the conversation, the Mirror analyzes the full transcript."

> "We send the entire message history — with **dynamic labels** based on context (not hardcoded 'Manager/Employee') — plus the original situation and emotion context to the AI."

> "The system prompt asks for a JSON response with three fields:
> - `moment_to_notice` — the exact phrase from the transcript that carried tension
> - `the_other_side` — how that phrase was likely experienced by the other person
> - `a_way_to_begin` — a vulnerability-based repair statement"

> "On the backend, we do **safe JSON parsing** — we strip markdown code fences if the AI wraps the JSON in backticks (which happens often), then parse and validate against a **Zod schema**. If parsing fails, we return a meaningful fallback reflection instead of crashing."

> "The mirror output is mapped to frontend-friendly keys: `trigger`, `empathyGap`, `repair`. The frontend renders these as three distinct cards with color-coded left borders — red for trigger, yellow for empathy, gold for repair."

---

## 6. The 3-Tier Fallback System (1.5 minutes)

> "Reliability was a first-class concern. We built a **3-tier fallback system**:"

> "**Tier 1 — Server-side fallback.** If the AI API fails, the backend routes return hardcoded but in-character responses with `isFallback: true` in the JSON. The simulate route returns natural-sounding lines like 'I hear you, I just need a moment.' The mirror route returns generic but meaningful reflections."

> "**Tier 2 — Client-side fallback.** If the server itself is unreachable — network failure, CORS issue, server crash — the frontend `api.ts` catches the error and returns prewritten demo responses, also with `isFallback: true`."

> "**Tier 3 — Visible indicator.** The frontend checks the `isFallback` flag using a custom `ApiResult<T>` type. When `isFallback` is true, a gold banner appears: 'Practice mode — AI is currently unavailable, using guided responses.' This is transparency, not failure."

> "The server also **starts without an API key** — it logs a warning and every AI call immediately throws, which triggers the Tier 1 fallback. So you can demo the entire app without any configuration."

---

## 7. Voice I/O — STT & TTS (1 minute)

> "We integrated **Speech-to-Text** and **Text-to-Speech** using the browser's **native Web Speech API** — no external services, no API costs, no latency."

> "**STT** uses `SpeechRecognition` (Chromium only). Click the mic icon, speak, and your words appear in the input field. You still press Send manually — this is intentional. Practicing saying difficult words out loud is part of the therapeutic value."

> "**TTS** uses `SpeechSynthesisUtterance`. AI responses are read aloud automatically — you can toggle it with the speaker icon. Speech is cancelled when you navigate to the Mirror, so the reflection moment stays quiet."

> "Both features gracefully hide on unsupported browsers — no errors, no broken UI."

---

## 8. Type Safety & Validation (1 minute)

> "The entire stack is **TypeScript end-to-end**. On the backend, every route uses **Zod schemas** — not just for validation, but for type inference. The `SimulateBodySchema` validates context shape, message roles, and text fields. The `MirrorResponseSchema` validates the AI's JSON output."

> "On the frontend, we introduced a custom generic type called `ApiResult<T>` — it wraps every API response with a `data: T` and `isFallback: boolean`. This means every component that calls the API knows *at the type level* whether the response is real or fallback."

> "TypeScript compiles with **zero errors** on both server and frontend — verified with `tsc --noEmit`."

---

## 9. Safety Guardrails (30 seconds)

> "We have a **safety guardrail** in `safety.ts`. If a user sends a very short message — like 'ok' or 'hi' — the guardrail wraps it with context so the AI still gives a meaningful response instead of a confused one-liner."

> "The AI prompt also has **hard constraints**: never break character, never give therapy advice, never diagnose, never use clinical language. The system says 'There may have been a moment where...' — never 'You were wrong.'"

---

## 10. Design Decisions Summary (1 minute)

| Decision | Why |
|----------|-----|
| **5-model cascade** | Free tier rate limits are unpredictable — cascading ensures at least one model responds |
| **`isFallback` flag** | Transparency over silent failure — users know when they're seeing demo data |
| **Dynamic prompts** | One codebase supports unlimited scenarios without code changes |
| **In-character fallbacks** | Immersion isn't broken even when AI fails |
| **No conversation storage** | Privacy-first — nothing is logged, stored, or transmitted |
| **Native Web Speech API** | Zero-cost voice I/O with no external dependencies |
| **Zod + TypeScript** | End-to-end type safety eliminates runtime shape mismatches |
| **Server starts without key** | Demo-ready out of the box — zero configuration needed |

---

## 11. Closing Line

> "Kintsugi isn't a chatbot. It's a **relational rehearsal engine** — and the engineering is designed around one idea: the technology should be invisible. The user should feel like they're talking to a real person, not using a product. Everything we built — the cascade, the dynamic prompts, the voice, the fallbacks — serves that single goal."

---

## Quick Q&A Prep

**Q: Why OpenRouter instead of OpenAI directly?**
> "OpenRouter gives us access to multiple model providers through a single API. The free tier lets us use 5 different models. If we were locked to OpenAI, a single rate limit would break everything."

**Q: How do you handle prompt injection?**
> "The system prompt has hard rules — 'never break character, never reveal you are AI.' Zod validates all user input before it reaches the prompt. The safety guardrail processes short inputs. We don't expose any system prompt to the user."

**Q: What happens at scale?**
> "For production, we'd move to paid tier models (better quality, higher limits), add Redis for rate limiting, and implement SSO for enterprise. The architecture already supports it — just swap the model list and add a database."

**Q: Why not use LangChain or a framework?**
> "We intentionally kept the stack minimal. Our AI layer is ~120 lines of TypeScript — model cascade, retry, fetch. No framework overhead, no abstraction layers over simple HTTP calls. Easier to debug, easier to maintain."

**Q: How is this different from just talking to ChatGPT?**
> "ChatGPT gives you advice. Kintsugi gives you *practice*. The AI stays in character, creates realistic friction, and then the Mirror shows you your own patterns — not answers. No AI tool does this today."
