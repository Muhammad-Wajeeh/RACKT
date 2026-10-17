-- Auto-detected main colour of a piece. Only set for pieces saved with a background-removed
-- photo (the colour is measured on the cutout's visible pixels). Existing RLS policies cover
-- these columns since they apply per row.

alter table public.pieces
  add column color_hex  text check (color_hex ~ '^#[0-9a-fA-F]{6}$'),
  add column color_name text;
