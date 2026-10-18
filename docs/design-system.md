# Design system

The visual language is editorial and minimal: flat grey surfaces, hairline borders, square
corners, uppercase tracked labels, one red accent. New screens should look like they belong
next to the existing ones.

## Tokens (`Frontend/src/index.css`)

| Variable | Value | Use |
|---|---|---|
| `--accent` | `#e8311a` | the only accent colour: primary buttons, active nav, eyebrows, category labels |
| `--ink` | `#141414` | text |
| `--muted` | `#8a8a8a` | secondary text, placeholders |
| `--bg` | `#f1f1f1` | app background |
| `--panel` | `#e9e9e9` | cards, hover fills |
| `--line` | `#cfcfcf` | light dividers |

Common literals: `#9a9a9a` for the 2px structural borders (page header underline, details
panel edge), `#8f8f8f` for input/button borders, `#e0e0e0` for image placeholders.

## Type

Font is **Archivo** (loaded from Google Fonts in `index.html`), weights 400–800.
- Page titles: 22px / 800 / uppercase, with a 10px tracked uppercase red "eyebrow" above.
- Labels and buttons: 11–13px, uppercase, `letter-spacing` 0.06–0.14em, weight 700.
- Meta text: 9.5–12px in `--muted`.

## Shape

- No border radius (square corners everywhere), except tiny icon badges.
- Hairline 1px borders; 2px `#9a9a9a` only for major structure.
- Dashed 1px border marks an empty image slot ("Photo / or browse files").

## Shared pieces

- **Shell:** `AppLayout` = fixed 231px `Sidebar` (logo, 5 nav links, item-count footer) + main column.
- **`PageHeader`:** 70px bar, eyebrow + title on the left, actions on the right (use `margin-left: auto`
  on the first action).
- **Buttons:** `.btn` (outlined), `.btn--primary` (solid red), `.btn--icon` (square icon-only).
- **Two-pane pages** (Closet, Bins): scrollable main area plus a 378px right "details" panel
  with a 2px left border. It shows an empty-state hint until something is selected, and is
  hidden below 1100px wide.
- **Empty states:** a 32px outline icon above one line of muted text.
- **Chips:** 25px tall, 1px red border, red text; the active chip is white with dark text.
- **Icons:** Material **Outlined** icons from `@mui/icons-material` (the mockups use the Outlined
  set). Import each icon from its own path (`@mui/icons-material/CheckroomOutlined`), never from
  the package root. Size with `sx={{ fontSize: N }}` (16–18 in buttons, 20 in the sidebar,
  26–32 for empty states). They inherit the text color. The one exception is the multicolor
  Google logo in `AuthPage`, which is inline SVG.

## Mockups

Pages are built from screenshots the owner supplies. When no mockup exists, extend the
patterns above instead of inventing a new look.
