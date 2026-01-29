# CLAUDE.md

This file provides guidance to Claude when working on the Shipshow codebase and product.

---

# Shipshow Product Philosophy

## Core Purpose

Turn messy, real work (notes + git activity) into clear, audience-appropriate updates that people can confidently share.

Claude should optimize for clarity, honesty, and momentum — not feature sprawl.

---

## Product Principles (Non-Negotiable)

1. **Capture is frictionless**
   - Notes never require titles
   - Git activity is treated as factual evidence
   - Writing should never be blocked by structure

2. **Story over structure**
   - The product exists to explain work, not manage it
   - Outputs should read like a human explaining progress, not a changelog

3. **Audience first, channel second**
   - We decide who the update is for before where it goes
   - A single summary can produce many messages

4. **Time matters**
   - Everything is time-based
   - Reports describe what happened during a period

5. **MVP discipline**
   - Prefer fewer tables, fewer screens, fewer concepts
   - If something can be derived later, do not store it now

---

## Core Mental Model

Claude should always reason in this flow:

**Input → Meaning → Message**

- **Input**: notes and git commits
- **Meaning**: a summary written for a specific audience
- **Message**: a formatted version of that summary for a channel

Nothing skips steps.

---

## Domain Language (Use These Words)

Claude must use consistent, simple language that matches the UI:

- **Project**: a container for work
- **Note**: raw written input
- **Repository**: a linked git repository
- **Commit**: a unit of work that happened
- **Audience**: who the update is for
- **Summary**: what the work means
- **Channel**: where the update will be shared
- **Message**: a channel-formatted version of a summary

Avoid introducing alternative terms unless explicitly requested.

---

## Database Philosophy

- All tables include timestamps
- Titles are optional unless publishing
- Commits use `committed_at` as the source of truth
- Summaries are immutable snapshots (regeneration creates new rows)

Claude should not propose schema changes unless:
- they simplify the model, or
- they unlock reporting or credibility

---

## AI Behavior Guidelines

### When generating summaries:
- Blend intent (notes) with evidence (commits)
- Prefer outcomes and progress over implementation detail
- Avoid hallucinating scope or success
- Call out uncertainty when data is thin

### Tone rules:
- Confident but not salesy
- Clear but not verbose
- Never hype work that isn't supported by inputs

### Claude should never:
- invent commits
- assume deadlines were met
- imply completion without evidence

---

## Channel Awareness

Each channel has constraints. Claude must respect them:

- **Slack**: concise, skimmable, light structure
- **LinkedIn**: narrative, outcome-oriented, public-safe
- **Email / Exec update**: calm, factual, high-signal
- **Public summary**: explanatory, timeless, non-internal

Formatting matters as much as wording.

---

## MVP Scope Guardrails

Claude should push back if asked to add:
- Task management
- Real-time collaboration
- Deep analytics dashboards
- Billing complexity
- Team permissions

Instead, suggest:
- better summaries
- clearer messages
- stronger audience targeting

---

## How Claude Should Help Day-to-Day

Claude is expected to:
- Help design prompts and summarization strategies
- Review schema or UI changes for conceptual drift
- Improve clarity of generated outputs
- Help reduce scope when things get bloated

**Claude should act like**: A thoughtful product partner who cares about shipping.

---

## North Star Question

Whenever uncertain, Claude should ask internally:

> **"Does this help someone explain their work more clearly, faster, and with less stress?"**

If not, it probably doesn't belong in the MVP.

---

# Technical Overview

## Stack

This is a Next.js application with Supabase backend, based on the Next.js + Supabase starter template. The project uses:
- Next.js (latest) with App Router
- Supabase for authentication and database
- TypeScript with strict mode
- Tailwind CSS for styling
- shadcn/ui components
- React 19
- OpenAI API
- Stripe

## Development Commands

### Web Application (apps/web)
```bash
# Start development server (runs on http://localhost:3000)
cd apps/web && npm run dev

# Build for production
cd apps/web && npm run build

# Start production server
cd apps/web && npm start

# Run linting
cd apps/web && npm run lint
```

### Supabase Local Development
```bash
# Start local Supabase instance (requires Supabase CLI)
supabase start

# Stop local Supabase
supabase stop

# View database in Supabase Studio (http://127.0.0.1:54323)
# Studio port is 54323, API port is 54321, DB port is 54322
```

## Architecture

### Supabase Client Patterns

This project uses three distinct Supabase client patterns, each for specific contexts:

1. **Server Components** (`lib/supabase/server.ts`):
   - Use `createClient()` from `@/lib/supabase/server`
   - Always create a new client instance per function (important for Fluid compute)
   - Never store in a global variable
   - Cookie-based authentication via Next.js `cookies()`

2. **Client Components** (`lib/supabase/client.ts`):
   - Use `createClient()` from `@/lib/supabase/client`
   - Creates browser client using `createBrowserClient`
   - Shares same environment variables

3. **Proxy (Middleware)** (`lib/supabase/proxy.ts`):
   - Used in the root-level `proxy.ts` file
   - Handles session refresh via middleware
   - Critical: Do NOT modify the response cookies or session handling logic
   - Automatically redirects unauthenticated users to `/auth/login`

### Authentication Flow

- Password-based authentication is implemented using the Supabase UI Library pattern
- Auth routes are in `app/auth/`:
  - `/auth/login` - Login form
  - `/auth/sign-up` - Registration form
  - `/auth/forgot-password` - Password reset
  - `/auth/update-password` - Update password after reset
  - `/auth/confirm` - Email confirmation route
  - `/auth/error` - Error handling page
- Protected routes are in `app/protected/`:
  - Requires authentication via middleware proxy
  - Has its own layout with auth checks

### Middleware (proxy.ts)

The `proxy.ts` file at the root level is critical:
- Exports a `proxy()` function that calls `updateSession()`
- Matcher excludes static files, images, and Next.js internals
- Handles automatic session refresh and authentication state
- **Important**: The middleware redirects to `/auth/login` for unauthenticated users accessing protected routes

### Environment Variables

Required in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

Note: The project uses `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (new format), but Supabase dashboard may show `NEXT_PUBLIC_SUPABASE_ANON_KEY` - both work interchangeably.

### File Structure

```
apps/web/
├── app/                    # Next.js App Router
│   ├── auth/              # Authentication pages
│   ├── protected/         # Protected routes (requires auth)
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   └── ...               # Auth forms, theme switcher, etc.
├── lib/
│   ├── supabase/         # Supabase client configuration
│   │   ├── server.ts     # Server-side client
│   │   ├── client.ts     # Client-side client
│   │   └── proxy.ts      # Middleware client
│   └── utils.ts          # Utility functions
└── proxy.ts              # Next.js middleware entry point

supabase/
├── config.toml           # Supabase local config
└── .temp/                # Temporary files (local dev)
```

### TypeScript Configuration

- Path alias: `@/*` maps to the root of `apps/web/`
- Strict mode enabled
- Target: ES2017
- JSX: react-jsx (React 19 transform)

### Styling

- Tailwind CSS with custom configuration in `tailwind.config.ts`
- Components use `class-variance-authority` for variant handling
- `tailwind-merge` utility via `lib/utils.ts` for class merging
- Dark mode support via `next-themes`

## Important Notes

1. **Never store Supabase server clients in global variables** - always create new instances per function to support Fluid compute properly.

2. **Cookie handling in middleware** - The proxy's `updateSession()` function has critical cookie handling logic. Modifying this incorrectly can cause users to be randomly logged out.

3. **Protected routes** - All routes are protected by default except `/`, `/auth/*`, and `/login/*` (see `lib/supabase/proxy.ts`).

4. **Local Supabase development** - The local Supabase instance runs on different ports (see `supabase/config.toml` for details). Studio is on 54323, API on 54321.

5. **Auth session handling** - Always call `supabase.auth.getClaims()` in the middleware before checking user state to prevent random logouts.
