# Maximum Extra

Maximum Extra is a full-stack Next.js demo that turns a harmless everyday situation into an increasingly absurd excuse, remembers recurring lore, and ends with a five-question contradiction check. The interface begins calm and readable, then adds bounded visual chaos without moving navigation or compromising the main reading order.

## Run locally

Requirements: Node.js 22+, pnpm 11+, and optionally PostgreSQL.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Add a SEA-LION key to `.env.local` to enable live generations:

```dotenv
SEALION_API_KEY=your_rotated_key
SEALION_BASE_URL=https://api.sea-lion.ai/v1
SEALION_MODEL=aisingapore/Gemma-SEA-LION-v4-27B-IT
```

Without a key, or if the provider times out, the complete experience continues with clearly labeled deterministic demo fixtures. No secret is sent to the browser.

To persist cases in PostgreSQL, set `DATABASE_URL`, then run:

```bash
pnpm db:migrate
```

Without `DATABASE_URL`, local development uses an in-memory store. Production deployments should always configure PostgreSQL.

## Checks

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm test:e2e
pnpm build
git diff --check
```

The browser tests deliberately disable the live provider so the fallback path remains deterministic and no API quota is consumed.

## Safety and privacy

- Cases are linked to a random HttpOnly browser token. Only its SHA-256 hash is stored.
- The app rejects serious fabricated emergencies, crimes, fraud, impersonation, and fake documents or evidence.
- Raw prompts and generated text are not written to application logs.
- High-chaos visuals never distort safety text, the narrative, navigation, or controls, and reduced-motion preferences disable animation.
