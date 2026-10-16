-- Say thanks for a gift. The person it was sent to can thank once, after
-- opening it. The giver gets a push and, on their next sync, a line in
-- Recent ("Name said thanks for Item").
-- Run after gifts.sql and push.sql.

alter table public.cheer_gifts add column if not exists thanked_at timestamptz;
-- When the giver's phone picked the thanks up for Recent.
alter table public.cheer_gifts add column if not exists thanks_seen_at timestamptz;

-- The giver's sync looks for thanks it has not seen yet.
create index if not exists cheer_gifts_thanks_idx
  on public.cheer_gifts (from_id)
  where thanked_at is not null and thanks_seen_at is null;

-- Once per gift: only a row with no thanks yet is updated. Rows have no
-- update grant or policy, so this function is the only way in.
create or replace function public.thank_gift(gift uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
  g public.cheer_gifts;
  name text;
  lang text;
  line text;
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  update public.cheer_gifts c
  set thanked_at = now()
  where c.id = gift and c.to_id = who and c.thanked_at is null and c.claimed_at is not null
  returning * into g;
  if g.id is null then
    return false;
  end if;

  if public.push_wanted(g.from_id, 'sends') then
    select coalesce(nullif(btrim(p.display_name), ''), 'Someone') into name
    from public.profiles p where p.user_id = who;
    lang := coalesce((select p.prefs ->> 'locale' from public.profiles p where p.user_id = g.from_id), 'en');
    line := coalesce(('{
      "en": "{name} said thanks for your gift.",
      "de": "{name} hat sich für dein Geschenk bedankt.",
      "es": "{name} te dio las gracias por tu regalo.",
      "fr": "{name} t''a remercié pour ton cadeau.",
      "it": "{name} ti ha ringraziato per il regalo.",
      "ja": "{name}さんがギフトのお礼を言いました。",
      "ko": "{name}님이 선물에 고맙다고 했어요.",
      "pt": "{name} agradeceu pelo seu presente.",
      "zh": "{name} 感谢了你的礼物。"
    }'::jsonb) ->> lang, '{name} said thanks for your gift.');
    insert into public.push_queue (to_id, title, body, go)
    values (g.from_id, left(replace(line, '{name}', coalesce(name, 'Someone')), 80), public.push_text(g.from_id, 'open'), '/gifts');
  end if;
  return true;
end;
$$;

revoke all on function public.thank_gift(uuid) from public, anon;
grant execute on function public.thank_gift(uuid) to authenticated;

-- The giver's phone: thanks not yet shown in Recent, marked seen as they are read.
create or replace function public.take_gift_thanks()
returns table (id uuid, kind text, item_id text, to_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  who uuid := (select auth.uid());
begin
  if who is null then
    raise exception 'not signed in';
  end if;
  return query
  with seen as (
    update public.cheer_gifts c
    set thanks_seen_at = now()
    where c.from_id = who and c.thanked_at is not null and c.thanks_seen_at is null
    returning c.id, c.kind, c.cheer_id, c.to_id
  )
  select s.id, s.kind, s.cheer_id, coalesce(nullif(btrim(p.display_name), ''), '')
  from seen s
  left join public.profiles p on p.user_id = s.to_id;
end;
$$;

revoke all on function public.take_gift_thanks() from public, anon;
grant execute on function public.take_gift_thanks() to authenticated;
