// Custom div-based terminal emulator. No xterm.js.
//
// Rendering, native input, command history, and tab completion. Command
// behavior and content live in commands.ts, and the LLM lives in llm.ts.

export type Mode = "shell" | "chat";

export interface TerminalOptions {
  root: HTMLElement;
  onBusyChange?: (busy: boolean) => void;
}

export class Terminal {
  private outputEl: HTMLElement;
  private promptEl: HTMLElement;
  private inputEl: HTMLInputElement;
  private submitButton: HTMLButtonElement;
  private stopButton: HTMLButtonElement;

  private history: string[] = [];
  private histIdx = 0; // points one past the last entry when not browsing
  private draft = ""; // stashed in-progress line while browsing history

  public mode: Mode = "shell";
  private promptText = "$";
  private busy = false;
  private stopReply?: () => void;

  // Tab-completion candidates for the current mode.
  private completions: string[] = [];
  private themeCompletions: string[] = [];

  // Set by the command router (main.ts).
  public onLine: (input: string) => void | Promise<void> = () => {};

  constructor(private readonly opts: TerminalOptions) {
    this.outputEl = document.createElement("div");
    this.outputEl.className = "output";
    this.outputEl.setAttribute("role", "region");
    this.outputEl.setAttribute("aria-label", "Terminal output");
    this.outputEl.tabIndex = 0;

    const form = document.createElement("form");
    form.className = "input-line";

    this.promptEl = document.createElement("span");
    this.promptEl.className = "prompt";
    this.promptEl.setAttribute("aria-hidden", "true");

    this.inputEl = document.createElement("input");
    this.inputEl.className = "terminal-input";
    this.inputEl.type = "text";
    this.inputEl.setAttribute("aria-label", "Terminal input");
    this.inputEl.autocomplete = "off";
    this.inputEl.spellcheck = false;
    this.inputEl.setAttribute("autocapitalize", "off");
    this.inputEl.setAttribute("autocorrect", "off");

    this.submitButton = document.createElement("button");
    this.submitButton.type = "submit";

    this.stopButton = document.createElement("button");
    this.stopButton.type = "button";
    this.stopButton.textContent = "Stop";
    this.stopButton.hidden = true;
    this.stopButton.addEventListener("click", () => this.stopReply?.());

    form.append(this.promptEl, this.inputEl, this.submitButton, this.stopButton);
    opts.root.append(this.outputEl, form);

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (this.busy) return;
      const input = this.inputEl.value.trim();
      if (!input) return;
      this.inputEl.value = "";
      void this.submit(input);
    });

    this.setPrompt("$");
    this.inputEl.addEventListener("keydown", (event) => this.onKeyDown(event));
    form.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !event.isComposing && this.stopReply) {
        event.preventDefault();
        this.stopReply();
      }
    });
  }

  // ---- public API -------------------------------------------------------

  setPrompt(text: string): void {
    this.promptText = text;
    this.promptEl.textContent = text;
    this.inputEl.enterKeyHint = this.mode === "chat" ? "send" : "go";
    this.inputEl.placeholder = this.mode === "chat" ? "Ask about my work" : "Type a command";
    this.updateInputControls();
  }

  setCompletions(words: string[], themes: string[] = []): void {
    this.completions = words;
    this.themeCompletions = themes;
  }

  setBusy(busy: boolean, stop?: () => void): void {
    const focused = document.activeElement;
    this.busy = busy;
    this.stopReply = stop;
    this.updateInputControls();
    this.opts.onBusyChange?.(busy);
    if (busy && stop && focused === this.submitButton) this.stopButton.focus();
    if (!busy && focused === this.stopButton) this.focus();
  }

  private updateInputControls(): void {
    this.inputEl.readOnly = this.busy;
    this.submitButton.disabled = this.busy;
    this.submitButton.hidden = this.busy && !!this.stopReply;
    this.submitButton.textContent = this.busy
      ? "Working…"
      : this.mode === "chat" ? "Send" : "Run";
    this.stopButton.hidden = !this.busy || !this.stopReply;
  }

  async submit(input: string): Promise<void> {
    if (!this.busy) await this.onLine(input);
  }

  focus(): void {
    this.inputEl.focus({ preventScroll: true });
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
    const previous = this.outputEl.lastElementChild;
    this.outputEl.append(node);
    const first = previous ? previous.nextElementSibling : this.outputEl.firstElementChild;
    if (first instanceof HTMLElement &&
        this.outputEl.scrollHeight - first.offsetTop > this.outputEl.clientHeight) {
      this.outputEl.scrollTop = first.offsetTop;
    } else {
      this.scroll();
    }
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

  // Stream text into a terminal response, then format its paragraphs and
  // list items once the model finishes.
  async streamLine(
    gen: AsyncGenerator<string>,
    prefix?: { text: string; cls?: string },
  ): Promise<void> {
    const line = document.createElement("div");
    line.className = "line streamed-response";
    if (prefix) {
      const p = document.createElement("span");
      p.className = `streamed-response-prefix ${prefix.cls ?? ""}`.trim();
      p.textContent = prefix.text + " ";
      line.append(p);
    }
    const body = document.createElement("div");
    body.className = "streamed-response-body";
    line.append(body);
    this.outputEl.append(line);
    this.scroll();

    let text = "";
    try {
      for await (const chunk of gen) {
        const remaining = this.outputEl.scrollHeight -
          this.outputEl.clientHeight - this.outputEl.scrollTop;
        text += chunk;
        body.textContent = text;
        if (remaining < 40) this.scroll();
      }
      renderAssistantText(body, text);
    } catch (err) {
      // Avoid leaving an empty "ai >" row when a request fails before output.
      if (!text) line.remove();
      else renderAssistantText(body, text);
      throw err;
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
    this.outputEl.scrollTop = this.outputEl.scrollHeight;
  }

  private onKeyDown(e: KeyboardEvent): void {
    if (e.isComposing || e.keyCode === 229) return;
    if (this.busy) return;

    if (e.key === "Tab" && !e.shiftKey && this.complete()) {
      e.preventDefault();
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
      return;
    } else {
      this.histIdx = next;
    }
    this.inputEl.value = this.history[this.histIdx] ?? "";
    this.moveCaretToEnd();
  }

  private complete(): boolean {
    const value = this.inputEl.value.trimStart().toLowerCase();
    const theme = /^\/?theme\s+(\S*)$/.exec(value);
    if (!theme && value.includes(" ")) return false;
    const prefix = theme ? theme[1] : value;
    if (!prefix) return false;
    const candidates = theme ? this.themeCompletions : this.completions;
    const matches = candidates.filter((c) => c.startsWith(prefix));
    const command = theme ? value.slice(0, value.length - prefix.length) : "";
    if (matches.length === 1) {
      if (matches[0] === prefix) return false;
      this.inputEl.value = command + matches[0];
      this.moveCaretToEnd();
    } else if (matches.length > 1) {
      // Complete the longest common prefix, then show options.
      const lcp = longestCommonPrefix(matches);
      if (lcp.length > value.length) {
        this.inputEl.value = command + lcp;
        this.moveCaretToEnd();
      }
      this.println(matches.join("    "), "dim");
    }
    return matches.length > 0;
  }

  private moveCaretToEnd(): void {
    const len = this.inputEl.value.length;
    this.inputEl.setSelectionRange(len, len);
  }
}

function renderAssistantText(container: HTMLElement, text: string): void {
  const fragment = document.createDocumentFragment();
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  let paragraph: string[] = [];

  const flushParagraph = () => {
    if (paragraph.length === 0) return;
    const node = document.createElement("div");
    node.className = "ai-paragraph";
    appendInlineText(node, paragraph.join(" "));
    fragment.append(node);
    paragraph = [];
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushParagraph();
      continue;
    }

    const bullet = line.match(/^[-*•·]\s+(.+)$/);
    const numbered = line.match(/^(\d+)[.)]\s+(.+)$/);
    const heading = line.match(/^#{1,3}\s+(.+)$/);

    if (bullet || numbered || heading) {
      flushParagraph();
      const node = document.createElement("div");
      if (heading) {
        node.className = "ai-heading";
        appendInlineText(node, heading[1] ?? "");
      } else {
        node.className = "ai-list-item";
        const marker = document.createElement("span");
        marker.className = "accent ai-list-marker";
        marker.textContent = numbered ? `${numbered[1]}.` : "·";
        const content = document.createElement("span");
        appendInlineText(content, (numbered?.[2] ?? bullet?.[1]) ?? "");
        node.append(marker, content);
      }
      fragment.append(node);
      continue;
    }

    paragraph.push(line);
  }

  flushParagraph();
  container.replaceChildren(fragment);
}

function appendInlineText(container: HTMLElement, text: string): void {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  for (const part of parts) {
    if (!part) continue;
    if (part.startsWith("**") && part.endsWith("**")) {
      const strong = document.createElement("strong");
      strong.textContent = part.slice(2, -2);
      container.append(strong);
    } else if (part.startsWith("`") && part.endsWith("`")) {
      const code = document.createElement("span");
      code.className = "command";
      code.textContent = part.slice(1, -1);
      container.append(code);
    } else {
      container.append(document.createTextNode(part));
    }
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
