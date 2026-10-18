# RACKT docs (read me first)

RACKT is a closet-tracking app: catalogue clothing "pieces", group them into outfits ("looks")
and storage "bins", and track cost per wear.

| Doc | What's in it |
|---|---|
| [architecture.md](architecture.md) | Repo layout, stack, routes, auth flow |
| [conventions.md](conventions.md) | Code style, file organisation, how to add a page or component |
| [design-system.md](design-system.md) | Colours, type, shared CSS classes, visual rules |
| [database.md](database.md) | Supabase schema, RLS, migration workflow |
| [gotchas.md](gotchas.md) | Things that have bitten us; read before debugging |

## Current status

- Built and wired to Supabase: Closet (add / edit / delete pieces, photos with optional
  background removal and colour detection, log wears, search, sort and filter), Categories
  (user-defined, 3 levels), Outfits (stacked-slot builder, tags, notes, cover photo, wear an
  outfit), Bins (storage containers; move pieces in and out, filter and search by bin),
  Profile (real member-since date, stats, name and picture, CSV export).
- Not built: Forgot password, Google sign-in setup in Supabase, measurements/sizing, account deletion.
- Wired to Supabase: authentication only (email/password; Google button is coded but the provider is not enabled yet).
- Database: `pieces` migration written; check `docs/database.md` for whether it has been applied.
- Not started: reading/writing real data on pages, image upload, bins and outfits tables, forgot-password flow.

## Working agreement

- **Never run a terminal command without the human's explicit permission**, every time, for
  every command (installs, builds, linters, dev server, git, Supabase CLI, curl, even `ls`).
  Ask, state the command and why, and wait for a yes. When a doc below lists commands, they are
  for the human to run or to approve, not for you to run on your own. **Exception, pre-approved
  by the human:** `npx tsc -b` and `npx eslint src` from `Frontend/`; run these after code
  changes without asking.
- Make the smallest change that does the job. Match surrounding code.
- Verify UI changes in the browser (dev server), not just with the type-checker.
- Update these docs when you change anything they describe.
