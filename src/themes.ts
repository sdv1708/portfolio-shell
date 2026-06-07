// Theme definitions and runtime switching. Themes are applied by writing
// CSS custom properties onto the document root, so existing terminal output
// recolors instantly without re-rendering.

export interface Theme {
  name: string;
  bg: string;
  text: string;
  command: string; // command names in help / output
  prompt: string; // the prompt symbol
  ok: string; // [ok] boot prefix
  accent: string; // arrows and bullets
  ai: string; // ai > prefix
  dim: string; // muted secondary text
}

export const THEMES: Record<string, Theme> = {
  espresso: {
    name: "espresso",
    bg: "#1a120b",
    text: "#f5f0e8",
    command: "#e8820c",
    prompt: "#e8820c",
    ok: "#8a9a7b",
    accent: "#4caf50",
    ai: "#4caf50",
    dim: "#a89a88",
  },
  dracula: {
    name: "dracula",
    bg: "#282a36",
    text: "#f8f8f2",
    command: "#bd93f9",
    prompt: "#ff79c6",
    ok: "#6272a4",
    accent: "#50fa7b",
    ai: "#8be9fd",
    dim: "#6272a4",
  },
  matrix: {
    name: "matrix",
    bg: "#0d0d0d",
    text: "#00ff41",
    command: "#39ff14",
    prompt: "#00ff41",
    ok: "#008f11",
    accent: "#00ff41",
    ai: "#39ff14",
    dim: "#008f11",
  },
};

export const DEFAULT_THEME = "espresso";

export function applyTheme(name: string): boolean {
  const theme = THEMES[name];
  if (!theme) return false;
  const root = document.documentElement;
  root.style.setProperty("--bg", theme.bg);
  root.style.setProperty("--text", theme.text);
  root.style.setProperty("--command", theme.command);
  root.style.setProperty("--prompt", theme.prompt);
  root.style.setProperty("--ok", theme.ok);
  root.style.setProperty("--accent", theme.accent);
  root.style.setProperty("--ai", theme.ai);
  root.style.setProperty("--dim", theme.dim);
  return true;
}

export function themeNames(): string[] {
  return Object.keys(THEMES);
}
