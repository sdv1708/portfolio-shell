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
const PROBE_TIMEOUT_MS = 2000;
const RESPONSE_TIMEOUT_MS = 25000;

export type ProgressCallback = (text: string) => void;

export class WorkersAIRequestError extends Error {
  readonly status: number;

  constructor(
    status: number,
    detail?: string,
  ) {
    super(
      `Workers AI request failed (${status})${detail ? `: ${detail}` : ""}`,
    );
    this.name = "WorkersAIRequestError";
    this.status = status;
  }
}

const BACKENDS: Record<BackendKind, BackendInfo> = {
  "gemini-nano": {
    kind: "gemini-nano",
    label: "ready. backend: Gemini Nano (Chrome Prompt API, on-device)",
    modelLabel: "Gemini Nano (Chrome Prompt API)",
    titleTag: "gemini nano",
  },
  "workers-ai": {
    kind: "workers-ai",
    label: "ready. backend: Cloudflare Workers AI (Llama 3.2, edge)",
    modelLabel: "Cloudflare Workers AI (Llama-3.2-3B-Instruct)",
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
    label: "Offline profile Q&A. The portfolio commands are still available.",
    modelLabel: "offline Q&A (no model)",
    titleTag: "offline",
  },
};

// Minimal structural typing for the experimental Chrome Prompt API.
interface PromptSession {
  promptStreaming(
    input: string,
    options?: { signal: AbortSignal },
  ): AsyncIterable<string> | ReadableStream<string>;
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
  private detection?: Promise<BackendInfo>;

  getBackend(): BackendInfo {
    return this.backend;
  }

  useCannedFallback(): BackendInfo {
    this.backend = BACKENDS.canned;
    this.initialized = false;
    this.detection = undefined;
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
  detect(): Promise<BackendInfo> {
    return this.detection ??= this.detectAutomaticBackend();
  }

  private async detectAutomaticBackend(): Promise<BackendInfo> {
    // 1. Chrome Prompt API (Gemini Nano)
    const lm = getLanguageModel();
    if (lm) {
      try {
        const status = lm.availability
          ? await withDeadline(lm.availability(), PROBE_TIMEOUT_MS)
          : "unavailable";
        if (status === "available") {
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
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), PROBE_TIMEOUT_MS);
    try {
      const res = await fetch("/api/health", { signal: ctrl.signal });
      if (!res.ok) return false;
      const data = (await res.json()) as { ai?: boolean };
      return data.ai === true;
    } catch {
      return false;
    } finally {
      clearTimeout(t);
    }
  }

  // Lazily prepare the active automatic backend. Only Gemini Nano needs setup;
  // Workers AI and canned are stateless.
  async init(): Promise<void> {
    await this.detect();
    if (this.initialized) return;
    if (this.backend.kind === "gemini-nano") {
      const controller = new AbortController();
      try {
        const lm = getLanguageModel();
        if (!lm) throw new Error("Prompt API unavailable");
        this.geminiSession = await withDeadline(lm.create({
          initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
          signal: controller.signal,
        }), 5000, () => controller.abort());
      } catch {
        this.backend = await this.probeWorkersAI() ? BACKENDS["workers-ai"] : BACKENDS.canned;
      }
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
  async *stream(userText: string, signal?: AbortSignal): AsyncGenerator<string> {
    signal?.throwIfAborted();
    if (this.backend.kind === "canned") {
      yield answerFromFaq(userText);
      return;
    }

    const controller = new AbortController();
    const cancel = () => controller.abort(signal?.reason);
    const timer = setTimeout(() => {
      controller.abort(new Error("The live response timed out."));
    }, RESPONSE_TIMEOUT_MS);
    signal?.addEventListener("abort", cancel, { once: true });

    const source = this.liveStream(userText, controller.signal);
    try {
      let answered = false;
      for await (const chunk of interruptible(source, controller.signal)) {
        if (chunk.trim()) answered = true;
        yield chunk;
      }
      if (!answered) throw new Error("The live model returned an empty answer.");
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener("abort", cancel);
    }
  }

  private liveStream(userText: string, signal: AbortSignal): AsyncGenerator<string> {
    switch (this.backend.kind) {
      case "gemini-nano":
        return this.streamGemini(userText, signal);
      case "workers-ai":
        return this.streamWorkersAI(userText, signal);
      case "webllm":
        return this.streamWebLLM(userText, signal);
      case "canned":
        throw new Error("No live AI is active.");
    }
  }

  private async *streamGemini(userText: string, signal: AbortSignal): AsyncGenerator<string> {
    if (!this.geminiSession) throw new Error("session not initialized");
    const out = this.geminiSession.promptStreaming(userText, { signal });
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

  private async *streamWorkersAI(userText: string, signal: AbortSignal): AsyncGenerator<string> {
    let status = 0;
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: userText }),
        signal,
      });
      status = res.status;
      if (!res.ok) {
        throw new WorkersAIRequestError(status, await readWorkerError(res));
      }
      if (!res.body || !res.headers.get("content-type")?.includes("text/event-stream")) {
        throw new WorkersAIRequestError(status, "expected a response stream");
      }
      yield* parseSSE(res.body);
    } catch (error) {
      if (error instanceof WorkersAIRequestError || signal.aborted) throw error;
      throw new WorkersAIRequestError(status, "connection interrupted");
    }
  }

  private async *streamWebLLM(userText: string, signal: AbortSignal): AsyncGenerator<string> {
    if (!this.webllmEngine) throw new Error("engine not initialized");
    const stop = () => this.webllmEngine.interruptGenerate?.();
    signal.addEventListener("abort", stop, { once: true });
    try {
      const completion = await this.webllmEngine.chat.completions.create({
        stream: true,
        max_tokens: 320,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userText },
        ],
      });
      for await (const chunk of completion) {
        signal.throwIfAborted();
        const delta = chunk?.choices?.[0]?.delta?.content ?? "";
        if (delta) yield delta;
      }
    } finally {
      signal.removeEventListener("abort", stop);
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function withDeadline<T>(pending: Promise<T>, ms: number, stop?: () => void): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(() => {
      stop?.();
      reject(new Error("AI setup timed out."));
    }, ms);
  });
  try {
    return await Promise.race([pending, deadline]);
  } finally {
    clearTimeout(timer);
  }
}

async function* interruptible(
  source: AsyncGenerator<string>,
  signal: AbortSignal,
): AsyncGenerator<string> {
  let abort!: () => void;
  const stopped = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason);
    signal.addEventListener("abort", abort, { once: true });
  });
  try {
    while (true) {
      signal.throwIfAborted();
      const next = await Promise.race([source.next(), stopped]);
      if (next.done) return;
      yield next.value;
    }
  } finally {
    signal.removeEventListener("abort", abort);
    // Providers may finish winding down after the UI has already recovered.
    void source.return(undefined).catch(() => {});
  }
}

async function readWorkerError(response: Response): Promise<string | undefined> {
  try {
    const payload = (await response.json()) as { error?: unknown };
    return typeof payload.error === "string"
      ? payload.error.slice(0, 180)
      : undefined;
  } catch {
    return undefined;
  }
}

// Parse a Workers AI text/event-stream body into text deltas.
async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<string> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += done ? decoder.decode() : decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = done ? "" : lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data:")) continue;
        const payload = trimmed.slice(5).trim();
        if (payload === "[DONE]") return;
        try {
          const json = JSON.parse(payload) as { response?: unknown };
          if (typeof json.response === "string") yield json.response;
        } catch {
          /* Ignore malformed events. A wholly empty stream triggers fallback. */
        }
      }
      if (done) return;
    }
  } finally {
    void reader.cancel().catch(() => {});
    reader.releaseLock();
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
