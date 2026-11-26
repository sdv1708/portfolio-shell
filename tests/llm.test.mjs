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
