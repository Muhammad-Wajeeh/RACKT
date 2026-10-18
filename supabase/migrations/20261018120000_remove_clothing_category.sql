-- "Clothing" was a catch-all that Tops and Bottoms already cover, so it is removed as a category.
-- Existing "Clothing" pieces become "Tops" (they can be re-categorised with Edit Piece).

update public.pieces set category = 'Tops' where category = 'Clothing';

alter table public.pieces drop constraint if exists pieces_category_check;
alter table public.pieces
  add constraint pieces_category_check
  check (category in ('Tops', 'Bottoms', 'Footwear', 'Jewelry', 'Headwear', 'Accessories'));
