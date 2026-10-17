-- Private bucket for piece photos. Files live at "<user_id>/<piece_id>.<ext>",
-- and users can only touch files inside their own <user_id> folder.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'piece-images',
  'piece-images',
  false,
  5242880, -- 5 MB
  array['image/png', 'image/webp', 'image/jpeg']
)
on conflict (id) do nothing;

create policy "piece_images_select_own" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'piece-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "piece_images_insert_own" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'piece-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "piece_images_update_own" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'piece-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'piece-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "piece_images_delete_own" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'piece-images'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
