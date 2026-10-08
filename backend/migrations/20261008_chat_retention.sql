-- Transcript retention only; unrelated tables are untouched.
-- Existing records receive a 30-day grace period; nothing is deleted at rollout.
create extension if not exists pg_cron with schema pg_catalog;
alter table public.portfolio_assistant_messages add column if not exists expires_at timestamptz;
update public.portfolio_assistant_messages set expires_at = greatest(coalesce(timestamp, now()) + interval '30 days', now() + interval '30 days') where expires_at is null;
alter table public.portfolio_assistant_messages alter column expires_at set default (now() + interval '30 days');
alter table public.portfolio_assistant_messages alter column expires_at set not null;
create index if not exists portfolio_assistant_messages_expiry on public.portfolio_assistant_messages(expires_at);
alter table public.portfolio_assistant_messages enable row level security;
revoke all on public.portfolio_assistant_messages from anon, authenticated;
create or replace function public.purge_expired_portfolio_messages() returns bigint language plpgsql security definer set search_path = pg_catalog as $$
declare removed bigint;
begin
  delete from public.portfolio_assistant_messages where expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;
revoke all on function public.purge_expired_portfolio_messages() from public, anon, authenticated;
grant execute on function public.purge_expired_portfolio_messages() to service_role;
select cron.schedule('portfolio-transcript-retention', '17 4 * * *', 'select public.purge_expired_portfolio_messages()');
