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

// An external link that opens in a new tab. The terminal's click-to-focus
// handler ignores <a> elements so these stay clickable.
function link(text: string, href: string): HTMLAnchorElement {
  const a = document.createElement("a");
  a.className = "entry-link";
  a.href = href;
  a.textContent = text;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  return a;
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

interface Project {
  name: string;
  repo: string; // github.com/... (no scheme)
  tech: string;
  desc: string;
}

const PROJECTS: Project[] = [
  {
    name: "PostMortem AI",
    repo: "github.com/sdv1708/postmortem",
    tech: "Python · TypeScript · PostgreSQL · Playwright",
    desc:
      "A six-stage incident-postmortem pipeline that turns raw logs and traces into reviewed, " +
      "citation-backed reports. Every claim is validated against its source evidence — hallucinated " +
      "claims are automatically retried, and uncited claims are flagged as assumptions. An " +
      "LLM-as-judge scores each draft against a rubric, with full experiment versioning so prompt " +
      "and model changes stay measurable.",
  },
  {
    name: "Clinical Decision Support System",
    repo: "github.com/sdv1708/Diagnostic-Stack",
    tech: "Google ADK · Gemini · MCP · RAG · Cloud Run",
    desc:
      "A three-agent coordinator that retrieves clinical context and drafts decision support under " +
      "guardrails. A coordinator routes between specialist agents that call MCP tool handlers, with " +
      "responsible-AI checks on every response and an eval-gated CI/CD pipeline that blocks deploys " +
      "when quality scores regress. Runs serverless on Cloud Run.",
  },
  {
    name: "Executive Intelligence Copilot",
    repo: "github.com/sdv1708/intelligence_copilot",
    tech: "LangChain · FAISS · SQLite",
    desc:
      "A multi-agent assistant for executive decision support. Tool-calling workflows route each " +
      "query to the right function — semantic search over a FAISS vector store, structured lookups " +
      "against SQLite — then compose the results into concise, sourced answers.",
  },
  {
    name: "GPT from Scratch",
    repo: "github.com/sdv1708/gpt-scratch",
    tech: "Python · PyTorch",
    desc:
      "A decoder-only GPT language model built from the ground up in PyTorch — tokenization, " +
      "multi-head causal self-attention, positional embeddings, and the training loop all " +
      "implemented by hand to understand transformer internals end to end.",
  },
];

function cmdProjects(term: Terminal): void {
  const frag = document.createDocumentFragment();

  for (const p of PROJECTS) {
    const entry = document.createElement("div");
    entry.className = "entry";

    const head = document.createElement("div");
    head.className = "entry-head";
    head.append(span("entry-title", p.name));
    frag.append(entry);

    const tech = document.createElement("div");
    tech.className = "entry-tech";
    tech.append(accentize(p.tech));

    const repo = document.createElement("div");
    repo.className = "entry-repo";
    repo.append(span("accent", "↳ "), link(p.repo, "https://" + p.repo));

    const desc = document.createElement("div");
    desc.className = "entry-desc";
    desc.textContent = p.desc;

    entry.append(head, tech, repo, desc);
  }

  // Pointer to the rest of the work on GitHub.
  const more = document.createElement("div");
  more.className = "entry-more";
  more.append(
    document.createTextNode("more projects on github "),
    span("accent", "→ "),
    link("github.com/sdv1708", "https://github.com/sdv1708"),
  );
  frag.append(more);

  term.printNode(frag);
}

interface Role {
  title: string;
  meta: string;
  bullets: string[];
}

const ROLES: Role[] = [
  {
    title: "Connyct CampusAI — Software Engineer Intern, AI",
    meta: "Sep–Dec 2025 · New York",
    bullets: [
      "Built a retrieval pipeline over Elasticsearch with SentenceTransformers embeddings and " +
        "Redis caching, using multi-signal ranking to return relevant results in under two seconds " +
        "on AWS ECS.",
      "Stood up an LLM evaluation framework (DeepEval, Confident AI) wired into CI/CD, gating model " +
        "deploys on measured answer quality rather than guesswork.",
    ],
  },
  {
    title: "UMD Community Preservation Trust — Software Engineer",
    meta: "Feb–Dec 2025 · Maryland",
    bullets: [
      "Built a full-stack application (React, Flask, MySQL) with JWT/RBAC authentication that " +
        "replaced paper-based workflows for a community of 15K+ users.",
    ],
  },
  {
    title: "IQVIA — Software Engineer, AI & Backend",
    meta: "Jul 2022–Jul 2024 · Bangalore",
    bullets: [
      "Shipped a GPT-3.5 NLP platform on Azure Functions that reached 95% extraction accuracy on " +
        "regulated compliance documents.",
      "Built an Airflow invoice-processing pipeline with a Tesseract → Donut OCR fallback, " +
        "improving throughput by 70%.",
      "Designed distributed microservices (Docker, Kubernetes, Azure Service Bus) sustaining 3K+ " +
        "messages per second.",
      "Built REST APIs (FastAPI, PostgreSQL) backing 1.2M+ annual transactions at sub-second " +
        "latency.",
    ],
  },
];

function cmdExperience(term: Terminal): void {
  const frag = document.createDocumentFragment();

  for (const r of ROLES) {
    const entry = document.createElement("div");
    entry.className = "entry";

    const head = document.createElement("div");
    head.className = "entry-head";
    head.append(span("entry-title", r.title));

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.append(accentize(r.meta));

    entry.append(head, meta);

    for (const b of r.bullets) {
      const line = document.createElement("div");
      line.className = "entry-bullet";
      line.append(span("accent", "· "), document.createTextNode(b));
      entry.append(line);
    }
    frag.append(entry);
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

  // Treat the chat commands as commands whether or not they're prefixed with
  // a slash — typing `exit` or `clear` (no slash) is a common reflex, and
  // silently sending those to the LLM is surprising.
  const parts = input.split(/\s+/);
  const word = (parts[0] ?? "").toLowerCase();
  const cmd = word.replace(/^\//, "");
  const KNOWN = new Set(["exit", "quit", "clear", "model", "local", "help"]);
  if (KNOWN.has(cmd)) {
    if (cmd === "exit" || cmd === "quit") {
      exitChat(ctx);
    } else if (cmd === "clear") {
      term.clear();
    } else if (cmd === "model") {
      term.println(llm.getBackend().modelLabel);
    } else if (cmd === "local") {
      await chatLocal(ctx, parts[1]?.toLowerCase());
    } else if (cmd === "help") {
      printChatHelp(ctx);
    }
    return;
  }
  if (word.startsWith("/")) {
    term.println(`unknown command: ${input}. try /help`);
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
