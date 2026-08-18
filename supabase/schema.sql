create extension if not exists pgcrypto;

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default '我们的打卡',
  invite_code text not null unique check (length(invite_code)=6),
  owner_id uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  household_id uuid references public.households(id) on delete set null,
  display_name text not null default '新成员',
  role text not null default 'member' check (role in ('owner','member')),
  created_at timestamptz not null default now()
);
create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null check (length(title) between 1 and 60),
  description text,
  schedule text not null default 'daily' check (schedule in ('daily','weekdays','once')),
  due_time time,
  active boolean not null default true,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);
create table public.checkins (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  checkin_date date not null default current_date,
  note text check (length(note)<=500),
  photo_url text,
  created_at timestamptz not null default now(),
  unique(task_id,user_id,checkin_date)
);

create or replace function public.new_user_profile() returns trigger language plpgsql security definer set search_path=public as $$
begin insert into profiles(id,display_name) values(new.id,coalesce(new.raw_user_meta_data->>'display_name','新成员')); return new; end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.new_user_profile();

create or replace function public.my_household() returns uuid language sql stable security definer set search_path=public as $$ select household_id from profiles where id=auth.uid() $$;
create or replace function public.join_household(code text,chosen_name text) returns boolean language plpgsql security definer set search_path=public as $$
declare target uuid; members integer;
begin
  select id into target from households where invite_code=upper(code);
  if target is null then return false; end if;
  select count(*) into members from profiles where household_id=target;
  if members>=2 then raise exception '这个小家已经有两个人了'; end if;
  update profiles set household_id=target,display_name=left(chosen_name,30),role='member' where id=auth.uid() and household_id is null;
  return found;
end $$;
grant execute on function public.join_household(text,text) to authenticated;

alter table households enable row level security;
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table checkins enable row level security;
create policy "create household" on households for insert to authenticated with check(owner_id=auth.uid());
create policy "read own household" on households for select to authenticated using(id=my_household() or owner_id=auth.uid());
create policy "read household profiles" on profiles for select to authenticated using(id=auth.uid() or household_id=my_household());
create policy "update self" on profiles for update to authenticated using(id=auth.uid()) with check(id=auth.uid());
create policy "read shared tasks" on tasks for select to authenticated using(household_id=my_household());
create policy "create shared tasks" on tasks for insert to authenticated with check(household_id=my_household() and created_by=auth.uid());
create policy "update shared tasks" on tasks for update to authenticated using(household_id=my_household()) with check(household_id=my_household());
create policy "read shared checkins" on checkins for select to authenticated using(task_id in(select id from tasks where household_id=my_household()));
create policy "create own checkin" on checkins for insert to authenticated with check(user_id=auth.uid() and task_id in(select id from tasks where household_id=my_household()));
create policy "change own checkin" on checkins for update to authenticated using(user_id=auth.uid());
create policy "delete own checkin" on checkins for delete to authenticated using(user_id=auth.uid());

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('checkin-photos','checkin-photos',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict do nothing;
create policy "upload household photos" on storage.objects for insert to authenticated with check(bucket_id='checkin-photos' and (storage.foldername(name))[1]=my_household()::text);
create policy "read household photos" on storage.objects for select to authenticated using(bucket_id='checkin-photos' and (storage.foldername(name))[1]=my_household()::text);

alter publication supabase_realtime add table tasks,checkins;

-- Internal functions must not be callable by anonymous clients.
revoke execute on function public.join_household(text,text) from public;
revoke execute on function public.my_household() from public;
revoke execute on function public.new_user_profile() from public;
grant execute on function public.join_household(text,text) to authenticated;
grant execute on function public.my_household() to authenticated;
