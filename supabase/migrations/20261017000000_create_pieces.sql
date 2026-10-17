-- Closet items ("pieces"). Each row belongs to one signed-in user.

create table public.pieces (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,

  name        text not null check (char_length(name) between 1 and 120),
  brand       text,
  category    text not null
                check (category in (
                  'Clothing', 'Tops', 'Bottoms', 'Footwear',
                  'Jewelry', 'Headwear', 'Accessories'
                )),

  price       numeric(10, 2) check (price >= 0),
  wear_count  integer not null default 0 check (wear_count >= 0),

  -- Path inside the (future) "piece-images" storage bucket, not a full URL.
  image_path  text,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  -- "$4.86 / wear" on the closet cards. Null until the piece has been worn.
  cost_per_wear numeric(10, 2) generated always as (
    case when wear_count > 0 and price is not null
         then round(price / wear_count, 2) end
  ) stored
);

create index pieces_user_id_idx on public.pieces (user_id);
create index pieces_user_category_idx on public.pieces (user_id, category);

-- Keep updated_at fresh on every update.
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pieces_set_updated_at
  before update on public.pieces
  for each row execute function public.set_updated_at();

-- Row Level Security: users can only see and change their own pieces.
alter table public.pieces enable row level security;

create policy "pieces_select_own" on public.pieces
  for select to authenticated
  using ((select auth.uid()) = user_id);

create policy "pieces_insert_own" on public.pieces
  for insert to authenticated
  with check ((select auth.uid()) = user_id);

create policy "pieces_update_own" on public.pieces
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

create policy "pieces_delete_own" on public.pieces
  for delete to authenticated
  using ((select auth.uid()) = user_id);
