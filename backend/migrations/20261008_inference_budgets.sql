-- Apply before deploying durable inference admission. Service role only.
begin;
create table if not exists public.portfolio_inference_buckets (
  day date not null, bucket text not null, tokens bigint not null default 0 check(tokens >= 0),
  primary key(day, bucket)
);
create table if not exists public.portfolio_inference_reservations (
  id uuid primary key, day date not null, receipt text not null,
  tokens bigint not null check(tokens >= 0), settled boolean not null default false
);
alter table public.portfolio_inference_buckets enable row level security;
alter table public.portfolio_inference_reservations enable row level security;
revoke all on public.portfolio_inference_buckets, public.portfolio_inference_reservations from public, anon, authenticated;
grant all on public.portfolio_inference_buckets, public.portfolio_inference_reservations to service_role;
create or replace function public.portfolio_reserve_inference(
 p_id uuid, p_receipt text, p_tokens integer, p_global_limit integer, p_receipt_limit integer
) returns jsonb language plpgsql security definer set search_path = '' as $$
declare d date := (now() at time zone 'UTC')::date; g bigint; r bigint;
begin
 if p_id is null or p_receipt is null or p_receipt !~ '^[0-9a-f]{64}$'
    or p_tokens is null or p_tokens <= 0 or p_global_limit is null or p_global_limit <= 0
    or p_receipt_limit is null or p_receipt_limit <= 0 then
   return jsonb_build_object('allowed', false);
 end if;
 -- Global then receipt order is shared by admission and settlement.
 insert into public.portfolio_inference_buckets(day,bucket) values(d,'global') on conflict do nothing;
 select tokens into g from public.portfolio_inference_buckets where day=d and bucket='global' for update;
 insert into public.portfolio_inference_buckets(day,bucket) values(d,p_receipt) on conflict do nothing;
 select tokens into r from public.portfolio_inference_buckets where day=d and bucket=p_receipt for update;
 if g+p_tokens > p_global_limit or r+p_tokens > p_receipt_limit then
   return jsonb_build_object('allowed', false);
 end if;
 insert into public.portfolio_inference_reservations(id,day,receipt,tokens) values(p_id,d,p_receipt,p_tokens);
 update public.portfolio_inference_buckets set tokens=tokens+p_tokens where day=d and bucket in ('global',p_receipt);
 delete from public.portfolio_inference_reservations where day < d-7;
 delete from public.portfolio_inference_buckets where day < d-7;
 return jsonb_build_object('allowed', true);
end $$;
create or replace function public.portfolio_settle_inference(p_id uuid, p_tokens integer)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare x public.portfolio_inference_reservations; delta bigint;
begin
 if p_tokens is null or p_tokens < 0 then return jsonb_build_object('settled',false); end if;
 -- Read immutable day/receipt before acquiring consistent bucket locks.
 select * into x from public.portfolio_inference_reservations where id=p_id;
 if not found then return jsonb_build_object('settled',false); end if;
 perform 1 from public.portfolio_inference_buckets where day=x.day and bucket='global' for update;
 perform 1 from public.portfolio_inference_buckets where day=x.day and bucket=x.receipt for update;
 select * into x from public.portfolio_inference_reservations where id=p_id for update;
 if not found or x.settled then return jsonb_build_object('settled',false); end if;
 delta := p_tokens-x.tokens;
 update public.portfolio_inference_buckets set tokens=tokens+delta where day=x.day and bucket in ('global',x.receipt);
 update public.portfolio_inference_reservations set tokens=p_tokens, settled=true where id=p_id;
 return jsonb_build_object('settled',true);
end $$;
revoke all on function public.portfolio_reserve_inference(uuid,text,integer,integer,integer) from public,anon,authenticated;
revoke all on function public.portfolio_settle_inference(uuid,integer) from public,anon,authenticated;
grant execute on function public.portfolio_reserve_inference(uuid,text,integer,integer,integer) to service_role;
grant execute on function public.portfolio_settle_inference(uuid,integer) to service_role;
commit;
