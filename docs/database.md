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

### `categories` (migration `20261018180000_create_categories.sql`)

User-defined tree of categories, **up to 3 levels deep** (type > subtype > sub-subtype).
Columns: `id`, `user_id`, `parent_id` (null = top-level), `name`, `sort_order`, `created_at`.

- Names are unique (case-insensitive) per user and parent.
- A trigger enforces the 3-level limit, that the parent belongs to the same user, and that a
  category can never be moved to a different parent (so there are no cycles; there is no
  re-parenting in the UI).
- Deleting a category deletes its subcategories (`on delete cascade`); pieces in any of them
  become uncategorized (`pieces.category_id ... on delete set null`).
- Every user gets a starter set (Tops, Bottoms, Footwear, Jewelry, Headwear, Accessories): the
  migration seeded existing users, and a trigger on `auth.users` seeds each new signup via
  `seed_default_categories` (not callable through the API).
- RLS: select/insert/update/delete only for the owner.
- The old fixed category list and the "Clothing" removal migration (`20261018120000`) are
  superseded by this table; the migration converted existing pieces to matching categories.
- Frontend: `src/lib/categories.ts` (data + tree helpers), `/categories` page for management,
  and the Closet filter chips drill down through the levels.

### `bins` (migration `20261019120000_create_bins.sql`)

Physical storage containers. Columns: `id`, `user_id`, `name` (unique per user, case-insensitive),
`notes`, `photo_path` (a path in the `piece-images` bucket, stored as
`<user_id>/bin-<bin_id>-<timestamp>.<ext>`), `created_at`, `updated_at`. There is deliberately no
location field. RLS: owner-only.

`pieces.bin_id` (nullable FK, `on delete set null`) puts a piece in **at most one bin**; deleting a
bin releases its pieces and never deletes them. A trigger rejects a `bin_id` owned by another user.
RPC `move_pieces_to_bin(p_bin, p_pieces)` moves pieces in one transaction (null `p_bin` takes them
out of any bin) and returns the updated pieces; it runs with the caller's rights, so RLS applies.

Frontend: `src/lib/bins.ts`; the Bins page (`BinsPage`) lists bins and shows a details panel with
add / take-out / edit / delete; the Closet shows a bin chip on cards, a Bin row in the details
panel, a MOVE TO BIN picker, a bulk "Select" mode, search by bin name, and a Bin section in the
Sort & filter panel (Any / In a bin / Not in a bin, plus specific bins). The outfit builder shows
each piece's bin.

### `outfits` and `outfit_pieces` (migration `20261019000000_create_outfits.sql`)

- `outfits`: `id`, `user_id`, `name`, `notes`, `tags text[]` (max 10), `cover_image_path`
  (a path in the `piece-images` bucket, stored as `<user_id>/outfit-<outfit_id>-<timestamp>.<ext>`,
  so the existing storage policies cover it), `created_at`, `updated_at`.
- `outfit_pieces`: `(outfit_id, piece_id)` primary key plus `position` (display order). Deleting an
  outfit or a piece removes its link rows (cascade), but never deletes the other side.
- RLS: outfits are owner-only; `outfit_pieces` rows are allowed only when the outfit is yours, and
  inserts also require the piece to be yours.
- RPCs (run with the caller's rights, so RLS applies; executable by `authenticated` only):
  `replace_outfit_pieces(p_outfit, p_pieces)` replaces an outfit's pieces atomically (array order
  becomes `position`), and `wear_outfit(p_outfit)` adds 1 to `wear_count` on every piece in the
  outfit and returns the updated rows (`cost_per_wear` is regenerated by the database).
- There is no per-outfit wear history; "wearing" an outfit just increments its pieces' counters.

### `pieces` (migration `20261017000000_create_pieces.sql`)

Closet items. Columns: `id`, `user_id`, `name`, `brand`, `category_id`, `price`, `wear_count`,
`image_path`, `created_at`, `updated_at`, `cost_per_wear` (generated: price / wear_count,
null until worn).

`color_hex` / `color_name` (migration `20261018000000_add_piece_color.sql`): the auto-detected
main colour. **Only set when the piece was saved with a background-removed photo**; measured
on the cutout's opaque pixels with Color Thief (`src/lib/colors.ts`), then snapped to a small
clothing-friendly name list in CIELAB. There is no manual colour choice yet.

`category_id` (nullable FK to `categories`, `on delete set null`) replaced the old fixed `category`
text column in `20261018180000_create_categories.sql`. Null means "Uncategorized". A trigger
rejects a `category_id` that belongs to another user.

`image_path` is a path in a future `piece-images` storage bucket, not a URL.

RLS: select/insert/update/delete allowed to `authenticated` for rows they own.

**Applied to the live project?** Yes (confirmed in the dashboard Table Editor on 2026-10-17: table
exists, 4 RLS policies, empty). An earlier set of unrelated remote migrations was cleared from
the history table first. A migration row in the history does not prove the SQL ran, so verify
in the Table Editor, or with an unauthenticated `GET <url>/rest/v1/pieces?select=id&limit=1`
(`PGRST205` means the table is missing).

### Storage bucket `piece-images` (migration `20261017120000_create_piece_images_bucket.sql`)

Private, 5 MB limit, PNG/WebP/JPEG only. Files are stored at `<user_id>/<piece_id>.<ext>`;
policies only allow a user to read/write/delete inside their own `<user_id>/` folder.
`pieces.image_path` holds that path. The UI displays images through 1-hour signed URLs
(`getSignedUrls` in `src/lib/images.ts`). Uploads are downscaled (max 1600px) and saved as JPEG.

## Planned (not built)

- `outfits` and `outfit_pieces` (join table).
- `profiles` (display name, avatar).
- Background removal (in-browser, `@imgly/background-removal`, user opt-in) and a manual
  erase/restore brush in the Add Piece modal; cutouts will be saved as transparent PNG/WebP.
- Possible `wears` table for per-day wear history (currently just `wear_count`).
