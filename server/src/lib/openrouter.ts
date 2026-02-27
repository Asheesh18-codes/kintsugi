import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../../../.env") });

if (!process.env.OPENROUTER_API_KEY) {
  console.error("OPENROUTER_API_KEY is not set. Create a .env file in the project root.");
  process.exit(1);
}

const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Model cascade: try each in order until one responds
// Ordered by current availability + quality balance
const FREE_MODELS = [
  "google/gemma-3-12b-it:free",
  "google/gemma-3n-e4b-it:free",
  "arcee-ai/trinity-large-preview:free",
  "meta-llama/llama-3.3-70b-instruct:free",
  "mistralai/mistral-small-3.1-24b-instruct:free",
];

const RETRIES_PER_MODEL = 2;
const BASE_DELAY_MS = 2000;

interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface ChatOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: "json_object" };
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function tryModel(
  model: string,
  options: ChatOptions
): Promise<string | null> {
  for (let attempt = 0; attempt < RETRIES_PER_MODEL; attempt++) {
    if (attempt > 0) {
      const delay = BASE_DELAY_MS * Math.pow(2, attempt - 1);
      console.warn(`  Retry ${attempt + 1}/${RETRIES_PER_MODEL} for ${model} after ${delay}ms...`);
      await sleep(delay);
    }

    try {
      const res = await fetch(OPENROUTER_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "X-Title": "Kintsugi",
        },
        body: JSON.stringify({
          model,
          messages: options.messages,
          temperature: options.temperature ?? 0.8,
          max_tokens: options.max_tokens ?? 300,
          ...(options.response_format && { response_format: options.response_format }),
        }),
      });

      // Retry on rate limits and server errors
      if (res.status === 429 || res.status >= 500) {
        const body = await res.text();
        console.warn(`  ${model} returned ${res.status}: ${body.slice(0, 120)}`);
        continue;
      }

      if (!res.ok) {
        const body = await res.text();
        console.warn(`  ${model} error ${res.status}: ${body.slice(0, 120)}`);
        return null; // Non-retryable error — move to next model
      }

      const data = await res.json();
      const content = data.choices?.[0]?.message?.content?.trim();

      if (!content) {
        console.warn(`  ${model} returned empty response`);
        continue;
      }

      return content;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`  ${model} threw: ${msg}`);
      continue;
    }
  }

  return null; // All retries exhausted for this model
}

export async function chatCompletion(options: ChatOptions): Promise<string> {
  for (const model of FREE_MODELS) {
    console.log(`Trying model: ${model}`);
    const result = await tryModel(model, options);
    if (result) {
      console.log(`Success with ${model}`);
      return result;
    }
    console.warn(`${model} failed, trying next...`);
  }

  throw new Error(
    `All models exhausted (${FREE_MODELS.length} models x ${RETRIES_PER_MODEL} retries each). ` +
    `Free tier may be under heavy load.`
  );
}
