// ─── Types ───────────────────────────────────────────────────────────────────
export interface Message {
  role: "user" | "ai";
  text: string;
}

export interface Context {
  situation: string;
  person: string;
  emotion: string;
}

export interface MirrorData {
  trigger: string;
  empathyGap: string;
  repair: string;
}

// ─── Timeout ─────────────────────────────────────────────────────────────────
const API_TIMEOUT_MS = 12_000;
const MIRROR_TIMEOUT_MS = 20_000;

// ─── Demo Fallback Data ──────────────────────────────────────────────────────
const DEMO_REPLIES = [
  "Yeah... I hear what you're saying. I just feel like there's been a lot going on that I haven't had a chance to explain.",
  "I appreciate you bringing this up. I've been wanting to talk about it too, but I wasn't sure how to start.",
  "Look, I know things haven't been perfect. I'm not making excuses, but there's more to the picture than it might seem.",
];

const DEMO_MIRROR: MirrorData = {
  trigger:
    "There may have been a moment where the urgency in your words overshadowed the concern beneath them — where accountability felt closer to pressure than care.",
  empathyGap:
    "From their side, this may have felt like being measured rather than understood — like the conversation was about performance, not about them.",
  repair:
    "I've been thinking about how that conversation landed for you, and I realize I may have led with worry instead of curiosity. I'd like to hear what's really going on.",
};

let demoReplyIndex = 0;

// ─── Fetch with timeout ──────────────────────────────────────────────────────
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = API_TIMEOUT_MS
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    return res;
  } finally {
    clearTimeout(timer);
  }
}

// ─── Simulate ────────────────────────────────────────────────────────────────
export async function fetchSimulateResponse(
  context: Context,
  messages: Message[]
): Promise<string> {
  try {
    const res = await fetchWithTimeout("/api/simulate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, messages }),
    });

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();
    if (!data.reply) throw new Error("Empty reply");
    return data.reply;
  } catch (err) {
    console.error("Simulate API failed:", err);
    throw err;
  }
}

// ─── Mirror ──────────────────────────────────────────────────────────────────
export async function fetchMirrorAnalysis(
  context: Context,
  messages: Message[]
): Promise<MirrorData> {
  try {
    const res = await fetchWithTimeout("/api/mirror", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ context, messages }),
    }, MIRROR_TIMEOUT_MS);

    if (!res.ok) {
      throw new Error(`Server error: ${res.status}`);
    }

    const data = await res.json();

    // Safe parse: validate shape
    if (!data.trigger || !data.empathyGap || !data.repair) {
      throw new Error("Incomplete mirror data");
    }

    return data as MirrorData;
  } catch (err) {
    console.error("Mirror API failed:", err);
    throw err;
  }
}
