# portfolio-shell

A static terminal portfolio for Sanjay Dari Veerabasappa (DV). Custom
div-based terminal emulator — no xterm.js, no frameworks. On-device LLM chat
via the Chrome Prompt API (Gemini Nano) with a WebLLM (WebGPU) fallback.

## Stack

- Vite + TypeScript (strict mode), native DOM APIs, CSS
- No backend, no API keys, no localStorage/cookies, no analytics
- Optional, lazy-loaded `@mlc-ai/web-llm` from CDN (only when WebGPU is used)

## Develop

```bash
npm install
npm run dev
```

## Build

```bash
npm run build      # tsc + vite build -> dist/
```

The output in `dist/` is fully static.

## Deploy (Cloudflare Workers Static Assets)

```bash
npm run build
npx wrangler deploy
```

See `wrangler.jsonc`.

## Source layout

| File            | Responsibility                                            |
| --------------- | --------------------------------------------------------- |
| `src/main.ts`   | entry, mobile gate, title bar, boot sequence, router      |
| `src/terminal.ts` | div terminal: render, input, history, tab, cursor       |
| `src/commands.ts` | command handlers + static portfolio content             |
| `src/llm.ts`    | capability detection, Gemini Nano, WebLLM, streaming      |
| `src/themes.ts` | theme definitions + runtime switching                     |
| `src/ascii.ts`  | hardcoded DV ASCII banner                                 |

## Commands

`ask · whoami · about · skills · projects · experience · contact · theme ·
history · clear · exit · help`

Themes: `espresso` (default), `dracula`, `matrix` — switch with `theme [name]`.

Type `ask` to chat with an on-device LLM. In chat mode: `/exit · /clear ·
/model · /help`.

> On-device AI requires desktop Chrome with the Prompt API, or a browser with
> WebGPU. Mobile viewports (`< 768px`) show a desktop-only notice.
