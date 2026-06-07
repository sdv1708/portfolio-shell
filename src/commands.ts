// Command handlers and static portfolio content for both the normal shell
// and the LLM chat mode.

import { Terminal } from "./terminal.ts";
import { LLM } from "./llm.ts";
import { themeNames } from "./themes.ts";

export interface Ctx {
  term: Terminal;
  llm: LLM;
  // Applies a theme and updates the title bar; returns false if unknown.
  applyThemeAndTitle: (name: string) => boolean;
  // Updates the active-backend tag shown in the title bar.
  updateBackendTag: (tag: string) => void;
}

export const SHELL_COMMANDS = [
  "ask",
  "whoami",
  "about",
  "skills",
  "projects",
  "experience",
  "contact",
  "theme",
  "history",
  "clear",
  "exit",
  "help",
];

export const CHAT_COMMANDS = ["/exit", "/clear", "/model", "/help", "/local"];

// ---- small rendering helpers --------------------------------------------

function span(cls: string, text: string): HTMLSpanElement {
  const s = document.createElement("span");
  if (cls) s.className = cls;
  s.textContent = text;
  return s;
}

// Wrap `·` bullets and `→` arrows in accent-colored spans within `text`.
function accentize(text: string): DocumentFragment {
  const frag = document.createDocumentFragment();
  const parts = text.split(/([·→])/);
  for (const part of parts) {
    if (part === "·" || part === "→") {
      frag.append(span("accent", part));
    } else if (part) {
      frag.append(document.createTextNode(part));
    }
  }
  return frag;
}

function printArrow(term: Terminal, text: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "line";
  line.append(span("accent", "→ "), document.createTextNode(text));
  term.printNode(line);
  return line;
}

function printBullet(term: Terminal, text: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "line";
  line.append(span("accent", "· "), document.createTextNode(text));
  term.printNode(line);
  return line;
}

// A two-column row: left padded to `pad`, colored with `leftCls`; right is
// accent-aware body text.
function row(leftCls: string, left: string, pad: number, right: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "block";
  line.append(span(leftCls, left.padEnd(pad)));
  line.append(accentize(right));
  return line;
}

// ---- shell commands ------------------------------------------------------

function cmdHelp(term: Terminal): void {
  const rows: [string, string][] = [
    ["ask", "chat with on-device LLM"],
    ["whoami", "one-line bio"],
    ["about", "longer intro"],
    ["skills", "stack"],
    ["projects", "selected work"],
    ["experience", "selected roles"],
    ["contact", "contact info"],
    ["theme", "switch theme"],
    ["history", "show history"],
    ["clear", "clear screen"],
    ["exit", "leave"],
  ];
  const frag = document.createDocumentFragment();
  for (const [name, desc] of rows) {
    const line = document.createElement("div");
    line.className = "block";
    line.append(span("command", name.padEnd(12)), span("text", desc));
    frag.append(line);
  }
  term.printNode(frag);
}

function cmdWhoami(term: Terminal): void {
  term.println("sanjay dari veerabasappa. backend + AI engineer. chicago, il.");
}

function cmdAbout(term: Terminal): void {
  term.printBlock(
    "MS Information Systems, UMD Robert H. Smith (Dec 2025). 2+ years production " +
      "SWE at IQVIA, Bengaluru. Currently building AI systems — RAG pipelines, " +
      "multi-agent orchestration, LLM evaluation. On OPT. Looking for backend / " +
      "AI engineering roles.",
  );
}

function cmdSkills(term: Terminal): void {
  const pad = 24;
  const frag = document.createDocumentFragment();
  const items: [string, string][] = [
    [
      "languages & databases",
      "Python · Java · SQL · PostgreSQL · MySQL · Redis · Elasticsearch",
    ],
    ["backend", "FastAPI · Flask · Microservices · Kafka · Airflow"],
    [
      "ml / ai",
      "LLMs · RAG · LangChain · LangGraph · PyTorch · Scikit-learn · Hugging Face · DeepEval",
    ],
    [
      "cloud & tools",
      "AWS · Azure · Docker · Kubernetes · CI/CD · Linux · Claude Code · Cursor",
    ],
  ];
  for (const [cat, val] of items) {
    frag.append(row("dim", cat, pad, val));
    frag.append(document.createElement("br"));
  }
  term.printNode(frag);
}

function cmdProjects(term: Terminal): void {
  const frag = document.createDocumentFragment();

  const projects: { name: string; pad: number; tech: string; body: string[] }[] = [
    {
      name: "PostMortem AI",
      pad: 24,
      tech: "Python · TypeScript · PostgreSQL · Playwright",
      body: [
        "  six-stage postmortem pipeline. immutable citation validation — hallucinated claims retry,",
        "  uncited claims flagged as assumptions. LLM-as-judge rubric scoring + experiment versioning.",
      ],
    },
    {
      name: "Clinical Decision Support System",
      pad: 36,
      tech: "Google ADK · Gemini · MCP · RAG · Cloud Run",
      body: ["  3-agent coordinator pattern. MCP tool handlers, RAI guardrails, eval-gated CI/CD."],
    },
    {
      name: "Executive Intelligence Copilot",
      pad: 36,
      tech: "LangChain · FAISS · SQLite",
      body: [
        "  multi-agent system with tool-calling workflows, function-level routing, structured decision support.",
      ],
    },
  ];

  for (const p of projects) {
    const head = document.createElement("div");
    head.className = "block";
    head.append(span("command", p.name.padEnd(p.pad)), accentize(p.tech));
    frag.append(head);
    for (const b of p.body) {
      const line = document.createElement("div");
      line.className = "block text";
      line.textContent = b;
      frag.append(line);
    }
    frag.append(document.createElement("br"));
  }
  term.printNode(frag);
}

function cmdExperience(term: Terminal): void {
  const frag = document.createDocumentFragment();

  const roles: { head: string; pad: number; meta: string; body: string[] }[] = [
    {
      head: "Connyct CampusAI — Software Engineer Intern, AI",
      pad: 57,
      meta: "Sep–Dec 2025 · New York",
      body: [
        "  RAG pipeline (Elasticsearch, SentenceTransformers, Redis), multisignal ranking, ≤2s on AWS ECS.",
        "  LLM eval framework (DeepEval, Confident AI) gating model deploys in CI/CD.",
      ],
    },
    {
      head: "UMD Community Preservation Trust — SDE",
      pad: 57,
      meta: "Feb–Dec 2025 · Maryland",
      body: ["  Full-stack (React, Flask, MySQL, JWT/RBAC) replacing paper workflows for 15K+ users."],
    },
    {
      head: "IQVIA — SDE, AI & Backend",
      pad: 57,
      meta: "Jul 2022–Jul 2024 · Bangalore",
      body: [
        "  GPT-3.5 NLP platform (Azure Functions), 95% extraction accuracy on compliance docs.",
        "  Airflow invoice pipeline (Tesseract → Donut fallback), 70% throughput improvement.",
        "  Distributed microservices (Docker, Kubernetes, Azure Service Bus), 3K+ msgs/sec.",
        "  REST APIs (FastAPI, PostgreSQL), 1.2M+ annual transactions, sub-second latency.",
      ],
    },
  ];

  for (const r of roles) {
    const head = document.createElement("div");
    head.className = "block";
    head.append(span("command", r.head.padEnd(r.pad)), span("dim", r.meta));
    frag.append(head);
    for (const b of r.body) {
      const line = document.createElement("div");
      line.className = "block text";
      line.append(accentize(b));
      frag.append(line);
    }
    frag.append(document.createElement("br"));
  }
  term.printNode(frag);
}

function cmdContact(term: Terminal): void {
  const rows: [string, string][] = [
    ["email", "sanjaydv@umd.edu"],
    ["linkedin", "linkedin.com/in/sanjaydv"],
    ["github", "github.com/sdv1708"],
    ["location", "chicago, il"],
  ];
  const frag = document.createDocumentFragment();
  for (const [label, value] of rows) {
    const line = document.createElement("div");
    line.className = "block";
    line.append(span("command", label.padEnd(11)), span("text", value));
    frag.append(line);
  }
  term.printNode(frag);
}

function cmdTheme(ctx: Ctx, arg: string | undefined): void {
  const { term } = ctx;
  if (!arg) {
    term.println("available themes:");
    for (const name of themeNames()) {
      term.println("  " + name);
    }
    return;
  }
  const ok = ctx.applyThemeAndTitle(arg);
  if (!ok) {
    term.println(`unknown theme: ${arg}`);
  }
}

function cmdHistory(term: Terminal): void {
  const hist = term.getHistory();
  const frag = document.createDocumentFragment();
  hist.forEach((entry, i) => {
    const line = document.createElement("div");
    line.className = "block";
    line.append(span("dim", String(i + 1).padStart(4) + "  "), document.createTextNode(entry));
    frag.append(line);
  });
  term.printNode(frag);
}

// ---- chat mode -----------------------------------------------------------

function printChatHelp(ctx: Ctx): void {
  const { term, llm } = ctx;
  const lines = ["  ask anything about DV's work, projects, or background."];
  if (llm.canOfferWebLLM()) {
    lines.push("  commands: /exit · /clear · /model · /local · /help");
    lines.push("  /local downloads a private model (~0.9GB) to run fully in your browser.");
  } else {
    lines.push("  commands: /exit · /clear · /model · /help");
  }
  for (const line of lines) {
    const el = document.createElement("div");
    el.className = "line text";
    el.append(accentize(line));
    term.printNode(el);
  }
}

export async function enterChat(ctx: Ctx): Promise<void> {
  const { term, llm } = ctx;

  printArrow(term, "detecting on-device LLM capabilities...");

  term.setBusy(true);
  try {
    await llm.init();
  } catch (err) {
    term.setBusy(false);
    const msg = err instanceof Error ? err.message : String(err);
    term.println(msg);
    return;
  }
  term.setBusy(false);

  printArrow(term, llm.getBackend().label);
  ctx.updateBackendTag(llm.getBackend().titleTag);
  term.println("");
  printChatHelp(ctx);

  // Switch into chat mode.
  term.mode = "chat";
  term.setPrompt("dv-chat>");
  term.setPlaceholder("ask something about DV...");
  term.setCompletions(CHAT_COMMANDS);
}

function exitChat(ctx: Ctx): void {
  const { term } = ctx;
  term.mode = "shell";
  term.setPrompt("$");
  term.setPlaceholder("");
  term.setCompletions(SHELL_COMMANDS);
}

// Opt-in download of a fully-local in-browser model.
async function chatLocal(ctx: Ctx, arg: string | undefined): Promise<void> {
  const { term, llm } = ctx;

  if (!llm.canOfferWebLLM()) {
    if (llm.getBackend().kind === "webllm") {
      term.println("already running a local model in your browser.");
    } else if (llm.getBackend().kind === "gemini-nano") {
      term.println("already running on-device via Gemini Nano — no download needed.");
    } else {
      term.println("local models need a WebGPU browser (desktop Chrome / Edge).");
    }
    return;
  }

  if (arg !== "yes") {
    printArrow(term, "local model: Llama-3.2-1B, ~0.9GB one-time download.");
    term.println("  runs fully in your browser. nothing leaves your device. cached for next time.");
    term.println("  type /local yes to download, or keep chatting on the current backend.");
    return;
  }

  const progress = printBullet(term, "download progress: 0%");
  term.setBusy(true);
  try {
    await llm.enableWebLLM((text) => {
      progress.replaceChildren(span("accent", "· "), document.createTextNode(text));
    });
    progress.replaceChildren(
      span("accent", "· "),
      document.createTextNode("download progress: 100%"),
    );
    printArrow(term, llm.getBackend().label);
    ctx.updateBackendTag(llm.getBackend().titleTag);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    term.println(msg, "dim");
    term.println("  staying on the current backend. you can retry /local yes anytime.", "dim");
  } finally {
    term.setBusy(false);
  }
}

export async function runChatInput(ctx: Ctx, input: string): Promise<void> {
  const { term, llm } = ctx;

  if (input.startsWith("/")) {
    const parts = input.split(/\s+/);
    const cmd = (parts[0] ?? "").toLowerCase();
    if (cmd === "/exit") {
      exitChat(ctx);
    } else if (cmd === "/clear") {
      term.clear();
    } else if (cmd === "/model") {
      term.println(llm.getBackend().modelLabel);
    } else if (cmd === "/local") {
      await chatLocal(ctx, parts[1]?.toLowerCase());
    } else if (cmd === "/help") {
      printChatHelp(ctx);
    } else {
      term.println(`unknown command: ${input}. try /help`);
    }
    return;
  }

  term.setBusy(true);
  try {
    await term.streamLine(llm.stream(input), { text: "ai >", cls: "ai" });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    term.println(`ai > error: ${msg}`, "dim");
  } finally {
    term.setBusy(false);
  }
}

// ---- shell dispatch ------------------------------------------------------

export async function runShellCommand(ctx: Ctx, input: string): Promise<void> {
  const { term } = ctx;
  const parts = input.split(/\s+/);
  const cmd = (parts[0] ?? "").toLowerCase();
  const arg = parts[1];

  switch (cmd) {
    case "help":
      cmdHelp(term);
      break;
    case "whoami":
      cmdWhoami(term);
      break;
    case "about":
      cmdAbout(term);
      break;
    case "skills":
      cmdSkills(term);
      break;
    case "projects":
      cmdProjects(term);
      break;
    case "experience":
      cmdExperience(term);
      break;
    case "contact":
      cmdContact(term);
      break;
    case "theme":
      cmdTheme(ctx, arg);
      break;
    case "history":
      cmdHistory(term);
      break;
    case "clear":
      term.clear();
      break;
    case "exit":
      term.println("you can't leave. there's no door.");
      break;
    case "ask":
      await enterChat(ctx);
      break;
    default:
      term.println(`command not found: ${input}. type 'help' for available commands.`);
  }
}
