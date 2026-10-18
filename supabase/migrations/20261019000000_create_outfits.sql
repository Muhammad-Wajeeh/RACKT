-- Outfits ("looks"): a named set of pieces with optional tags, notes and cover photo.

create table public.outfits (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null default auth.uid()
                      references auth.users (id) on delete cascade,
  name              text not null check (char_length(btrim(name)) between 1 and 120),
  notes             text,
  tags              text[] not null default '{}' check (cardinality(tags) <= 10),
  -- Path in the "piece-images" bucket (the same user-folder policies apply), not a URL.
  cover_image_path  text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index outfits_user_created_idx on public.outfits (user_id, created_at desc);

create trigger outfits_set_updated_at
  before update on public.outfits
  for each row execute function public.set_updated_at();

alter table public.outfits enable row level security;

create policy "outfits_select_own" on public.outfits
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "outfits_insert_own" on public.outfits
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "outfits_update_own" on public.outfits
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "outfits_delete_own" on public.outfits
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Which pieces are in which outfit, in display order. Deleting a piece or an outfit removes its rows.
create table public.outfit_pieces (
  outfit_id  uuid not null references public.outfits (id) on delete cascade,
  piece_id   uuid not null references public.pieces (id) on delete cascade,
  position   integer not null default 0,
  primary key (outfit_id, piece_id)
);

create index outfit_pieces_piece_idx on public.outfit_pieces (piece_id);

alter table public.outfit_pieces enable row level security;

create policy "outfit_pieces_select_own" on public.outfit_pieces
  for select to authenticated
  using (exists (
    select 1 from public.outfits o
    where o.id = outfit_pieces.outfit_id and o.user_id = (select auth.uid())
  ));

-- Both the outfit and the piece must belong to the user.
create policy "outfit_pieces_insert_own" on public.outfit_pieces
  for insert to authenticated
  with check (
    exists (
      select 1 from public.outfits o
      where o.id = outfit_pieces.outfit_id and o.user_id = (select auth.uid())
    )
    and exists (
      select 1 from public.pieces p
      where p.id = outfit_pieces.piece_id and p.user_id = (select auth.uid())
    )
  );

create policy "outfit_pieces_delete_own" on public.outfit_pieces
  for delete to authenticated
  using (exists (
    select 1 from public.outfits o
    where o.id = outfit_pieces.outfit_id and o.user_id = (select auth.uid())
  ));

-- Replaces an outfit's pieces in one transaction (array order = display order).
-- Runs with the caller's rights, so row level security still applies.
create function public.replace_outfit_pieces(p_outfit uuid, p_pieces uuid[]) returns void
language plpgsql as $$
begin
  delete from public.outfit_pieces where outfit_id = p_outfit;
  insert into public.outfit_pieces (outfit_id, piece_id, position)
  select p_outfit, t.piece_id, (min(t.ord) - 1)::integer
  from unnest(p_pieces) with ordinality as t(piece_id, ord)
  group by t.piece_id;
end;
$$;

-- Adds one wear to every piece in the outfit and returns the updated pieces.
create function public.wear_outfit(p_outfit uuid) returns setof public.pieces
language sql as $$
  update public.pieces
  set wear_count = wear_count + 1
  where id in (select piece_id from public.outfit_pieces where outfit_id = p_outfit)
  returning *;
$$;

revoke all on function public.replace_outfit_pieces(uuid, uuid[]) from public, anon;
revoke all on function public.wear_outfit(uuid) from public, anon;
grant execute on function public.replace_outfit_pieces(uuid, uuid[]) to authenticated;
grant execute on function public.wear_outfit(uuid) to authenticated;
