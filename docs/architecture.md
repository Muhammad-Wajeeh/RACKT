# Architecture

## Layout

```
RACKT/
├── AGENTS.md / CLAUDE.md      pointers to these docs
├── docs/                      you are here
├── package.json               root: Supabase CLI + db:* scripts only
├── supabase/
│   ├── config.toml
│   └── migrations/            SQL migrations (see database.md)
└── Frontend/                  the whole app (Vite)
    ├── .env.local             SECRET-ish config, git-ignored, never read or print it
    ├── .env.example           names of required env vars
    └── src/
        ├── main.tsx           BrowserRouter + root render
        ├── App.tsx            route table
        ├── index.css          global reset, CSS variables, shared .btn classes
        ├── auth/              AuthContext (useAuth) and route guards
        ├── lib/supabase.ts    the single Supabase client
        ├── layouts/AppLayout  sidebar + <Outlet/> shell
        ├── components/        Sidebar, PageHeader
        └── pages/             one component (+ .css) per route
```

There is **no custom backend**. An earlier Express backend was deleted; the browser talks
to Supabase (Postgres, Auth, Storage) directly with the publishable key. Row Level Security
is what protects data, so every table must have RLS enabled.

## Stack

Vite 8, React 19, TypeScript, `react-router-dom` 7, `@supabase/supabase-js`. Styling is plain
CSS (one `.css` file next to each component). MUI is used **only for icons**
(`@mui/icons-material`, which needs `@mui/material` and Emotion as peer dependencies); no MUI
components are used.

## Routes (`src/App.tsx`)

| Path | Page | Access |
|---|---|---|
| `/login`, `/signup` | `AuthPage` (`mode` prop) | guests only (`GuestOnly`; signed-in users go to `/closet`) |
| `/` | redirect to `/closet` | signed in |
| `/closet` | `ClosetPage`. Clicking a card selects it and shows `PieceDetails` in the right-hand panel (Delete works, with a confirm dialog; LOG A WEAR works and adds 1 to `wear_count`, a plain counter with no history; EDIT PIECE works for name, brand, category, price and wear count, but not the photo or colour; MOVE TO BIN works (single piece, or in bulk via the SELECT mode). The add and edit modals share `PieceFields` and `parsePieceForm`.). Selection is local state, not a route. The search box, category chips and the top-right Sort & filter panel (`SortFilterMenu`; logic in `src/lib/closetView.ts`) all work client-side on the loaded pieces: search matches name, brand, category path and colour name (every typed word must match); the panel sorts (newest/oldest, price, colour lightness, wear count, cost per wear; pieces missing the value sort last) and filters by colour, price range, times worn and brand (AND across groups, OR within colours and within brands). | signed in |
| `/categories` | `CategoriesPage`: add / rename / delete types and subtypes (max 3 levels) | signed in |
| `/profile` | `ProfilePage`: "Member since" from the account's real creation date (`user.created_at`), name and picture (stored in the auth user's metadata: `display_name`, `avatar_path` in the `piece-images` bucket; Google sign-ins also supply `avatar_url`), live stats (pieces, looks, average cost per wear = total spent on worn priced pieces / total wears), Edit profile, Export closet as CSV, Sign out | signed in |
| `/bins` | `BinsPage`: bins (name, notes, optional photo) with a details panel to add pieces, take them out, edit and delete; a piece is in at most one bin | signed in |
| `/outfits` | `OutfitsPage`: grid of saved looks (pieces stacked top to bottom via `OutfitCollage`, or the cover photo), tag filter | signed in |
| `/outfits/new`, `/outfits/:id` | `OutfitBuilderPage`: an outfit is a vertical stack of **slots** (add / remove / drag or arrow-reorder, each holds one piece, empty slots are dropped on save); click a slot, then pick a piece from your closet on the left. Also name / tags / notes / optional cover photo; for a saved look also WEAR THIS OUTFIT (adds one wear to every piece via the `wear_outfit` RPC) and DELETE | signed in |
| `/bins` | `BinsPage` | signed in |
| `/profile` | `ProfilePage` | signed in |
| anything else | redirect to `/closet` | signed in |

Signed-in routes sit inside `RequireAuth` (redirects to `/login`) and `AppLayout`.

## Sidebar item count

The "No. N items catalogued" footer reads `useClosetCount()` (`src/layouts/ClosetCount.tsx`). The
provider (inside `AppLayout`) fetches a cheap count once, and the Closet page updates it whenever
its pieces list changes, so adds and deletes show up immediately.

## Auth flow

- `AuthProvider` loads the session with `supabase.auth.getSession()` and subscribes to
  `onAuthStateChange`. `useAuth()` returns `{ user, session, loading }`.
- Email/password: `signInWithPassword` / `signUp` (name stored in `user_metadata.display_name`).
- Google: `signInWithOAuth({ provider: 'google' })`. Requires the provider to be enabled in the
  Supabase dashboard, and as of writing it is not.
- Sign out: `supabase.auth.signOut()` on the Profile page.
- Supabase has email confirmation on (`mailer_autoconfirm: false`), so signup may show
  "Check your email" instead of signing the user in.

## Background removal

`cutOutBackground()` in `src/lib/images.ts` runs `@imgly/background-removal` in the browser
(lazy-loaded; the model downloads on first use from IMG.LY's CDN) and returns a transparent PNG.
It is opt-in per photo in the Add Piece modal. `preloadCutoutModel()` starts the model
download (when the browser is idle) as soon as the modal opens; a cutout requested before it
finishes just waits for it and shows the loading state. `preload()` and `removeBackground()` must
share the same config (`CUTOUT_CONFIG`). **That package is AGPL-licensed**: fine while this
is a personal project, but before any commercial release either buy an IMG.LY license or swap
this one function for a server-side API (e.g. a Supabase Edge Function calling a paid service).

## Environment variables (Frontend/.env.local)

`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`. Only `VITE_`-prefixed vars reach the
browser. Never use or add the `service_role` / secret key in frontend code.

## Dev server

`.claude/launch.json` defines `frontend` (`npm run dev --prefix Frontend`, port 5173; Vite
picks another port if it's taken).
