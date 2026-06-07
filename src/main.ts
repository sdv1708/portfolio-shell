// Entry point: mobile gate, title bar, boot sequence, async LLM detection,
// and the command router wiring the terminal to the command handlers.

import "./style.css";
import { Terminal } from "./terminal.ts";
import { LLM } from "./llm.ts";
import { applyTheme, DEFAULT_THEME } from "./themes.ts";
import { DV_ASCII } from "./ascii.ts";
import {
  Ctx,
  SHELL_COMMANDS,
  runShellCommand,
  runChatInput,
} from "./commands.ts";

const MOBILE_BREAKPOINT = 768;
const app = document.getElementById("app")!;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function renderMobile(): void {
  app.innerHTML = "";
  const wrap = document.createElement("div");
  wrap.className = "mobile";
  const a = document.createElement("div");
  a.className = "mobile-prompt";
  a.textContent = "sdv@dev:~$";
  const b = document.createElement("div");
  b.className = "mobile-msg";
  b.textContent =
    "best experienced on desktop Chrome.\non-device AI requires a real GPU.";
  wrap.append(a, b);
  app.append(wrap);
}

// ---- desktop ----

let titleThemeEl: HTMLElement;

function buildChrome(): { titleBar: HTMLElement; root: HTMLElement } {
  app.innerHTML = "";

  const win = document.createElement("div");
  win.className = "window";

  const titleBar = document.createElement("div");
  titleBar.className = "titlebar";

  const dots = document.createElement("div");
  dots.className = "dots";
  for (const c of ["red", "yellow", "green"]) {
    const d = document.createElement("span");
    d.className = "dot " + c;
    dots.append(d);
  }

  const title = document.createElement("div");
  title.className = "title";
  title.append(document.createTextNode("sdv@dev — ai (on-device) — "));
  titleThemeEl = document.createElement("span");
  titleThemeEl.className = "title-theme";
  title.append(titleThemeEl);

  titleBar.append(dots, title);

  const root = document.createElement("div");
  root.className = "terminal-root";

  win.append(titleBar, root);
  app.append(win);
  return { titleBar, root };
}

function setTitleTheme(name: string): void {
  if (titleThemeEl) titleThemeEl.textContent = name;
}

function printOk(term: Terminal, text: string): HTMLElement {
  const line = document.createElement("div");
  line.className = "line";
  const ok = document.createElement("span");
  ok.className = "ok";
  ok.textContent = "[ok] ";
  line.append(ok, document.createTextNode(text));
  term.printNode(line);
  return line;
}

async function boot(term: Terminal, llm: LLM): Promise<void> {
  // Kick off detection immediately; it resolves asynchronously while the
  // staggered boot lines print.
  const detection = llm.detect();

  printOk(term, "mounting /dev/curiosity");
  await sleep(350);
  printOk(term, "loading backend systems...");
  await sleep(350);
  const checking = printOk(term, "checking for on-device LLM...");
  await sleep(350);
  printOk(term, "warming up the postmortem engine");
  await sleep(350);
  printOk(term, "system ready");
  await sleep(350);

  // Insert the on-device LLM status directly beneath the "checking..." line.
  const backend = await detection;
  const status = document.createElement("div");
  status.className = "line";
  const arrow = document.createElement("span");
  arrow.className = "accent";
  arrow.textContent = "→ ";
  status.append(arrow, document.createTextNode(backend.label));
  checking.after(status);

  await sleep(200);

  // Banner + welcome.
  term.printBlock(DV_ASCII, "ascii");
  term.println("");
  term.println(
    "welcome. type 'help' for commands, or 'ask' to chat with a local LLM about my work.",
  );
  term.println("");
}

function main(): void {
  if (window.innerWidth < MOBILE_BREAKPOINT) {
    renderMobile();
    // If the viewport grows past the breakpoint, build the real terminal.
    window.addEventListener("resize", onResizeFromMobile);
    return;
  }
  startTerminal();
}

let started = false;

function onResizeFromMobile(): void {
  if (!started && window.innerWidth >= MOBILE_BREAKPOINT) {
    window.removeEventListener("resize", onResizeFromMobile);
    startTerminal();
  }
}

function startTerminal(): void {
  started = true;
  applyTheme(DEFAULT_THEME);

  const { root } = buildChrome();
  setTitleTheme(DEFAULT_THEME);

  const term = new Terminal({ root });
  term.setCompletions(SHELL_COMMANDS);

  const llm = new LLM();

  const ctx: Ctx = {
    term,
    llm,
    applyThemeAndTitle: (name: string) => {
      const ok = applyTheme(name);
      if (ok) setTitleTheme(name);
      return ok;
    },
  };

  term.onLine = async (raw: string) => {
    const input = raw;
    if (input.trim() === "") return;
    term.echo(input);
    term.recordHistory(input);
    if (term.mode === "shell") {
      await runShellCommand(ctx, input.trim());
    } else {
      await runChatInput(ctx, input.trim());
    }
  };

  // Hide the input line until boot finishes, then hand control to the user.
  term.setBusy(true);
  boot(term, llm).then(() => {
    term.setBusy(false);
    term.focus();
  });
}

main();
