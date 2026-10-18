-- Bins: physical storage containers. A piece is in at most one bin (pieces.bin_id).
-- Deleting a bin releases its pieces (bin_id becomes null); the pieces are never deleted.

create table public.bins (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 80),
  notes       text,
  -- Path in the "piece-images" bucket (the same user-folder policies apply), not a URL.
  photo_path  text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Bin names are unique per user, ignoring case.
create unique index bins_user_name_idx on public.bins (user_id, lower(name));

create trigger bins_set_updated_at
  before update on public.bins
  for each row execute function public.set_updated_at();

alter table public.bins enable row level security;

create policy "bins_select_own" on public.bins
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "bins_insert_own" on public.bins
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "bins_update_own" on public.bins
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "bins_delete_own" on public.bins
  for delete to authenticated using ((select auth.uid()) = user_id);

alter table public.pieces
  add column bin_id uuid references public.bins (id) on delete set null;

create index pieces_bin_idx on public.pieces (bin_id);

-- A piece may only point at a bin its owner owns.
create function public.pieces_bin_guard() returns trigger
language plpgsql as $$
begin
  if new.bin_id is not null and not exists (
    select 1 from public.bins where id = new.bin_id and user_id = new.user_id
  ) then
    raise exception 'Invalid bin';
  end if;
  return new;
end;
$$;

create trigger pieces_bin_guard
  before insert or update of bin_id on public.pieces
  for each row execute function public.pieces_bin_guard();

-- Moves pieces into a bin (or out of every bin when p_bin is null) in one transaction and returns
-- the updated pieces. Runs with the caller's rights, so row level security still applies.
create function public.move_pieces_to_bin(p_bin uuid, p_pieces uuid[]) returns setof public.pieces
language sql as $$
  update public.pieces
  set bin_id = p_bin
  where id = any (p_pieces)
  returning *;
$$;

revoke all on function public.move_pieces_to_bin(uuid, uuid[]) from public, anon;
grant execute on function public.move_pieces_to_bin(uuid, uuid[]) to authenticated;
