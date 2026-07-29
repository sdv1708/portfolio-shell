// Command handlers and static portfolio content for both the normal shell
// and the LLM chat mode.

import { Terminal } from "./terminal.ts";
import { LLM } from "./llm.ts";
import { themeNames } from "./themes.ts";
import { PROFILE, type ProjectStatus } from "./profile.ts";

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
  "profile",
  "whoami",
  "about",
  "skills",
  "projects",
  "experience",
  "education",
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
    ["ask", "chat about my work"],
    ["profile", "complete profile"],
    ["whoami", "one-line bio"],
    ["about", "longer intro"],
    ["skills", "stack"],
    ["projects", "selected work"],
    ["experience", "selected roles"],
    ["education", "degrees"],
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
  term.println(
    `${PROFILE.fullName.toLowerCase()}. ${PROFILE.headline.toLowerCase()}. ` +
      `${PROFILE.location.toLowerCase()}.`,
  );
}

function cmdAbout(term: Terminal): void {
  term.printBlock(
    `${PROFILE.summary} ${PROFILE.workAuthorization}. Looking for ` +
      `${PROFILE.targetRoles.join(" / ")} roles.`,
  );
}

function cmdSkills(term: Terminal): void {
  const pad = 24;
  const frag = document.createDocumentFragment();
  for (const group of PROFILE.skills) {
    frag.append(row("dim", group.label, pad, group.items.join(" · ")));
    frag.append(document.createElement("br"));
  }
  term.printNode(frag);
}

const PROJECT_GROUPS: { status: ProjectStatus; label: string }[] = [
  { status: "featured", label: "featured" },
  { status: "open-source", label: "open-source contributions" },
  { status: "in-progress", label: "in progress" },
  { status: "additional", label: "additional work" },
];

function cmdProjects(term: Terminal): void {
  const frag = document.createDocumentFragment();

  for (const group of PROJECT_GROUPS) {
    const projects = PROFILE.projects.filter(
      (project) => project.status === group.status,
    );
    if (projects.length === 0) continue;

    const groupTitle = document.createElement("div");
    groupTitle.className = "project-group-title command";
    groupTitle.textContent = group.label;
    frag.append(groupTitle);

    for (const project of projects) {
      const entry = document.createElement("div");
      entry.className = "entry";

      const head = document.createElement("div");
      head.className = "entry-head";
      head.append(span("entry-title", project.name));

      const role = document.createElement("div");
      role.className = "entry-meta";
      role.textContent = project.role ?? "";

      const tech = document.createElement("div");
      tech.className = "entry-tech";
      tech.append(accentize(project.technologies.join(" · ")));

      const repo = document.createElement("div");
      repo.className = "entry-repo";
      repo.append(
        span("accent", "↳ "),
        link(project.repo, "https://" + project.repo),
      );

      const desc = document.createElement("div");
      desc.className = "entry-desc";
      desc.textContent = project.description;

      entry.append(head);
      if (project.role) entry.append(role);
      entry.append(tech, repo);

      for (const projectLink of project.links ?? []) {
        const linkLine = document.createElement("div");
        linkLine.className = "entry-repo";
        linkLine.append(
          span("accent", "↳ "),
          link(projectLink.label, projectLink.url),
        );
        entry.append(linkLine);
      }

      entry.append(desc);
      for (const highlight of project.highlights) {
        const highlightLine = document.createElement("div");
        highlightLine.className = "entry-bullet";
        highlightLine.append(
          span("accent", "· "),
          document.createTextNode(highlight),
        );
        entry.append(highlightLine);
      }
      frag.append(entry);
    }
  }

  // Pointer to the rest of the work on GitHub.
  const github = PROFILE.contacts.find((item) => item.label === "github");
  const more = document.createElement("div");
  more.className = "entry-more";
  more.append(
    document.createTextNode("more projects on github "),
    span("accent", "→ "),
    github?.href ? link(github.value, github.href) : document.createTextNode("github"),
  );
  frag.append(more);

  term.printNode(frag);
}

function cmdExperience(term: Terminal): void {
  const frag = document.createDocumentFragment();

  for (const role of PROFILE.experience) {
    const entry = document.createElement("div");
    entry.className = "entry";

    const head = document.createElement("div");
    head.className = "entry-head";
    head.append(span("entry-title", `${role.company} — ${role.title}`));

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.append(accentize(`${role.dates} · ${role.location}`));

    entry.append(head, meta);

    for (const achievement of role.achievements) {
      const line = document.createElement("div");
      line.className = "entry-bullet";
      line.append(span("accent", "· "), document.createTextNode(achievement));
      entry.append(line);
    }
    frag.append(entry);
  }
  term.printNode(frag);
}

function cmdContact(term: Terminal): void {
  const frag = document.createDocumentFragment();
  for (const contact of PROFILE.contacts) {
    const line = document.createElement("div");
    line.className = "block";
    line.append(span("command", contact.label.padEnd(11)));
    line.append(
      contact.href ? link(contact.value, contact.href) : span("text", contact.value),
    );
    frag.append(line);
  }
  term.printNode(frag);
}

function cmdEducation(term: Terminal): void {
  const frag = document.createDocumentFragment();
  for (const education of PROFILE.education) {
    const entry = document.createElement("div");
    entry.className = "entry";

    const degree = document.createElement("div");
    degree.className = "entry-head";
    degree.append(span("entry-title", education.degree));

    const meta = document.createElement("div");
    meta.className = "entry-meta";
    meta.textContent = `${education.institution} · ${education.graduation}`;

    entry.append(degree, meta);
    frag.append(entry);
  }
  term.printNode(frag);
}

function printSection(term: Terminal, title: string): void {
  term.println("");
  term.println(title, "command");
}

function cmdProfile(term: Terminal): void {
  printArrow(term, `${PROFILE.fullName} · updated ${PROFILE.updatedAt}`);
  printSection(term, "about");
  cmdAbout(term);
  printSection(term, "skills");
  cmdSkills(term);
  printSection(term, "projects");
  cmdProjects(term);
  printSection(term, "experience");
  cmdExperience(term);
  printSection(term, "education");
  cmdEducation(term);
  printSection(term, "contact");
  cmdContact(term);
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
    case "profile":
      cmdProfile(term);
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
    case "education":
      cmdEducation(term);
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
