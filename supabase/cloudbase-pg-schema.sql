-- CloudBase PostgreSQL mode schema for 一起打卡
-- Execute this once in CloudBase Console -> PostgreSQL -> SQL 编辑器.
create extension if not exists pgcrypto;

create table if not exists public.households (
  id text primary key default gen_random_uuid()::text,
  name text not null default '我们的打卡',
  invite_code text not null unique check (length(invite_code)=6),
  owner_id text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.profiles (
  id text primary key,
  household_id text references public.households(id) on delete set null,
  display_name text not null default '新成员',
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now()
);
create table if not exists public.tasks (
  id text primary key default gen_random_uuid()::text,
  household_id text not null references public.households(id) on delete cascade,
  title text not null check (length(title) between 1 and 60),
  description text,
  schedule text not null default 'daily' check (schedule in ('daily','weekdays','once')),
  due_time time,
  active boolean not null default true,
  created_by text not null,
  created_at timestamptz not null default now()
);
create table if not exists public.checkins (
  id text primary key default gen_random_uuid()::text,
  task_id text not null references public.tasks(id) on delete cascade,
  user_id text not null references public.profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  note text check (length(note)<=500),
  photo_url text,
  created_at timestamptz not null default now(),
  unique(task_id,user_id,checkin_date)
);

create or replace function public.my_household() returns text
language sql stable security definer set search_path=public as $$
  select household_id from public.profiles where id=auth.uid()
$$;

create or replace function public.join_household(code text,chosen_name text) returns boolean
language plpgsql security definer set search_path=public as $$
declare target text; members integer;
begin
  select id into target from public.households where invite_code=upper(code);
  if target is null then return false; end if;
  select count(*) into members from public.profiles where household_id=target;
  if members>=2 then raise exception '这个小家已经有两个人了'; end if;
  update public.profiles set household_id=target,display_name=left(chosen_name,30),role='member'
    where id=auth.uid() and household_id is null;
  return found;
end $$;

grant usage on schema public to authenticated;
grant select,insert,update on public.households,public.profiles,public.tasks,public.checkins to authenticated;
grant execute on function public.my_household() to authenticated;
grant execute on function public.join_household(text,text) to authenticated;

alter table public.households enable row level security;
alter table public.profiles enable row level security;
alter table public.tasks enable row level security;
alter table public.checkins enable row level security;

drop policy if exists "create household" on public.households;
create policy "create household" on public.households for insert to authenticated
  with check(owner_id=auth.uid());
drop policy if exists "read own household" on public.households;
create policy "read own household" on public.households for select to authenticated
  using(id=public.my_household() or owner_id=auth.uid());
drop policy if exists "create own profile" on public.profiles;
create policy "create own profile" on public.profiles for insert to authenticated
  with check(id=auth.uid());
drop policy if exists "read household profiles" on public.profiles;
create policy "read household profiles" on public.profiles for select to authenticated
  using(id=auth.uid() or household_id=public.my_household());
drop policy if exists "update self" on public.profiles;
create policy "update self" on public.profiles for update to authenticated
  using(id=auth.uid()) with check(id=auth.uid());
drop policy if exists "read shared tasks" on public.tasks;
create policy "read shared tasks" on public.tasks for select to authenticated
  using(household_id=public.my_household());
drop policy if exists "create shared tasks" on public.tasks;
create policy "create shared tasks" on public.tasks for insert to authenticated
  with check(household_id=public.my_household() and created_by=auth.uid());
drop policy if exists "update shared tasks" on public.tasks;
create policy "update shared tasks" on public.tasks for update to authenticated
  using(household_id=public.my_household()) with check(household_id=public.my_household());
drop policy if exists "read shared checkins" on public.checkins;
create policy "read shared checkins" on public.checkins for select to authenticated
  using(task_id in(select id from public.tasks where household_id=public.my_household()));
drop policy if exists "create own checkin" on public.checkins;
create policy "create own checkin" on public.checkins for insert to authenticated
  with check(user_id=auth.uid() and task_id in(select id from public.tasks where household_id=public.my_household()));
drop policy if exists "change own checkin" on public.checkins;
create policy "change own checkin" on public.checkins for update to authenticated
  using(user_id=auth.uid()) with check(user_id=auth.uid());
drop policy if exists "delete own checkin" on public.checkins;
create policy "delete own checkin" on public.checkins for delete to authenticated
  using(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('checkin-photos','checkin-photos',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do nothing;
drop policy if exists "upload household photos" on storage.objects;
create policy "upload household photos" on storage.objects for insert to authenticated
  with check(bucket_id='checkin-photos' and (storage.foldername(name))[1]=public.my_household());
drop policy if exists "read household photos" on storage.objects;
create policy "read household photos" on storage.objects for select to authenticated
  using(bucket_id='checkin-photos' and (storage.foldername(name))[1]=public.my_household());
