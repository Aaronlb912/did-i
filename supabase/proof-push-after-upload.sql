-- The "added a photo" push goes out after the file is in storage, not when
-- the row is made. The phone makes the row, uploads, and deletes the row if
-- the upload fails, so the old after-insert trigger could push for a photo
-- that never existed. The phone now calls proof_uploaded(pid) after a good
-- upload. pushed_at makes a second call do nothing.
--
-- Apply last, after proof-view-kid.sql.

alter table public.proofs add column if not exists pushed_at timestamptz;

drop trigger if exists proofs_push on public.proofs;
drop function if exists public.proofs_push();

create or replace function public.proof_uploaded(pid uuid)
returns void
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  p public.proofs;
  who text;
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
  select coalesce(nullif(btrim(pr.display_name), ''), '') into who
  from public.profiles pr where pr.user_id = p.owner_id;
  if p.send_id is not null then
    insert into public.push_queue (to_id, title, body, go)
    select s.from_id, 'Did I',
      left(public.proof_push_text(s.from_id, coalesce(nullif(who, ''), public.push_text(s.from_id, 'someone'))), 200),
      '/sent'
    from public.sends s
    where s.id = p.send_id and public.push_wanted(s.from_id, 'sends');
  else
    insert into public.push_queue (to_id, title, body, go)
    select m.user_id, 'Did we',
      left(public.proof_push_text(m.user_id, coalesce(nullif(who, ''), public.push_text(m.user_id, 'someone'))), 200),
      '/tonight'
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
