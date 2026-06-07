# portfolio-shell

A terminal portfolio for Sanjay Dari Veerabasappa. Custom div-based terminal
emulator — no xterm.js, no frameworks. The static site is served from a small
Cloudflare Worker that also exposes one edge AI route, so `ask` works for
*every* visitor without a multi-GB download.

## AI backend cascade

`ask` picks the best available backend automatically — fastest-acceptable wins,
and it always returns *something* instantly:

1. **Gemini Nano** — Chrome Prompt API, on-device, zero download.
2. **Cloudflare Workers AI** — Llama 3.1 at the edge, instant, no API key
   (first-party binding), free-tier friendly. The default for most visitors.
3. **Canned Q&A** — offline string matching over common questions. Last resort
   when neither of the above is reachable (e.g. local `vite preview`).

**WebLLM is opt-in only.** In chat, `/local` downloads a ~0.9GB Llama-3.2-1B to
run fully in the browser — for visitors who want 100% private/offline inference.
It is hardened against the usual `Cache.add()` failures (persistent storage,
quota pre-check, IndexedDB cache, resume-on-retry) and never runs automatically.

## Stack

- Vite + TypeScript (strict mode), native DOM APIs, CSS
- Cloudflare Worker (`worker/index.ts`): Static Assets + `/api/chat` (Workers AI)
- No API keys, no localStorage/cookies, no analytics, no external DB
- Optional, lazy-loaded `@mlc-ai/web-llm` from CDN (only when `/local` is used)

## Develop

```bash
npm install
npm run dev        # vite — UI only; ask falls back to canned Q&A (no /api)
npm run cf-dev     # build + wrangler dev — full stack incl. Workers AI
```

## Build

```bash
npm run build      # tsc + vite build -> dist/
```

## Deploy (Cloudflare Workers)

```bash
npm run deploy     # build + wrangler deploy
```

The Worker serves `dist/` as Static Assets and adds `/api/chat` (Workers AI)
and `/api/health`. The `AI` binding needs no secret — see `wrangler.jsonc`.
First deploy will prompt you to authenticate with Cloudflare.

### Auto-deploy on push (CI)

`.github/workflows/deploy.yml` builds and deploys on every push to `main` or
`claude/terminal-portfolio-vite-yVenn`. One-time setup — add two repo secrets
(GitHub → Settings → Secrets and variables → Actions):

| Secret | Where to get it |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | dash.cloudflare.com → My Profile → API Tokens → Create Token. Use the **Edit Cloudflare Workers** template, then add **Account → Workers AI → Read** so the `AI` binding deploys. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare dashboard → Workers & Pages → right sidebar **Account ID**. |

After the secrets exist, the next push ships automatically. Trigger it by hand
anytime from the Actions tab (**Run workflow**). To deploy only from `main`,
drop the feature branch from the workflow's `on.push.branches`.

## Source layout

| File            | Responsibility                                            |
| --------------- | --------------------------------------------------------- |
| `src/main.ts`   | entry, mobile gate, title bar, boot sequence, router      |
| `src/terminal.ts` | div terminal: render, input, history, tab, cursor       |
| `src/commands.ts` | command handlers + static portfolio content             |
| `src/llm.ts`    | backend cascade, Gemini Nano, Workers AI, WebLLM, streaming |
| `src/faq.ts`    | offline canned Q&A (last-resort fallback)                 |
| `src/system-prompt.ts` | shared system prompt + knowledge base (DOM-free)   |
| `src/themes.ts` | theme definitions + runtime switching                     |
| `src/ascii.ts`  | hardcoded ASCII banner                                    |
| `worker/index.ts` | Cloudflare Worker: Static Assets + `/api/chat` (Workers AI) |

## Commands

`ask · whoami · about · skills · projects · experience · contact · theme ·
history · clear · exit · help`

Themes: `espresso` (default), `dracula`, `matrix` — switch with `theme [name]`.

Type `ask` to chat. In chat mode: `/exit · /clear · /model · /help`, plus
`/local` (opt-in in-browser model) where WebGPU is available.

> Mobile viewports (`< 768px`) show a desktop-only notice.
