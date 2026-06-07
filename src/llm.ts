// On-device / edge LLM layer with a graceful cascade:
//
//   1. Gemini Nano   — Chrome Prompt API, on-device, zero download (auto)
//   2. Workers AI     — Cloudflare edge inference, instant, no download (auto)
//   3. Canned Q&A     — offline string matching, last resort (auto)
//   4. WebLLM         — fully-local in-browser model, ~0.9GB (opt-in only)
//
// detect() picks the best automatic backend. WebLLM is never automatic — it
// is enabled explicitly via enableWebLLM() so a visitor never waits on a
// multi-hundred-MB download they didn't ask for.

import { SYSTEM_PROMPT } from "./system-prompt.ts";
import { answerFromFaq } from "./faq.ts";

export type BackendKind = "gemini-nano" | "workers-ai" | "webllm" | "canned";

export interface BackendInfo {
  kind: BackendKind;
  label: string; // status line shown during boot / ask intro
  modelLabel: string; // shown by /model
  titleTag: string; // short tag for the title bar
}

const WEBLLM_MODEL = "Llama-3.2-1B-Instruct-q4f16_1-MLC"; // ~0.9GB
const WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";

export type ProgressCallback = (text: string) => void;

const BACKENDS: Record<BackendKind, BackendInfo> = {
  "gemini-nano": {
    kind: "gemini-nano",
    label: "ready. backend: Gemini Nano (Chrome Prompt API, on-device)",
    modelLabel: "Gemini Nano (Chrome Prompt API)",
    titleTag: "gemini nano",
  },
  "workers-ai": {
    kind: "workers-ai",
    label: "ready. backend: Cloudflare Workers AI (Llama 3.1, edge)",
    modelLabel: "Cloudflare Workers AI (Llama-3.1-8B-Instruct)",
    titleTag: "workers ai",
  },
  webllm: {
    kind: "webllm",
    label: "ready. backend: WebLLM (Llama-3.2-1B, on-device)",
    modelLabel: "WebLLM (Llama-3.2-1B-Instruct)",
    titleTag: "webllm · local",
  },
  canned: {
    kind: "canned",
    label: "offline Q&A mode (no model). try desktop Chrome for live AI.",
    modelLabel: "offline Q&A (no model)",
    titleTag: "offline",
  },
};

// Minimal structural typing for the experimental Chrome Prompt API.
interface PromptSession {
  promptStreaming(input: string): AsyncIterable<string> | ReadableStream<string>;
}
interface LanguageModelStatic {
  create(opts?: unknown): Promise<PromptSession>;
  availability?: () => Promise<string>;
}

function getLanguageModel(): LanguageModelStatic | undefined {
  return (window as unknown as { LanguageModel?: LanguageModelStatic }).LanguageModel;
}

export class LLM {
  private backend: BackendInfo = BACKENDS.canned;
  private geminiSession: PromptSession | null = null;
  private webllmEngine: any = null;
  private initialized = false;

  getBackend(): BackendInfo {
    return this.backend;
  }

  // True when an in-browser WebLLM download is even possible (WebGPU present)
  // and we aren't already using a live model — i.e. when offering /local makes
  // sense.
  canOfferWebLLM(): boolean {
    const hasGpu = "gpu" in navigator && !!(navigator as Navigator & { gpu?: unknown }).gpu;
    return hasGpu && this.backend.kind !== "webllm" && this.backend.kind !== "gemini-nano";
  }

  // Pick the best AUTOMATIC backend (never WebLLM).
  async detect(): Promise<BackendInfo> {
    // 1. Chrome Prompt API (Gemini Nano)
    const lm = getLanguageModel();
    if (lm) {
      try {
        const status = lm.availability ? await lm.availability() : "available";
        if (status !== "unavailable") {
          this.backend = BACKENDS["gemini-nano"];
          return this.backend;
        }
      } catch {
        /* fall through */
      }
    }

    // 2. Cloudflare Workers AI (only if our edge endpoint answers)
    if (await this.probeWorkersAI()) {
      this.backend = BACKENDS["workers-ai"];
      return this.backend;
    }

    // 3. Offline canned Q&A
    this.backend = BACKENDS.canned;
    return this.backend;
  }

  private async probeWorkersAI(): Promise<boolean> {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 2000);
      const res = await fetch("/api/health", { signal: ctrl.signal });
      clearTimeout(t);
      if (!res.ok) return false;
      const data = (await res.json()) as { ai?: boolean };
      return data.ai === true;
    } catch {
      return false;
    }
  }

  // Lazily prepare the active automatic backend. Only Gemini Nano needs setup;
  // Workers AI and canned are stateless.
  async init(): Promise<void> {
    if (this.initialized) return;
    if (this.backend.kind === "gemini-nano") {
      const lm = getLanguageModel();
      if (!lm) throw new Error("Prompt API unavailable");
      this.geminiSession = await lm.create({
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
      });
    }
    this.initialized = true;
  }

  // Opt-in: download + run a fully-local model in the browser. Hardened
  // against the common WebLLM Cache.add() failures (eviction / interrupted
  // shard) via persistent storage, a quota pre-check, and resume-on-retry.
  async enableWebLLM(onProgress?: ProgressCallback): Promise<void> {
    if (!("gpu" in navigator) || !(navigator as Navigator & { gpu?: unknown }).gpu) {
      throw new Error("WebGPU unavailable. local models need desktop Chrome/Edge.");
    }

    // Reduce mid-download eviction.
    try {
      await navigator.storage?.persist?.();
    } catch {
      /* best effort */
    }

    // Pre-flight storage so we fail early with a clear message.
    try {
      const est = await navigator.storage?.estimate?.();
      if (est && est.quota && est.usage != null) {
        const free = est.quota - est.usage;
        if (free < 1.2e9) {
          throw new Error(
            `need ~1GB free disk, only ${(free / 1e9).toFixed(1)}GB available. free up space and retry.`,
          );
        }
      }
    } catch (e) {
      if (e instanceof Error && e.message.includes("free disk")) throw e;
      /* estimate unsupported — proceed */
    }

    const webllm: any = await import(/* @vite-ignore */ WEBLLM_CDN);
    // IndexedDB cache sidesteps some Cache Storage quota/secure-context quirks.
    const appConfig = { ...webllm.prebuiltAppConfig, useIndexedDBCache: true };
    const initProgressCallback = (report: { progress: number; text: string }) => {
      if (onProgress) {
        const pct = Math.round((report.progress ?? 0) * 100);
        onProgress(`download progress: ${pct}%`);
      }
    };

    // Completed shards persist in cache, so each retry resumes forward.
    let lastErr: unknown;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        this.webllmEngine = await webllm.CreateMLCEngine(WEBLLM_MODEL, {
          appConfig,
          initProgressCallback,
        });
        this.backend = BACKENDS.webllm;
        this.initialized = true;
        return;
      } catch (e) {
        lastErr = e;
        if (attempt < 3) {
          if (onProgress) onProgress(`hiccup — retrying (${attempt}/3)...`);
          await sleep(1500 * attempt);
        }
      }
    }
    const msg = lastErr instanceof Error ? lastErr.message : String(lastErr);
    throw new Error(`local model download failed: ${msg}`);
  }

  // Stream a response, yielding incremental text deltas.
  async *stream(userText: string): AsyncGenerator<string> {
    switch (this.backend.kind) {
      case "gemini-nano":
        yield* this.streamGemini(userText);
        return;
      case "workers-ai":
        yield* this.streamWorkersAI(userText);
        return;
      case "webllm":
        yield* this.streamWebLLM(userText);
        return;
      case "canned":
        yield* streamString(answerFromFaq(userText));
        return;
    }
  }

  private async *streamGemini(userText: string): AsyncGenerator<string> {
    if (!this.geminiSession) throw new Error("session not initialized");
    const out = this.geminiSession.promptStreaming(userText);
    let prev = "";
    for await (const chunk of asyncIterable(out)) {
      // The Prompt API has shipped both cumulative and delta streams; normalize.
      if (prev.length > 0 && chunk.startsWith(prev)) {
        yield chunk.slice(prev.length);
        prev = chunk;
      } else {
        yield chunk;
        prev += chunk;
      }
    }
  }

  private async *streamWorkersAI(userText: string): AsyncGenerator<string> {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: userText }),
    });
    if (!res.ok || !res.body) {
      // Network/edge failure — fall back to canned so the user still gets an answer.
      yield* streamString(answerFromFaq(userText));
      return;
    }
    yield* parseSSE(res.body);
  }

  private async *streamWebLLM(userText: string): AsyncGenerator<string> {
    if (!this.webllmEngine) throw new Error("engine not initialized");
    const completion = await this.webllmEngine.chat.completions.create({
      stream: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userText },
      ],
    });
    for await (const chunk of completion) {
      const delta = chunk?.choices?.[0]?.delta?.content ?? "";
      if (delta) yield delta;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// Stream a fixed string out word-by-word so canned answers feel typed.
async function* streamString(text: string): AsyncGenerator<string> {
  const tokens = text.split(/(\s+)/);
  for (const tok of tokens) {
    yield tok;
    await sleep(12);
  }
}

// Parse a Workers AI text/event-stream body into text deltas.
async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const payload = trimmed.slice(5).trim();
      if (payload === "[DONE]") return;
      try {
        const json = JSON.parse(payload) as { response?: string };
        if (json.response) yield json.response;
      } catch {
        /* ignore keep-alive / partial frames */
      }
    }
  }
}

// Normalize ReadableStream<string> | AsyncIterable<string> into an async iterable.
function asyncIterable(
  src: AsyncIterable<string> | ReadableStream<string>,
): AsyncIterable<string> {
  if (Symbol.asyncIterator in (src as object)) {
    return src as AsyncIterable<string>;
  }
  const reader = (src as ReadableStream<string>).getReader();
  return {
    [Symbol.asyncIterator]() {
      return {
        async next(): Promise<IteratorResult<string>> {
          const { done, value } = await reader.read();
          return done
            ? { done: true, value: undefined }
            : { done: false, value: value as string };
        },
      };
    },
  };
}
