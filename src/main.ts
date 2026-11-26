// Entry point for the terminal, command bar, and background AI detection.

import "./style.css";
import { Terminal } from "./terminal.ts";
import { LLM } from "./llm.ts";
import { applyTheme, DEFAULT_THEME, themeNames } from "./themes.ts";
import { DV_ASCII } from "./ascii.ts";
import { PROFILE } from "./profile.ts";
import {
  Ctx,
  SHELL_COMMANDS,
  chatCommands,
  runShellCommand,
  runChatInput,
} from "./commands.ts";

const app = document.getElementById("app")!;

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
  titleBackendEl.textContent = "checking AI";
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

function main(): void {
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
  const desktopPointer = window.matchMedia("(pointer: fine)");

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
    term.setCompletions([...shortcuts, ...themeNames()], themeNames());
  }

  updateCommandBar();

  term.onLine = async (raw: string) => {
    const input = raw.trim();
    if (!input) return;
    const mode = term.mode;
    term.echo(input);
    term.recordHistory(input);
    try {
      if (mode === "shell") await runShellCommand(ctx, input);
      else await runChatInput(ctx, input);
    } catch {
      term.println("That command couldn’t run. Try again or choose another command.", "dim");
    } finally {
      updateCommandBar();
      if (mode !== term.mode && desktopPointer.matches) {
        term.focus();
      }
    }
  };

  const banner = term.printBlock(DV_ASCII, "ascii");
  banner.setAttribute("aria-hidden", "true");
  const heading = document.createElement("h1");
  heading.className = "intro-name";
  heading.textContent = PROFILE.fullName;
  term.printNode(heading);
  term.println("Choose a command above or type one below.");
  if (desktopPointer.matches) term.focus();
  void llm.detect().then(
    (backend) => setTitleBackend(backend.titleTag),
    () => setTitleBackend(llm.useCannedFallback().titleTag),
  );
}

main();
