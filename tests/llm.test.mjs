import assert from "node:assert/strict";
import test from "node:test";

import { answerFromFaq, isWorkHistoryQuestion } from "../src/faq.ts";
import { LLM } from "../src/llm.ts";
import { PROFILE } from "../src/profile.ts";
import { SYSTEM_PROMPT } from "../src/system-prompt.ts";

test("Workers AI HTTP errors are not disguised as generated answers", async () => {
  const originalFetch = globalThis.fetch;
  const originalWindow = globalThis.window;

  globalThis.window = {};
  globalThis.fetch = async (input) => {
    const url = String(input);
    if (url.endsWith("/api/health")) {
      return Response.json({ ai: true });
    }
    if (url.endsWith("/api/chat")) {
      return Response.json(
        { error: "model is no longer available" },
        { status: 502 },
      );
    }
    throw new Error(`unexpected request: ${url}`);
  };

  try {
    const llm = new LLM();
    assert.equal((await llm.detect()).kind, "workers-ai");

    await assert.rejects(
      async () => {
        for await (const _chunk of llm.stream("what are some projects?")) {
          // Consume the entire stream so generator failures are observed.
        }
      },
      /Workers AI request failed \(502\)/,
    );
  } finally {
    globalThis.fetch = originalFetch;
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  }
});

test("detection does not select an on-device model that requires a download", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  globalThis.window = {
    LanguageModel: { availability: async () => "downloadable" },
  };
  globalThis.fetch = async () => Response.json({ ai: true });
  try {
    assert.equal((await new LLM().detect()).kind, "workers-ai");
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("Workers AI distinguishes an interrupted connection from a valid answer", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  globalThis.window = {};
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/api/health")) return Response.json({ ai: true });
    throw new TypeError("Failed to fetch");
  };
  try {
    const llm = new LLM();
    await llm.detect();
    await assert.rejects(async () => {
      for await (const _chunk of llm.stream("what are some projects?")) {
        // Drain the stream so an asynchronous connection failure is observed.
      }
    }, { name: "WorkersAIRequestError" });
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("a local model that cannot open hands chat over to the edge", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  globalThis.window = {
    LanguageModel: {
      availability: async () => "available",
      create: async () => { throw new Error("Session unavailable"); },
    },
  };
  globalThis.fetch = async () => Response.json({ ai: true });
  try {
    const llm = new LLM();
    assert.equal((await llm.detect()).kind, "gemini-nano");
    await llm.init();
    assert.equal(llm.getBackend().kind, "workers-ai");
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("an empty or interrupted reply does not leave chat waiting", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  globalThis.window = {};
  try {
    const llm = new LLM();
    globalThis.fetch = async (input) => String(input).endsWith("/api/health")
      ? Response.json({ ai: true })
      : new Response("data: [DONE]\n\n", { headers: { "content-type": "text/event-stream" } });
    await llm.detect();
    await assert.rejects(llm.stream("what did he build?").next(), /empty answer/);

    globalThis.fetch = async () => new Promise(() => {});
    const controller = new AbortController();
    const pending = llm.stream("what did he build?", controller.signal).next();
    controller.abort();
    await assert.rejects(pending, { name: "AbortError" });
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("Workers AI preserves a response frame split across network chunks", async () => {
  const originalWindow = globalThis.window;
  const originalFetch = globalThis.fetch;
  globalThis.window = {};
  globalThis.fetch = async (input) => {
    if (String(input).endsWith("/api/health")) return Response.json({ ai: true });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode('data: {"resp'));
        controller.enqueue(encoder.encode('onse":"Hi"}'));
        controller.close();
      },
    });
    return new Response(stream, { headers: { "content-type": "text/event-stream" } });
  };
  try {
    const llm = new LLM();
    await llm.detect();
    let answer = "";
    for await (const chunk of llm.stream("say hi")) answer += chunk;
    assert.equal(answer, "Hi");
  } finally {
    globalThis.window = originalWindow;
    globalThis.fetch = originalFetch;
  }
});

test("offline project answers use the terminal list format", () => {
  const answer = answerFromFaq("what are some of his projects?");

  assert.match(answer, /^A few featured projects:\n\n- /);
  assert.match(answer, /\n- .+\[featured\]:/);
  assert.doesNotMatch(answer, /\[in-progress\]/);
});

test("offline project answers recognize audited projects and show current claims", () => {
  const cases = [
    ["tell me about the benchmarking project", /28 public LiveCodeBench models/],
    ["how does the post-mortem work?", /immutable, line-addressable evidence/],
    ["tell me about the executive copilot", /LangGraph searches in parallel/],
    ["what model evaluation work did he do for Ragas?", /Merged Ragas PR #77/],
    ["how does the reservation API handle concurrent bookings?", /locks every occupied night/],
    ["tell me about the KV store", /working durable single-node key-value engine/],
    ["summarize the NeetCode submissions", /349 Python submissions across 145/],
  ];

  for (const [question, expected] of cases) {
    assert.match(answerFromFaq(question), expected, question);
  }
});

test("general work history questions use the structured view", () => {
  for (const question of [
    "experience",
    "Tell me about your work experience.",
    "What are his work experiences and achievements?",
    "Can you summarize Sanjay’s professional background?",
    "What work experience does Sanjay have?",
  ]) {
    assert.equal(isWorkHistoryQuestion(question), true, question);
  }

  for (const question of [
    "What is his experience with PostgreSQL?",
    "Tell me about his work experience at IQVIA.",
    "Tell me about the Copilot architecture.",
  ]) {
    assert.equal(isWorkHistoryQuestion(question), false, question);
  }
});

test("work facts distinguish IQVIA platform reach from extraction accuracy", () => {
  const virtualGold = PROFILE.experience.find((role) => role.company === "Virtual Gold");
  assert.equal(virtualGold?.dates, "Aug 2026 - Present");
  assert.match(answerFromFaq("current role"), /Aug 2026 - Present/);
  assert.match(SYSTEM_PROMPT, /Aug 2026 - Present/);

  const iqvia = PROFILE.experience.find((role) => role.company.startsWith("IQVIA"));
  assert.match(iqvia?.context ?? "", /350K\+ regulatory documents across 110\+/);
  assert.match(iqvia?.achievements[0] ?? "", /55% to 95%/);
  assert.doesNotMatch(iqvia?.achievements[0] ?? "", /350K|110\+/);
  assert.match(answerFromFaq("work experience at IQVIA"), /350K\+.*110\+.*55% to 95%/);
});

test("the alternate email reaches the canonical profile and LLM prompt", () => {
  const alternateEmail = "reach.sdv1708@gmail.com";

  assert.ok(PROFILE.contacts.some((contact) => contact.value === alternateEmail));
  assert.match(SYSTEM_PROMPT, new RegExp(alternateEmail.replace(".", "\\.")));
});
