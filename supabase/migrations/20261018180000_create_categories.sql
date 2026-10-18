-- User-defined categories: a tree up to 3 levels deep (type > subtype > sub-subtype).
-- Pieces point at one category (any level) through pieces.category_id.
-- Deleting a category deletes its subcategories; pieces in any of them become uncategorized.

create table public.categories (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid()
                references auth.users (id) on delete cascade,
  parent_id   uuid references public.categories (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 60),
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

-- No duplicate names (case-insensitive) under the same parent. Root categories share a sentinel
-- parent id because NULLs never collide in a unique index.
create unique index categories_unique_name on public.categories (
  user_id,
  coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid),
  lower(name)
);
create index categories_user_parent_idx on public.categories (user_id, parent_id);

-- Enforces: the parent belongs to the same user, nesting is at most 3 levels, and a category
-- can't be moved to a different parent (which also rules out cycles).
create function public.categories_guard() returns trigger
language plpgsql as $$
declare
  depth integer := 1;
  cur   uuid := new.parent_id;
  owner uuid;
begin
  if tg_op = 'UPDATE' then
    if new.parent_id is distinct from old.parent_id then
      raise exception 'A category cannot be moved to a different parent';
    end if;
    return new;
  end if;

  if new.parent_id is not null then
    select user_id into owner from public.categories where id = new.parent_id;
    if owner is null or owner <> new.user_id then
      raise exception 'Invalid parent category';
    end if;
    while cur is not null loop
      depth := depth + 1;
      if depth > 3 then
        raise exception 'Categories can be at most 3 levels deep';
      end if;
      select parent_id into cur from public.categories where id = cur;
    end loop;
  end if;
  return new;
end;
$$;

create trigger categories_guard
  before insert or update on public.categories
  for each row execute function public.categories_guard();

alter table public.categories enable row level security;

create policy "categories_select_own" on public.categories
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "categories_insert_own" on public.categories
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "categories_update_own" on public.categories
  for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "categories_delete_own" on public.categories
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Starter set, created for every existing user and for each new signup.
create function public.seed_default_categories(uid uuid) returns void
language sql as $$
  insert into public.categories (user_id, name, sort_order)
  values (uid, 'Tops', 1), (uid, 'Bottoms', 2), (uid, 'Footwear', 3),
         (uid, 'Jewelry', 4), (uid, 'Headwear', 5), (uid, 'Accessories', 6)
  on conflict do nothing;
$$;

create function public.handle_new_user_categories() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform public.seed_default_categories(new.id);
  return new;
end;
$$;

-- These are internal helpers; the API should not be able to call them directly.
revoke execute on function public.seed_default_categories(uuid) from public, anon, authenticated;
revoke execute on function public.handle_new_user_categories() from public, anon, authenticated;

create trigger on_auth_user_created_categories
  after insert on auth.users
  for each row execute function public.handle_new_user_categories();

select public.seed_default_categories(id) from auth.users;

-- Link pieces to categories and migrate the old text column.
alter table public.pieces
  add column category_id uuid references public.categories (id) on delete set null;

update public.pieces p
set category_id = c.id
from public.categories c
where c.user_id = p.user_id and c.parent_id is null and c.name = p.category;

alter table public.pieces drop column category;

create index pieces_user_category_id_idx on public.pieces (user_id, category_id);

-- A piece may only point at a category its owner owns.
create function public.pieces_category_guard() returns trigger
language plpgsql as $$
begin
  if new.category_id is not null and not exists (
    select 1 from public.categories where id = new.category_id and user_id = new.user_id
  ) then
    raise exception 'Invalid category';
  end if;
  return new;
end;
$$;

create trigger pieces_category_guard
  before insert or update of category_id on public.pieces
  for each row execute function public.pieces_category_guard();
