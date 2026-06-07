// On-device LLM: capability detection, Gemini Nano (Chrome Prompt API)
// integration, WebLLM (WebGPU) fallback, and token streaming.
//
// Detection priority:
//   1. Chrome Prompt API  -> window.LanguageModel
//   2. WebLLM (WebGPU)    -> navigator.gpu, lazy-loaded from CDN
//   3. Unsupported

export type BackendKind = "gemini-nano" | "webllm" | "none";

export interface BackendInfo {
  kind: BackendKind;
  // Short status label used during boot / ask intro.
  label: string;
  // Detailed label used by the /model command.
  modelLabel: string;
}

export const SYSTEM_PROMPT = `You are an AI assistant embedded in DV's portfolio terminal at sdv.dev.

Answer questions about DV (Sanjay Dari Veerabasappa) concisely in plain text only — no markdown, no bullet symbols, no headers.

Keep all responses under 120 words.

Terminal-friendly output only.

CONTACT:
sanjaydv@umd.edu
linkedin.com/in/sanjaydv
github.com/sdv1708

EXPERIENCE:

Connyct CampusAI, AI Engineer Intern (Sep-Dec 2025)
RAG pipeline (Elasticsearch, SentenceTransformers, Redis), multisignal ranking, ≤2s on AWS ECS.
LLM eval framework (DeepEval, Confident AI) in CI/CD.

UMD Community Preservation Trust, SDE (Feb-Dec 2025)
React/Flask/MySQL application replacing paper workflows for 15K+ users.

IQVIA, SDE AI & Backend (Jul 2022 - Jul 2024)
GPT-3.5 NLP platform (Azure Functions) 95% extraction accuracy.
Airflow invoice pipeline with 70% throughput improvement.
Microservices using Docker, Kubernetes, Azure Service Bus handling 3K+ msgs/sec.
FastAPI/PostgreSQL APIs supporting 1.2M+ annual transactions.

PROJECTS:

PostMortem AI
Python, TypeScript, PostgreSQL, Playwright.
Six-stage pipeline.
Immutable citation validation.
LLM-as-judge rubric scoring.
Experiment versioning.

Clinical Decision Support System
Google ADK, Gemini, MCP, RAG, Cloud Run.
3-agent coordinator.
MCP tool handlers.
RAI guardrails.
Eval-gated CI/CD.

Executive Intelligence Copilot
LangChain, FAISS, SQLite.
Multi-agent workflows.
Tool calling.
Function-level routing.

SKILLS:

Python
Java
SQL
PostgreSQL
MySQL
Redis
Elasticsearch
FastAPI
Flask
Kafka
Airflow
LLMs
RAG
LangChain
LangGraph
PyTorch
Scikit-learn
Hugging Face
DeepEval
AWS
Azure
Docker
Kubernetes
CI/CD
Claude Code
Cursor

EDUCATION:

MS Information Systems, UMD Robert H. Smith School of Business (Dec 2025)

BS Electronics Engineering, PES University (May 2022)`;

const WEBLLM_MODEL = "Phi-3.5-mini-instruct-q4f16_1-MLC";
const WEBLLM_CDN = "https://esm.run/@mlc-ai/web-llm";

export type ProgressCallback = (text: string) => void;

// Minimal structural typing for the experimental Chrome Prompt API so we
// don't depend on ambient lib types that may not exist.
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
  private backend: BackendInfo = {
    kind: "none",
    label: "on-device AI unavailable. try Chrome.",
    modelLabel: "none",
  };
  private geminiSession: PromptSession | null = null;
  private webllmEngine: any = null;
  private initialized = false;

  getBackend(): BackendInfo {
    return this.backend;
  }

  // Fast, non-destructive capability probe used during boot. Does not
  // download or instantiate any model.
  async detect(): Promise<BackendInfo> {
    const lm = getLanguageModel();
    if (lm) {
      try {
        // Newer Prompt API exposes availability(); treat presence as enough.
        const status = lm.availability ? await lm.availability() : "available";
        if (status !== "unavailable") {
          this.backend = {
            kind: "gemini-nano",
            label: "ready. backend: Gemini Nano (Chrome Prompt API, on-device)",
            modelLabel: "Gemini Nano (Chrome Prompt API)",
          };
          return this.backend;
        }
      } catch {
        // fall through to other backends
      }
    }

    if ("gpu" in navigator && (navigator as Navigator & { gpu?: unknown }).gpu) {
      this.backend = {
        kind: "webllm",
        label: "ready. backend: WebLLM (WebGPU)",
        modelLabel: "WebLLM (Phi-3.5-mini-instruct)",
      };
      return this.backend;
    }

    this.backend = {
      kind: "none",
      label: "on-device AI unavailable. try Chrome.",
      modelLabel: "none",
    };
    return this.backend;
  }

  // Lazily instantiate the active backend. `onProgress` reports model
  // download / warm-up status (mostly meaningful for WebLLM).
  async init(onProgress?: ProgressCallback): Promise<void> {
    if (this.initialized) return;

    if (this.backend.kind === "gemini-nano") {
      const lm = getLanguageModel();
      if (!lm) throw new Error("Prompt API unavailable");
      this.geminiSession = await lm.create({
        initialPrompts: [{ role: "system", content: SYSTEM_PROMPT }],
      });
      this.initialized = true;
      return;
    }

    if (this.backend.kind === "webllm") {
      const webllm: any = await import(/* @vite-ignore */ WEBLLM_CDN);
      this.webllmEngine = await webllm.CreateMLCEngine(WEBLLM_MODEL, {
        initProgressCallback: (report: { progress: number; text: string }) => {
          if (onProgress) {
            const pct = Math.round((report.progress ?? 0) * 100);
            onProgress(`download progress: ${pct}%`);
          }
        },
      });
      this.initialized = true;
      return;
    }

    throw new Error("on-device AI isn't supported in this browser. try desktop Chrome.");
  }

  // Stream a response to `userText`, yielding incremental text deltas.
  async *stream(userText: string): AsyncGenerator<string> {
    if (this.backend.kind === "gemini-nano") {
      if (!this.geminiSession) throw new Error("session not initialized");
      const out = this.geminiSession.promptStreaming(userText);
      let prev = "";
      for await (const chunk of asyncIterable(out)) {
        // The Prompt API has shipped both cumulative and delta streams across
        // versions; normalize to deltas.
        if (chunk.startsWith(prev) && prev.length > 0) {
          yield chunk.slice(prev.length);
          prev = chunk;
        } else if (chunk.length >= prev.length && prev.length > 0 && chunk.includes(prev)) {
          yield chunk.slice(prev.length);
          prev = chunk;
        } else {
          yield chunk;
          prev = prev + chunk;
        }
      }
      return;
    }

    if (this.backend.kind === "webllm") {
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
      return;
    }

    throw new Error("on-device AI isn't supported in this browser. try desktop Chrome.");
  }
}

// Normalize a ReadableStream<string> or AsyncIterable<string> into an async
// iterable we can `for await` over.
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
