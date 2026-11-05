-- Proof photo files, the Storage API way.
--
-- A plain delete from storage.objects is blocked (storage.protect_delete).
-- With storage.allow_delete_query set it goes through, but it only drops the
-- metadata row: the file itself stays in the bucket and can no longer be
-- listed. So the phone removes its own files through the Storage API (list,
-- then remove) before it deletes a photo, all its photos, or the account.
-- The owner can read their own folder even after the photo row is gone.
--
-- The trigger proofs_drop_file went: when a question or card went away it
-- dropped the metadata of other people's photos and left the files hidden.
-- Keeping the metadata lets a service-role sweep find them (docs/not-yet.md).
--
-- Also redefines proof_uploaded: the "added a photo" push now opens that
-- photo (/photos?id=<proof id>) instead of the sent list or Today.
--
-- Files of other people left behind when a question or card goes away need a
-- service-role sweep (docs/not-yet.md).
--
-- Apply last, after proof-push-after-upload.sql.

-- Photos uploaded before pushed_at existed have their file but no mark;
-- mark them so a retry never mistakes them for a half-done upload.
update public.proofs p set pushed_at = p.made_at
where p.pushed_at is null and exists (
  select 1 from storage.objects o
  where o.bucket_id = 'proofs' and o.name = p.owner_id::text || '/' || p.id::text || '.jpg');

drop policy if exists "proofs own read" on storage.objects;
create policy "proofs own read" on storage.objects
  for select to authenticated
  using (bucket_id = 'proofs' and (storage.foldername(name))[1] = (select auth.uid())::text);

drop trigger if exists proofs_drop_file on public.proofs;
drop function if exists public.proofs_drop_file();

create or replace function public.proof_uploaded(pid uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  p public.proofs;
  who text;
  where_to text;
begin
  select * into p from public.proofs x
  where x.id = pid and x.owner_id = (select auth.uid())
  for update;
  if not found or p.pushed_at is not null then
    return;
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'proofs' and o.name = p.owner_id::text || '/' || p.id::text || '.jpg'
  ) then
    return;
  end if;
  update public.proofs set pushed_at = now() where id = p.id;
  where_to := '/photos?id=' || p.id::text;
  select coalesce(nullif(btrim(pr.display_name), ''), '') into who
  from public.profiles pr where pr.user_id = p.owner_id;
  if p.send_id is not null then
    insert into public.push_queue (to_id, title, body, go)
    select s.from_id, 'Did I',
      left(public.proof_push_text(s.from_id, coalesce(nullif(who, ''), public.push_text(s.from_id, 'someone'))), 200),
      where_to
    from public.sends s
    where s.id = p.send_id and public.push_wanted(s.from_id, 'sends');
  else
    insert into public.push_queue (to_id, title, body, go)
    select m.user_id, 'Did we',
      left(public.proof_push_text(m.user_id, coalesce(nullif(who, ''), public.push_text(m.user_id, 'someone'))), 200),
      where_to
    from public.we_members m
    join public.we_cards c on c.id = m.card_id
    where m.card_id = p.card_id and m.state = 'in' and m.user_id <> p.owner_id
      and c.shows <> 'count'
      and not exists (select 1 from public.blocks b
                      where (b.blocker = p.owner_id and b.blocked = m.user_id)
                         or (b.blocker = m.user_id and b.blocked = p.owner_id))
      and public.push_wanted(m.user_id, 'we');
  end if;
end;
$$;

revoke all on function public.proof_uploaded(uuid) from public, anon;
grant execute on function public.proof_uploaded(uuid) to authenticated;

notify pgrst, 'reload schema';
