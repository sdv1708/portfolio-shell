// Custom div-based terminal emulator. No xterm.js.
//
// Mechanics only: rendering, input handling, command history, tab
// completion, and a manually drawn blinking cursor. Command behavior and
// content live in commands.ts; the LLM lives in llm.ts.

export type Mode = "shell" | "chat";

export interface TerminalOptions {
  root: HTMLElement;
}

export class Terminal {
  private root: HTMLElement;
  private outputEl: HTMLElement;
  private inputLineEl: HTMLElement;
  private promptEl: HTMLElement;
  private renderEl: HTMLElement;
  private inputEl: HTMLInputElement;

  private history: string[] = [];
  private histIdx = 0; // points one past the last entry when not browsing
  private draft = ""; // stashed in-progress line while browsing history

  public mode: Mode = "shell";
  private promptText = "$";
  private busy = false;

  // Tab-completion candidates for the current mode.
  private completions: string[] = [];

  // Set by the command router (main.ts).
  public onLine: (input: string) => void | Promise<void> = () => {};

  constructor(opts: TerminalOptions) {
    this.root = opts.root;
    this.root.classList.add("terminal");

    this.outputEl = document.createElement("div");
    this.outputEl.className = "output";

    this.inputLineEl = document.createElement("div");
    this.inputLineEl.className = "input-line";

    this.promptEl = document.createElement("span");
    this.promptEl.className = "prompt";

    this.renderEl = document.createElement("span");
    this.renderEl.className = "input-render";

    // Real input element captures keystrokes but is visually hidden; the
    // visible text + block cursor are drawn manually in renderEl.
    this.inputEl = document.createElement("input");
    this.inputEl.className = "hidden-input";
    this.inputEl.type = "text";
    this.inputEl.autocomplete = "off";
    this.inputEl.spellcheck = false;
    this.inputEl.setAttribute("autocapitalize", "off");
    this.inputEl.setAttribute("autocorrect", "off");

    this.inputLineEl.append(this.promptEl, this.renderEl, this.inputEl);
    this.root.append(this.outputEl, this.inputLineEl);

    this.setPrompt("$");
    this.bindEvents();
    this.renderInput();
  }

  // ---- public API -------------------------------------------------------

  setPrompt(text: string): void {
    this.promptText = text;
    this.promptEl.textContent = text;
  }

  setPlaceholder(text: string): void {
    this.inputEl.placeholder = text;
  }

  setCompletions(words: string[]): void {
    this.completions = words;
  }

  setBusy(busy: boolean): void {
    this.busy = busy;
    this.inputLineEl.style.visibility = busy ? "hidden" : "visible";
    if (!busy) this.focus();
  }

  focus(): void {
    this.inputEl.focus();
  }

  getHistory(): string[] {
    return this.history.slice();
  }

  clear(): void {
    this.outputEl.replaceChildren();
  }

  // Append a plain line. `cls` adds a color class (see style.css).
  println(text = "", cls?: string): HTMLElement {
    const line = document.createElement("div");
    line.className = "line" + (cls ? " " + cls : "");
    line.textContent = text;
    this.outputEl.append(line);
    this.scroll();
    return line;
  }

  // Append a pre-built element (used for multi-segment colored output).
  printNode(node: Node): void {
    this.outputEl.append(node);
    this.scroll();
  }

  // Append a block of preformatted text (preserves alignment / newlines).
  printBlock(text: string, cls?: string): HTMLElement {
    const pre = document.createElement("div");
    pre.className = "block" + (cls ? " " + cls : "");
    pre.textContent = text;
    this.outputEl.append(pre);
    this.scroll();
    return pre;
  }

  // Echo a submitted command as a history line, e.g. "$ help".
  echo(input: string): void {
    const line = document.createElement("div");
    line.className = "line echo";
    const p = document.createElement("span");
    p.className = "prompt";
    p.textContent = this.promptText + " ";
    const t = document.createElement("span");
    t.textContent = input;
    line.append(p, t);
    this.outputEl.append(line);
    this.scroll();
  }

  // Stream text from an async generator into a single output line, drawing
  // an optional colored prefix (e.g. "ai >"). Resolves when streaming ends.
  async streamLine(
    gen: AsyncGenerator<string>,
    prefix?: { text: string; cls?: string },
  ): Promise<void> {
    const line = document.createElement("div");
    line.className = "line";
    if (prefix) {
      const p = document.createElement("span");
      p.className = prefix.cls ?? "";
      p.textContent = prefix.text + " ";
      line.append(p);
    }
    const body = document.createElement("span");
    line.append(body);
    this.outputEl.append(line);
    this.scroll();

    for await (const chunk of gen) {
      body.textContent += chunk;
      this.scroll();
    }
  }

  recordHistory(input: string): void {
    if (input.trim() && this.history[this.history.length - 1] !== input) {
      this.history.push(input);
    }
    this.histIdx = this.history.length;
    this.draft = "";
  }

  // ---- internals --------------------------------------------------------

  private scroll(): void {
    this.root.scrollTop = this.root.scrollHeight;
  }

  private bindEvents(): void {
    // Click anywhere focuses input (unless selecting text).
    this.root.addEventListener("mousedown", (e) => {
      const target = e.target as HTMLElement;
      if (target.tagName === "A") return; // allow link clicks
      const sel = window.getSelection();
      if (sel && sel.toString().length > 0) return; // preserve selections
      // Defer so the browser finishes its own focus/selection handling.
      setTimeout(() => this.focus(), 0);
    });

    this.inputEl.addEventListener("input", () => this.renderInput());
    this.inputEl.addEventListener("keyup", () => this.renderInput());
    this.inputEl.addEventListener("click", () => this.renderInput());
    this.inputEl.addEventListener("keydown", (e) => this.onKeyDown(e));
  }

  private async onKeyDown(e: KeyboardEvent): Promise<void> {
    if (e.key === "Enter") {
      e.preventDefault();
      if (this.busy) return;
      const value = this.inputEl.value;
      this.inputEl.value = "";
      this.renderInput();
      await this.onLine(value);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      this.complete();
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      this.browseHistory(-1);
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      this.browseHistory(1);
      return;
    }
  }

  private browseHistory(dir: -1 | 1): void {
    if (this.history.length === 0) return;
    // Stash current draft when leaving the live line.
    if (this.histIdx === this.history.length) {
      this.draft = this.inputEl.value;
    }
    const next = this.histIdx + dir;
    if (next < 0) {
      this.histIdx = 0;
    } else if (next >= this.history.length) {
      this.histIdx = this.history.length;
      this.inputEl.value = this.draft;
      this.moveCaretToEnd();
      this.renderInput();
      return;
    } else {
      this.histIdx = next;
    }
    this.inputEl.value = this.history[this.histIdx] ?? "";
    this.moveCaretToEnd();
    this.renderInput();
  }

  private complete(): void {
    const value = this.inputEl.value;
    // Only complete the first token (the command name).
    if (value.includes(" ")) return;
    const prefix = value.toLowerCase();
    if (!prefix) return;
    const matches = this.completions.filter((c) => c.startsWith(prefix));
    if (matches.length === 1) {
      this.inputEl.value = matches[0];
      this.moveCaretToEnd();
      this.renderInput();
    } else if (matches.length > 1) {
      // Complete the longest common prefix, then show options.
      const lcp = longestCommonPrefix(matches);
      if (lcp.length > value.length) {
        this.inputEl.value = lcp;
        this.moveCaretToEnd();
      }
      this.echo(value);
      this.println(matches.join("    "), "dim");
      this.renderInput();
    }
  }

  private moveCaretToEnd(): void {
    const len = this.inputEl.value.length;
    // Defer so it applies after the value assignment settles.
    requestAnimationFrame(() => this.inputEl.setSelectionRange(len, len));
  }

  // Redraw the visible input line (typed text + block cursor) from the
  // hidden input's value and caret position.
  private renderInput(): void {
    const value = this.inputEl.value;
    const pos = this.inputEl.selectionStart ?? value.length;

    const before = document.createTextNode(value.slice(0, pos));
    const cursorChar = value[pos] ?? " ";
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.textContent = cursorChar;
    const after = document.createTextNode(value.slice(pos + 1));

    this.renderEl.replaceChildren(before, cursor, after);
    // Keep the (possibly multi-line, wrapping) input line in view as it grows.
    this.scroll();
  }
}

function longestCommonPrefix(words: string[]): string {
  if (words.length === 0) return "";
  let prefix = words[0];
  for (const w of words) {
    while (!w.startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}
