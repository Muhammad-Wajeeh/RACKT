# RACKT: instructions for AI agents

RACKT is a closet-tracking app (React + TypeScript frontend, Supabase backend).

**Before changing anything, read [`docs/README.md`](docs/README.md)** and the docs it links to.
They cover architecture, conventions, the design system, the database/migration workflow,
and known gotchas. Keep the docs up to date when you change something they describe.

Hard rules (details in `docs/`):

- **Never run any terminal command without the human's explicit permission.** This covers
  everything: installs, builds, type-checks, linters, dev servers, git, the Supabase CLI,
  `curl`, even read-only commands like `ls`. Ask first, say what you want to run and why,
  and wait for a clear yes. Permission applies to that command only and does not carry over
  to later ones. Use your file read, search and edit tools for reading and changing files.
  If you can't verify something without a command, say so and ask.
  **Standing exception (pre-approved by the human):** `npx tsc -b` and `npx eslint src`, run
  from `Frontend/`. Run them after code changes without asking. Nothing else is pre-approved.
- There is no custom backend. The frontend talks to Supabase directly.
- Never read, print, or commit `Frontend/.env.local` or any key or secret.
- Never edit a migration that has already been applied. Add a new one (`npm run db:new <name>`).
- Don't run `db:push`, `supabase login` or anything else that touches the live project unless the user asks.
