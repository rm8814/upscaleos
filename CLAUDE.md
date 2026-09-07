# uForge Discipline — Claude Code Project Instructions

This file tells Claude Code how to build in this project. It exists to replicate
the quality bar of "uForge" (an in-browser prototyping tool) but for a real,
full-stack Next.js + Convex app with a live database and backend.

Read this before writing any code. Apply it on every request in this project,
not just the first one.

## Stack

- **Frontend:** Next.js (App Router), React, Tailwind CSS
- **Backend:** Convex (real-time database + serverless functions, TypeScript-native)
- **No other backend** — do not suggest or add Express, a separate REST API, or
  a different database. Convex IS the backend here.

## The four-pass discipline (apply to every non-trivial build)

### Pass 1 — Understand before building
If the user's request is short or vague (a one-liner like "build a habit tracker"),
do not immediately start writing code. First, silently work out a concrete spec:
core purpose, key screens/views, main interactions, what the Convex schema needs
to look like, and one edge case worth handling. State this spec briefly back to
the user in plain language before writing files, so they can correct course early
if you've assumed something wrong. Skip this for requests that are already
specific, or for small follow-up edits.

### Pass 2 — Build with these defaults, unasked
Apply all of these without being told, every time:
1. **Responsive.** Every layout works at both ~1200px desktop and ~390px mobile
   width. No horizontal scroll. Tap targets >=40px on mobile.
2. **Real placeholder content.** Never "Item 1" or "Lorem ipsum" — use specific,
   realistic content for the app's actual subject.
3. **Sensible empty and loading states.** Any Convex query that can return no
   data yet, or is still loading, needs a real empty/loading UI — not a blank
   screen or undefined crash.
4. **Accessible basics.** Visible focus states, sufficient contrast, no
   color-only signaling.
5. **A deliberate visual identity** suited to the subject — not default
   unstyled forms or generic SaaS-card look.
6. **Convex schema matches the actual data the UI needs** — don't over- or
   under-model it. Use `defineSchema`/`defineTable` in `convex/schema.ts` and
   keep query/mutation files organized by entity (e.g. `convex/tasks.ts`).
7. **Real-time by default.** Since Convex queries are reactive, don't add
   manual polling or refresh buttons for data that Convex already keeps live —
   that's the whole point of using Convex over a REST API.

### Pass 3 — Self-critique before showing the result
After writing the code, re-read it against this checklist and fix issues
silently before telling the user it's done:
- Does every Convex query/mutation have correctly typed `args` and a `handler`
  that matches what the frontend actually calls?
- Do frontend `useQuery`/`useMutation` calls reference functions that actually
  exist in `convex/`, with matching argument shapes?
- Any placeholder content left in? Replace it.
- Any hardcoded fake data that should be coming from Convex instead? Wire it up
  for real — this project has a real database, use it.
- Responsive check per Pass 2, rule 1.

### Pass 4 — Verify it actually runs
Before declaring a task done:
- Run `npx tsc --noEmit` (or the project's typecheck script) and fix any errors.
- If `npx convex dev` is running in the background, check its output for schema
  or function errors after any change to `convex/`.
- If you changed a Convex function's signature, check every caller in the
  frontend was updated to match.
- Only tell the user the feature is ready once it typechecks and the dev
  servers show no errors — don't declare success on the strength of the code
  looking right; confirm it actually runs.

## Planning for large requests

If a request clearly spans multiple distinct systems or screens (three or more
genuinely separate areas — e.g. "build a hotel PMS with a dashboard,
reservations, and revenue reporting"), do not try to build it all in one pass.
Instead:
1. State a short numbered plan (2-5 milestones).
2. Build only the first milestone completely and correctly.
3. Say explicitly that the rest are planned next, and wait for the user to
   confirm or redirect before continuing — don't silently barrel through all
   milestones in one uninterrupted run.

For a single-purpose request (a form, a timer, a small tool), skip planning
and just build it.

## Style notes

- Prefer Convex's built-in auth helpers over rolling custom auth, unless the
  user specifies a provider (Clerk, Auth0) — ask which one before building
  login if it's not specified and the app needs one.
- Keep Convex functions small and named after what they do
  (`getTasksForUser`, not `query1`).
- Don't add a state-management library (Redux, Zustand, etc.) — Convex's
  `useQuery` hook + local React state is enough for the great majority of
  what this stack is used for.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
