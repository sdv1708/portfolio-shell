// Cloudflare Worker: serves the static portfolio AND a tiny edge AI endpoint.
//
// Everything except the API routes is handed to the static-assets binding, so
// the site stays "static" — the Worker only adds /api/chat (Workers AI, edge
// inference, no API key, no data stored) and /api/health (capability probe).
//
// Built and bundled by Wrangler (esbuild), separately from the Vite frontend.
// It is intentionally excluded from the frontend tsconfig.

import { SYSTEM_PROMPT } from "../src/system-prompt.ts";

// Small, fast instruct model on Workers AI. Cheap enough for a portfolio's
// free-tier Neuron allocation.
const MODEL = "@cf/meta/llama-3.1-8b-instruct";

interface Env {
  // Static Assets binding (configured in wrangler.jsonc).
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  // Workers AI binding.
  AI: {
    run: (model: string, input: unknown) => Promise<ReadableStream | { response?: string }>;
  };
}

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/health") {
      return Response.json({ ai: true, model: MODEL }, { headers: CORS });
    }

    if (url.pathname === "/api/chat") {
      if (request.method === "OPTIONS") {
        return new Response(null, { headers: CORS });
      }
      if (request.method !== "POST") {
        return new Response("method not allowed", { status: 405, headers: CORS });
      }
      return handleChat(request, env);
    }

    // Everything else: static assets.
    return env.ASSETS.fetch(request);
  },
};

async function handleChat(request: Request, env: Env): Promise<Response> {
  let message = "";
  try {
    const body = (await request.json()) as { message?: unknown };
    message = typeof body.message === "string" ? body.message.slice(0, 2000) : "";
  } catch {
    return new Response("bad request", { status: 400, headers: CORS });
  }
  if (!message.trim()) {
    return new Response("empty message", { status: 400, headers: CORS });
  }

  try {
    const stream = (await env.AI.run(MODEL, {
      stream: true,
      max_tokens: 320,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: message },
      ],
    })) as ReadableStream;

    // Workers AI already returns a text/event-stream of `data: {...}` chunks;
    // pass it straight through to the browser.
    return new Response(stream, {
      headers: {
        "content-type": "text/event-stream",
        "cache-control": "no-cache",
        ...CORS,
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "inference error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 502,
      headers: { "content-type": "application/json", ...CORS },
    });
  }
}
