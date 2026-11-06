-- Jessica Daily: isolated intake inbox; existing orders/snapshots are untouched.
-- Run once as the project database owner. No service_role key is used by the browser.
begin;
create table if not exists public.jessica_intakes (
 id uuid primary key,
 created_at timestamptz not null default now(),
 status text not null default 'uploading' check(status in ('uploading','new','accepted','archived')),
 payload jsonb not null,
 files jsonb not null default '[]'::jsonb,
 fee_amount integer not null,
 upload_token text not null,
 accepted_at timestamptz
);
alter table public.jessica_intakes enable row level security;
revoke all on public.jessica_intakes from anon,authenticated;
grant select,update on public.jessica_intakes to authenticated;
create table if not exists public.jessica_intake_admins(user_id uuid primary key references auth.users(id));
alter table public.jessica_intake_admins enable row level security;
revoke all on public.jessica_intake_admins from anon,authenticated;
-- Set jessica.intake_owner_email in the SQL session before running this migration.
insert into public.jessica_intake_admins(user_id)
 select id from auth.users where lower(email)=lower(current_setting('jessica.intake_owner_email',true)) and email_confirmed_at is not null
 on conflict do nothing;
do $$ begin if not exists(select 1 from public.jessica_intake_admins) then raise exception 'Set jessica.intake_owner_email to the verified owner before installing intake';end if;end;$$;
create or replace function public.jessica_intake_admin() returns boolean
language sql stable security definer set search_path = '' as $$
 select exists(select 1 from public.jessica_intake_admins a join auth.users u on u.id=a.user_id where a.user_id=auth.uid() and u.email_confirmed_at is not null);
$$;
revoke all on function public.jessica_intake_admin() from public;
grant execute on function public.jessica_intake_admin() to authenticated;
drop policy if exists jessica_intake_admin_read on public.jessica_intakes;
create policy jessica_intake_admin_read on public.jessica_intakes for select to authenticated using (public.jessica_intake_admin());
drop policy if exists jessica_intake_admin_update on public.jessica_intakes;
create policy jessica_intake_admin_update on public.jessica_intakes for update to authenticated using (public.jessica_intake_admin()) with check (public.jessica_intake_admin());
create or replace function public.jessica_submit_intake(p_id uuid,p_token text,p_payload jsonb,p_files jsonb default '[]'::jsonb) returns uuid
language plpgsql security definer set search_path='' as $$
declare t text; pkg text; price integer; n integer; count_rows integer; total bigint:=0; f jsonb; i integer:=0; metric text; a jsonb; required_key text; old public.jessica_intakes; summed integer;
begin
 if p_token is null or p_token !~ '^[a-f0-9]{48}$' or p_id is null then raise exception 'Mã gửi không hợp lệ'; end if;
 if jsonb_typeof(p_payload) <> 'object' or octet_length(p_payload::text)>60000 then raise exception 'Thông tin quá dài'; end if;
 if jsonb_typeof(p_files)<>'array' or jsonb_array_length(p_files)>12 then raise exception 'Tối đa 12 tệp'; end if;
 t:=p_payload->>'jobType';pkg:=p_payload->>'package';
 price:=case when t='lesson' and pkg='ppt' then 1000000 when t='lesson' and pkg='ppt_word' then 1500000 when t='SKKN' and pkg='full' then 1500000 when t='BCBP' and pkg='word' then 1000000 when t='BCBP' and pkg='word_ppt' then 1500000 else null end;
 if price is null then raise exception 'Gói dịch vụ không hợp lệ';end if;
 if coalesce(nullif(trim(p_payload->>'name'),''),nullif(trim(p_payload->>'zalo'),'')) is null then raise exception 'Vui lòng điền tên hoặc tên Zalo';end if;
 if coalesce(nullif(trim(p_payload->>'lesson'),''),nullif(trim(p_payload->>'topic'),''),nullif(trim(p_payload->>'notes'),'')) is null and coalesce(p_payload->>'helpTopic','false')<>'true' then raise exception 'Vui lòng mô tả nội dung cần làm';end if;
 if coalesce(p_payload->>'requestedDate','')<>'' then
  if p_payload->>'requestedDate' !~ '^\d{4}-\d{2}-\d{2}$' then raise exception 'Ngày không hợp lệ';end if;
  perform (p_payload->>'requestedDate')::date;
 end if;
 if coalesce(p_payload->>'studentCount','')<>'' then
  if p_payload->>'studentCount' !~ '^[0-9]{1,6}$' then raise exception 'Số học sinh phải là số nguyên';end if;
  n:=(p_payload->>'studentCount')::integer;if n<1 or n>100000 then raise exception 'Số học sinh không hợp lệ';end if;
 end if;
 for f in select value from jsonb_array_elements(p_files) loop
  if coalesce(f->>'path','') !~ ('^'||p_id::text||'/'||p_token||'/'||i::text||'\.(pdf|doc|docx|ppt|pptx|jpg|jpeg|png|webp)$') then raise exception 'Đường dẫn tệp không hợp lệ';end if;
  if coalesce(f->>'size','') !~ '^[0-9]{1,9}$' or coalesce(length(f->>'original_name'),0)>250 then raise exception 'Thông tin tệp không hợp lệ';end if;
  if (f->>'size')::bigint>10485760 then raise exception 'Tệp quá 10 MB';end if;
  total:=total+(f->>'size')::bigint;i:=i+1;
 end loop;
 if total>41943040 then raise exception 'Tổng tệp quá 40 MB';end if;
 -- Serialize admission to enforce a bounded public inbox and idempotent retry.
 perform pg_advisory_xact_lock(82489125);
 select * into old from public.jessica_intakes where id=p_id;
 if found then
  if old.upload_token<>p_token or old.payload<>p_payload or old.files<>p_files then raise exception 'Mã gửi đã được sử dụng';end if;
  return p_id;
 end if;
 select count(*) into count_rows from public.jessica_intakes where created_at>now()-interval '1 day';
 if count_rows>=100 then raise exception 'Hôm nay hệ thống đã đủ lượt nhận; vui lòng liên hệ Jessica';end if;
 insert into public.jessica_intakes(id,payload,files,fee_amount,upload_token) values(p_id,p_payload,p_files,price,p_token);
 return p_id;
end;$$;
revoke all on function public.jessica_submit_intake(uuid,text,jsonb,jsonb) from public;
grant execute on function public.jessica_submit_intake(uuid,text,jsonb,jsonb) to anon,authenticated;
create or replace function public.jessica_intake_upload_allowed(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.jessica_intakes r,jsonb_array_elements(r.files) f
 where r.status='uploading' and r.created_at>now()-interval '2 hours' and f->>'path'=object_name);
$$;
revoke all on function public.jessica_intake_upload_allowed(text) from public;
grant execute on function public.jessica_intake_upload_allowed(text) to anon,authenticated;
insert into storage.buckets(id,name,public,file_size_limit) values('jessica-intake','jessica-intake',false,10485760) on conflict(id) do nothing;
drop policy if exists jessica_intake_upload on storage.objects;
create policy jessica_intake_upload on storage.objects for insert to anon,authenticated with check(bucket_id='jessica-intake' and public.jessica_intake_upload_allowed(name));
drop policy if exists jessica_intake_files_admin on storage.objects;
create policy jessica_intake_files_admin on storage.objects for select to authenticated using(bucket_id='jessica-intake' and public.jessica_intake_admin());
create or replace function public.jessica_finalize_intake(p_id uuid,p_token text) returns uuid
language plpgsql security definer set search_path='' as $$
declare r public.jessica_intakes;f jsonb;
begin
 select * into r from public.jessica_intakes where id=p_id for update;
 if not found or r.upload_token<>p_token then raise exception 'Mã gửi không hợp lệ';end if;
 if r.status<>'uploading' then return p_id;end if;
 if r.created_at<now()-interval '2 hours' then raise exception 'Phiên tải tệp đã hết hạn';end if;
 for f in select value from jsonb_array_elements(r.files) loop
  if not exists(select 1 from storage.objects where bucket_id='jessica-intake' and name=f->>'path') then raise exception 'Chưa tải đủ tệp';end if;
 end loop;
 update public.jessica_intakes set status='new' where id=p_id;
 return p_id;
end;$$;
revoke all on function public.jessica_finalize_intake(uuid,text) from public;
grant execute on function public.jessica_finalize_intake(uuid,text) to anon,authenticated;
commit;
