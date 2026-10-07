-- Apply through the owner-approved Supabase SQL editor before enabling trials.
-- No visitor messages, emails, companies, or raw IP addresses are stored here.
begin;
create table if not exists public.portfolio_agent_trials (
  id uuid primary key,
  expires_at timestamptz not null,
  used smallint not null default 0 check (used between 0 and 2)
);
create table if not exists public.portfolio_agent_trial_buckets (
  bucket text not null,
  day date not null,
  issued integer not null default 0,
  primary key (bucket, day)
);
alter table public.portfolio_agent_trials enable row level security;
alter table public.portfolio_agent_trial_buckets enable row level security;
revoke all on public.portfolio_agent_trials, public.portfolio_agent_trial_buckets from public, anon, authenticated;
grant all on public.portfolio_agent_trials, public.portfolio_agent_trial_buckets to service_role;

create or replace function public.portfolio_issue_agent_trial(p_id uuid, p_peer_hash text, p_expires bigint)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n integer; d date := (now() at time zone 'UTC')::date;
begin
  if p_id is null or p_peer_hash is null or p_expires is null
     or p_peer_hash !~ '^[0-9a-f]{64}$' or p_expires <= extract(epoch from now())
     or p_expires > extract(epoch from now()) + 86401 then
    return jsonb_build_object('allowed', false);
  end if;
  -- Consistent global-then-peer lock order serializes admission across replicas.
  insert into public.portfolio_agent_trial_buckets(bucket, day) values ('global', d)
    on conflict do nothing;
  select issued into n from public.portfolio_agent_trial_buckets where bucket = 'global' and day = d for update;
  if n >= 300 then return jsonb_build_object('allowed', false); end if;
  insert into public.portfolio_agent_trial_buckets(bucket, day) values (p_peer_hash, d)
    on conflict do nothing;
  select issued into n from public.portfolio_agent_trial_buckets where bucket = p_peer_hash and day = d for update;
  if n >= 1 then return jsonb_build_object('allowed', false); end if;
  insert into public.portfolio_agent_trials(id, expires_at) values(p_id, to_timestamp(p_expires));
  update public.portfolio_agent_trial_buckets set issued = issued + 1 where day = d and bucket in ('global', p_peer_hash);
  -- Bounded retention; expired receipts cannot become valid again after pruning.
  delete from public.portfolio_agent_trials where expires_at < now() - interval '2 days';
  delete from public.portfolio_agent_trial_buckets where day < d - 3;
  return jsonb_build_object('allowed', true);
end $$;

create or replace function public.portfolio_agent_trial_turn(p_id uuid, p_consume boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare n smallint;
begin
  select used into n from public.portfolio_agent_trials where id = p_id and expires_at > now() for update;
  if not found then return jsonb_build_object('valid', false); end if;
  if p_consume and n < 2 then
    update public.portfolio_agent_trials set used = used + 1 where id = p_id;
    return jsonb_build_object('valid', true, 'allowed', true, 'remaining_messages', 1 - n);
  end if;
  return jsonb_build_object('valid', true, 'allowed', not p_consume, 'remaining_messages', 2 - n);
end $$;
revoke all on function public.portfolio_issue_agent_trial(uuid, text, bigint) from public, anon, authenticated;
revoke all on function public.portfolio_agent_trial_turn(uuid, boolean) from public, anon, authenticated;
grant execute on function public.portfolio_issue_agent_trial(uuid, text, bigint) to service_role;
grant execute on function public.portfolio_agent_trial_turn(uuid, boolean) to service_role;
commit;
