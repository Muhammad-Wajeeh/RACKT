# Database (Supabase)

Project ref: `cxyprhcjhoxtrrbsosus` (not secret; it's the subdomain of the project URL).

## Rules

1. **Every table has Row Level Security enabled** with per-user policies
   (`(select auth.uid()) = user_id`). The browser holds only the publishable key, so RLS is the
   only thing protecting data.
2. Per-user tables have `user_id uuid not null default auth.uid() references auth.users(id) on delete cascade`.
   The app never sends `user_id`.
3. Schema changes are **migrations** in `supabase/migrations/`, applied with the Supabase CLI.
   Never change the schema by clicking in the dashboard (it won't be recorded and will drift).
4. Never edit a migration that has been applied; add a new one.

## Migration workflow (run from the repo root)

```bash
npx supabase login            # once, opens the browser
npm run db:link               # once, asks for the DB password
npm run db:new <name>         # creates supabase/migrations/<timestamp>_<name>.sql
npm run db:push               # applies migrations not yet applied remotely
npx supabase migration list   # local vs remote
npx supabase db push --dry-run
```

`db:push` compares the version (filename timestamp) of local files against
`supabase_migrations.schema_migrations` on the remote DB and runs the missing ones in order.
If SQL was run by hand in the dashboard, record it without re-running via
`npx supabase migration repair --status applied <version>`.

Agents: never run any of these (or any other terminal command) without the human's explicit
permission. `login`, `link` and `push` in particular affect the live project and need the
user's credentials, so the human runs them.

## Tables

### `pieces` (migration `20261017000000_create_pieces.sql`)

Closet items. Columns: `id`, `user_id`, `name`, `brand`, `category`, `price`, `wear_count`,
`image_path`, `created_at`, `updated_at`, `cost_per_wear` (generated: price / wear_count,
null until worn).

`category` is constrained to: Clothing, Tops, Bottoms, Footwear, Jewelry, Headwear,
Accessories (these match the filter chips on the Closet page).

`image_path` is a path in a future `piece-images` storage bucket, not a URL.

RLS: select/insert/update/delete allowed to `authenticated` for rows they own.

**Applied to the live project?** As of last check, no (the table did not exist remotely and the
CLI was not linked). Verify before assuming; an unauthenticated
`GET <url>/rest/v1/pieces?select=id&limit=1` returns `PGRST205` if the table is missing.

## Planned (not built)

- `bins` (name, location) and `pieces.bin_id` (nullable FK).
- `outfits` and `outfit_pieces` (join table).
- `profiles` (display name, avatar).
- Storage bucket `piece-images` (private; signed URLs) with per-user path policies.
- Possible `wears` table for per-day wear history (currently just `wear_count`).
