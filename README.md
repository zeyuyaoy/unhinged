# Extrcuse Generater

Extrcuse Generater is a full-stack comedy demo for turning a harmless everyday situation into an increasingly elaborate excuse. It remembers recurring lore, escalates into a Y2K reality collapse, launches an eight-second pigeon paperwork arcade, and ends with a five-question contradiction check.

The interface starts colorful and orderly, then progresses through glossy Web 2.0, office-dialog chaos, Flash-era motion, and GeoCities-style arcade maximalism. Navigation, forms, safety information, and the excuse document remain readable and stable throughout.

> **Project status:** feature-complete demo. The intentional spelling of “Extrcuse Generater” is the product name.

## Demo flow

1. Enter a harmless situation and choose the audience, role, genre, and starting chaos.
2. Generate an initial excuse with SEA-LION.
3. Make it worse, add detail, add lore, or escalate the universe.
4. Meet the Emergency Backup Pigeon and preserve its increasingly unnecessary continuity.
5. At chaos 8–10, play or skip recurring **Paperwork Panic** arcade rounds.
6. Answer five interrogation questions and receive the final recommendation to stop escalating.

## Highlights

- **Progressive Y2K interface:** exact chaos levels `0–10` drive color, typography, panel offsets, stickers, scanlines, faux dialogs, and bounded animation.
- **Singapore-aware generation:** SEA-LION provides multilingual, locally aware comedy through its OpenAI-compatible API.
- **Authoritative story state:** lore, claims, contradictions, metrics, interrogation history, arcade results, and collectibles survive reloads.
- **Paperwork Panic:** deterministic keyboard/touch arcade rounds with server-validated outcomes and clamped metric effects.
- **Original audio:** Web Audio oscillator/noise cues, arcade-only music, visible captions, persistent mute, and master volume.
- **Anonymous persistence:** cases belong to a random HttpOnly browser token; no account or personal profile is required.
- **Safe fallback:** provider timeouts, malformed responses, refusals, and unsafe output use clearly labeled deterministic continuations.
- **Accessible chaos:** stable DOM and focus order, 44px controls, keyboard operation, focus restoration, AA-oriented tokens, and full reduced-motion behavior.

## Technology

- Next.js 16 App Router, React 19, and TypeScript
- CSS custom properties and locally bundled variable fonts
- SEA-LION via the OpenAI-compatible chat completions API
- Zod structured-response and request validation
- Drizzle ORM with PostgreSQL
- Railway deployment configuration and health checks
- Vitest, Playwright, and Axe accessibility checks

## Run locally

Requirements:

- Node.js 22 or newer
- pnpm 11 or newer
- PostgreSQL only when testing persistent storage locally

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000).

Do not commit `.env` or `.env.local`; both are ignored by Git. SEA-LION credentials and prompts remain server-side.

## Configuration

| Variable | Required | Purpose |
| --- | --- | --- |
| `SEALION_API_KEY` | For live AI | SEA-LION API credential. |
| `SEALION_BASE_URL` | No | Defaults to `https://api.sea-lion.ai/v1`. |
| `SEALION_MODEL` | No | Defaults to `aisingapore/Gemma-SEA-LION-v4-27B-IT`. |
| `SEALION_INITIAL_TIMEOUT_MS` | No | Initial-generation deadline; defaults to `25000`. |
| `SEALION_TRANSFORM_TIMEOUT_MS` | No | Transformation deadline; defaults to `15000`. |
| `DATABASE_URL` | Production | Railway/private PostgreSQL connection URL. |
| `DATABASE_PUBLIC_URL` | Local only | Public Railway PostgreSQL URL when developing outside Railway. |
| `DATABASE_REQUIRED` | No | Set to `1` to reject startup/runtime storage access without PostgreSQL. |

Minimal live-generation configuration:

```dotenv
SEALION_API_KEY=your_key
SEALION_BASE_URL=https://api.sea-lion.ai/v1
SEALION_MODEL=aisingapore/Gemma-SEA-LION-v4-27B-IT
```

Without `SEALION_API_KEY`, the entire demo remains usable through clearly labeled deterministic fixtures. Local development without a database uses an in-memory store; production refuses temporary memory storage.

## Railway deployment

1. Create an app service from this repository and add a Railway PostgreSQL service to the same project.
2. In the app service, create a reference variable named `DATABASE_URL` pointing to the database service’s `DATABASE_URL`.
3. Add `SEALION_API_KEY` and any optional SEA-LION overrides to the app service.
4. Deploy.

The included [`railway.json`](./railway.json) performs:

- `pnpm build` during the build phase;
- `pnpm db:migrate` before deployment;
- `pnpm start` on Railway’s injected `PORT`;
- a `/api/health` readiness check before the deployment is marked healthy.

For local access to Railway PostgreSQL, enable the database service’s public TCP endpoint and set `DATABASE_PUBLIC_URL`. Services running inside the same Railway project should use the private `DATABASE_URL`.

Run migrations manually when needed:

```bash
pnpm db:migrate
```

## Architecture

The application stores narrative state rather than treating raw model chat history as its database.

- `device_sessions` stores only a SHA-256 hash of the anonymous browser token.
- `cases` stores ownership, status, version, timestamps, and the authoritative `ExcuseState` JSONB document.
- `case_events` stores append-only actions, idempotency keys, versions, source, latency, token usage, and sanitized error categories.
- Every mutation supplies an `expectedVersion` and `idempotencyKey` so stale tabs cannot silently overwrite newer state.
- Older JSONB cases are normalized during reads and persist their updated shape on the next ordinary mutation.

Provider output is parsed into Zod schemas and merged into deterministic state only after validation. The server preserves canonical lore and arcade state even when the live model response omits them.

### API routes

| Method | Route | Purpose |
| --- | --- | --- |
| `POST` | `/api/cases` | Validate a scenario, create a case, and generate the initial excuse. |
| `GET` | `/api/cases` | List recent cases for the current browser. |
| `DELETE` | `/api/cases` | Clear the current browser’s case history. |
| `GET` | `/api/cases/:id` | Restore an owned case and its authoritative state. |
| `POST` | `/api/cases/:id/actions` | Apply a versioned transformation, interrogation answer, or arcade result. |
| `GET` | `/api/health` | Check application and database readiness. |

## Audio and Paperwork Panic

Sound begins in an armed state and can activate only from a user’s Generate or escalation click. The header exposes immediate mute and a persistent volume slider; significant sounds also receive visible captions. Audio is suspended when the page is hidden and background music exists only during arcade rounds.

Critical actions at chaos `8–10` queue Paperwork Panic after generation completes. Each round:

- lasts eight seconds;
- supports arrows, WASD, and touch controls;
- asks the pigeon to collect three forms while avoiding red tape;
- can always be skipped with the visible button or `Escape`;
- uses a deterministic scenario/action seed;
- records deliveries, misfiles, skips, scores, and collectibles server-side.

Reduced-motion mode freezes decorative animation and uses static, turn-based hazard movement.

## Safety and privacy

- Cases are linked to this browser. No account required.
- Serious fabricated emergencies, crimes, fraud, impersonation, fake evidence, and official documents are rejected.
- Harmless high-chaos comedy remains allowed even when SEA-LION labels it as implausible or suspicious.
- Genuine provider refusals and unsafe generated material still switch to the labeled fallback.
- Raw prompts and generated text are not copied into application logs.
- Logs contain identifiers, lengths/latency, token usage, source, and sanitized error categories.
- Safety text, navigation, forms, and the excuse document are never distorted by the chaos presentation.

## Verification

Run the complete project checks before deployment:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
git diff --check
```

The Playwright suite deliberately sets `SEALION_DISABLED=1`. This keeps browser tests deterministic, exercises the labeled fallback without consuming quota, and validates desktop/mobile layouts, audio lifecycle, arcade input, reload recovery, reduced motion, accessibility, and visual snapshots.

## Troubleshooting

### SEA-LION uses a fallback

Confirm that `SEALION_API_KEY`, `SEALION_BASE_URL`, and `SEALION_MODEL` are correct and restart the development server after changing environment variables. The server will also use fallback content after a timeout, malformed JSON, genuine refusal, or unsafe generated claim. The UI and event record label the source explicitly.

### `/api/health` returns `503`

Production requires a reachable PostgreSQL connection. Check `DATABASE_URL`, confirm Railway reference-variable wiring, and verify that migrations ran. For local development, remove `DATABASE_REQUIRED=1` if in-memory storage is intentional.

### Sound is silent

Browsers require a user gesture before Web Audio can start. Click Generate or an escalation action, confirm that the header is not muted, and raise the volume slider. No background music should play outside Paperwork Panic.

### A pending arcade returns after reload

This is intentional. Pending rounds are authoritative case state. Play the round, choose **Skip nonsense**, or press `Escape` to resolve it safely.

## Project layout

```text
src/app/                 Next.js pages, styles, and API routes
src/components/          Main application, audio director, and arcade
src/lib/                 Chaos engine, SEA-LION adapter, safety, DB, and store
drizzle/                 PostgreSQL migrations and metadata
public/art/y2k/          Original optimized Y2K asset pack
tests/e2e/               Playwright flows and visual baselines
railway.json             Railway build, migration, start, and health config
```
