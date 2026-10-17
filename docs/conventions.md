# Conventions

> **Terminal commands need the human's explicit permission, every time.** Mentions below of
> `tsc`, `eslint`, git and similar are checks to *request*, not to run on your own.

## TypeScript / React

- Function components, default-exported, one per file: `PascalCase.tsx`.
- Strict TS. `npx tsc -b` and `npx eslint src` (run from `Frontend/`) must both be clean before
  you finish.
- Don't add dependencies without a reason; prefer plain CSS and inline SVG icons (no icon lib).
- Match the surrounding code's style and comment density. No stray comments narrating the obvious.
- Hard-coded mock data lives at the top of the page file for now; when a page gets real data,
  replace the constant with a Supabase query and keep the same shape.

## Adding a page

1. Create `src/pages/FooPage.tsx` and `FooPage.css`.
2. Start with `<PageHeader eyebrow="..." title="..."> ...actions... </PageHeader>`, then the body.
3. Add the route inside the `RequireAuth` / `AppLayout` block in `App.tsx`.
4. If it belongs in the sidebar, add an entry to `NAV_ITEMS` in `components/Sidebar.tsx`.

## CSS

- One stylesheet per component/page, class names namespaced with BEM-ish prefixes
  (`closet-grid`, `piece__image`, `sidebar__item--active`).
- Page-specific rules stay in that page's CSS. Anything used by 2+ pages goes in `index.css`
  (this is where `.btn`, `.btn--primary`, `.btn--icon` live).
- Use the CSS variables from `index.css` (`--accent`, `--ink`, `--muted`, `--panel`, …) rather
  than new hex values when one exists.

## Supabase access from the UI

- Import the client only from `src/lib/supabase.ts`. Never create a second client.
- Get the current user from `useAuth()`, not by calling `supabase.auth` in components.
- Never send `user_id` on inserts; the column defaults to `auth.uid()`.

## Git

- Don't commit unless asked. Never commit `.env.local` or keys.
- Commit messages: short imperative subject.
