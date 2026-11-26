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
  chatCommands,
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
let titleBackendEl: HTMLElement;

function buildChrome(): {
  commandBar: HTMLElement;
  commands: HTMLFieldSetElement;
  root: HTMLElement;
} {
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
  title.append(document.createTextNode("sdv@dev — "));
  titleBackendEl = document.createElement("span");
  titleBackendEl.className = "title-backend";
  titleBackendEl.textContent = "ai";
  title.append(titleBackendEl, document.createTextNode(" — "));
  titleThemeEl = document.createElement("span");
  titleThemeEl.className = "title-theme";
  title.append(titleThemeEl);

  titleBar.append(dots, title);

  const commandBar = document.createElement("nav");
  commandBar.className = "command-bar";
  const commands = document.createElement("fieldset");
  commandBar.append(commands);

  const root = document.createElement("div");
  root.className = "terminal-root";

  win.append(titleBar, commandBar, root);
  app.append(win);
  return { commandBar, commands, root };
}

function setTitleTheme(name: string): void {
  if (titleThemeEl) titleThemeEl.textContent = name;
}

function setTitleBackend(tag: string): void {
  if (titleBackendEl) titleBackendEl.textContent = tag;
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

  // Insert the LLM status directly beneath the "checking..." line.
  const backend = await detection;
  const status = document.createElement("div");
  status.className = "line";
  const arrow = document.createElement("span");
  arrow.className = "accent";
  arrow.textContent = "→ ";
  status.append(arrow, document.createTextNode(backend.label));
  checking.after(status);
  setTitleBackend(backend.titleTag);

  await sleep(200);

  // Banner + welcome.
  term.printBlock(DV_ASCII, "ascii");
  term.println("");
  term.println("Choose a command above or type one here.");
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

  const { commandBar, commands, root } = buildChrome();
  setTitleTheme(DEFAULT_THEME);

  const term = new Terminal({
    root,
    onBusyChange: (busy) => {
      commands.disabled = busy;
    },
  });

  const llm = new LLM();

  const ctx: Ctx = {
    term,
    llm,
    applyThemeAndTitle: (name: string) => {
      const ok = applyTheme(name);
      if (ok) setTitleTheme(name);
      return ok;
    },
    updateBackendTag: setTitleBackend,
  };

  let renderedCommands = "";

  function updateCommandBar(): void {
    const inChat = term.mode === "chat";
    const shortcuts = inChat ? chatCommands(llm) : SHELL_COMMANDS;
    const key = shortcuts.join(" ");
    if (key === renderedCommands) return;
    renderedCommands = key;

    const label = inChat ? "Chat commands" : "Portfolio commands";
    commandBar.setAttribute("aria-label", label);
    const buttons = shortcuts.map((shortcut) => {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = shortcut;
      if (shortcut === "/exit") button.title = "Return to portfolio commands";
      button.addEventListener("click", () => void term.submit(shortcut));
      return button;
    });
    commands.replaceChildren(...buttons);
    term.setCompletions(shortcuts);
    if (document.activeElement === document.body) term.focus();
  }

  updateCommandBar();

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
    updateCommandBar();
  };

  // Hide the input line until boot finishes, then hand control to the user.
  term.setBusy(true);
  boot(term, llm).then(() => {
    term.setBusy(false);
    term.focus();
  });
}

main();
