import assert from "node:assert/strict";
import test from "node:test";

import { answerFromFaq } from "../src/faq.ts";
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

test("the alternate email reaches the canonical profile and LLM prompt", () => {
  const alternateEmail = "reach.sdv1708@gmail.com";

  assert.ok(PROFILE.contacts.some((contact) => contact.value === alternateEmail));
  assert.match(SYSTEM_PROMPT, new RegExp(alternateEmail.replace(".", "\\.")));
});
